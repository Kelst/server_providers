/**
 * Cache Management Types
 * Types for Redis cache statistics and management
 */

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
  totalRequests: number;
  timestamp: string;
}

export interface FlushCacheResponse {
  success: boolean;
  message: string;
  patternsCleared: string[];
  keysDeleted: number;
  timestamp: string;
}

export interface InvalidateCacheResponse {
  success: boolean;
  message: string;
  pattern: string;
  keysDeleted: number;
  timestamp: string;
}

export interface CachePattern {
  name: string;
  pattern: string;
  description: string;
}

export const COMMON_CACHE_PATTERNS: CachePattern[] = [
  {
    name: 'All Analytics',
    pattern: 'analytics:*',
    description: 'Clear all analytics cache (dashboard, realtime, performance, etc.)',
  },
  {
    name: 'Dashboard Stats',
    pattern: 'analytics:dashboard:*',
    description: 'Clear dashboard statistics cache',
  },
  {
    name: 'Realtime Metrics',
    pattern: 'analytics:realtime:*',
    description: 'Clear real-time metrics cache (auto-refreshes every 10s)',
  },
  {
    name: 'Top Endpoints',
    pattern: 'analytics:top-endpoints:*',
    description: 'Clear top endpoints cache',
  },
  {
    name: 'Performance Metrics',
    pattern: 'analytics:performance:*',
    description: 'Clear performance metrics cache (P50, P95, P99)',
  },
  {
    name: 'Request Timeline',
    pattern: 'analytics:requests-time:*',
    description: 'Clear requests over time cache',
  },
  {
    name: 'All Settings',
    pattern: 'settings:*',
    description: 'Clear all admin settings cache',
  },
  {
    name: 'Token Validation',
    pattern: 'token:validation:*',
    description: 'Clear API token validation cache',
  },
];
