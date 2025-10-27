import { apiClient } from './client';

export enum AlertType {
  ERROR_RATE_HIGH = 'ERROR_RATE_HIGH',
  RESPONSE_TIME_SLOW = 'RESPONSE_TIME_SLOW',
  REQUESTS_SPIKE = 'REQUESTS_SPIKE',
  CPU_HIGH = 'CPU_HIGH',
  MEMORY_HIGH = 'MEMORY_HIGH',
  DISK_FULL = 'DISK_FULL',
  DATABASE_SLOW = 'DATABASE_SLOW',
  DATABASE_CONNECTIONS_HIGH = 'DATABASE_CONNECTIONS_HIGH',
  REDIS_SLOW = 'REDIS_SLOW',
  REDIS_MEMORY_HIGH = 'REDIS_MEMORY_HIGH',
  EVENT_LOOP_BLOCKED = 'EVENT_LOOP_BLOCKED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_DOWN = 'SERVICE_DOWN',
  ABILLS_UNREACHABLE = 'ABILLS_UNREACHABLE',
  ABILLS_SYNC_FAILED = 'ABILLS_SYNC_FAILED',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
  CUSTOM = 'CUSTOM',
}

export enum Severity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY',
}

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: AlertType;
  metric: string;
  threshold: number;
  comparisonOp: string;
  windowMinutes: number;
  severity: Severity;
  cooldownMinutes: number;
  notifyTelegram: boolean;
  notifyEmail: boolean;
  notifyWebhook: boolean;
  webhookUrl?: string;
  notifyOnRecovery: boolean;
  isActive: boolean;
  lastTriggered?: string;
  lastChecked?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    alerts: number;
  };
}

export interface AlertRuleTemplate {
  name: string;
  description: string;
  type: AlertType;
  metric: string;
  threshold: number;
  comparisonOp: string;
  windowMinutes: number;
  severity: Severity;
  cooldownMinutes: number;
}

export interface CreateAlertRuleDto {
  name: string;
  description?: string;
  type: AlertType;
  metric: string;
  threshold: number;
  comparisonOp: string;
  windowMinutes: number;
  severity: Severity;
  cooldownMinutes: number;
  notifyTelegram: boolean;
  notifyEmail: boolean;
  notifyWebhook: boolean;
  webhookUrl?: string;
  notifyOnRecovery: boolean;
  isActive: boolean;
}

export interface UpdateAlertRuleDto extends Partial<CreateAlertRuleDto> {}

export const alertRulesApi = {
  async getTemplates(): Promise<AlertRuleTemplate[]> {
    const { data } = await apiClient.get('/alerts/rules/templates');
    return data.data;
  },

  async createRule(dto: CreateAlertRuleDto): Promise<AlertRule> {
    const { data } = await apiClient.post('/alerts/rules', dto);
    return data.data;
  },

  async getRules(): Promise<AlertRule[]> {
    const { data } = await apiClient.get('/alerts/rules');
    return data.data;
  },

  async getRule(id: string): Promise<AlertRule> {
    const { data } = await apiClient.get(`/alerts/rules/${id}`);
    return data.data;
  },

  async updateRule(id: string, dto: UpdateAlertRuleDto): Promise<AlertRule> {
    const { data } = await apiClient.patch(`/alerts/rules/${id}`, dto);
    return data.data;
  },

  async deleteRule(id: string): Promise<void> {
    await apiClient.delete(`/alerts/rules/${id}`);
  },

  async toggleRule(id: string): Promise<AlertRule> {
    const { data } = await apiClient.post(`/alerts/rules/${id}/toggle`);
    return data.data;
  },

  async testRule(id: string): Promise<any> {
    const { data } = await apiClient.post(`/alerts/rules/${id}/test`);
    return data.data;
  },
};
