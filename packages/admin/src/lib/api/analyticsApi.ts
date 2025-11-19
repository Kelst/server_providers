import { apiClient } from './client';
import type {
  DashboardStats,
  RequestsOverTime,
  TopEndpoint,
  ErrorLog,
  RateLimitEvent,
  RateLimitStats,
  AuditLogResponse,
  EndpointsByToken,
  RequestLogsResponse,
} from '../types';
import type {
  CacheStats,
  FlushCacheResponse,
  InvalidateCacheResponse,
} from '../../types/cache';

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

  async getEndpointsByToken(
    period: '24h' | '7d' | '30d' = '24h',
    tokenId?: string
  ): Promise<EndpointsByToken> {
    const { data } = await apiClient.get<EndpointsByToken>('/analytics/endpoints-by-token', {
      params: { period, tokenId },
    });
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

  async getRealtimeMetrics(): Promise<any> {
    const { data } = await apiClient.get('/analytics/realtime');
    return data;
  },

  async getPerformanceMetrics(days: number = 7): Promise<any> {
    const { data } = await apiClient.get(`/analytics/performance?days=${days}`);
    return data;
  },

  async getAnomalies(days: number = 7): Promise<any[]> {
    const { data } = await apiClient.get(`/analytics/anomalies?days=${days}`);
    return data;
  },

  async getTrends(days: number = 7): Promise<any> {
    const { data } = await apiClient.get(`/analytics/trends?days=${days}`);
    return data;
  },

  // Cache Management
  async getCacheStats(): Promise<CacheStats> {
    const { data } = await apiClient.get<CacheStats>('/analytics/cache/stats');
    return data;
  },

  async flushCache(): Promise<FlushCacheResponse> {
    const { data } = await apiClient.post<FlushCacheResponse>('/analytics/cache/flush');
    return data;
  },

  async invalidateCachePattern(pattern: string): Promise<InvalidateCacheResponse> {
    const { data } = await apiClient.post<InvalidateCacheResponse>(
      '/analytics/cache/invalidate',
      { pattern }
    );
    return data;
  },

  // Request Logs
  async getRequestLogs(params: {
    tokenId?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    page?: number;
    limit?: number;
    period?: '1h' | '24h' | '7d' | '30d';
  }): Promise<RequestLogsResponse> {
    const { data } = await apiClient.get<RequestLogsResponse>('/analytics/requests', {
      params,
    });
    return data;
  },
};
