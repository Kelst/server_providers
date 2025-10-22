import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RateLimitService } from '../services/rate-limit.service';
import { PrismaService } from '../../modules/database/prisma.service';

/**
 * Guard that enforces per-token rate limiting
 *
 * Must be used AFTER ApiTokenGuard (which validates the token and attaches it to request.user)
 *
 * @example
 * ```typescript
 * @UseGuards(ApiTokenGuard, RateLimitGuard)
 * @Get('data')
 * getData() { ... }
 * ```
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const apiToken = request.user; // Set by ApiTokenGuard

    // If no API token, skip rate limiting (likely admin endpoint with JWT)
    if (!apiToken || !apiToken.id) {
      return true;
    }

    // Get rate limit from token (default to 100 if not set)
    const rateLimit = apiToken.rateLimit || 100;

    try {
      // Check rate limit
      const result = await this.rateLimitService.checkRateLimit(
        apiToken.id,
        rateLimit,
      );

      // Add rate limit headers to response
      response.setHeader('X-RateLimit-Limit', result.limit.toString());
      response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      response.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

      // If not allowed, throw 429 Too Many Requests
      if (!result.allowed) {
        this.logger.warn(
          `Rate limit exceeded for token ${apiToken.id} (${apiToken.projectName}). ` +
          `Limit: ${result.limit}, Retry after: ${result.retryAfter}s`,
        );

        // Add Retry-After header
        if (result.retryAfter) {
          response.setHeader('Retry-After', result.retryAfter.toString());
        }

        // Log rate limit event to database (async, don't block response)
        this.logRateLimitEvent(
          apiToken.id,
          request.path,
          request.method,
          result.limit,
          request.ip || request.connection?.remoteAddress || 'unknown',
          request.headers['user-agent'],
        ).catch((err) => {
          this.logger.error('Failed to log rate limit event:', err);
        });

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Rate limit exceeded',
            error: 'Too Many Requests',
            limit: result.limit,
            remaining: result.remaining,
            resetAt: result.resetAt,
            retryAfter: result.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Log if getting close to limit (80% threshold)
      if (result.remaining < result.limit * 0.2) {
        this.logger.warn(
          `Token ${apiToken.id} (${apiToken.projectName}) is close to rate limit: ${result.remaining}/${result.limit} remaining`,
        );
      }

      return true;
    } catch (error) {
      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // On other errors, log and allow request (fail open)
      this.logger.error(
        `Error checking rate limit for token ${apiToken.id}:`,
        error,
      );
      return true;
    }
  }

  /**
   * Log rate limit event to database
   */
  private async logRateLimitEvent(
    tokenId: string,
    endpoint: string,
    method: string,
    limitValue: number,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      // Get current request count from rate limit service
      const stats = await this.rateLimitService.getRateLimitStats(
        tokenId,
        limitValue,
      );

      await this.prisma.rateLimitEvent.create({
        data: {
          tokenId,
          endpoint,
          method,
          requestsCount: stats.currentCount,
          limitValue,
          ipAddress,
          userAgent: userAgent || null,
        },
      });

      this.logger.log(
        `Rate limit event logged: token=${tokenId}, endpoint=${endpoint}, count=${stats.currentCount}/${limitValue}`,
      );
    } catch (error) {
      this.logger.error('Error logging rate limit event:', error);
      // Don't throw - logging failure shouldn't affect the request
    }
  }
}
