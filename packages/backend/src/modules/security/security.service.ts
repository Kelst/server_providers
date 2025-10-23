import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SecurityEventType } from '@prisma/client';

@Injectable()
export class SecurityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get suspicious activity (high error rates, scanning attempts, etc.)
   */
  async getSuspiciousActivity(userId: string, days: number = 7) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get security events
    const securityEvents = await this.prisma.securityEvent.findMany({
      where: {
        tokenId: { in: tokenIds },
        createdAt: { gte: startDate },
      },
      include: {
        token: {
          select: {
            projectName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Analyze patterns
    const ipActivity = securityEvents.reduce((acc, event) => {
      if (!acc[event.ipAddress]) {
        acc[event.ipAddress] = {
          ipAddress: event.ipAddress,
          events: [],
          totalEvents: 0,
          eventTypes: new Set(),
        };
      }
      acc[event.ipAddress].events.push(event);
      acc[event.ipAddress].totalEvents++;
      acc[event.ipAddress].eventTypes.add(event.eventType);
      return acc;
    }, {} as Record<string, any>);

    // Find suspicious IPs (multiple event types or high frequency)
    const suspiciousIPs = Object.values(ipActivity)
      .filter((ip: any) => ip.totalEvents > 5 || ip.eventTypes.size > 1)
      .map((ip: any) => ({
        ipAddress: ip.ipAddress,
        totalEvents: ip.totalEvents,
        eventTypes: Array.from(ip.eventTypes),
        recentEvents: ip.events.slice(0, 5),
        threatLevel: ip.totalEvents > 20 ? 'HIGH' : ip.totalEvents > 10 ? 'MEDIUM' : 'LOW',
      }))
      .sort((a, b) => b.totalEvents - a.totalEvents);

    return {
      total: securityEvents.length,
      suspiciousIPs,
      recentEvents: securityEvents.slice(0, 20),
    };
  }

  /**
   * Get failed authentication attempts
   */
  async getFailedAttempts(userId: string, days: number = 7) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const tokenIds = tokens.map((t) => t.id);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get 401/403 errors from API requests
    const failedAttempts = await this.prisma.apiRequest.findMany({
      where: {
        tokenId: { in: tokenIds },
        createdAt: { gte: startDate },
        statusCode: { in: [401, 403] },
      },
      select: {
        id: true,
        tokenId: true,
        endpoint: true,
        method: true,
        statusCode: true,
        ipAddress: true,
        userAgent: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get security events for failed auth
    const securityEvents = await this.prisma.securityEvent.findMany({
      where: {
        tokenId: { in: tokenIds },
        eventType: SecurityEventType.FAILED_AUTH,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Group by IP
    const ipGroups = failedAttempts.reduce((acc, attempt) => {
      if (!acc[attempt.ipAddress]) {
        acc[attempt.ipAddress] = [];
      }
      acc[attempt.ipAddress].push(attempt);
      return acc;
    }, {} as Record<string, typeof failedAttempts>);

    const topOffenders = Object.entries(ipGroups)
      .map(([ip, attempts]) => ({
        ipAddress: ip,
        attemptCount: attempts.length,
        lastAttempt: attempts[0].createdAt,
        endpoints: [...new Set(attempts.map(a => a.endpoint))],
      }))
      .sort((a, b) => b.attemptCount - a.attemptCount)
      .slice(0, 10);

    return {
      total: failedAttempts.length + securityEvents.length,
      failedRequests: failedAttempts,
      securityEvents,
      topOffenders,
    };
  }

  /**
   * Block IP address at system level
   */
  async blockIP(ipAddress: string, reason: string, userId: string) {
    // Create security event
    await this.prisma.securityEvent.create({
      data: {
        eventType: SecurityEventType.BLOCKED_IP,
        ipAddress,
        details: {
          reason,
          blockedBy: userId,
          blockedAt: new Date().toISOString(),
        },
      },
    });

    // In real implementation, this would update firewall rules or rate limiting config
    // For now, we just log the event

    return {
      success: true,
      ipAddress,
      message: `IP ${ipAddress} has been blocked`,
    };
  }

  /**
   * Get all blocked IPs
   */
  async getBlockedIPs(userId: string) {
    const blockedEvents = await this.prisma.securityEvent.findMany({
      where: {
        eventType: SecurityEventType.BLOCKED_IP,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return blockedEvents.map(event => ({
      ipAddress: event.ipAddress,
      reason: (event.details as any)?.reason,
      blockedAt: event.createdAt,
      blockedBy: (event.details as any)?.blockedBy,
    }));
  }

  /**
   * Log security event
   */
  async logSecurityEvent(data: {
    tokenId?: string;
    eventType: SecurityEventType;
    ipAddress: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    details?: any;
    userAgent?: string;
  }) {
    return this.prisma.securityEvent.create({
      data,
    });
  }
}
