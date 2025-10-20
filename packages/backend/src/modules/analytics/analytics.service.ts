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

    const [totalRequests, totalTokens, last24hRequests] = await Promise.all([
      this.prisma.apiRequest.count({
        where: { tokenId: { in: tokenIds } },
      }),
      this.prisma.apiToken.count({
        where: { createdBy: userId },
      }),
      this.prisma.apiRequest.count({
        where: {
          tokenId: { in: tokenIds },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const successRate = await this.getSuccessRate(tokenIds);

    return {
      totalRequests,
      totalTokens,
      last24hRequests,
      successRate,
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

    const requests = await this.prisma.apiRequest.groupBy({
      by: ['createdAt'],
      where: {
        tokenId: { in: tokenIds },
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    return requests;
  }

  async getTopEndpoints(userId: string, limit: number = 10) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);

    const endpoints = await this.prisma.apiRequest.groupBy({
      by: ['endpoint'],
      where: { tokenId: { in: tokenIds } },
      _count: true,
      orderBy: {
        _count: {
          endpoint: 'desc',
        },
      },
      take: limit,
    });

    return endpoints;
  }

  async getErrorStats(userId: string) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);

    const errors = await this.prisma.apiRequest.groupBy({
      by: ['statusCode'],
      where: {
        tokenId: { in: tokenIds },
        statusCode: { gte: 400 },
      },
      _count: true,
      orderBy: {
        _count: {
          statusCode: 'desc',
        },
      },
    });

    return errors;
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
}
