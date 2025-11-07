import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../modules/database/prisma.service';
import { CacheService } from '../common/services/cache.service';
import Redis from 'ioredis';

@Injectable()
export class ConfigurableThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(ConfigurableThrottlerGuard.name);
  private readonly redis: Redis;
  private readonly WINDOW_SIZE_MS = 60000; // 1 minute window

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {
    // Initialize separate Redis connection for throttling
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error for throttler:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Throttler connected to Redis');
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    const key = `throttle:global:${ip}`;

    const limit = await this.getRateLimit();
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE_MS;

    try {
      // Redis sliding window algorithm (same as RateLimitService)
      // 1. Remove old entries outside window
      await this.redis.zremrangebyscore(key, '-inf', windowStart);

      // 2. Count requests in current window
      const count = await this.redis.zcard(key);

      // 3. Check if limit exceeded
      if (count >= limit) {
        // Get oldest request timestamp to calculate retry-after
        const oldestRequests = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        let retryAfter = 60; // Default 60 seconds

        if (oldestRequests.length >= 2) {
          const oldestTimestamp = parseInt(oldestRequests[1]);
          const retryAfterMs = oldestTimestamp + this.WINDOW_SIZE_MS - now;
          retryAfter = Math.ceil(retryAfterMs / 1000);
        }

        this.logger.warn(`Global rate limit exceeded for IP ${ip}: ${count}/${limit}`);

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Global rate limit exceeded. Current limit: ${limit} requests per minute. Try again in ${retryAfter} seconds.`,
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 4. Add current request timestamp
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);

      // 5. Set expiration (2 minutes to be safe)
      await this.redis.expire(key, 120);

      return true;
    } catch (error) {
      // If it's our HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // For Redis errors, log and allow request (fail open)
      this.logger.error('Redis error in throttler, allowing request:', error);
      return true;
    }
  }

  /**
   * Extract client IP from request
   */
  private getClientIp(request: any): string {
    // Try to get IP from X-Forwarded-For header first (for proxied requests)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    // Fallback to direct IP
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  /**
   * Get global rate limit from settings with Redis caching
   * Cache TTL: 5 minutes
   */
  private async getRateLimit(): Promise<number> {
    const cacheKey = 'settings:global:rateLimit';

    return this.cacheService.remember(
      cacheKey,
      300, // 5 minutes
      async () => {
        try {
          const settings = await this.prisma.adminSettings.findFirst({
            select: { globalRateLimit: true },
          });

          const limit = settings?.globalRateLimit || 100;
          this.logger.debug(`Global rate limit fetched: ${limit} req/min`);
          return limit;
        } catch (error) {
          this.logger.error('Failed to fetch rate limit settings:', error.message);
          return 100; // Default fallback
        }
      },
    );
  }
}
