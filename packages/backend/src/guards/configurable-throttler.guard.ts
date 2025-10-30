import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../modules/database/prisma.service';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class ConfigurableThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(ConfigurableThrottlerGuard.name);
  private cachedLimit: number = 100; // Default 100 requests per minute
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 30000; // Cache for 30 seconds

  // In-memory storage for rate limiting (можна замінити на Redis)
  private readonly storage = new Map<string, RateLimitRecord>();

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {
    // Clean up old records every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request);

    const limit = await this.getRateLimit();
    const ttl = 60000; // 1 minute

    const now = Date.now();
    let record = this.storage.get(key);

    // If no record or record expired, create new one
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + ttl,
      };
      this.storage.set(key, record);
      return true;
    }

    // Increment count
    record.count++;

    // Check if limit exceeded
    if (record.count > limit) {
      const resetIn = Math.ceil((record.resetTime - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Please wait before making more requests. Current limit: ${limit} requests per minute. Try again in ${resetIn} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Generate unique key for rate limiting based on IP
   */
  private generateKey(request: any): string {
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    return `global:${ip}`;
  }

  /**
   * Get rate limit from database with caching
   */
  private async getRateLimit(): Promise<number> {
    const now = Date.now();

    // Return cached value if still valid
    if (now - this.lastCacheUpdate < this.CACHE_TTL) {
      return this.cachedLimit;
    }

    try {
      // Fetch the first admin settings (global rate limit)
      const settings = await this.prisma.adminSettings.findFirst({
        select: { globalRateLimit: true },
      });

      if (settings && settings.globalRateLimit) {
        this.cachedLimit = settings.globalRateLimit;
        this.lastCacheUpdate = now;
        this.logger.debug(`Global rate limit updated: ${this.cachedLimit} req/min`);
      }
    } catch (error) {
      this.logger.error('Failed to fetch rate limit settings:', error.message);
    }

    return this.cachedLimit;
  }

  /**
   * Clean up expired records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.storage.entries()) {
      if (now > record.resetTime) {
        this.storage.delete(key);
      }
    }
  }
}
