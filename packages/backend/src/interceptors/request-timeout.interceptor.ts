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
import { PrismaService } from '../modules/database/prisma.service';

/**
 * Interceptor that applies configurable request timeout to all API endpoints.
 * Timeout value is read from AdminSettings and cached for 30 seconds.
 */
@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestTimeoutInterceptor.name);
  private cachedTimeout: number = 30000; // Default 30 seconds
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 30000; // Cache for 30 seconds

  constructor(private prisma: PrismaService) {}

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
   * Get timeout value from AdminSettings with caching
   */
  private async getTimeout(request: any): Promise<number> {
    const now = Date.now();

    // Return cached value if cache is still valid
    if (now - this.lastCacheUpdate < this.CACHE_TTL) {
      return this.cachedTimeout;
    }

    try {
      // Try to get user from JWT auth (admin requests)
      const user = request.user;

      if (user && user.id) {
        const settings = await this.prisma.adminSettings.findUnique({
          where: { userId: user.id },
          select: { apiRequestTimeout: true },
        });

        if (settings && settings.apiRequestTimeout) {
          this.cachedTimeout = settings.apiRequestTimeout;
          this.lastCacheUpdate = now;
          return this.cachedTimeout;
        }
      }

      // If no user or settings found, try to get first available settings
      const anySettings = await this.prisma.adminSettings.findFirst({
        select: { apiRequestTimeout: true },
      });

      if (anySettings && anySettings.apiRequestTimeout) {
        this.cachedTimeout = anySettings.apiRequestTimeout;
        this.lastCacheUpdate = now;
      }
    } catch (error) {
      this.logger.error('Failed to fetch timeout settings:', error);
    }

    return this.cachedTimeout;
  }
}
