import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator';
import { ApiScope } from '../constants/scopes.constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard that checks if the API token has required scopes
 *
 * Must be used AFTER ApiTokenGuard (which validates the token and attaches it to request.user)
 *
 * @example
 * ```typescript
 * @UseGuards(ApiTokenGuard, ScopeGuard)
 * @RequireScopes(ApiScope.BILLING)
 * @Get('balance')
 * getBalance() { ... }
 * ```
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip scope check if endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredScopes = this.reflector.getAllAndOverride<ApiScope[]>(
      SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no scopes are required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiToken = request.user; // Set by ApiTokenGuard

    if (!apiToken) {
      throw new ForbiddenException('API token not found in request');
    }

    const tokenScopes: string[] = apiToken.scopes || [];

    // Check if token has ALL required scopes
    const hasAllScopes = requiredScopes.every((scope) =>
      tokenScopes.includes(scope),
    );

    if (!hasAllScopes) {
      const missing = requiredScopes.filter(
        (scope) => !tokenScopes.includes(scope),
      );
      throw new ForbiddenException(
        `Token lacks required scope(s): ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
