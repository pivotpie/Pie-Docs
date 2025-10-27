/**
 * Axios configuration with interceptors for error handling and retries
 */

import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getErrorMessage, logError, isNetworkError } from '@/utils/errorHandling';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp for logging
    (config as any).metadata = { startTime: new Date() };

    return config;
  },
  (error: AxiosError) => {
    logError(error, 'Request Interceptor');
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time in development
    if (process.env.NODE_ENV === 'development') {
      const config = response.config as any;
      if (config.metadata?.startTime) {
        const duration = new Date().getTime() - config.metadata.startTime.getTime();
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url} - ${duration}ms`);
      }
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Log error
    logError(error, 'Response Interceptor');

    // Handle specific error cases
    if (error.response) {
      const { status } = error.response;

      // 401 Unauthorized - redirect to login
      if (status === 401) {
        // Clear auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // Redirect to login (avoid redirect loop)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      // 403 Forbidden - show permission error
      if (status === 403) {
        console.warn('Permission denied:', getErrorMessage(error));
        // TODO: Show toast notification
      }

      // 429 Too Many Requests - retry with delay
      if (status === 429 && !originalRequest._retry) {
        originalRequest._retry = true;

        const retryAfter = error.response.headers['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;

        await new Promise(resolve => setTimeout(resolve, delay));
        return axiosInstance(originalRequest);
      }
    }

    // Network errors - retry up to 3 times
    if (isNetworkError(error) && (!originalRequest._retryCount || originalRequest._retryCount < 3)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      const delay = Math.min(1000 * Math.pow(2, originalRequest._retryCount), 10000);
      console.log(`Network error, retrying in ${delay}ms... (attempt ${originalRequest._retryCount}/3)`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return axiosInstance(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Export configured instance as default axios
export default axiosInstance;
