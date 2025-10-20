import { SetMetadata } from '@nestjs/common';
import { ApiScope } from '../constants/scopes.constants';

export const SCOPES_KEY = 'scopes';

/**
 * Decorator to require specific scopes for an endpoint
 *
 * @example
 * ```typescript
 * @RequireScopes(ApiScope.BILLING)
 * @Get('balance')
 * getBalance() { ... }
 * ```
 *
 * @example Multiple scopes (token must have ALL listed scopes)
 * ```typescript
 * @RequireScopes(ApiScope.BILLING, ApiScope.ANALYTICS)
 * @Get('reports')
 * getReports() { ... }
 * ```
 */
export const RequireScopes = (...scopes: ApiScope[]) =>
  SetMetadata(SCOPES_KEY, scopes);
