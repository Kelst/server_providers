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
  videos: ProviderVideo[];
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

export interface ProviderVideo {
  id: string;
  providerId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  duration?: number;
  mimeType: string;
  isActive: boolean;
  order: number;
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

export interface CreateVideoRequest {
  title: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateVideoRequest {
  title?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

// News Types
export type NewsStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  newsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface News {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string;
  };
  authorId: string;
  author?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  status: NewsStatus;
  tags: string[];
  isFeatured: boolean;
  isPinned: boolean;
  viewsCount: number;
  publishedAt?: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewsCategoryRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateNewsCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
}

export interface CreateNewsRequest {
  title: string;
  excerpt?: string;
  content: string;
  categoryId?: string;
  tags?: string[];
  isFeatured?: boolean;
  isPinned?: boolean;
  status?: NewsStatus;
  scheduledFor?: string;
}

export interface UpdateNewsRequest {
  title?: string;
  excerpt?: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
  isFeatured?: boolean;
  isPinned?: boolean;
  status?: NewsStatus;
  scheduledFor?: string;
}

export interface NewsListQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  status?: NewsStatus;
  search?: string;
  tag?: string;
  featured?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NewsListResponse {
  data: News[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Connection Request Types
export type ConnectionRequestStatus = 'PENDING' | 'CONTACTED' | 'COMPLETED' | 'REJECTED';

export interface ConnectionRequest {
  id: string;
  fullName: string;
  phoneNumber: string;
  status: ConnectionRequestStatus;
  notes?: string;
  ipAddress: string;
  userAgent?: string;
  telegramSent: boolean;
  telegramSentAt?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  processor?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface UpdateConnectionRequestRequest {
  status?: ConnectionRequestStatus;
  notes?: string;
}

export interface ConnectionRequestListQuery {
  page?: number;
  limit?: number;
  status?: ConnectionRequestStatus;
  search?: string;
  telegramSent?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ConnectionRequestListResponse {
  data: ConnectionRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Telegram Settings Types
export interface TelegramSettings {
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
  telegramNotificationsEnabled: boolean;
  // Appeals Telegram Settings
  appealsTelegramChatId?: string | null;
  appealsTelegramEnabled: boolean;
}

export interface TestTelegramSettingsRequest {
  botToken: string;
  chatId: string;
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

  // Video Management
  async getVideos(): Promise<ProviderVideo[]> {
    const { data } = await apiClient.get<ProviderVideo[]>('/admin/cabinet-intelekt/videos');
    return data;
  },

  async uploadVideo(file: File, videoData: CreateVideoRequest): Promise<ProviderVideo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', videoData.title);
    if (videoData.description) formData.append('description', videoData.description);
    if (videoData.order !== undefined) formData.append('order', videoData.order.toString());
    if (videoData.isActive !== undefined) formData.append('isActive', videoData.isActive.toString());

    const { data } = await apiClient.post<ProviderVideo>(
      '/admin/cabinet-intelekt/videos',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  async updateVideo(id: string, videoData: UpdateVideoRequest): Promise<ProviderVideo> {
    const { data } = await apiClient.patch<ProviderVideo>(`/admin/cabinet-intelekt/videos/${id}`, videoData);
    return data;
  },

  async deleteVideo(id: string): Promise<void> {
    await apiClient.delete(`/admin/cabinet-intelekt/videos/${id}`);
  },

  // ========================================
  // News Categories
  // ========================================

  async getNewsCategories(): Promise<NewsCategory[]> {
    const { data } = await apiClient.get<NewsCategory[]>('/admin/cabinet-intelekt/news-categories');
    return data;
  },

  async createNewsCategory(categoryData: CreateNewsCategoryRequest): Promise<NewsCategory> {
    const { data } = await apiClient.post<NewsCategory>('/admin/cabinet-intelekt/news-categories', categoryData);
    return data;
  },

  async updateNewsCategory(id: string, categoryData: UpdateNewsCategoryRequest): Promise<NewsCategory> {
    const { data } = await apiClient.put<NewsCategory>(`/admin/cabinet-intelekt/news-categories/${id}`, categoryData);
    return data;
  },

  async deleteNewsCategory(id: string): Promise<void> {
    await apiClient.delete(`/admin/cabinet-intelekt/news-categories/${id}`);
  },

  // ========================================
  // News
  // ========================================

  async getNewsList(params?: NewsListQuery): Promise<NewsListResponse> {
    const { data } = await apiClient.get<NewsListResponse>('/admin/cabinet-intelekt/news', { params });
    return data;
  },

  async getNewsById(id: string): Promise<News> {
    const { data } = await apiClient.get<News>(`/admin/cabinet-intelekt/news/${id}`);
    return data;
  },

  async createNews(newsData: CreateNewsRequest): Promise<News> {
    const { data } = await apiClient.post<News>('/admin/cabinet-intelekt/news', newsData);
    return data;
  },

  async updateNews(id: string, newsData: UpdateNewsRequest): Promise<News> {
    const { data } = await apiClient.put<News>(`/admin/cabinet-intelekt/news/${id}`, newsData);
    return data;
  },

  async deleteNews(id: string): Promise<void> {
    await apiClient.delete(`/admin/cabinet-intelekt/news/${id}`);
  },

  async uploadNewsCover(id: string, file: File): Promise<News> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<News>(
      `/admin/cabinet-intelekt/news/${id}/cover`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  async deleteNewsCover(id: string): Promise<void> {
    await apiClient.delete(`/admin/cabinet-intelekt/news/${id}/cover`);
  },

  // ========================================
  // Connection Requests
  // ========================================

  async getConnectionRequests(params?: ConnectionRequestListQuery): Promise<ConnectionRequestListResponse> {
    const { data } = await apiClient.get<ConnectionRequestListResponse>('/admin/cabinet-intelekt/connection-requests', { params });
    return data;
  },

  async getConnectionRequestById(id: string): Promise<ConnectionRequest> {
    const { data} = await apiClient.get<ConnectionRequest>(`/admin/cabinet-intelekt/connection-requests/${id}`);
    return data;
  },

  async updateConnectionRequest(id: string, requestData: UpdateConnectionRequestRequest): Promise<ConnectionRequest> {
    const { data } = await apiClient.put<ConnectionRequest>(`/admin/cabinet-intelekt/connection-requests/${id}`, requestData);
    return data;
  },

  async deleteConnectionRequest(id: string): Promise<void> {
    await apiClient.delete(`/admin/cabinet-intelekt/connection-requests/${id}`);
  },

  // ========================================
  // Telegram Settings
  // ========================================

  async getTelegramSettings(): Promise<TelegramSettings> {
    const { data } = await apiClient.get<TelegramSettings>('/admin/cabinet-intelekt/telegram-settings');
    return data;
  },

  async updateTelegramSettings(settings: TelegramSettings): Promise<TelegramSettings> {
    const { data } = await apiClient.put<TelegramSettings>('/admin/cabinet-intelekt/telegram-settings', settings);
    return data;
  },

  async testTelegramSettings(testData: TestTelegramSettingsRequest): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      '/admin/cabinet-intelekt/telegram-settings/test',
      testData
    );
    return data;
  },

  async testAppealsSettings(testData: TestTelegramSettingsRequest): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      '/admin/cabinet-intelekt/telegram-settings/test-appeals',
      testData
    );
    return data;
  },
};
