import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { ALERT_TEMPLATES } from './constants/alert-templates';

@ApiTags('Alert Rules')
@Controller('alerts/rules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AlertRulesController {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all alert rule templates
   */
  @Get('templates')
  @ApiOperation({ summary: 'Get pre-configured alert rule templates' })
  @ApiResponse({ status: 200, description: 'Returns available templates' })
  getTemplates() {
    return {
      success: true,
      data: ALERT_TEMPLATES,
    };
  }

  /**
   * Create new alert rule
   */
  @Post()
  @ApiOperation({ summary: 'Create new alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createRule(@Body() dto: CreateAlertRuleDto, @Request() req) {
    const userId = req.user.id;

    const rule = await this.prisma.alertRule.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        metric: dto.metric,
        threshold: dto.threshold,
        comparisonOp: dto.comparisonOp,
        windowMinutes: dto.windowMinutes,
        severity: dto.severity,
        cooldownMinutes: dto.cooldownMinutes,
        notifyTelegram: dto.notifyTelegram,
        notifyEmail: dto.notifyEmail,
        notifyWebhook: dto.notifyWebhook,
        webhookUrl: dto.webhookUrl,
        notifyOnRecovery: dto.notifyOnRecovery,
        isActive: dto.isActive,
      },
    });

    return {
      success: true,
      message: 'Alert rule created successfully',
      data: rule,
    };
  }

  /**
   * Get all alert rules for current user
   */
  @Get()
  @ApiOperation({ summary: 'Get all alert rules' })
  @ApiResponse({ status: 200, description: 'Returns user alert rules' })
  async getRules(@Request() req) {
    const userId = req.user.id;

    const rules = await this.prisma.alertRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { alerts: true },
        },
      },
    });

    return {
      success: true,
      data: rules,
    };
  }

  /**
   * Get single alert rule by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get alert rule by ID' })
  @ApiResponse({ status: 200, description: 'Returns alert rule' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRule(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;

    const rule = await this.prisma.alertRule.findFirst({
      where: { id, userId },
      include: {
        alerts: {
          take: 10,
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!rule) {
      return {
        success: false,
        message: 'Alert rule not found',
      };
    }

    return {
      success: true,
      data: rule,
    };
  }

  /**
   * Update alert rule
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update alert rule' })
  @ApiResponse({ status: 200, description: 'Rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRuleDto,
    @Request() req,
  ) {
    const userId = req.user.id;

    // Check ownership
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return {
        success: false,
        message: 'Alert rule not found',
      };
    }

    const updated = await this.prisma.alertRule.update({
      where: { id },
      data: dto,
    });

    return {
      success: true,
      message: 'Alert rule updated successfully',
      data: updated,
    };
  }

  /**
   * Delete alert rule
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete alert rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteRule(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;

    // Check ownership
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return {
        success: false,
        message: 'Alert rule not found',
      };
    }

    await this.prisma.alertRule.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Alert rule deleted successfully',
    };
  }

  /**
   * Toggle alert rule active status
   */
  @Post(':id/toggle')
  @ApiOperation({ summary: 'Enable or disable alert rule' })
  @ApiResponse({ status: 200, description: 'Rule toggled successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async toggleRule(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;

    // Check ownership
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return {
        success: false,
        message: 'Alert rule not found',
      };
    }

    const updated = await this.prisma.alertRule.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return {
      success: true,
      message: `Alert rule ${updated.isActive ? 'enabled' : 'disabled'}`,
      data: updated,
    };
  }

  /**
   * Test alert rule manually (trigger without waiting for cron)
   */
  @Post(':id/test')
  @ApiOperation({ summary: 'Test alert rule by triggering it manually' })
  @ApiResponse({ status: 200, description: 'Test alert sent' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async testRule(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;

    // Check ownership
    const rule = await this.prisma.alertRule.findFirst({
      where: { id, userId },
    });

    if (!rule) {
      return {
        success: false,
        message: 'Alert rule not found',
      };
    }

    // Create a test alert
    const testAlert = await this.prisma.alert.create({
      data: {
        ruleId: rule.id,
        ruleName: rule.name,
        type: rule.type,
        severity: rule.severity,
        message: `[TEST ALERT]\n\n${rule.name}\n\nThis is a test alert triggered manually.\n\nMetric: ${rule.metric}\nThreshold: ${rule.threshold}`,
        metric: rule.metric,
        currentValue: rule.threshold, // Use threshold as test value
        threshold: rule.threshold,
        metadata: {
          test: true,
          triggeredBy: userId,
        },
        channelTelegram: rule.notifyTelegram,
      },
    });

    return {
      success: true,
      message: 'Test alert created successfully',
      data: testAlert,
    };
  }
}
