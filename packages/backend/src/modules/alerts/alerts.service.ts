import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { HealthService } from '../health/health.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { SettingsService } from '../settings/settings.service';
import { WebSocketService } from '../websocket/websocket.service';
import { AlertType, Severity } from '@prisma/client';

interface AlertMetrics {
  // Performance
  errorRate: number;
  avgResponseTime: number;
  requestsPerSecond: number;

  // Resources
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;

  // Services
  postgresLatency: number;
  redisLatency: number;
  databaseConnectionsPercentage: number;

  // Application
  eventLoopLag: number;
  activeConnections: number;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private prisma: PrismaService,
    private healthService: HealthService,
    private analyticsService: AnalyticsService,
    private settingsService: SettingsService,
    private websocketService: WebSocketService,
  ) {}

  /**
   * Main monitoring cron job - runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlerts() {
    try {
      this.logger.debug('Running alert checks...');

      // 1. Fetch current metrics
      const metrics = await this.collectMetrics();

      // 2. Get all active alert rules
      const rules = await this.getActiveRules();

      this.logger.debug(`Checking ${rules.length} active alert rules`);

      // 3. Evaluate each rule
      for (const rule of rules) {
        try {
          await this.evaluateRule(rule, metrics);

          // Update lastChecked timestamp
          await this.prisma.alertRule.update({
            where: { id: rule.id },
            data: { lastChecked: new Date() },
          });
        } catch (error) {
          this.logger.error(`Error evaluating rule ${rule.id}: ${error.message}`);
        }
      }

      this.logger.debug('Alert checks completed');
    } catch (error) {
      this.logger.error(`Alert check cron failed: ${error.message}`);
    }
  }

  /**
   * Collect all metrics for alert evaluation
   */
  private async collectMetrics(): Promise<AlertMetrics> {
    try {
      const [health, realtime] = await Promise.all([
        this.healthService.getEnhancedHealth(),
        this.analyticsService.getRealtimeMetrics(null),
      ]);

      return {
        // Performance
        errorRate: realtime.summary.totalRequests > 0
          ? (realtime.summary.totalErrors / realtime.summary.totalRequests) * 100
          : 0,
        avgResponseTime: realtime.summary.avgResponseTime,
        requestsPerSecond: realtime.summary.requestsPerSecond,

        // Resources
        cpuUsage: health.system?.cpu?.usage || 0,
        memoryUsage: health.system?.memory?.percentage || 0,
        diskUsage: health.system?.disk?.percentage || 0,

        // Services
        postgresLatency: health.services.postgres.latency || 0,
        redisLatency: health.services.redis.latency || 0,
        databaseConnectionsPercentage: 0, // Would need connection pool info

        // Application
        eventLoopLag: health.application?.eventLoop?.lag || 0,
        activeConnections: health.application?.http?.activeConnections || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to collect metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all active alert rules
   */
  private async getActiveRules() {
    return this.prisma.alertRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(rule: any, metrics: AlertMetrics) {
    const metricValue = metrics[rule.metric];

    if (metricValue === undefined) {
      this.logger.warn(`Metric ${rule.metric} not found for rule ${rule.id}`);
      return;
    }

    // Check if condition is met
    const isTriggered = this.checkCondition(
      metricValue,
      rule.comparisonOp,
      rule.threshold,
    );

    if (isTriggered) {
      // Check cooldown (don't spam)
      if (this.isInCooldown(rule)) {
        this.logger.debug(`Rule ${rule.id} in cooldown, skipping`);
        return;
      }

      // Trigger alert
      await this.triggerAlert(rule, metricValue, metrics);
    } else {
      // Check if we need to send recovery notification
      await this.checkRecovery(rule, metricValue);
    }
  }

  /**
   * Check if condition is met
   */
  private checkCondition(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Check if rule is in cooldown period
   */
  private isInCooldown(rule: any): boolean {
    if (!rule.lastTriggered) return false;

    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();

    return timeSinceLastTrigger < cooldownMs;
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: any, currentValue: number, metrics: AlertMetrics) {
    this.logger.log(`🔔 Alert triggered: ${rule.name} (${rule.type})`);

    try {
      // Create alert record
      const alert = await this.createAlert(rule, currentValue);

      // Send notifications
      const notificationPromises: Promise<any>[] = [];

      if (rule.notifyTelegram) {
        notificationPromises.push(
          this.sendTelegramAlert(rule.userId, alert).catch((error) => {
            this.logger.error(`Failed to send Telegram alert: ${error.message}`);
            return false;
          }),
        );
      }

      // Wait for all notifications
      const results = await Promise.allSettled(notificationPromises);

      // Update sent channels
      const channelTelegram = results[0]?.status === 'fulfilled' && results[0].value;

      await this.prisma.alert.update({
        where: { id: alert.id },
        data: {
          channelTelegram,
        },
      });

      // Real-time broadcast to dashboard
      this.websocketService.sendAlert({
        message: `Alert triggered: ${rule.name}`,
        severity: alert.severity,
        type: alert.type,
        metadata: {
          ...alert,
          timestamp: new Date().toISOString(),
        },
      });

      // Update rule last triggered time
      await this.prisma.alertRule.update({
        where: { id: rule.id },
        data: { lastTriggered: new Date() },
      });

      this.logger.log(`Alert ${alert.id} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to trigger alert: ${error.message}`);
    }
  }

  /**
   * Create alert record in database
   */
  private async createAlert(rule: any, currentValue: number) {
    const message = this.formatAlertMessage(rule, currentValue);

    return this.prisma.alert.create({
      data: {
        ruleId: rule.id,
        ruleName: rule.name,
        type: rule.type,
        severity: rule.severity,
        message,
        metric: rule.metric,
        currentValue,
        threshold: rule.threshold,
        metadata: {
          comparisonOp: rule.comparisonOp,
          windowMinutes: rule.windowMinutes,
        },
      },
    });
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(rule: any, currentValue: number): string {
    const metricLabel = this.getMetricLabel(rule.metric);
    const unit = this.getMetricUnit(rule.metric);

    return `${rule.name}\n\nMetric: ${metricLabel}\nCurrent: ${currentValue.toFixed(2)}${unit}\nThreshold: ${rule.threshold}${unit}\nWindow: Last ${rule.windowMinutes} minutes`;
  }

  /**
   * Get human-readable metric label
   */
  private getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      errorRate: 'Error Rate',
      avgResponseTime: 'Avg Response Time',
      requestsPerSecond: 'Requests/Second',
      cpuUsage: 'CPU Usage',
      memoryUsage: 'Memory Usage',
      diskUsage: 'Disk Usage',
      postgresLatency: 'PostgreSQL Latency',
      redisLatency: 'Redis Latency',
      databaseConnectionsPercentage: 'DB Connections',
      eventLoopLag: 'Event Loop Lag',
      activeConnections: 'Active Connections',
    };
    return labels[metric] || metric;
  }

  /**
   * Get metric unit
   */
  private getMetricUnit(metric: string): string {
    if (metric.includes('Rate') || metric.includes('Usage') || metric.includes('Percentage')) {
      return '%';
    }
    if (metric.includes('Time') || metric.includes('Latency') || metric.includes('Lag')) {
      return 'ms';
    }
    if (metric.includes('PerSecond')) {
      return '/s';
    }
    return '';
  }

  /**
   * Send Telegram alert notification
   */
  private async sendTelegramAlert(userId: string, alert: any): Promise<boolean> {
    const emoji = this.getSeverityEmoji(alert.severity);

    const message = `${emoji} *${alert.severity} ALERT*\n\n${alert.message}\n━━━━━━━━━━━━━━━━━━\n*Time:* ${new Date().toLocaleString()}\n\n_Rule: ${alert.ruleName}_`;

    return this.settingsService.sendTelegramMessage(userId, message);
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: Severity): string {
    const emojis: Record<Severity, string> = {
      [Severity.INFO]: 'ℹ️',
      [Severity.WARNING]: '⚠️',
      [Severity.CRITICAL]: '🔴',
      [Severity.EMERGENCY]: '🚨',
    };
    return emojis[severity] || 'ℹ️';
  }

  /**
   * Check if alert should send recovery notification
   */
  private async checkRecovery(rule: any, currentValue: number) {
    if (!rule.notifyOnRecovery) return;

    // Check if there was a recent unresolved alert for this rule
    const unresolvedAlert = await this.prisma.alert.findFirst({
      where: {
        ruleId: rule.id,
        resolved: false,
        sentAt: {
          gte: new Date(Date.now() - rule.cooldownMinutes * 60 * 1000 * 3), // Check last 3x cooldown
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    if (unresolvedAlert) {
      // Mark as resolved
      await this.prisma.alert.update({
        where: { id: unresolvedAlert.id },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          recoveryMessage: `Metric returned to normal: ${currentValue.toFixed(2)}`,
        },
      });

      // Send recovery notification
      if (rule.notifyTelegram) {
        const duration = this.formatDuration(
          unresolvedAlert.sentAt,
          new Date(),
        );

        const message = `✅ *RECOVERED*\n\n${unresolvedAlert.message}\n━━━━━━━━━━━━━━━━━━\n*Status:* Back to normal\n*Current:* ${currentValue.toFixed(2)}\n*Duration:* ${duration}\n\n_Rule: ${rule.name}_`;

        await this.settingsService.sendTelegramMessage(rule.userId, message);
      }

      this.logger.log(`Recovery notification sent for alert ${unresolvedAlert.id}`);
    }
  }

  /**
   * Format duration between two dates
   */
  private formatDuration(from: Date, to: Date): string {
    const diffMs = to.getTime() - from.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} minutes`;
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }
}
