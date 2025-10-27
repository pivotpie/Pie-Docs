// Standardized error types for consistent error handling across the application
export interface AppError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface ValidationError extends AppError {
  code: 'VALIDATION_ERROR';
  field?: string;
  value?: unknown;
}

export interface NetworkError extends AppError {
  code: 'NETWORK_ERROR';
  status?: number;
  endpoint?: string;
}

export interface BarcodeError extends AppError {
  code: 'BARCODE_ERROR';
  operation?: 'generate' | 'validate' | 'print' | 'scan';
  format?: string;
}

export interface PrintError extends AppError {
  code: 'PRINT_ERROR';
  printerId?: string;
  jobId?: string;
}

// Error factory functions for consistent error creation
export const createError = {
  validation: (message: string, field?: string, value?: unknown): ValidationError => ({
    code: 'VALIDATION_ERROR',
    message,
    field,
    value,
    timestamp: new Date().toISOString(),
  }),

  network: (message: string, status?: number, endpoint?: string): NetworkError => ({
    code: 'NETWORK_ERROR',
    message,
    status,
    endpoint,
    timestamp: new Date().toISOString(),
  }),

  barcode: (
    message: string,
    operation?: 'generate' | 'validate' | 'print' | 'scan',
    format?: string,
    details?: string
  ): BarcodeError => ({
    code: 'BARCODE_ERROR',
    message,
    operation,
    format,
    details,
    timestamp: new Date().toISOString(),
  }),

  print: (message: string, printerId?: string, jobId?: string, details?: string): PrintError => ({
    code: 'PRINT_ERROR',
    message,
    printerId,
    jobId,
    details,
    timestamp: new Date().toISOString(),
  }),

  generic: (code: string, message: string, context?: Record<string, unknown>): AppError => ({
    code,
    message,
    context,
    timestamp: new Date().toISOString(),
  }),
};

// User-friendly error messages
export const getErrorMessage = (error: AppError): string => {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return error.field
        ? `Invalid ${error.field}: ${error.message}`
        : `Validation error: ${error.message}`;

    case 'NETWORK_ERROR':
      return error.status
        ? `Network error (${error.status}): ${error.message}`
        : `Network error: ${error.message}`;

    case 'BARCODE_ERROR':
      return error.operation
        ? `Barcode ${error.operation} failed: ${error.message}`
        : `Barcode error: ${error.message}`;

    case 'PRINT_ERROR':
      return `Print error: ${error.message}`;

    default:
      return error.message || 'An unexpected error occurred';
  }
};