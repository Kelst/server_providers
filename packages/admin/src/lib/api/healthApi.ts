import { apiClient } from './client';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    postgres: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency?: number;
      error?: string;
      connections?: {
        active: number;
        idle: number;
        total: number;
      };
      database?: {
        size: string;
        tables: number;
      };
    };
    redis: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency?: number;
      error?: string;
      memory?: {
        used: string;
        peak: string;
        fragmentation: number;
      };
      clients?: {
        connected: number;
        blocked: number;
      };
      stats?: {
        totalKeys: number;
        opsPerSec: number;
      };
    };
    abills: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      details?: string;
      error?: string;
    };
  };
  system?: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
      free: number;
    };
    cpu: {
      usage: number;
      cores: number;
      loadAverage: number[];
      model: string;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      percentage: number;
      path: string;
    };
    network?: {
      interfaces: Array<{
        name: string;
        ip4: string;
        speed: number;
      }>;
    };
    process: {
      pid: number;
      version: string;
      platform: string;
    };
    version: string;
    platform: string;
  };
  application?: {
    eventLoop: {
      lag: number;
    };
    http: {
      activeConnections: number;
    };
  };
}

export const healthApi = {
  async getHealth(): Promise<HealthStatus> {
    const { data } = await apiClient.get('/health');
    return data;
  },

  async getEnhancedHealth(): Promise<HealthStatus> {
    const { data } = await apiClient.get('/health/enhanced');
    return data;
  },

  async getLiveness() {
    const { data } = await apiClient.get('/health/live');
    return data;
  },

  async getReadiness() {
    const { data } = await apiClient.get('/health/ready');
    return data;
  },
};
