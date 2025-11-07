import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { CacheService } from '../common/services/cache.service';

/**
 * Interceptor that applies configurable request timeout to all API endpoints.
 * Timeout value is read from AdminSettings and cached in Redis (TTL: 30 seconds).
 */
@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestTimeoutInterceptor.name);
  private readonly DEFAULT_TIMEOUT = 30000; // Default 30 seconds

  constructor(private cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Get timeout from settings (with caching)
    const timeoutMs = await this.getTimeout(request);

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          this.logger.warn(
            `Request timeout after ${timeoutMs}ms: ${request.method} ${request.url}`,
          );
          return throwError(
            () =>
              new RequestTimeoutException(
                `Request timeout after ${timeoutMs}ms. Please try again or contact support.`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }

  /**
   * Get timeout value from AdminSettings with Redis caching (TTL: 30s)
   * Uses cached settings from SettingsService when available
   */
  private async getTimeout(request: any): Promise<number> {
    try {
      // Try to get user from JWT auth (admin requests)
      const user = request.user;

      if (user && user.id) {
        // Try to get timeout from cached admin settings
        const cacheKey = `settings:admin:${user.id}`;
        const settings = await this.cacheService.get<any>(cacheKey);

        if (settings && settings.apiRequestTimeout) {
          this.logger.debug(
            `Using cached timeout for user ${user.id}: ${settings.apiRequestTimeout}ms`,
          );
          return settings.apiRequestTimeout;
        }
      }

      // Fallback: get global timeout setting
      const globalCacheKey = 'settings:global:timeout';
      const globalTimeout = await this.cacheService.get<number>(globalCacheKey);

      if (globalTimeout) {
        return globalTimeout;
      }

      // Return default timeout if no cached value found
      this.logger.debug(`Using default timeout: ${this.DEFAULT_TIMEOUT}ms`);
      return this.DEFAULT_TIMEOUT;
    } catch (error) {
      this.logger.error('Failed to fetch timeout from cache:', error);
      return this.DEFAULT_TIMEOUT;
    }
  }
}
