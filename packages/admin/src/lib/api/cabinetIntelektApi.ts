import { apiClient } from './client';

// Types
export type ProviderPhoneType = 'MAIN' | 'SUPPORT' | 'SALES' | 'TECHNICAL' | 'OTHER';

export interface ProviderInfo {
  id: string;
  companyName: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  telegramBot?: string;
  workingHours?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostal?: string;
  addressCountry?: string;
  createdAt: string;
  updatedAt: string;
  phones: ProviderPhone[];
  emails: ProviderEmail[];
  socialMedia: ProviderSocialMedia[];
}

export interface ProviderPhone {
  id: string;
  providerId: string;
  phoneNumber: string;
  type: ProviderPhoneType;
  label?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProviderEmailType = 'GENERAL' | 'SUPPORT' | 'SALES' | 'TECHNICAL' | 'OTHER';

export interface ProviderEmail {
  id: string;
  providerId: string;
  email: string;
  type: ProviderEmailType;
  label?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProviderSocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'YOUTUBE' | 'TWITTER' | 'LINKEDIN' | 'TELEGRAM' | 'VIBER' | 'TIKTOK' | 'OTHER';

export interface ProviderSocialMedia {
  id: string;
  providerId: string;
  platform: ProviderSocialPlatform;
  url: string;
  label?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  providerId: string;
  adminId: string;
  action: string;
  changes: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  admin?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateProviderInfoRequest {
  companyName: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  telegramBot?: string;
  workingHours?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostal?: string;
  addressCountry?: string;
}

export interface UpdateProviderInfoRequest {
  companyName?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  telegramBot?: string;
  workingHours?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostal?: string;
  addressCountry?: string;
}

export interface CreatePhoneRequest {
  phoneNumber: string;
  type: ProviderPhoneType;
  label?: string;
  isPrimary?: boolean;
}

export interface UpdatePhoneRequest {
  phoneNumber?: string;
  type?: ProviderPhoneType;
  label?: string;
  isPrimary?: boolean;
}

export interface CreateEmailRequest {
  email: string;
  type: ProviderEmailType;
  label?: string;
  isPrimary?: boolean;
}

export interface UpdateEmailRequest {
  email?: string;
  type?: ProviderEmailType;
  label?: string;
  isPrimary?: boolean;
}

export interface CreateSocialMediaRequest {
  platform: ProviderSocialPlatform;
  url: string;
  label?: string;
}

export interface UpdateSocialMediaRequest {
  platform?: ProviderSocialPlatform;
  url?: string;
  label?: string;
}

export const cabinetIntelektApi = {
  // Provider Info Management
  async getInfo(): Promise<ProviderInfo> {
    const { data } = await apiClient.get<ProviderInfo>('/admin/cabinet-intelekt');
    return data;
  },

  async createInfo(infoData: CreateProviderInfoRequest): Promise<ProviderInfo> {
    const { data } = await apiClient.post<ProviderInfo>('/admin/cabinet-intelekt', infoData);
    return data;
  },

  async updateInfo(infoData: UpdateProviderInfoRequest): Promise<ProviderInfo> {
    const { data } = await apiClient.patch<ProviderInfo>('/admin/cabinet-intelekt', infoData);
    return data;
  },

  // Logo Management
  async uploadLogo(file: File): Promise<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<{ logoUrl: string }>(
      '/admin/cabinet-intelekt/logo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  async deleteLogo(): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete<{ success: boolean }>('/admin/cabinet-intelekt/logo');
    return data;
  },

  // Phone Management
  async createPhone(phoneData: CreatePhoneRequest): Promise<ProviderPhone> {
    const { data } = await apiClient.post<ProviderPhone>('/admin/cabinet-intelekt/phones', phoneData);
    return data;
  },

  async updatePhone(id: string, phoneData: UpdatePhoneRequest): Promise<ProviderPhone> {
    const { data } = await apiClient.put<ProviderPhone>(`/admin/cabinet-intelekt/phones/${id}`, phoneData);
    return data;
  },

  async deletePhone(id: string): Promise<void> {
    await apiClient.delete(`/admin/cabinet-intelekt/phones/${id}`);
  },

  // Email Management
  async createEmail(emailData: CreateEmailRequest): Promise<ProviderEmail> {
    const { data } = await apiClient.post<ProviderEmail>('/admin/cabinet-intelekt/emails', emailData);
    return data;
  },

  async updateEmail(id: string, emailData: UpdateEmailRequest): Promise<ProviderEmail> {
    const { data } = await apiClient.put<ProviderEmail>(`/admin/cabinet-intelekt/emails/${id}`, emailData);
    return data;
  },

  async deleteEmail(id: string): Promise<void> {
    await apiClient.delete(`/admin/cabinet-intelekt/emails/${id}`);
  },

  // Social Media Management
  async createSocialMedia(socialData: CreateSocialMediaRequest): Promise<ProviderSocialMedia> {
    const { data } = await apiClient.post<ProviderSocialMedia>('/admin/cabinet-intelekt/social', socialData);
    return data;
  },

  async updateSocialMedia(id: string, socialData: UpdateSocialMediaRequest): Promise<ProviderSocialMedia> {
    const { data } = await apiClient.put<ProviderSocialMedia>(`/admin/cabinet-intelekt/social/${id}`, socialData);
    return data;
  },

  async deleteSocialMedia(id: string): Promise<void> {
    await apiClient.delete(`/admin/cabinet-intelekt/social/${id}`);
  },

  // Audit Logs
  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    const params = limit ? { limit } : {};
    const { data } = await apiClient.get<AuditLog[]>('/admin/cabinet-intelekt/audit-logs', { params });
    return data;
  },
};
