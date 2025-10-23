import { create } from 'zustand';
import { analyticsApi } from '../api/analyticsApi';

interface RealtimeMetrics {
  summary: {
    requestsPerSecond: number;
    errorsPerSecond: number;
    avgResponseTime: number;
    totalRequests: number;
    totalErrors: number;
    activeTokens: number;
  };
  timeline: Array<{
    timestamp: string;
    count: number;
    errors: number;
  }>;
  activeTokens: any[];
  lastUpdated: string;
}

interface RealtimeState {
  metrics: RealtimeMetrics | null;
  isLoading: boolean;
  error: string | null;
  isAutoRefresh: boolean;
  fetchMetrics: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  clearError: () => void;
}

let refreshInterval: NodeJS.Timeout | null = null;

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  metrics: null,
  isLoading: false,
  error: null,
  isAutoRefresh: false,

  fetchMetrics: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsApi.getRealtimeMetrics();
      set({ metrics: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch realtime metrics',
        isLoading: false,
      });
    }
  },

  startAutoRefresh: () => {
    const { fetchMetrics } = get();

    // Clear existing interval if any
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Fetch immediately
    fetchMetrics();

    // Set up auto-refresh every 5 seconds
    refreshInterval = setInterval(() => {
      fetchMetrics();
    }, 5000);

    set({ isAutoRefresh: true });
  },

  stopAutoRefresh: () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    set({ isAutoRefresh: false });
  },

  clearError: () => set({ error: null }),
}));
