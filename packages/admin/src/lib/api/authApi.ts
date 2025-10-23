import { apiClient } from './client';
import type { LoginRequest, AuthResponse, User } from '../types';

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
};
