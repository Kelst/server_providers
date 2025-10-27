import { apiClient } from './client';
import { AlertType, Severity } from './alertRulesApi';

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  type: AlertType;
  severity: Severity;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  metadata?: any;
  sentAt: string;
  channelTelegram: boolean;
  channelEmail: boolean;
  channelWebhook: boolean;
  resolved: boolean;
  resolvedAt?: string;
  recoveryMessage?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  rule?: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

export interface AlertQueryParams {
  severity?: Severity;
  type?: AlertType;
  ruleId?: string;
  resolved?: boolean;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface AlertsHistoryResponse {
  alerts: Alert[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AlertStats {
  period: {
    days: number;
    from: string;
    to: string;
  };
  alerts: {
    total: number;
    resolved: number;
    unresolved: number;
    bySeverity: Record<Severity, number>;
    byType: Record<AlertType, number>;
    byDay: Record<string, number>;
  };
  rules: {
    total: number;
    active: number;
    inactive: number;
  };
  performance: {
    avgResolutionMinutes: number;
  };
}

export const alertsApi = {
  async getHistory(params: AlertQueryParams = {}): Promise<AlertsHistoryResponse> {
    const { data } = await apiClient.get('/alerts/history', { params });
    return data.data;
  },

  async getAlert(id: string): Promise<Alert> {
    const { data } = await apiClient.get(`/alerts/history/${id}`);
    return data.data;
  },

  async acknowledgeAlert(id: string): Promise<Alert> {
    const { data } = await apiClient.post(`/alerts/history/${id}/acknowledge`);
    return data.data;
  },

  async resolveAlert(id: string): Promise<Alert> {
    const { data } = await apiClient.post(`/alerts/history/${id}/resolve`);
    return data.data;
  },

  async getStats(days: number = 7): Promise<AlertStats> {
    const { data } = await apiClient.get('/alerts/stats', {
      params: { days },
    });
    return data.data;
  },

  async getRecent(limit: number = 10): Promise<Alert[]> {
    const { data } = await apiClient.get('/alerts/recent', {
      params: { limit },
    });
    return data.data;
  },
};
