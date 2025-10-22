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

  /**
   * Sanitize payload to remove sensitive data and limit size
   */
  private sanitizePayload(payload: any): any {
    if (!payload) return null;

    // Sensitive field patterns (case-insensitive)
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apikey',
      'api_key',
      'authorization',
      'auth',
      'key',
      'private',
      'passwordHash',
      'password_hash',
      'credit_card',
      'creditCard',
      'cvv',
      'ssn',
    ];

    // Deep clone to avoid mutating original
    let sanitized = this.deepClone(payload);

    // Recursively sanitize object
    sanitized = this.sanitizeObject(sanitized, sensitiveFields);

    // Limit payload size to avoid storing too much data
    const payloadString = JSON.stringify(sanitized);
    if (payloadString.length > 10000) {
      return {
        truncated: true,
        size: payloadString.length,
        preview: JSON.parse(payloadString.substring(0, 1000))
      };
    }

    return sanitized;
  }

  /**
   * Deep clone object
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));

    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Recursively sanitize object by masking sensitive fields
   */
  private sanitizeObject(obj: any, sensitiveFields: string[]): any {
    if (obj === null || typeof obj !== 'object') return obj;

    if (obj instanceof Array) {
      return obj.map(item => this.sanitizeObject(item, sensitiveFields));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();

        // Check if key matches sensitive field
        const isSensitive = sensitiveFields.some(field =>
          lowerKey.includes(field.toLowerCase())
        );

        if (isSensitive) {
          // Mask sensitive value
          const value = obj[key];
          if (typeof value === 'string' && value.length > 0) {
            sanitized[key] = '***REDACTED***';
          } else {
            sanitized[key] = '***';
          }
        } else if (typeof obj[key] === 'object') {
          // Recursively sanitize nested objects
          sanitized[key] = this.sanitizeObject(obj[key], sensitiveFields);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  }
}
