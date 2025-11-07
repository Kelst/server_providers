import { Global, Module } from '@nestjs/common';
import { CacheService } from '../services/cache.service';

/**
 * Global Cache Module
 *
 * This module is marked as @Global() so CacheService is available
 * throughout the entire application without needing to import
 * CacheModule in every module that needs caching.
 *
 * Usage in any service:
 * constructor(private readonly cacheService: CacheService) {}
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
