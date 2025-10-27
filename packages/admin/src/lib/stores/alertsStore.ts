import { create } from 'zustand';
import {
  alertsApi,
  Alert,
  AlertQueryParams,
  AlertStats,
} from '../api/alertsApi';

interface AlertsState {
  alerts: Alert[];
  recentAlerts: Alert[];
  selectedAlert: Alert | null;
  stats: AlertStats | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchHistory: (params?: AlertQueryParams) => Promise<void>;
  fetchRecent: (limit?: number) => Promise<void>;
  fetchAlert: (id: string) => Promise<void>;
  fetchStats: (days?: number) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  resolveAlert: (id: string) => Promise<void>;
  setSelectedAlert: (alert: Alert | null) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  recentAlerts: [],
  selectedAlert: null,
  stats: null,
  pagination: {
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  },
  isLoading: false,
  error: null,

  fetchHistory: async (params: AlertQueryParams = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await alertsApi.getHistory(params);
      set({
        alerts: response.alerts,
        pagination: response.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch alerts history',
        isLoading: false,
      });
    }
  },

  fetchRecent: async (limit: number = 10) => {
    set({ isLoading: true, error: null });
    try {
      const recentAlerts = await alertsApi.getRecent(limit);
      set({ recentAlerts, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch recent alerts',
        isLoading: false,
      });
    }
  },

  fetchAlert: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const alert = await alertsApi.getAlert(id);
      set({ selectedAlert: alert, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch alert',
        isLoading: false,
      });
    }
  },

  fetchStats: async (days: number = 7) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await alertsApi.getStats(days);
      set({ stats, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch statistics',
        isLoading: false,
      });
    }
  },

  acknowledgeAlert: async (id: string) => {
    try {
      const updated = await alertsApi.acknowledgeAlert(id);
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updated : a)),
        recentAlerts: state.recentAlerts.map((a) => (a.id === id ? updated : a)),
        selectedAlert: state.selectedAlert?.id === id ? updated : state.selectedAlert,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to acknowledge alert',
      });
      throw error;
    }
  },

  resolveAlert: async (id: string) => {
    try {
      const updated = await alertsApi.resolveAlert(id);
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updated : a)),
        recentAlerts: state.recentAlerts.map((a) => (a.id === id ? updated : a)),
        selectedAlert: state.selectedAlert?.id === id ? updated : state.selectedAlert,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to resolve alert',
      });
      throw error;
    }
  },

  setSelectedAlert: (alert: Alert | null) => {
    set({ selectedAlert: alert });
  },
}));
