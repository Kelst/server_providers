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

  /**
   * Get real-time metrics (last 5 minutes with auto-refresh capability)
   */
  async getRealtimeMetrics(userId: string | null) {
    // Build token filter based on userId
    const tokenFilter = userId ? { createdBy: userId } : {};

    const tokens = await this.prisma.apiToken.findMany({
      where: tokenFilter,
      select: { id: true, projectName: true, isActive: true },
    });

    const tokenIds = tokens.map((t) => t.id);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // If no tokens found, return empty metrics
    if (tokenIds.length === 0) {
      return {
        summary: {
          requestsPerSecond: 0,
          errorsPerSecond: 0,
          avgResponseTime: 0,
          totalRequests: 0,
          totalErrors: 0,
          activeTokens: 0,
        },
        timeline: [],
        activeTokens: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    const [recentRequests, recentErrors, activeRequests] = await Promise.all([
      // Requests in last 5 minutes
      this.prisma.apiRequest.findMany({
        where: {
          tokenId: { in: tokenIds },
          createdAt: { gte: fiveMinutesAgo },
        },
        select: {
          createdAt: true,
          statusCode: true,
          responseTime: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Errors in last 5 minutes
      this.prisma.apiRequest.count({
        where: {
          tokenId: { in: tokenIds },
          createdAt: { gte: fiveMinutesAgo },
          statusCode: { gte: 400 },
        },
      }),

      // Current active tokens with recent activity
      this.prisma.apiToken.findMany({
        where: {
          ...(userId ? { createdBy: userId } : {}),
          isActive: true,
          requests: {
            some: {
              createdAt: { gte: fiveMinutesAgo },
            },
          },
        },
        select: {
          id: true,
          projectName: true,
          _count: {
            select: {
              requests: true,
            },
          },
        },
      }),
    ]);

    // Calculate requests per second
    const requestsPerSecond = recentRequests.length / 300; // 300 seconds = 5 minutes

    // Calculate errors per second
    const errorsPerSecond = recentErrors / 300;

    // Calculate average response time
    const avgResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length
      : 0;

    // Group requests by minute for chart
    const requestsByMinute = recentRequests.reduce((acc, req) => {
      const minute = new Date(req.createdAt);
      minute.setSeconds(0, 0);
      const key = minute.toISOString();

      if (!acc[key]) {
        acc[key] = { timestamp: key, count: 0, errors: 0 };
      }
      acc[key].count++;
      if (req.statusCode >= 400) {
        acc[key].errors++;
      }
      return acc;
    }, {} as Record<string, { timestamp: string; count: number; errors: number }>);

    const timeline = Object.values(requestsByMinute).sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );

    return {
      summary: {
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        errorsPerSecond: Math.round(errorsPerSecond * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        totalRequests: recentRequests.length,
        totalErrors: recentErrors,
        activeTokens: activeRequests.length,
      },
      timeline,
      activeTokens: activeRequests,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get performance metrics (P95, P99, latency distribution)
   */
  async getPerformanceMetrics(userId: string, days: number = 7) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all response times for the period
    const requests = await this.prisma.apiRequest.findMany({
      where: {
        tokenId: { in: tokenIds },
        createdAt: { gte: startDate },
      },
      select: {
        responseTime: true,
        endpoint: true,
        statusCode: true,
      },
    });

    if (requests.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        avg: 0,
        distribution: [],
        slowestEndpoints: [],
      };
    }

    // Calculate percentiles
    const sortedTimes = requests.map(r => r.responseTime).sort((a, b) => a - b);

    const p50Index = Math.floor(sortedTimes.length * 0.50);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const p50 = sortedTimes[p50Index];
    const p95 = sortedTimes[p95Index];
    const p99 = sortedTimes[p99Index];
    const min = sortedTimes[0];
    const max = sortedTimes[sortedTimes.length - 1];
    const avg = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;

    // Create latency distribution buckets
    const buckets = [0, 50, 100, 200, 500, 1000, 2000, 5000];
    const distribution = buckets.map((bucket, i) => {
      const nextBucket = buckets[i + 1] || Infinity;
      const count = sortedTimes.filter(t => t >= bucket && t < nextBucket).length;
      return {
        range: nextBucket === Infinity ? `${bucket}+ms` : `${bucket}-${nextBucket}ms`,
        count,
        percentage: Math.round((count / sortedTimes.length) * 100),
      };
    });

    // Find slowest endpoints
    const endpointStats = requests.reduce((acc, req) => {
      if (!acc[req.endpoint]) {
        acc[req.endpoint] = { times: [], count: 0 };
      }
      acc[req.endpoint].times.push(req.responseTime);
      acc[req.endpoint].count++;
      return acc;
    }, {} as Record<string, { times: number[]; count: number }>);

    const slowestEndpoints = Object.entries(endpointStats)
      .map(([endpoint, data]) => ({
        endpoint,
        avgResponseTime: Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length),
        requestCount: data.count,
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);

    return {
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      min: Math.round(min),
      max: Math.round(max),
      avg: Math.round(avg),
      distribution,
      slowestEndpoints,
    };
  }

  /**
   * Detect anomalies in API usage
   */
  async getAnomalies(userId: string, days: number = 7) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true, projectName: true },
    });

    const tokenIds = tokens.map((t) => t.id);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const anomalies = [];

    // Check for error spikes
    const errorSpikes = await this.prisma.apiRequest.groupBy({
      by: ['tokenId', 'endpoint'],
      where: {
        tokenId: { in: tokenIds },
        createdAt: { gte: startDate },
        statusCode: { gte: 400 },
      },
      _count: true,
      having: {
        tokenId: {
          _count: { gt: 10 }, // More than 10 errors
        },
      },
    });

    for (const spike of errorSpikes) {
      const token = tokens.find(t => t.id === spike.tokenId);
      anomalies.push({
        type: 'ERROR_SPIKE',
        severity: spike._count > 50 ? 'HIGH' : 'MEDIUM',
        tokenId: spike.tokenId,
        tokenName: token?.projectName,
        endpoint: spike.endpoint,
        count: spike._count,
        message: `High error rate detected: ${spike._count} errors on ${spike.endpoint}`,
        detectedAt: new Date().toISOString(),
      });
    }

    // Check for unusual response times
    const slowRequests = await this.prisma.apiRequest.findMany({
      where: {
        tokenId: { in: tokenIds },
        createdAt: { gte: startDate },
        responseTime: { gt: 5000 }, // > 5 seconds
      },
      select: {
        tokenId: true,
        endpoint: true,
        responseTime: true,
        createdAt: true,
      },
      take: 20,
      orderBy: { responseTime: 'desc' },
    });

    if (slowRequests.length > 0) {
      const groupedByToken = slowRequests.reduce((acc, req) => {
        if (!acc[req.tokenId]) {
          acc[req.tokenId] = [];
        }
        acc[req.tokenId].push(req);
        return acc;
      }, {} as Record<string, typeof slowRequests>);

      for (const [tokenId, requests] of Object.entries(groupedByToken)) {
        const token = tokens.find(t => t.id === tokenId);
        anomalies.push({
          type: 'SLOW_RESPONSE',
          severity: 'MEDIUM',
          tokenId,
          tokenName: token?.projectName,
          endpoint: requests[0].endpoint,
          count: requests.length,
          message: `Slow responses detected: ${requests.length} requests > 5s`,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Check for rate limit abuse
    const rateLimitAbuse = await this.prisma.rateLimitEvent.groupBy({
      by: ['tokenId'],
      where: {
        tokenId: { in: tokenIds },
        blockedAt: { gte: startDate },
      },
      _count: true,
      having: {
        tokenId: {
          _count: { gt: 5 },
        },
      },
    });

    for (const abuse of rateLimitAbuse) {
      const token = tokens.find(t => t.id === abuse.tokenId);
      anomalies.push({
        type: 'RATE_LIMIT_ABUSE',
        severity: abuse._count > 20 ? 'HIGH' : 'MEDIUM',
        tokenId: abuse.tokenId,
        tokenName: token?.projectName,
        count: abuse._count,
        message: `Excessive rate limit hits: ${abuse._count} violations`,
        detectedAt: new Date().toISOString(),
      });
    }

    return anomalies.sort((a, b) => {
      if (a.severity === 'HIGH' && b.severity !== 'HIGH') return -1;
      if (a.severity !== 'HIGH' && b.severity === 'HIGH') return 1;
      return 0;
    });
  }

  /**
   * Get trend comparison (current period vs previous period)
   */
  async getTrends(userId: string, days: number = 7) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);

    // Current period
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - days);

    // Previous period (same length)
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    const [currentRequests, previousRequests] = await Promise.all([
      this.prisma.apiRequest.findMany({
        where: {
          tokenId: { in: tokenIds },
          createdAt: { gte: currentStart },
        },
        select: {
          statusCode: true,
          responseTime: true,
        },
      }),

      this.prisma.apiRequest.findMany({
        where: {
          tokenId: { in: tokenIds },
          createdAt: {
            gte: previousStart,
            lt: currentStart,
          },
        },
        select: {
          statusCode: true,
          responseTime: true,
        },
      }),
    ]);

    const calculateMetrics = (requests: typeof currentRequests) => {
      const total = requests.length;
      const errors = requests.filter(r => r.statusCode >= 400).length;
      const errorRate = total > 0 ? (errors / total) * 100 : 0;
      const avgResponseTime = total > 0
        ? requests.reduce((sum, r) => sum + r.responseTime, 0) / total
        : 0;

      return { total, errors, errorRate, avgResponseTime };
    };

    const current = calculateMetrics(currentRequests);
    const previous = calculateMetrics(previousRequests);

    const calculateChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      period: `Last ${days} days`,
      current: {
        totalRequests: current.total,
        errorRate: Math.round(current.errorRate * 100) / 100,
        avgResponseTime: Math.round(current.avgResponseTime),
      },
      previous: {
        totalRequests: previous.total,
        errorRate: Math.round(previous.errorRate * 100) / 100,
        avgResponseTime: Math.round(previous.avgResponseTime),
      },
      changes: {
        totalRequests: calculateChange(current.total, previous.total),
        errorRate: calculateChange(current.errorRate, previous.errorRate),
        avgResponseTime: calculateChange(current.avgResponseTime, previous.avgResponseTime),
      },
    };
  }
}
