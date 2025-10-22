import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until reset
}

/**
 * Rate Limiting Service using Redis
 *
 * Implements sliding window rate limiting per API token
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redis: Redis;
  private readonly WINDOW_SIZE_MS = 60000; // 1 minute window

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis connection
    const redisHost = this.configService.get<string>('redis.host');
    const redisPort = this.configService.get<number>('redis.port');

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for rate limiting');
    });
  }

  /**
   * Check if request is allowed based on rate limit
   * Uses sliding window algorithm with Redis
   */
  async checkRateLimit(
    tokenId: string,
    limit: number,
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${tokenId}`;
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE_MS;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      pipeline.zcount(key, windowStart, now);

      // Add current request timestamp
      pipeline.zadd(key, now, `${now}`);

      // Set expiration (2 minutes to be safe)
      pipeline.expire(key, 120);

      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Redis pipeline failed');
      }

      // Get count from zcount command (index 1 in results)
      const count = (results[1][1] as number) || 0;

      // Calculate remaining requests
      const remaining = Math.max(0, limit - count - 1); // -1 because we already added current request
      const allowed = count < limit;

      // Calculate reset time
      const resetAt = new Date(now + this.WINDOW_SIZE_MS);

      // If not allowed, calculate retry after
      let retryAfter: number | undefined;
      if (!allowed) {
        // Get oldest request in window
        const oldestRequests = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        if (oldestRequests.length >= 2) {
          const oldestTimestamp = parseInt(oldestRequests[1]);
          const retryAfterMs = oldestTimestamp + this.WINDOW_SIZE_MS - now;
          retryAfter = Math.ceil(retryAfterMs / 1000);
        } else {
          retryAfter = Math.ceil(this.WINDOW_SIZE_MS / 1000);
        }

        // If not allowed, remove the request we just added
        await this.redis.zrem(key, `${now}`);
      }

      this.logger.debug(
        `Rate limit check for ${tokenId}: ${count}/${limit}, allowed: ${allowed}, remaining: ${remaining}`,
      );

      return {
        allowed,
        limit,
        remaining,
        resetAt,
        retryAfter,
      };
    } catch (error) {
      this.logger.error(`Error checking rate limit for ${tokenId}:`, error);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        limit,
        remaining: limit,
        resetAt: new Date(now + this.WINDOW_SIZE_MS),
      };
    }
  }

  /**
   * Get remaining requests for a token
   */
  async getRemainingRequests(
    tokenId: string,
    limit: number,
  ): Promise<number> {
    const key = `rate_limit:${tokenId}`;
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE_MS;

    try {
      const count = await this.redis.zcount(key, windowStart, now);
      return Math.max(0, limit - count);
    } catch (error) {
      this.logger.error(
        `Error getting remaining requests for ${tokenId}:`,
        error,
      );
      return limit;
    }
  }

  /**
   * Reset rate limit for a token (admin action)
   */
  async resetRateLimit(tokenId: string): Promise<void> {
    const key = `rate_limit:${tokenId}`;

    try {
      await this.redis.del(key);
      this.logger.log(`Rate limit reset for token ${tokenId}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit for ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Get rate limit statistics for a token
   */
  async getRateLimitStats(tokenId: string, limit: number): Promise<{
    currentCount: number;
    limit: number;
    remaining: number;
    windowStart: Date;
    windowEnd: Date;
  }> {
    const key = `rate_limit:${tokenId}`;
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE_MS;

    try {
      const count = await this.redis.zcount(key, windowStart, now);
      const remaining = Math.max(0, limit - count);

      return {
        currentCount: count,
        limit,
        remaining,
        windowStart: new Date(windowStart),
        windowEnd: new Date(now),
      };
    } catch (error) {
      this.logger.error(`Error getting rate limit stats for ${tokenId}:`, error);
      return {
        currentCount: 0,
        limit,
        remaining: limit,
        windowStart: new Date(windowStart),
        windowEnd: new Date(now),
      };
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Redis connection closed');
  }
}
