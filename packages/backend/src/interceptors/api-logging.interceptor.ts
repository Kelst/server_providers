import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../modules/database/prisma.service';

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Only log requests with API token (from API token authenticated endpoints)
    // Skip JWT authenticated requests (admin panel requests)
    const apiToken = request.user;
    if (!apiToken || !apiToken.id || !apiToken.token || !apiToken.tokenHash) {
      // This is either not authenticated or JWT authenticated (admin)
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          this.logRequest(
            request,
            response,
            startTime,
            apiToken.id,
            responseData,
            null,
          );
        },
        error: (error) => {
          this.logRequest(
            request,
            response,
            startTime,
            apiToken.id,
            null,
            error,
          );
        },
      }),
    );
  }

  private async logRequest(
    request: any,
    response: any,
    startTime: number,
    tokenId: string,
    responseData: any,
    error: any,
  ) {
    const responseTime = Date.now() - startTime;
    const statusCode = error ? error.status || 500 : response.statusCode;

    try {
      await this.prisma.apiRequest.create({
        data: {
          tokenId,
          endpoint: request.path,
          method: request.method,
          statusCode,
          responseTime,
          ipAddress: request.ip || request.connection.remoteAddress || 'unknown',
          userAgent: request.headers['user-agent'] || null,
          requestPayload: this.limitPayloadSize(request.body),
          responsePayload: error ? null : this.limitPayloadSize(responseData),
          errorMessage: error ? error.message : null,
        },
      });
    } catch (logError) {
      // Don't throw errors from logging
      console.error('Failed to log API request:', logError);
    }
  }

  /**
   * Limit payload size to avoid storing too much data
   * Admin can see all data including sensitive information
   */
  private limitPayloadSize(payload: any): any {
    if (!payload) return null;

    // Convert to JSON string to check size
    const payloadString = JSON.stringify(payload);

    // Limit to 50KB to avoid database issues with very large payloads
    if (payloadString.length > 50000) {
      return {
        truncated: true,
        originalSize: payloadString.length,
        message: 'Payload too large, showing preview only',
        preview: JSON.parse(payloadString.substring(0, 10000))
      };
    }

    return payload;
  }
}
