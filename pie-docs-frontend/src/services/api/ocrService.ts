import type {
  OCRJob,
  OCRResult,
  OCRProcessingSettings,
  OCRLanguage,
  OCRError,
  OCRPreviewData
} from '@/types/domain/OCR';

const API_BASE_URL = import.meta.env.VITE_RAG_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8001';
const OCR_ENABLED = import.meta.env.VITE_OCR_ENABLED === 'true';

export interface StartOCRRequest {
  documentId: string;
  documentUrl: string;
  settings: OCRProcessingSettings;
}

export interface StartOCRResponse {
  jobId: string;
  estimatedTime: number;
  status: 'pending' | 'processing';
}

export interface OCRStatusResponse {
  jobId: string;
  status: OCRJob['status'];
  progress: number;
  estimatedTimeRemaining?: number;
  error?: OCRError;
}

export interface OCRJobStatusResponse extends OCRStatusResponse {
  result?: OCRResult;
}

class OCRService {
  private baseUrl: string;
  private isEnabled: boolean;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/ocr`;
    this.isEnabled = OCR_ENABLED;
  }

  async isOCREnabled(): Promise<boolean> {
    return this.isEnabled;
  }

  async detectDocumentType(documentUrl: string): Promise<{ isOCRCompatible: boolean; documentType: string }> {
    if (!this.isEnabled) {
      return { isOCRCompatible: false, documentType: 'unknown' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/detect-type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentUrl }),
      });

      if (!response.ok) {
        throw new Error(`Failed to detect document type: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error detecting document type:', error);
      return { isOCRCompatible: false, documentType: 'error' };
    }
  }

  async startOCRJob(request: StartOCRRequest): Promise<StartOCRResponse> {
    if (!this.isEnabled) {
      throw new Error('OCR service is not enabled');
    }

    try {
      const response = await fetch(`${this.baseUrl}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Failed to start OCR job: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting OCR job:', error);
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<OCRJobStatusResponse> {
    if (!this.isEnabled) {
      throw new Error('OCR service is not enabled');
    }

    try {
      const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get job status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }

  async retryOCRJob(jobId: string, newSettings?: Partial<OCRProcessingSettings>): Promise<StartOCRResponse> {
    if (!this.isEnabled) {
      throw new Error('OCR service is not enabled');
    }

    try {
      const response = await fetch(`${this.baseUrl}/retry/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Failed to retry OCR job: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error retrying OCR job:', error);
      throw error;
    }
  }

  async cancelOCRJob(jobId: string): Promise<void> {
    if (!this.isEnabled) {
      throw new Error('OCR service is not enabled');
    }

    try {
      const response = await fetch(`${this.baseUrl}/cancel/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel OCR job: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error canceling OCR job:', error);
      throw error;
    }
  }

  async getOCRResult(jobId: string): Promise<OCRResult> {
    if (!this.isEnabled) {
      throw new Error('OCR service is not enabled');
    }

    try {
      const response = await fetch(`${this.baseUrl}/result/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get OCR result: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting OCR result:', error);
      throw error;
    }
  }

  async getDocumentOCRResults(documentId: string): Promise<{
    document_id: string;
    has_ocr_results: boolean;
    job_id?: string;
    status?: string;
    extractedText?: string;
    pageCount?: number;
    confidence?: { overall: number };
    language?: string;
    message?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/ocr`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get document OCR results: ${response.statusText}`);
      }

      const data = await response.json();

      // Map backend response to frontend format
      return {
        document_id: data.document_id,
        has_ocr_results: data.has_ocr,
        job_id: data.job_id,
        status: data.job_status,
        extractedText: data.extracted_text,
        pageCount: data.page_count,
        confidence: data.confidence ? { overall: data.confidence } : undefined,
        language: data.language,
        message: data.message
      };
    } catch (error) {
      console.error('Error getting document OCR results:', error);
      throw error;
    }
  }

  async getPreviewData(jobId: string): Promise<OCRPreviewData> {
    if (!this.isEnabled) {
      throw new Error('OCR service is not enabled');
    }

    try {
      const response = await fetch(`${this.baseUrl}/preview/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get OCR preview: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting OCR preview:', error);
      throw error;
    }
  }

  async detectLanguage(documentUrl: string): Promise<{ language: OCRLanguage; confidence: number }> {
    if (!this.isEnabled) {
      return { language: 'auto', confidence: 0 };
    }

    try {
      const response = await fetch(`${this.baseUrl}/detect-language`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentUrl }),
      });

      if (!response.ok) {
        throw new Error(`Failed to detect language: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error detecting language:', error);
      return { language: 'auto', confidence: 0 };
    }
  }

  async optimizeImageForOCR(imageUrl: string, settings: OCRProcessingSettings['imagePreprocessing']): Promise<string> {
    if (!this.isEnabled) {
      return imageUrl;
    }

    try {
      const response = await fetch(`${this.baseUrl}/optimize-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl, settings }),
      });

      if (!response.ok) {
        throw new Error(`Failed to optimize image: ${response.statusText}`);
      }

      const result = await response.json();
      return result.optimizedImageUrl || imageUrl;
    } catch (error) {
      console.error('Error optimizing image:', error);
      return imageUrl;
    }
  }

  async getProcessingStats(): Promise<{
    totalJobsProcessed: number;
    averageProcessingTime: number;
    successRate: number;
    currentQueueLength: number;
  }> {
    if (!this.isEnabled) {
      return {
        totalJobsProcessed: 0,
        averageProcessingTime: 0,
        successRate: 0,
        currentQueueLength: 0,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get processing stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting processing stats:', error);
      return {
        totalJobsProcessed: 0,
        averageProcessingTime: 0,
        successRate: 0,
        currentQueueLength: 0,
      };
    }
  }

  createStatusPolling(jobId: string, onUpdate: (status: OCRJobStatusResponse) => void, intervalMs = 2000): () => void {
    let isPolling = true;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (!isPolling) return;

      try {
        const status = await this.getJobStatus(jobId);
        onUpdate(status);

        if (status.status === 'completed' || status.status === 'failed') {
          isPolling = false;
          return;
        }

        if (isPolling) {
          timeoutId = setTimeout(poll, intervalMs);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        if (isPolling) {
          timeoutId = setTimeout(poll, intervalMs * 2); // Backoff on error
        }
      }
    };

    poll();

    return () => {
      isPolling = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }
}

export const ocrService = new OCRService();
export default ocrService;