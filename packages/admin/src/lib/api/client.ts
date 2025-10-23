import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from '@/hooks/use-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor - add JWT token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle different error cases
    if (!error.response) {
      // Network error
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
      });
    } else if (error.response.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      toast({
        variant: 'destructive',
        title: 'Session Expired',
        description: 'Your session has expired. Please log in again.',
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else if (error.response.status === 403) {
      // Forbidden
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to perform this action.',
      });
    } else if (error.response.status === 404) {
      // Not found
      toast({
        variant: 'destructive',
        title: 'Not Found',
        description: 'The requested resource was not found.',
      });
    } else if (error.response.status === 429) {
      // Too many requests
      toast({
        variant: 'destructive',
        title: 'Too Many Requests',
        description: 'You are making too many requests. Please slow down.',
      });
    } else if (error.response.status >= 500) {
      // Server error
      toast({
        variant: 'destructive',
        title: 'Server Error',
        description: 'An unexpected server error occurred. Please try again later.',
      });
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      toast({
        variant: 'destructive',
        title: 'Request Timeout',
        description: 'The request took too long to complete. Please try again.',
      });
    }

    return Promise.reject(error);
  }
);

// Error handling helper
export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message: string; statusCode?: number }>;
    return {
      message: axiosError.response?.data?.message || 'An error occurred',
      statusCode: axiosError.response?.status,
    };
  }
  return {
    message: 'An unexpected error occurred',
  };
};
