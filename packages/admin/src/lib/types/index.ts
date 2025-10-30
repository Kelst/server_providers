// User & Auth types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// API Token types
export enum ApiScope {
  BILLING = 'billing',
  USERSIDE = 'userside',
  ANALYTICS = 'analytics',
  SHARED = 'shared',
}

export interface ApiToken {
  id: string;
  token: string;
  projectName: string;
  description?: string;
  scopes: ApiScope[];
  rateLimit: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTokenRequest {
  projectName: string;
  description?: string;
  scopes?: ApiScope[];
  rateLimit?: number;
  expiresAt?: string;
}

export interface UpdateTokenRequest {
  projectName?: string;
  description?: string;
  scopes?: ApiScope[];
  rateLimit?: number;
  isActive?: boolean;
  expiresAt?: string;
}

export interface TokenStats {
  totalRequests: number;
  successRate: number;
  errorRate: number;
  avgResponseTime: number;
  lastUsed?: string;
}

// Analytics types
export interface DashboardStats {
  totalRequests: number;
  activeTokens: number;
  errorRate: number;
  rateLimitEvents: number;
}

export interface RequestsOverTime {
  date: string;
  count: number;
}

export interface TopEndpoint {
  endpoint: string;
  method: string;
  count: number;
  avgResponseTime: number;
}

// Endpoints by token types
export interface EndpointStats {
  endpoint: string;
  method: string;
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  successRate: number;
  avgResponseTime: number;
}

export interface TokenEndpointStats {
  tokenId: string;
  projectName: string;
  endpoints: EndpointStats[];
}

export interface EndpointsByToken {
  period: '24h' | '7d' | '30d';
  tokens: TokenEndpointStats[];
}

export interface ErrorLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  message: string;
  timestamp: string;
}

export interface RateLimitEvent {
  id: string;
  tokenId: string;
  endpoint: string;
  method: string;
  requestsCount: number;
  limitValue: number;
  ipAddress: string;
  userAgent: string;
  blockedAt: string;
  token?: {
    projectName: string;
    rateLimit: number;
  };
}

export interface RateLimitStats {
  totalEvents: number;
  last24h: number;
  topOffenders: Array<{
    tokenId: string;
    projectName: string;
    rateLimit: number;
    hitCount: number;
  }>;
}

// Audit Log types
export interface TokenAuditLog {
  id: string;
  tokenId: string;
  adminId: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
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

export interface AuditLogResponse {
  tokenId: string;
  projectName: string;
  logs: TokenAuditLog[];
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Endpoint Rule types
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export interface EndpointRule {
  id: string;
  tokenId: string;
  endpoint: string;
  method?: HttpMethod | null;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateEndpointRuleRequest {
  endpoint: string;
  method?: HttpMethod;
  description?: string;
}
