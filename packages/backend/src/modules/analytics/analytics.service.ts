import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(userId: string) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalRequests, activeTokens, errorRequests, rateLimitEventsCount] = await Promise.all([
      this.prisma.apiRequest.count({
        where: {
          tokenId: { in: tokenIds },
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      this.prisma.apiToken.count({
        where: {
          createdBy: userId,
          isActive: true,
        },
      }),
      this.prisma.apiRequest.count({
        where: {
          tokenId: { in: tokenIds },
          createdAt: { gte: twentyFourHoursAgo },
          statusCode: { gte: 400 },
        },
      }),
      this.prisma.rateLimitEvent.count({
        where: {
          tokenId: { in: tokenIds },
          blockedAt: { gte: twentyFourHoursAgo },
        },
      }),
    ]);

    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;

    return {
      totalRequests,
      activeTokens,
      errorRate,
      rateLimitEvents: rateLimitEventsCount,
    };
  }

  async getRequestsOverTime(
    userId: string,
    days: number = 7,
    tokenId?: string,
  ) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokenId ? [tokenId] : tokens.map((t) => t.id);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all requests in the period
    const requests = await this.prisma.apiRequest.findMany({
      where: {
        tokenId: { in: tokenIds },
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date (not datetime)
    const groupedByDate = requests.reduce((acc, req) => {
      const dateStr = req.createdAt.toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = 0;
      }
      acc[dateStr]++;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format expected by frontend
    return Object.entries(groupedByDate).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getTopEndpoints(userId: string, limit: number = 10) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);

    // Get endpoint stats with method and avgResponseTime
    const endpoints = await this.prisma.apiRequest.groupBy({
      by: ['endpoint', 'method'],
      where: { tokenId: { in: tokenIds } },
      _count: true,
      _avg: {
        responseTime: true,
      },
      orderBy: {
        _count: {
          endpoint: 'desc',
        },
      },
      take: limit,
    });

    return endpoints.map(ep => ({
      endpoint: ep.endpoint,
      method: ep.method,
      count: ep._count,
      avgResponseTime: Math.round(ep._avg.responseTime || 0),
    }));
  }

  async getErrorStats(userId: string) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);

    // Get actual error request details, not just counts
    const errors = await this.prisma.apiRequest.findMany({
      where: {
        tokenId: { in: tokenIds },
        statusCode: { gte: 400 },
      },
      select: {
        id: true,
        endpoint: true,
        method: true,
        statusCode: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return errors.map(err => ({
      id: err.id,
      endpoint: err.endpoint,
      method: err.method,
      statusCode: err.statusCode,
      message: err.errorMessage || `HTTP ${err.statusCode}`,
      timestamp: err.createdAt.toISOString(),
    }));
  }

  private async getSuccessRate(tokenIds: string[]): Promise<number> {
    const [total, successful] = await Promise.all([
      this.prisma.apiRequest.count({
        where: { tokenId: { in: tokenIds } },
      }),
      this.prisma.apiRequest.count({
        where: {
          tokenId: { in: tokenIds },
          statusCode: { gte: 200, lt: 300 },
        },
      }),
    ]);

    return total > 0 ? (successful / total) * 100 : 0;
  }

  // Cron job to aggregate analytics daily
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateAnalytics() {
    console.log('🔄 Aggregating analytics...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    // Get all tokens
    const tokens = await this.prisma.apiToken.findMany();

    for (const token of tokens) {
      // Get requests for yesterday
      const requests = await this.prisma.apiRequest.findMany({
        where: {
          tokenId: token.id,
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
      });

      if (requests.length === 0) continue;

      const totalRequests = requests.length;
      const successRequests = requests.filter(
        (r) => r.statusCode >= 200 && r.statusCode < 300,
      ).length;
      const errorRequests = totalRequests - successRequests;

      const responseTimes = requests.map((r) => r.responseTime);
      const avgResponseTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const minResponseTime = Math.min(...responseTimes);
      const maxResponseTime = Math.max(...responseTimes);

      // Group by endpoint
      const endpointGroups = requests.reduce(
        (acc, req) => {
          if (!acc[req.endpoint]) {
            acc[req.endpoint] = [];
          }
          acc[req.endpoint].push(req);
          return acc;
        },
        {} as Record<string, typeof requests>,
      );

      // Create summary for each endpoint
      for (const [endpoint, endpointRequests] of Object.entries(
        endpointGroups,
      )) {
        const endpointTotal = endpointRequests.length;
        const endpointSuccess = endpointRequests.filter(
          (r) => r.statusCode >= 200 && r.statusCode < 300,
        ).length;
        const endpointErrors = endpointTotal - endpointSuccess;

        const endpointResponseTimes = endpointRequests.map(
          (r) => r.responseTime,
        );
        const endpointAvgResponseTime =
          endpointResponseTimes.reduce((a, b) => a + b, 0) /
          endpointResponseTimes.length;
        const endpointMinResponseTime = Math.min(...endpointResponseTimes);
        const endpointMaxResponseTime = Math.max(...endpointResponseTimes);

        await this.prisma.analyticsSummary.upsert({
          where: {
            date_tokenId_endpoint: {
              date: yesterday,
              tokenId: token.id,
              endpoint,
            },
          },
          update: {
            totalRequests: endpointTotal,
            successRequests: endpointSuccess,
            errorRequests: endpointErrors,
            avgResponseTime: endpointAvgResponseTime,
            minResponseTime: endpointMinResponseTime,
            maxResponseTime: endpointMaxResponseTime,
          },
          create: {
            date: yesterday,
            tokenId: token.id,
            endpoint,
            totalRequests: endpointTotal,
            successRequests: endpointSuccess,
            errorRequests: endpointErrors,
            avgResponseTime: endpointAvgResponseTime,
            minResponseTime: endpointMinResponseTime,
            maxResponseTime: endpointMaxResponseTime,
          },
        });
      }

      // Create overall summary
      await this.prisma.analyticsSummary.upsert({
        where: {
          date_tokenId_endpoint: {
            date: yesterday,
            tokenId: token.id,
            endpoint: null,
          },
        },
        update: {
          totalRequests,
          successRequests,
          errorRequests,
          avgResponseTime,
          minResponseTime,
          maxResponseTime,
        },
        create: {
          date: yesterday,
          tokenId: token.id,
          endpoint: null,
          totalRequests,
          successRequests,
          errorRequests,
          avgResponseTime,
          minResponseTime,
          maxResponseTime,
        },
      });
    }

    console.log('✅ Analytics aggregated successfully');
  }

  async logRequest(data: {
    tokenId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    ipAddress: string;
    userAgent?: string;
    requestPayload?: any;
    responsePayload?: any;
    errorMessage?: string;
  }) {
    return this.prisma.apiRequest.create({
      data,
    });
  }

  /**
   * Get rate limit events for user's tokens
   */
  async getRateLimitEvents(userId: string, tokenId?: string, limit: number = 100) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokenId ? [tokenId] : tokens.map((t) => t.id);

    const events = await this.prisma.rateLimitEvent.findMany({
      where: { tokenId: { in: tokenIds } },
      include: {
        token: {
          select: {
            projectName: true,
            rateLimit: true,
          },
        },
      },
      orderBy: { blockedAt: 'desc' },
      take: limit,
    });

    const totalEvents = await this.prisma.rateLimitEvent.count({
      where: { tokenId: { in: tokenIds } },
    });

    return {
      total: totalEvents,
      events,
    };
  }

  /**
   * Get audit log for specific token
   */
  async getTokenAuditLog(tokenId: string, userId: string) {
    // Verify token belongs to user
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        createdBy: userId,
      },
    });

    if (!token) {
      return null;
    }

    const auditLogs = await this.prisma.tokenAuditLog.findMany({
      where: { tokenId },
      include: {
        admin: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      tokenId,
      projectName: token.projectName,
      logs: auditLogs,
    };
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(userId: string) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);

    const [totalEvents, last24h, topOffenders] = await Promise.all([
      // Total rate limit events
      this.prisma.rateLimitEvent.count({
        where: { tokenId: { in: tokenIds } },
      }),

      // Events in last 24 hours
      this.prisma.rateLimitEvent.count({
        where: {
          tokenId: { in: tokenIds },
          blockedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Top tokens by rate limit hits
      this.prisma.rateLimitEvent.groupBy({
        by: ['tokenId'],
        where: { tokenId: { in: tokenIds } },
        _count: true,
        orderBy: {
          _count: {
            tokenId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Get token details for top offenders
    const topOffendersWithDetails = await Promise.all(
      topOffenders.map(async (item) => {
        const token = await this.prisma.apiToken.findUnique({
          where: { id: item.tokenId },
          select: {
            projectName: true,
            rateLimit: true,
          },
        });

        return {
          tokenId: item.tokenId,
          projectName: token?.projectName,
          rateLimit: token?.rateLimit,
          hitCount: item._count,
        };
      }),
    );

    return {
      totalEvents,
      last24h,
      topOffenders: topOffendersWithDetails,
    };
  }

  /**
   * Get all audit logs with pagination and filters
   */
  async getAllAuditLogs(
    userId: string,
    page: number = 1,
    limit: number = 25,
    tokenId?: string,
    action?: string,
  ) {
    // Get user's tokens
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);

    // Build where clause
    const where: any = {
      tokenId: tokenId ? tokenId : { in: tokenIds },
    };

    if (action) {
      where.action = action;
    }

    // Get total count
    const total = await this.prisma.tokenAuditLog.count({ where });

    // Get paginated logs
    const logs = await this.prisma.tokenAuditLog.findMany({
      where,
      include: {
        admin: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        token: {
          select: {
            projectName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
