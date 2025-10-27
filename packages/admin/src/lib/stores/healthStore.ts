import { create } from 'zustand';
import { healthApi, HealthStatus } from '../api/healthApi';

interface HealthState {
  health: HealthStatus | null;
  isLoading: boolean;
  error: string | null;
  fetchHealth: () => Promise<void>;
}

export const useHealthStore = create<HealthState>((set) => ({
  health: null,
  isLoading: false,
  error: null,

  fetchHealth: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await healthApi.getEnhancedHealth();
      set({ health: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch health',
        isLoading: false,
      });
    }
  },
}));
