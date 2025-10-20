// User types
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Token types
export interface ApiToken {
  id: string;
  token: string;
  projectName: string;
  description?: string;
  isActive: boolean;
  rateLimit: number;
  createdBy: string;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Request types
export interface ApiRequest {
  id: string;
  tokenId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  createdAt: Date;
}

// Analytics types
export interface AnalyticsSummary {
  id: string;
  date: Date;
  tokenId?: string;
  endpoint?: string;
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  createdAt: Date;
}

export interface DashboardStats {
  totalRequests: number;
  totalTokens: number;
  last24hRequests: number;
  successRate: number;
}

// DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateTokenDto {
  projectName: string;
  description?: string;
  rateLimit?: number;
  expiresAt?: Date;
}

export interface UpdateTokenDto {
  projectName?: string;
  description?: string;
  isActive?: boolean;
  rateLimit?: number;
  expiresAt?: Date;
}
