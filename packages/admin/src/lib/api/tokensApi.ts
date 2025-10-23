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

  async regenerate(id: string, reason?: string): Promise<ApiToken> {
    const { data } = await apiClient.post<ApiToken>(`/tokens/${id}/regenerate`, { reason });
    return data;
  },

  async getRotationHistory(id: string): Promise<any[]> {
    const { data } = await apiClient.get(`/tokens/${id}/rotation-history`);
    return data;
  },

  async createIpRule(id: string, ruleData: { type: 'WHITELIST' | 'BLACKLIST'; ipAddress: string; description?: string }): Promise<any> {
    const { data } = await apiClient.post(`/tokens/${id}/ip-rules`, ruleData);
    return data;
  },

  async getIpRules(id: string): Promise<any[]> {
    const { data } = await apiClient.get(`/tokens/${id}/ip-rules`);
    return data;
  },

  async deleteIpRule(id: string, ruleId: string): Promise<void> {
    await apiClient.delete(`/tokens/${id}/ip-rules/${ruleId}`);
  },

  async getSecurityLog(id: string): Promise<any[]> {
    const { data } = await apiClient.get(`/tokens/${id}/security-log`);
    return data;
  },
};
