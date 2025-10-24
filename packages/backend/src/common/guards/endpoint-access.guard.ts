import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/database/prisma.service';

@Injectable()
export class EndpointAccessGuard implements CanActivate {
  private readonly logger = new Logger(EndpointAccessGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.user; // Token object set by ApiTokenGuard

    // If no token in request (shouldn't happen after ApiTokenGuard), deny access
    if (!token || !token.id) {
      this.logger.warn('EndpointAccessGuard: No token found in request');
      throw new ForbiddenException('Access denied');
    }

    const requestPath = request.url;
    const requestMethod = request.method;

    // Get all endpoint rules for this token
    const endpointRules = await this.prisma.endpointRule.findMany({
      where: { tokenId: token.id },
      select: {
        endpoint: true,
        method: true,
      },
    });

    // Check if current endpoint + method is blocked
    const isBlocked = endpointRules.some((rule) => {
      // Match endpoint path with wildcard support
      const endpointMatches = this.matchEndpoint(rule.endpoint, requestPath);

      // Match method (if rule.method is null, block all methods for this endpoint)
      const methodMatches = rule.method === null || rule.method === requestMethod;

      return endpointMatches && methodMatches;
    });

    if (isBlocked) {
      this.logger.warn(
        `Endpoint access blocked: token=${token.id}, path=${requestPath}, method=${requestMethod}`,
      );
      throw new ForbiddenException(
        'Access to this endpoint is denied for your token',
      );
    }

    return true;
  }

  /**
   * Match endpoint with wildcard support
   * Examples:
   * - /api/billing/users/ASTERISK matches /api/billing/users/123
   * - /api/billing/users/ASTERISK/payments matches /api/billing/users/123/payments
   * - /api/billing/DOUBLE_ASTERISK matches any path starting with /api/billing/
   * (ASTERISK = *, DOUBLE_ASTERISK = **)
   */
  private matchEndpoint(pattern: string, path: string): boolean {
    // If no wildcards, do exact match
    if (!pattern.includes('*')) {
      return pattern === path;
    }

    // Convert wildcard pattern to regex
    // Escape special regex characters except *
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*\*/g, '___DOUBLE___') // Temporarily replace **
      .replace(/\*/g, '[^/]+') // * matches any segment (not /)
      .replace(/___DOUBLE___/g, '.*'); // ** matches anything including /

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }
}
