import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { AnalyticsService } from './analytics.service';

/**
 * Cache Warming Service
 *
 * Pre-warms cache for active users to ensure fast response times.
 * Runs every 5 minutes to keep frequently accessed data in cache.
 */
@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);
  private isWarming = false;

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * Warm cache every 5 minutes
   * Pre-loads critical analytics data for active users
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async warmCache() {
    if (this.isWarming) {
      this.logger.debug('Cache warming already in progress, skipping...');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting cache warming...');

      // Get active users (users who logged in within last 24 hours)
      const activeUsers = await this.getActiveUsers();

      if (activeUsers.length === 0) {
        this.logger.log('No active users found, skipping cache warming');
        return;
      }

      this.logger.log(`Warming cache for ${activeUsers.length} active users`);

      // Warm cache for each active user
      const warmingPromises = activeUsers.map((userId) =>
        this.warmUserCache(userId),
      );

      await Promise.allSettled(warmingPromises);

      const duration = Date.now() - startTime;
      this.logger.log(`Cache warming completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Get list of active user IDs (users with active tokens)
   */
  private async getActiveUsers(): Promise<string[]> {
    try {
      // Get users who have active tokens (likely to be actively using the system)
      const activeUsers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          tokens: {
            some: {
              isActive: true,
            },
          },
        },
        select: {
          id: true,
        },
        take: 50, // Limit to 50 users to avoid overload
        orderBy: {
          updatedAt: 'desc', // Most recently updated users first
        },
      });

      return activeUsers.map((user) => user.id);
    } catch (error) {
      this.logger.error('Failed to fetch active users:', error);
      return [];
    }
  }

  /**
   * Warm cache for a specific user
   * Pre-loads frequently accessed analytics data
   */
  private async warmUserCache(userId: string): Promise<void> {
    try {
      // Warm critical analytics data in parallel
      await Promise.allSettled([
        // Dashboard stats (1min TTL) - most critical
        this.analyticsService.getDashboardStats(userId),

        // Realtime metrics (10s TTL) - refreshed frequently anyway
        this.analyticsService.getRealtimeMetrics(userId),

        // Top endpoints (2min TTL)
        this.analyticsService.getTopEndpoints(userId, 10),

        // Requests over time - last 7 days (5min TTL)
        this.analyticsService.getRequestsOverTime(userId, 7),
      ]);

      this.logger.debug(`Cache warmed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to warm cache for user ${userId}:`, error.message);
    }
  }

  /**
   * Manual cache warming trigger (for testing or manual refresh)
   */
  async triggerManualWarming(): Promise<{
    success: boolean;
    message: string;
    usersWarmed?: number;
  }> {
    if (this.isWarming) {
      return {
        success: false,
        message: 'Cache warming is already in progress',
      };
    }

    try {
      await this.warmCache();

      const activeUsers = await this.getActiveUsers();

      return {
        success: true,
        message: 'Cache warming completed successfully',
        usersWarmed: activeUsers.length,
      };
    } catch (error) {
      this.logger.error('Manual cache warming failed:', error);
      return {
        success: false,
        message: `Cache warming failed: ${error.message}`,
      };
    }
  }
}
