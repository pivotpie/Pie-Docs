/**
 * Error handling utilities for API calls and application errors
 */

import axios, { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  statusCode?: number;
  details?: any;
  timestamp: Date;
}

/**
 * Extract user-friendly error message from API error
 */
export function getErrorMessage(error: unknown): string {
  // Axios error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;

    // Server responded with error
    if (axiosError.response) {
      const { status, data } = axiosError.response;

      // Handle specific status codes
      switch (status) {
        case 400:
          return data?.detail || data?.message || 'Invalid request. Please check your input.';
        case 401:
          return 'You are not authorized. Please log in again.';
        case 403:
          return data?.detail || 'You don\'t have permission to perform this action.';
        case 404:
          return data?.detail || 'The requested resource was not found.';
        case 409:
          return data?.detail || 'This action conflicts with existing data.';
        case 422:
          return data?.detail || 'Validation error. Please check your input.';
        case 429:
          return 'Too many requests. Please try again later.';
        case 500:
          return 'Internal server error. Please try again later.';
        case 502:
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return data?.detail || data?.message || `Request failed with status ${status}`;
      }
    }

    // Network error
    if (axiosError.request && !axiosError.response) {
      return 'Network error. Please check your internet connection.';
    }

    // Request setup error
    return axiosError.message || 'Failed to make request';
  }

  // Standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // Unknown error type
  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Create structured API error object
 */
export function createApiError(error: unknown): ApiError {
  const message = getErrorMessage(error);
  let statusCode: number | undefined;
  let details: any;

  if (axios.isAxiosError(error)) {
    statusCode = error.response?.status;
    details = error.response?.data;
  }

  return {
    message,
    statusCode,
    details,
    timestamp: new Date(),
  };
}

/**
 * Log error to console (and optionally to external service)
 */
export function logError(error: unknown, context?: string): void {
  const apiError = createApiError(error);

  console.error(`[Error${context ? ` - ${context}` : ''}]:`, {
    message: apiError.message,
    statusCode: apiError.statusCode,
    details: apiError.details,
    timestamp: apiError.timestamp,
    originalError: error,
  });

  // TODO: Send to error tracking service (e.g., Sentry)
  // Example: Sentry.captureException(error, { contexts: { custom: apiError } });
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return Boolean(error.request && !error.response);
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 401;
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 403;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 422 || error.response?.status === 400;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          throw error;
        }
      }

      // Last attempt, throw error
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Handle API error with toast notification
 * (Requires toast library like react-hot-toast or react-toastify)
 */
export function handleApiError(error: unknown, context?: string): void {
  logError(error, context);

  const message = getErrorMessage(error);

  // TODO: Show toast notification
  // Example: toast.error(message);
  console.warn('API Error:', message);
}

/**
 * Safe async function wrapper that handles errors
 */
export function safeAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: unknown) => void
): (...args: T) => Promise<R | undefined> {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      } else {
        handleApiError(error);
      }
      return undefined;
    }
  };
}

/**
 * Validate response data structure
 */
export function validateResponse<T>(
  data: unknown,
  validator: (data: any) => data is T,
  errorMessage = 'Invalid response data structure'
): T {
  if (!validator(data)) {
    throw new Error(errorMessage);
  }
  return data;
}

export default {
  getErrorMessage,
  createApiError,
  logError,
  isNetworkError,
  isAuthError,
  isPermissionError,
  isValidationError,
  retryWithBackoff,
  handleApiError,
  safeAsync,
  validateResponse,
};
