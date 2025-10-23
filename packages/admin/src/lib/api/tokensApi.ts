import { apiClient } from './client';
import type { ApiToken, CreateTokenRequest, UpdateTokenRequest, TokenStats } from '../types';

export const tokensApi = {
  async getAll(): Promise<ApiToken[]> {
    const { data } = await apiClient.get<ApiToken[]>('/tokens');
    return data;
  },

  async getById(id: string): Promise<ApiToken> {
    const { data } = await apiClient.get<ApiToken>(`/tokens/${id}`);
    return data;
  },

  async create(tokenData: CreateTokenRequest): Promise<ApiToken> {
    const { data } = await apiClient.post<ApiToken>('/tokens', tokenData);
    return data;
  },

  async update(id: string, tokenData: UpdateTokenRequest): Promise<ApiToken> {
    const { data } = await apiClient.patch<ApiToken>(`/tokens/${id}`, tokenData);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/tokens/${id}`);
  },

  async getStats(id: string): Promise<TokenStats> {
    const { data } = await apiClient.get<TokenStats>(`/tokens/${id}/stats`);
    return data;
  },
};
