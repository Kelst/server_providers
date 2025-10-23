import { create } from 'zustand';
import { securityApi, SuspiciousActivity, FailedAttempts, BlockedIP } from '../api/securityApi';

interface SecurityState {
  suspiciousActivity: SuspiciousActivity | null;
  failedAttempts: FailedAttempts | null;
  blockedIPs: BlockedIP[];
  isLoading: boolean;
  error: string | null;
  fetchSuspiciousActivity: (days?: number) => Promise<void>;
  fetchFailedAttempts: (days?: number) => Promise<void>;
  fetchBlockedIPs: () => Promise<void>;
  blockIP: (ipAddress: string, reason: string) => Promise<void>;
  clearError: () => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  suspiciousActivity: null,
  failedAttempts: null,
  blockedIPs: [],
  isLoading: false,
  error: null,

  fetchSuspiciousActivity: async (days = 7) => {
    set({ isLoading: true, error: null });
    try {
      const data = await securityApi.getSuspiciousActivity(days);
      set({ suspiciousActivity: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch suspicious activity',
        isLoading: false,
      });
    }
  },

  fetchFailedAttempts: async (days = 7) => {
    set({ isLoading: true, error: null });
    try {
      const data = await securityApi.getFailedAttempts(days);
      set({ failedAttempts: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch failed attempts',
        isLoading: false,
      });
    }
  },

  fetchBlockedIPs: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await securityApi.getBlockedIPs();
      set({ blockedIPs: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch blocked IPs',
        isLoading: false,
      });
    }
  },

  blockIP: async (ipAddress: string, reason: string) => {
    set({ isLoading: true, error: null });
    try {
      await securityApi.blockIP(ipAddress, reason);
      // Refresh blocked IPs after blocking
      const data = await securityApi.getBlockedIPs();
      set({ blockedIPs: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to block IP',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
