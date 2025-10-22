import { Module, Global } from '@nestjs/common';
import { RateLimitService } from './services/rate-limit.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { ScopeGuard } from './guards/scope.guard';

/**
 * Global Common Module
 *
 * Provides shared services and guards across the application
 */
@Global()
@Module({
  providers: [RateLimitService, RateLimitGuard, ScopeGuard],
  exports: [RateLimitService, RateLimitGuard, ScopeGuard],
})
export class CommonModule {}
