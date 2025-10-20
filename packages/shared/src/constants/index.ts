export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
  },
  TOKENS: {
    BASE: '/tokens',
    DETAIL: (id: string) => `/tokens/${id}`,
    STATS: (id: string) => `/tokens/${id}/stats`,
  },
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    REQUESTS_OVER_TIME: '/analytics/requests-over-time',
    TOP_ENDPOINTS: '/analytics/top-endpoints',
    ERRORS: '/analytics/errors',
  },
  SHARED: {
    EXAMPLE: '/shared/example',
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const DEFAULT_RATE_LIMIT = 100; // requests per minute
