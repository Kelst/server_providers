import { create } from 'zustand';
import { settingsApi, AdminSettings } from '../api/settingsApi';

interface SettingsState {
  settings: AdminSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<AdminSettings>) => Promise<void>;
  testTelegram: () => Promise<{ success: boolean; message: string }>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await settingsApi.getSettings();
      set({ settings: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch settings',
        isLoading: false,
      });
    }
  },

  updateSettings: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await settingsApi.updateSettings(data);
      set({ settings: updated, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update settings',
        isLoading: false,
      });
      throw error;
    }
  },

  testTelegram: async () => {
    try {
      return await settingsApi.testTelegram();
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Connection failed',
      };
    }
  },
}));
