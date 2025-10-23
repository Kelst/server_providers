import { apiClient } from './client';

export interface SuspiciousActivity {
  total: number;
  suspiciousIPs: Array<{
    ipAddress: string;
    totalEvents: number;
    eventTypes: string[];
    recentEvents: any[];
    threatLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  recentEvents: any[];
}

export interface FailedAttempts {
  total: number;
  failedRequests: any[];
  securityEvents: any[];
  topOffenders: Array<{
    ipAddress: string;
    attemptCount: number;
    lastAttempt: string;
    endpoints: string[];
  }>;
}

export interface BlockedIP {
  ipAddress: string;
  reason: string;
  blockedAt: string;
  blockedBy: string;
}

export const securityApi = {
  getSuspiciousActivity: async (days: number = 7): Promise<SuspiciousActivity> => {
    const response = await apiClient.get(`/security/suspicious-activity?days=${days}`);
    return response.data;
  },

  getFailedAttempts: async (days: number = 7): Promise<FailedAttempts> => {
    const response = await apiClient.get(`/security/failed-attempts?days=${days}`);
    return response.data;
  },

  blockIP: async (ipAddress: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/security/block-ip', { ipAddress, reason });
    return response.data;
  },

  getBlockedIPs: async (): Promise<BlockedIP[]> => {
    const response = await apiClient.get('/security/blocked-ips');
    return response.data;
  },
};
