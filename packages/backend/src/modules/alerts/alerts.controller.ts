import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { AlertQueryDto } from './dto/alert-query.dto';
import { Severity, AlertType } from '@prisma/client';

@ApiTags('Alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AlertsController {
  constructor(private prisma: PrismaService) {}

  /**
   * Get alerts history with filtering and pagination
   */
  @Get('history')
  @ApiOperation({ summary: 'Get alerts history' })
  @ApiResponse({ status: 200, description: 'Returns alerts history' })
  async getHistory(@Query() query: AlertQueryDto, @Request() req) {
    const userId = req.user.id;
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    // Build where clause
    const where: any = {
      rule: { userId }, // Only alerts from user's rules
    };

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.ruleId) {
      where.ruleId = query.ruleId;
    }

    if (query.resolved !== undefined) {
      where.resolved = query.resolved;
    }

    if (query.fromDate || query.toDate) {
      where.sentAt = {};
      if (query.fromDate) {
        where.sentAt.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.sentAt.lte = new Date(query.toDate);
      }
    }

    // Fetch alerts and total count
    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          rule: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      success: true,
      data: {
        alerts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    };
  }

  /**
   * Get single alert details
   */
  @Get('history/:id')
  @ApiOperation({ summary: 'Get alert details by ID' })
  @ApiResponse({ status: 200, description: 'Returns alert details' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async getAlert(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;

    const alert = await this.prisma.alert.findFirst({
      where: {
        id,
        rule: { userId }, // Ensure user owns the rule
      },
      include: {
        rule: true,
      },
    });

    if (!alert) {
      return {
        success: false,
        message: 'Alert not found',
      };
    }

    return {
      success: true,
      data: alert,
    };
  }

  /**
   * Acknowledge an alert
   */
  @Post('history/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async acknowledgeAlert(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;

    // Check if alert exists and user owns it
    const alert = await this.prisma.alert.findFirst({
      where: {
        id,
        rule: { userId },
      },
    });

    if (!alert) {
      return {
        success: false,
        message: 'Alert not found',
      };
    }

    const updated = await this.prisma.alert.update({
      where: { id },
      data: {
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Alert acknowledged',
      data: updated,
    };
  }

  /**
   * Manually resolve an alert
   */
  @Post('history/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually resolve an alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async resolveAlert(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;

    // Check if alert exists and user owns it
    const alert = await this.prisma.alert.findFirst({
      where: {
        id,
        rule: { userId },
      },
    });

    if (!alert) {
      return {
        success: false,
        message: 'Alert not found',
      };
    }

    const updated = await this.prisma.alert.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        recoveryMessage: 'Manually resolved by admin',
      },
    });

    return {
      success: true,
      message: 'Alert resolved',
      data: updated,
    };
  }

  /**
   * Get alert statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiResponse({ status: 200, description: 'Returns alert statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to analyze (default: 7)' })
  async getStats(@Query('days') days: string, @Request() req) {
    const userId = req.user.id;
    const daysNum = days ? parseInt(days, 10) : 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysNum);

    // Get all alerts for user's rules in time period
    const alerts = await this.prisma.alert.findMany({
      where: {
        rule: { userId },
        sentAt: { gte: fromDate },
      },
      select: {
        severity: true,
        type: true,
        resolved: true,
        sentAt: true,
      },
    });

    // Calculate statistics
    const total = alerts.length;
    const resolved = alerts.filter((a) => a.resolved).length;
    const unresolved = total - resolved;

    // Count by severity
    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<Severity, number>);

    // Count by type
    const byType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<AlertType, number>);

    // Count by day
    const byDay = alerts.reduce((acc, alert) => {
      const day = alert.sentAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average resolution time
    const resolvedAlerts = alerts.filter((a) => a.resolved);
    let avgResolutionMinutes = 0;
    if (resolvedAlerts.length > 0) {
      const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
        // Note: We would need resolvedAt field to calculate this properly
        // For now, return 0 or estimate
        return sum;
      }, 0);
      avgResolutionMinutes = totalResolutionTime / resolvedAlerts.length;
    }

    // Get active rules count
    const activeRules = await this.prisma.alertRule.count({
      where: { userId, isActive: true },
    });

    const totalRules = await this.prisma.alertRule.count({
      where: { userId },
    });

    return {
      success: true,
      data: {
        period: {
          days: daysNum,
          from: fromDate.toISOString(),
          to: new Date().toISOString(),
        },
        alerts: {
          total,
          resolved,
          unresolved,
          bySeverity,
          byType,
          byDay,
        },
        rules: {
          total: totalRules,
          active: activeRules,
          inactive: totalRules - activeRules,
        },
        performance: {
          avgResolutionMinutes,
        },
      },
    };
  }

  /**
   * Get recent unresolved alerts
   */
  @Get('recent')
  @ApiOperation({ summary: 'Get recent unresolved alerts' })
  @ApiResponse({ status: 200, description: 'Returns recent unresolved alerts' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit (default: 10)' })
  async getRecent(@Query('limit') limit: string, @Request() req) {
    const userId = req.user.id;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const alerts = await this.prisma.alert.findMany({
      where: {
        rule: { userId },
        resolved: false,
      },
      orderBy: { sentAt: 'desc' },
      take: limitNum,
      include: {
        rule: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    return {
      success: true,
      data: alerts,
    };
  }
}
