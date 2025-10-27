import type { OCRError, OCRJob, OCRProcessingSettings } from '@/types/domain/OCR';

export interface OCRErrorRecoveryStrategy {
  canRecover: boolean;
  suggestedAction: 'retry' | 'manual_intervention' | 'fallback' | 'skip';
  newSettings?: Partial<OCRProcessingSettings>;
  userMessage: string;
  technicalDetails?: string;
  retryDelay?: number; // milliseconds
}

export interface OCRFallbackOption {
  type: 'manual_text_entry' | 'simplified_ocr' | 'image_optimization' | 'skip_processing';
  label: string;
  description: string;
  available: boolean;
  action: () => Promise<void> | void;
}

// Common OCR error codes and their meanings
export const OCR_ERROR_CODES = {
  // Network/Service Errors
  NETWORK_ERROR: 'Network connection failed',
  SERVICE_UNAVAILABLE: 'OCR service is temporarily unavailable',
  TIMEOUT_ERROR: 'Processing timeout exceeded',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',

  // Document/Input Errors
  INVALID_DOCUMENT_FORMAT: 'Document format not supported for OCR',
  DOCUMENT_TOO_LARGE: 'Document size exceeds processing limits',
  DOCUMENT_CORRUPTED: 'Document appears to be corrupted',
  EMPTY_DOCUMENT: 'No content detected in document',

  // OCR Processing Errors
  LOW_QUALITY_RESULT: 'OCR result quality below threshold',
  LANGUAGE_DETECTION_FAILED: 'Unable to detect document language',
  TEXT_EXTRACTION_FAILED: 'Failed to extract text from document',
  UNSUPPORTED_LANGUAGE: 'Document language not supported',

  // Configuration Errors
  INVALID_SETTINGS: 'OCR processing settings are invalid',
  MISSING_PERMISSIONS: 'Insufficient permissions for OCR processing',
  QUOTA_EXCEEDED: 'OCR processing quota exceeded',

  // Internal Errors
  PROCESSING_ERROR: 'Internal OCR processing error',
  MEMORY_ERROR: 'Insufficient memory for processing',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

export type OCRErrorCode = keyof typeof OCR_ERROR_CODES;

export function createOCRError(
  code: OCRErrorCode,
  customMessage?: string,
  details?: Record<string, unknown>,
  recoverable: boolean = true
): OCRError {
  return {
    code,
    message: customMessage || OCR_ERROR_CODES[code],
    details,
    timestamp: new Date().toISOString(),
    recoverable,
  };
}

export function analyzeOCRError(error: OCRError, job: OCRJob): OCRErrorRecoveryStrategy {
  const strategy: OCRErrorRecoveryStrategy = {
    canRecover: error.recoverable,
    suggestedAction: 'skip',
    userMessage: 'An error occurred during OCR processing.',
    retryDelay: 1000,
  };

  switch (error.code) {
    case 'NETWORK_ERROR':
    case 'TIMEOUT_ERROR':
      strategy.suggestedAction = 'retry';
      strategy.userMessage = 'Network issue detected. The system will retry automatically.';
      strategy.retryDelay = 5000;
      break;

    case 'SERVICE_UNAVAILABLE':
      strategy.suggestedAction = 'retry';
      strategy.userMessage = 'OCR service is temporarily unavailable. Retrying in a few moments.';
      strategy.retryDelay = 10000;
      break;

    case 'RATE_LIMIT_EXCEEDED':
      strategy.suggestedAction = 'retry';
      strategy.userMessage = 'Processing limit reached. Please wait before retrying.';
      strategy.retryDelay = 30000;
      break;

    case 'LOW_QUALITY_RESULT':
      strategy.suggestedAction = 'retry';
      strategy.userMessage = 'OCR quality was low. Try adjusting image preprocessing settings.';
      strategy.newSettings = {
        imagePreprocessing: {
          ...job.processingSettings.imagePreprocessing,
          enhanceContrast: true,
          denoiseImage: true,
          resolutionDPI: Math.min(job.processingSettings.imagePreprocessing.resolutionDPI + 100, 600),
        },
        qualityThreshold: Math.max(job.processingSettings.qualityThreshold - 10, 40),
      };
      break;

    case 'LANGUAGE_DETECTION_FAILED':
      strategy.suggestedAction = 'retry';
      strategy.userMessage = 'Language detection failed. Try specifying the language manually.';
      strategy.newSettings = {
        enableLanguageDetection: false,
        targetLanguages: ['ar', 'en'], // Default to both languages
      };
      break;

    case 'DOCUMENT_TOO_LARGE':
      strategy.suggestedAction = 'fallback';
      strategy.userMessage = 'Document is too large for processing. Consider using a smaller file or image optimization.';
      strategy.newSettings = {
        imagePreprocessing: {
          ...job.processingSettings.imagePreprocessing,
          resolutionDPI: Math.max(job.processingSettings.imagePreprocessing.resolutionDPI - 100, 150),
        },
      };
      break;

    case 'INVALID_DOCUMENT_FORMAT':
    case 'DOCUMENT_CORRUPTED':
      strategy.canRecover = false;
      strategy.suggestedAction = 'manual_intervention';
      strategy.userMessage = 'This document format is not compatible with OCR. Please try a different file.';
      break;

    case 'EMPTY_DOCUMENT':
      strategy.canRecover = false;
      strategy.suggestedAction = 'manual_intervention';
      strategy.userMessage = 'No text content detected in the document. Please check if the file contains readable text.';
      break;

    case 'QUOTA_EXCEEDED':
      strategy.canRecover = false;
      strategy.suggestedAction = 'manual_intervention';
      strategy.userMessage = 'OCR processing quota has been exceeded. Please try again later or contact support.';
      break;

    case 'MISSING_PERMISSIONS':
      strategy.canRecover = false;
      strategy.suggestedAction = 'manual_intervention';
      strategy.userMessage = 'Insufficient permissions for OCR processing. Please contact your administrator.';
      break;

    default:
      strategy.suggestedAction = job.retryCount < job.maxRetries ? 'retry' : 'fallback';
      strategy.userMessage = `OCR processing failed: ${error.message}`;
      strategy.retryDelay = 3000;
  }

  strategy.technicalDetails = `Error Code: ${error.code}\nTimestamp: ${error.timestamp}\nRetry Count: ${job.retryCount}/${job.maxRetries}`;

  return strategy;
}

export function generateFallbackOptions(error: OCRError, job: OCRJob): OCRFallbackOption[] {
  const options: OCRFallbackOption[] = [];

  // Manual text entry option
  options.push({
    type: 'manual_text_entry',
    label: 'Enter Text Manually',
    description: 'Type or paste the document text manually',
    available: true,
    action: () => {
      // This would trigger a manual text entry modal
      console.log('Manual text entry requested');
    },
  });

  // Simplified OCR with basic settings
  if (job.retryCount < job.maxRetries) {
    options.push({
      type: 'simplified_ocr',
      label: 'Try Basic OCR',
      description: 'Retry with simplified settings for better compatibility',
      available: true,
      action: async () => {
        // This would trigger a retry with minimal settings
        console.log('Simplified OCR retry requested');
      },
    });
  }

  // Image optimization
  if (['LOW_QUALITY_RESULT', 'TEXT_EXTRACTION_FAILED'].includes(error.code as OCRErrorCode)) {
    options.push({
      type: 'image_optimization',
      label: 'Optimize Image',
      description: 'Try automatic image enhancement before OCR',
      available: true,
      action: async () => {
        // This would trigger image optimization
        console.log('Image optimization requested');
      },
    });
  }

  // Skip processing
  options.push({
    type: 'skip_processing',
    label: 'Skip OCR',
    description: 'Continue without OCR processing',
    available: true,
    action: () => {
      console.log('Skip OCR processing');
    },
  });

  return options;
}

export function shouldAutoRetry(error: OCRError, job: OCRJob): boolean {
  // Don't auto-retry if we've reached the limit
  if (job.retryCount >= job.maxRetries) {
    return false;
  }

  // Auto-retry for transient errors
  const autoRetryableCodes: OCRErrorCode[] = [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVICE_UNAVAILABLE',
  ];

  return autoRetryableCodes.includes(error.code as OCRErrorCode);
}

export function calculateRetryDelay(retryCount: number, baseDelay: number = 1000): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

export function formatErrorForUser(error: OCRError, includeDetails: boolean = false): string {
  let message = error.message;

  if (includeDetails && error.details) {
    const details = Object.entries(error.details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    message += ` (${details})`;
  }

  return message;
}

export function isRecoverableError(error: OCRError): boolean {
  return error.recoverable && shouldAutoRetry(error, { retryCount: 0 } as OCRJob);
}

export function logOCRError(error: OCRError, job: OCRJob, context?: Record<string, unknown>): void {
  const logData = {
    errorCode: error.code,
    errorMessage: error.message,
    jobId: job.id,
    documentId: job.documentId,
    retryCount: job.retryCount,
    timestamp: error.timestamp,
    recoverable: error.recoverable,
    context,
  };

  // In a real application, this would send to a logging service
  console.error('OCR Error:', logData);

  // Could also send to analytics or error tracking service
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
    ((window as unknown as Record<string, unknown>).gtag as (...args: unknown[]) => void)('event', 'exception', {
      description: `OCR Error: ${error.code}`,
      fatal: !error.recoverable,
    });
  }
}

export class OCRErrorHandler {
  private errorHistory: Map<string, OCRError[]> = new Map();

  recordError(jobId: string, error: OCRError): void {
    if (!this.errorHistory.has(jobId)) {
      this.errorHistory.set(jobId, []);
    }
    this.errorHistory.get(jobId)!.push(error);
  }

  getErrorHistory(jobId: string): OCRError[] {
    return this.errorHistory.get(jobId) || [];
  }

  hasRepeatingErrors(jobId: string, errorCode: string, threshold: number = 3): boolean {
    const errors = this.getErrorHistory(jobId);
    const recentErrors = errors.slice(-threshold);
    return recentErrors.length >= threshold &&
           recentErrors.every(e => e.code === errorCode);
  }

  clearErrorHistory(jobId: string): void {
    this.errorHistory.delete(jobId);
  }

  getRecoveryStrategy(error: OCRError, job: OCRJob): OCRErrorRecoveryStrategy {
    this.recordError(job.id, error);

    // Check for repeating errors
    if (this.hasRepeatingErrors(job.id, error.code)) {
      const strategy = analyzeOCRError(error, job);
      strategy.suggestedAction = 'manual_intervention';
      strategy.userMessage = 'This error has occurred multiple times. Manual intervention may be required.';
      return strategy;
    }

    return analyzeOCRError(error, job);
  }
}

export const ocrErrorHandler = new OCRErrorHandler();