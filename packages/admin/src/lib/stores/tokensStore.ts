import { create } from 'zustand';
import { tokensApi } from '../api/tokensApi';
import { useNotificationsStore } from './notificationsStore';
import type { ApiToken, CreateTokenRequest, UpdateTokenRequest } from '../types';

interface TokensState {
  tokens: ApiToken[];
  selectedToken: ApiToken | null;
  isLoading: boolean;
  error: string | null;
  fetchTokens: () => Promise<void>;
  fetchToken: (id: string) => Promise<void>;
  createToken: (data: CreateTokenRequest) => Promise<ApiToken>;
  updateToken: (id: string, data: UpdateTokenRequest) => Promise<void>;
  deleteToken: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useTokensStore = create<TokensState>((set) => ({
  tokens: [],
  selectedToken: null,
  isLoading: false,
  error: null,

  fetchTokens: async () => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await tokensApi.getAll();
      set({ tokens, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch tokens',
        isLoading: false,
      });
    }
  },

  fetchToken: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = await tokensApi.getById(id);
      set({ selectedToken: token, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch token',
        isLoading: false,
      });
    }
  },

  createToken: async (data: CreateTokenRequest) => {
    set({ isLoading: true, error: null });
    try {
      const newToken = await tokensApi.create(data);
      set((state) => ({
        tokens: [...state.tokens, newToken],
        isLoading: false,
      }));

      // Add notification
      useNotificationsStore.getState().addNotification({
        type: 'success',
        title: 'Token Created',
        message: `API token "${data.projectName}" has been created successfully.`,
      });

      return newToken;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create token',
        isLoading: false,
      });
      throw error;
    }
  },

  updateToken: async (id: string, data: UpdateTokenRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedToken = await tokensApi.update(id, data);
      set((state) => ({
        tokens: state.tokens.map((t) => (t.id === id ? updatedToken : t)),
        selectedToken: state.selectedToken?.id === id ? updatedToken : state.selectedToken,
        isLoading: false,
      }));

      // Add notification
      useNotificationsStore.getState().addNotification({
        type: 'info',
        title: 'Token Updated',
        message: `API token "${updatedToken.projectName}" has been updated.`,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update token',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteToken: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const tokenToDelete = useTokensStore.getState().tokens.find(t => t.id === id);
      await tokensApi.delete(id);
      set((state) => ({
        tokens: state.tokens.filter((t) => t.id !== id),
        selectedToken: state.selectedToken?.id === id ? null : state.selectedToken,
        isLoading: false,
      }));

      // Add notification
      useNotificationsStore.getState().addNotification({
        type: 'warning',
        title: 'Token Deleted',
        message: `API token "${tokenToDelete?.projectName || 'Unknown'}" has been deleted.`,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete token',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
