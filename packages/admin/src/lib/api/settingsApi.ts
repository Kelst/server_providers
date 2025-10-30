import { apiClient } from './client';

export interface AdminSettings {
  id: string;
  userId: string;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  alertsEnabled: boolean;
  emailNotifications: boolean;
  apiRequestTimeout: number; // milliseconds
  databaseQueryTimeout: number; // milliseconds
  createdAt: string;
  updatedAt: string;
}

export const settingsApi = {
  async getSettings(): Promise<AdminSettings> {
    const { data } = await apiClient.get('/settings');
    return data;
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const { data } = await apiClient.patch('/settings', settings);
    return data;
  },

  async testTelegram(): Promise<{
    success: boolean;
    message: string;
    botInfo?: any;
  }> {
    const { data } = await apiClient.post('/settings/telegram/test');
    return data;
  },

  async testTimeout(delaySeconds: number = 5): Promise<{
    success: boolean;
    message: string;
    delaySeconds: number;
    timestamp: string;
  }> {
    const { data } = await apiClient.get(`/settings/timeout/test?delay=${delaySeconds}`);
    return data;
  },
};
