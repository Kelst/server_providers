import { create } from 'zustand';
import { analyticsApi } from '../api/analyticsApi';
import { connectSocket, disconnectSocket } from '../socket/socket';

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

export const useRealtimeStore = create<RealtimeState>((set) => ({
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
    const socket = connectSocket();

    // Listen to metrics events from WebSocket
    socket.on('metrics', (data: RealtimeMetrics) => {
      set({ metrics: data, isLoading: false, error: null });
    });

    // Listen to alerts
    socket.on('alert', (alert: any) => {
      console.log('[Alert]', alert);
      // Можна додати окремий state для alerts або показати toast
    });

    // Listen to health updates
    socket.on('health', (health: any) => {
      console.log('[Health Update]', health);
      // Можна додати окремий state для health
    });

    // Listen to anomalies
    socket.on('anomaly', (anomaly: any) => {
      console.log('[Anomaly]', anomaly);
      // Можна додати окремий state для anomalies
    });

    // Handle connection errors
    socket.on('connect_error', (error: Error) => {
      set({ error: `Connection error: ${error.message}`, isLoading: false });
    });

    set({ isAutoRefresh: true, isLoading: false });
  },

  stopAutoRefresh: () => {
    disconnectSocket();
    set({ isAutoRefresh: false });
  },

  clearError: () => set({ error: null }),
}));
