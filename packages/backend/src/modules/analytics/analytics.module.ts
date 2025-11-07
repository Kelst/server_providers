import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CacheWarmingService } from './cache-warming.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, CacheWarmingService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
