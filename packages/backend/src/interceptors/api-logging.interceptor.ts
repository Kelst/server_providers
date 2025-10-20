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

    // Only log requests with API token (from shared-api endpoints)
    const apiToken = request.user;
    if (!apiToken || !apiToken.id) {
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
          requestPayload: this.sanitizePayload(request.body),
          responsePayload: error ? null : this.sanitizePayload(responseData),
          errorMessage: error ? error.message : null,
        },
      });
    } catch (logError) {
      // Don't throw errors from logging
      console.error('Failed to log API request:', logError);
    }
  }

  private sanitizePayload(payload: any): any {
    if (!payload) return null;

    // Limit payload size to avoid storing too much data
    const payloadString = JSON.stringify(payload);
    if (payloadString.length > 10000) {
      return { truncated: true, size: payloadString.length };
    }

    return payload;
  }
}
