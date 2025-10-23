import { apiClient } from './client';
import type {
  DashboardStats,
  RequestsOverTime,
  TopEndpoint,
  ErrorLog,
  RateLimitEvent,
  RateLimitStats,
  AuditLogResponse,
} from '../types';

export const analyticsApi = {
  async getDashboard(): Promise<DashboardStats> {
    const { data } = await apiClient.get<DashboardStats>('/analytics/dashboard');
    return data;
  },

  async getRequestsOverTime(
    period: '24h' | '7d' | '30d' = '7d'
  ): Promise<RequestsOverTime[]> {
    const { data } = await apiClient.get<RequestsOverTime[]>('/analytics/requests-over-time', {
      params: { period },
    });
    return data;
  },

  async getTopEndpoints(): Promise<TopEndpoint[]> {
    const { data } = await apiClient.get<TopEndpoint[]>('/analytics/top-endpoints');
    return data;
  },

  async getErrors(): Promise<ErrorLog[]> {
    const { data } = await apiClient.get<ErrorLog[]>('/analytics/errors');
    return data;
  },

  async getRateLimitEvents(tokenId?: string, limit: number = 100): Promise<{
    total: number;
    events: RateLimitEvent[];
  }> {
    const { data } = await apiClient.get('/analytics/rate-limit-events', {
      params: { tokenId, limit },
    });
    return data;
  },

  async getRateLimitStats(): Promise<RateLimitStats> {
    const { data } = await apiClient.get<RateLimitStats>('/analytics/rate-limit-stats');
    return data;
  },

  async getAuditLog(tokenId: string): Promise<AuditLogResponse> {
    const { data } = await apiClient.get<AuditLogResponse>(`/analytics/audit-log/${tokenId}`);
    return data;
  },

  async getAllAuditLogs(params: {
    page?: number;
    limit?: number;
    tokenId?: string;
    action?: string;
  }): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { data } = await apiClient.get('/analytics/audit-logs', { params });
    return data;
  },
};
