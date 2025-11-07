import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Centralized Redis Cache Service
 *
 * Provides caching functionality for the entire application:
 * - Token validation
 * - Admin settings
 * - Analytics data
 * - Dashboard stats
 *
 * Features:
 * - Automatic serialization/deserialization
 * - TTL support
 * - Pattern-based invalidation
 * - "Remember" pattern for cache-aside
 * - Connection retry strategy
 * - Graceful error handling
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;

  // Cache statistics for monitoring
  private hits = 0;
  private misses = 0;
  private errors = 0;

  constructor(private readonly configService: ConfigService) {
    const redisHost = this.configService.get<string>('redis.host');
    const redisPort = this.configService.get<number>('redis.port');

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
      this.errors++;
    });

    this.redis.on('connect', () => {
      this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis client is ready');
    });
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Parsed value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);

      if (value) {
        this.hits++;
        this.logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(value) as T;
      }

      this.misses++;
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.errors++;
      this.logger.error(`Error getting cache key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache (will be JSON serialized)
   * @param ttl Time to live in seconds (optional)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
        this.logger.debug(`Cache SET with TTL: ${key} (${ttl}s)`);
      } else {
        await this.redis.set(key, serialized);
        this.logger.debug(`Cache SET: ${key}`);
      }
    } catch (error) {
      this.errors++;
      this.logger.error(`Error setting cache key "${key}":`, error);
      // Don't throw - caching should fail silently
    }
  }

  /**
   * Delete key from cache
   * @param key Cache key to delete
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.errors++;
      this.logger.error(`Error deleting cache key "${key}":`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern Redis key pattern (e.g., "user:*", "dashboard:stats:*")
   * @returns Number of keys deleted
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        this.logger.debug(`Cache invalidate pattern: ${pattern} - no keys found`);
        return 0;
      }

      await this.redis.del(...keys);
      this.logger.debug(`Cache invalidate pattern: ${pattern} - deleted ${keys.length} keys`);
      return keys.length;
    } catch (error) {
      this.errors++;
      this.logger.error(`Error invalidating pattern "${pattern}":`, error);
      return 0;
    }
  }

  /**
   * Cache-aside pattern: Get from cache or execute callback and cache result
   * This is the most common caching pattern
   *
   * @param key Cache key
   * @param ttl Time to live in seconds
   * @param callback Function to execute if cache miss
   * @returns Cached or computed value
   *
   * @example
   * const userData = await cacheService.remember(
   *   `user:${userId}`,
   *   300, // 5 minutes
   *   async () => await this.prisma.user.findUnique({ where: { id: userId }})
   * );
   */
  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute callback
    try {
      const result = await callback();

      // Cache the result
      await this.set(key, result, ttl);

      return result;
    } catch (error) {
      this.logger.error(`Error in remember callback for key "${key}":`, error);
      throw error; // Re-throw so caller can handle it
    }
  }

  /**
   * Get multiple keys at once
   * @param keys Array of cache keys
   * @returns Array of values (null for missing keys)
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (keys.length === 0) {
        return [];
      }

      const values = await this.redis.mget(...keys);

      return values.map((value) => {
        if (value) {
          this.hits++;
          return JSON.parse(value) as T;
        }
        this.misses++;
        return null;
      });
    } catch (error) {
      this.errors++;
      this.logger.error('Error in mget:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   * @param entries Array of [key, value] pairs
   * @param ttl Optional TTL for all keys
   */
  async mset(entries: [string, any][], ttl?: number): Promise<void> {
    try {
      if (entries.length === 0) {
        return;
      }

      const pipeline = this.redis.pipeline();

      for (const [key, value] of entries) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
      this.logger.debug(`Cache MSET: ${entries.length} keys`);
    } catch (error) {
      this.errors++;
      this.logger.error('Error in mset:', error);
    }
  }

  /**
   * Check if key exists in cache
   * @param key Cache key
   * @returns true if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.errors++;
      this.logger.error(`Error checking existence of key "${key}":`, error);
      return false;
    }
  }

  /**
   * Get time to live for a key
   * @param key Cache key
   * @returns TTL in seconds, -1 if no expire, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.errors++;
      this.logger.error(`Error getting TTL for key "${key}":`, error);
      return -2;
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
      this.logger.warn('Cache FLUSHALL - all keys deleted');
    } catch (error) {
      this.errors++;
      this.logger.error('Error flushing cache:', error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    errors: number;
    hitRate: string;
    total: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : '0.00';

    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRate: `${hitRate}%`,
      total,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
    this.logger.log('Cache statistics reset');
  }

  /**
   * Get Redis info
   */
  async getRedisInfo(): Promise<string> {
    try {
      return await this.redis.info();
    } catch (error) {
      this.logger.error('Error getting Redis info:', error);
      return '';
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    try {
      const stats = this.getCacheStats();
      this.logger.log(`Cache statistics before shutdown: ${JSON.stringify(stats)}`);

      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing Redis connection:', error);
    }
  }
}
