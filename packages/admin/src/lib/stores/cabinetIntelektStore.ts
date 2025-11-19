import { create } from 'zustand';
import {
  cabinetIntelektApi,
  ProviderInfo,
  AuditLog,
  CreateProviderInfoRequest,
  UpdateProviderInfoRequest,
  CreatePhoneRequest,
  UpdatePhoneRequest,
  CreateEmailRequest,
  UpdateEmailRequest,
  CreateSocialMediaRequest,
  UpdateSocialMediaRequest,
} from '../api/cabinetIntelektApi';

interface CabinetIntelektState {
  providerInfo: ProviderInfo | null;
  auditLogs: AuditLog[];
  isLoading: boolean;
  error: string | null;

  // Provider Info Actions
  fetchProviderInfo: () => Promise<void>;
  createProviderInfo: (data: CreateProviderInfoRequest) => Promise<void>;
  updateProviderInfo: (data: UpdateProviderInfoRequest) => Promise<void>;

  // Logo Actions
  uploadLogo: (file: File) => Promise<string>;
  deleteLogo: () => Promise<void>;

  // Phone Actions
  createPhone: (data: CreatePhoneRequest) => Promise<void>;
  updatePhone: (id: string, data: UpdatePhoneRequest) => Promise<void>;
  deletePhone: (id: string) => Promise<void>;

  // Email Actions
  createEmail: (data: CreateEmailRequest) => Promise<void>;
  updateEmail: (id: string, data: UpdateEmailRequest) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;

  // Social Media Actions
  createSocialMedia: (data: CreateSocialMediaRequest) => Promise<void>;
  updateSocialMedia: (id: string, data: UpdateSocialMediaRequest) => Promise<void>;
  deleteSocialMedia: (id: string) => Promise<void>;

  // Audit Logs
  fetchAuditLogs: (limit?: number) => Promise<void>;
}

export const useCabinetIntelektStore = create<CabinetIntelektState>((set, get) => ({
  providerInfo: null,
  auditLogs: [],
  isLoading: false,
  error: null,

  // Provider Info Actions
  fetchProviderInfo: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await cabinetIntelektApi.getInfo();
      set({ providerInfo: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch provider information',
        isLoading: false,
      });
    }
  },

  createProviderInfo: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const created = await cabinetIntelektApi.createInfo(data);
      set({ providerInfo: created, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create provider information',
        isLoading: false,
      });
      throw error;
    }
  },

  updateProviderInfo: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await cabinetIntelektApi.updateInfo(data);
      set({ providerInfo: updated, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update provider information',
        isLoading: false,
      });
      throw error;
    }
  },

  // Logo Actions
  uploadLogo: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cabinetIntelektApi.uploadLogo(file);
      // Refresh provider info to get updated logo
      await get().fetchProviderInfo();
      set({ isLoading: false });
      return response.logoUrl;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to upload logo',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteLogo: async () => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.deleteLogo();
      // Refresh provider info to clear logo
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete logo',
        isLoading: false,
      });
      throw error;
    }
  },

  // Phone Actions
  createPhone: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.createPhone(data);
      // Refresh provider info to get updated phones
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create phone',
        isLoading: false,
      });
      throw error;
    }
  },

  updatePhone: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.updatePhone(id, data);
      // Refresh provider info to get updated phones
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update phone',
        isLoading: false,
      });
      throw error;
    }
  },

  deletePhone: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.deletePhone(id);
      // Refresh provider info to get updated phones
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete phone',
        isLoading: false,
      });
      throw error;
    }
  },

  // Email Actions
  createEmail: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.createEmail(data);
      // Refresh provider info to get updated emails
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create email',
        isLoading: false,
      });
      throw error;
    }
  },

  updateEmail: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.updateEmail(id, data);
      // Refresh provider info to get updated emails
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update email',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteEmail: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.deleteEmail(id);
      // Refresh provider info to get updated emails
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete email',
        isLoading: false,
      });
      throw error;
    }
  },

  // Social Media Actions
  createSocialMedia: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.createSocialMedia(data);
      // Refresh provider info to get updated social media
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create social media',
        isLoading: false,
      });
      throw error;
    }
  },

  updateSocialMedia: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.updateSocialMedia(id, data);
      // Refresh provider info to get updated social media
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update social media',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteSocialMedia: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await cabinetIntelektApi.deleteSocialMedia(id);
      // Refresh provider info to get updated social media
      await get().fetchProviderInfo();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete social media',
        isLoading: false,
      });
      throw error;
    }
  },

  // Audit Logs
  fetchAuditLogs: async (limit) => {
    set({ isLoading: true, error: null });
    try {
      const data = await cabinetIntelektApi.getAuditLogs(limit);
      set({ auditLogs: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch audit logs',
        isLoading: false,
      });
    }
  },
}));
