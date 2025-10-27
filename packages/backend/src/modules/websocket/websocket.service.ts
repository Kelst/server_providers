import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { MetricsGateway } from './websocket.gateway';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class WebSocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebSocketService.name);
  private metricsInterval: NodeJS.Timeout;
  private readonly METRICS_INTERVAL = 5000; // 5 seconds

  constructor(
    private readonly gateway: MetricsGateway,
    private readonly analyticsService: AnalyticsService,
  ) {}

  onModuleInit() {
    this.startMetricsBroadcast();
    this.logger.log('WebSocket Service initialized - starting metrics broadcast');
  }

  onModuleDestroy() {
    this.stopMetricsBroadcast();
    this.logger.log('WebSocket Service destroyed - stopped metrics broadcast');
  }

  /**
   * Start broadcasting metrics every 5 seconds
   */
  private startMetricsBroadcast() {
    this.metricsInterval = setInterval(async () => {
      try {
        const clientsCount = this.gateway.getConnectedClientsCount();

        // Only fetch and broadcast if there are connected clients
        if (clientsCount > 0) {
          // Fetch metrics for all users (system-wide metrics)
          // In production, може бути потрібно userId, але для dashboard
          // ми можемо використовувати null або system user
          const metrics = await this.analyticsService.getRealtimeMetrics(null);

          this.gateway.broadcastMetrics(metrics);

          // Log every minute (12 * 5 seconds)
          if (Date.now() % 60000 < this.METRICS_INTERVAL) {
            this.logger.debug(`Broadcasted metrics to ${clientsCount} clients`);
          }
        }
      } catch (error) {
        this.logger.error('Failed to broadcast metrics:', error.message);
      }
    }, this.METRICS_INTERVAL);
  }

  /**
   * Stop broadcasting metrics
   */
  private stopMetricsBroadcast() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Manually trigger metrics broadcast
   */
  async triggerMetricsBroadcast() {
    try {
      const metrics = await this.analyticsService.getRealtimeMetrics(null);
      this.gateway.broadcastMetrics(metrics);
      this.logger.log('Manual metrics broadcast triggered');
    } catch (error) {
      this.logger.error('Failed to trigger metrics broadcast:', error.message);
      throw error;
    }
  }

  /**
   * Send alert to all connected clients
   */
  sendAlert(alert: {
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    type: string;
    metadata?: any;
  }) {
    this.gateway.broadcastAlert({
      ...alert,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Alert sent: ${alert.type} - ${alert.severity}`);
  }

  /**
   * Send health update to all connected clients
   */
  sendHealthUpdate(health: any) {
    this.gateway.broadcastHealthUpdate(health);
  }

  /**
   * Send anomaly detection to all connected clients
   */
  sendAnomaly(anomaly: {
    type: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedEndpoints?: string[];
    metadata?: any;
  }) {
    this.gateway.broadcastAnomaly({
      ...anomaly,
      timestamp: new Date().toISOString(),
    });
    this.logger.warn(`Anomaly detected: ${anomaly.type}`);
  }
}
