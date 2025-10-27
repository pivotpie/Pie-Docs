import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ocrService } from '@/services/api/ocrService';
import type { OCRProcessingSettings, OCRResult } from '@/types/domain/OCR';

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_NLP_RAG_API_URL: 'http://localhost:3001/api',
  VITE_OCR_ENABLED: 'true'
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OCR Service', () => {
  const mockOCRSettings: OCRProcessingSettings = {
    enableLanguageDetection: true,
    targetLanguages: ['ar', 'en'],
    qualityThreshold: 75,
    imagePreprocessing: {
      enhanceContrast: true,
      denoiseImage: true,
      deskewImage: true,
      resolutionDPI: 300,
    },
    textProcessing: {
      preserveFormatting: true,
      extractTables: true,
      extractHeaders: true,
      mergeFragments: true,
    },
  };

  const mockDocument = {
    id: 'doc-123',
    url: 'https://example.com/document.pdf'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Service Availability', () => {
    it('should report OCR as enabled when environment flag is true', async () => {
      const isEnabled = await ocrService.isOCREnabled();
      expect(isEnabled).toBe(true);
    });
  });

  describe('Document Type Detection (AC1: Automatic OCR)', () => {
    it('should detect PDF documents as OCR compatible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isOCRCompatible: true, documentType: 'pdf' })
      });

      const result = await ocrService.detectDocumentType('https://example.com/document.pdf');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ocr/detect-type',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentUrl: 'https://example.com/document.pdf' })
        })
      );
      expect(result.isOCRCompatible).toBe(true);
      expect(result.documentType).toBe('pdf');
    });

    it('should detect image documents as OCR compatible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isOCRCompatible: true, documentType: 'image' })
      });

      const result = await ocrService.detectDocumentType('https://example.com/image.jpg');
      expect(result.isOCRCompatible).toBe(true);
      expect(result.documentType).toBe('image');
    });

    it('should handle detection errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await ocrService.detectDocumentType('https://example.com/document.pdf');
      expect(result.isOCRCompatible).toBe(false);
      expect(result.documentType).toBe('error');
    });
  });

  describe('Language Detection (AC2: Bilingual Support)', () => {
    it('should detect Arabic language with high confidence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ language: 'ar', confidence: 95 })
      });

      const result = await ocrService.detectLanguage('https://example.com/arabic-doc.pdf');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ocr/detect-language',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ documentUrl: 'https://example.com/arabic-doc.pdf' })
        })
      );
      expect(result.language).toBe('ar');
      expect(result.confidence).toBe(95);
    });

    it('should detect English language with high confidence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ language: 'en', confidence: 92 })
      });

      const result = await ocrService.detectLanguage('https://example.com/english-doc.pdf');
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(92);
    });

    it('should handle mixed Arabic-English content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ language: 'ar-en', confidence: 88 })
      });

      const result = await ocrService.detectLanguage('https://example.com/mixed-doc.pdf');
      expect(result.language).toBe('ar-en');
      expect(result.confidence).toBe(88);
    });

    it('should fallback to auto when detection fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Detection failed'));

      const result = await ocrService.detectLanguage('https://example.com/doc.pdf');
      expect(result.language).toBe('auto');
      expect(result.confidence).toBe(0);
    });
  });

  describe('OCR Job Management (AC3: Processing Status)', () => {
    it('should start OCR job successfully', async () => {
      const mockResponse = {
        jobId: 'job-456',
        estimatedTime: 25,
        status: 'processing'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await ocrService.startOCRJob({
        documentId: mockDocument.id,
        documentUrl: mockDocument.url,
        settings: mockOCRSettings
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ocr/start',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            documentId: mockDocument.id,
            documentUrl: mockDocument.url,
            settings: mockOCRSettings
          })
        })
      );
      expect(result.jobId).toBe('job-456');
      expect(result.estimatedTime).toBe(25);
      expect(result.status).toBe('processing');
    });

    it('should get job status with progress updates', async () => {
      const mockStatus = {
        jobId: 'job-456',
        status: 'processing' as const,
        progress: 65,
        estimatedTimeRemaining: 10
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus
      });

      const result = await ocrService.getJobStatus('job-456');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ocr/status/job-456',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.progress).toBe(65);
      expect(result.estimatedTimeRemaining).toBe(10);
    });
  });

  describe('Error Handling (AC7: Error Handling)', () => {
    it('should handle API errors with proper error messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'OCR service temporarily unavailable' })
      });

      await expect(ocrService.startOCRJob({
        documentId: mockDocument.id,
        documentUrl: mockDocument.url,
        settings: mockOCRSettings
      })).rejects.toThrow('Failed to start OCR job: OCR service temporarily unavailable');
    });

    it('should handle network failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(ocrService.getJobStatus('job-456')).rejects.toThrow('Network error');
    });

    it('should provide fallback when OCR is disabled', async () => {
      // Temporarily mock OCR as disabled
      vi.spyOn(ocrService, 'isOCREnabled').mockResolvedValue(false);

      await expect(ocrService.startOCRJob({
        documentId: mockDocument.id,
        documentUrl: mockDocument.url,
        settings: mockOCRSettings
      })).rejects.toThrow('OCR service is not enabled');
    });
  });

  describe('Manual Retry (AC5: Manual Retry)', () => {
    it('should retry OCR job with new settings', async () => {
      const newSettings = {
        qualityThreshold: 85,
        imagePreprocessing: {
          ...mockOCRSettings.imagePreprocessing,
          resolutionDPI: 600
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-retry-789', estimatedTime: 30, status: 'processing' })
      });

      const result = await ocrService.retryOCRJob('job-456', newSettings);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ocr/retry/job-456',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ settings: newSettings })
        })
      );
      expect(result.jobId).toBe('job-retry-789');
    });

    it('should cancel OCR job when requested', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await ocrService.cancelOCRJob('job-456');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ocr/cancel/job-456',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Results and Preview (AC6: Text Preview)', () => {
    it('should retrieve completed OCR results', async () => {
      const mockResult: OCRResult = {
        id: 'result-123',
        jobId: 'job-456',
        documentId: mockDocument.id,
        extractedText: 'Sample text from document',
        formattedText: 'Sample text from document\n\nFormatted version',
        language: 'en',
        confidence: {
          overall: 94,
          character: 96,
          word: 93,
          line: 95,
          paragraph: 92
        },
        qualityMetrics: {
          textCoverage: 85,
          averageWordLength: 5.2,
          punctuationRatio: 0.12,
          specialCharacterRatio: 0.03,
          layoutPreservation: 78,
          quality: 'high',
          recommendations: ['Consider higher resolution for better accuracy']
        },
        textBlocks: [],
        processingTime: 22,
        dateCreated: new Date().toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult
      });

      const result = await ocrService.getOCRResult('job-456');

      expect(result.extractedText).toBe('Sample text from document');
      expect(result.confidence.overall).toBe(94);
      expect(result.language).toBe('en');
    });

    it('should get preview data for text editing', async () => {
      const mockPreview = {
        originalImageUrl: 'https://example.com/preview.jpg',
        extractedText: 'Preview text',
        confidence: { overall: 90, character: 92, word: 88, line: 91, paragraph: 89 },
        highlightedBlocks: [],
        editable: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPreview
      });

      const result = await ocrService.getPreviewData('job-456');
      expect(result.editable).toBe(true);
      expect(result.extractedText).toBe('Preview text');
    });
  });

  describe('Performance Optimization (AC8: Performance)', () => {
    it('should optimize images before OCR processing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ optimizedImageUrl: 'https://example.com/optimized.jpg' })
      });

      const result = await ocrService.optimizeImageForOCR(
        'https://example.com/original.jpg',
        mockOCRSettings.imagePreprocessing
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ocr/optimize-image',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            imageUrl: 'https://example.com/original.jpg',
            settings: mockOCRSettings.imagePreprocessing
          })
        })
      );
      expect(result).toBe('https://example.com/optimized.jpg');
    });

    it('should provide processing statistics', async () => {
      const mockStats = {
        totalJobsProcessed: 150,
        averageProcessingTime: 18.5,
        successRate: 0.94,
        currentQueueLength: 3
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats
      });

      const result = await ocrService.getProcessingStats();
      expect(result.averageProcessingTime).toBe(18.5);
      expect(result.successRate).toBe(0.94);
    });
  });

  describe('Status Polling (Real-time Updates)', () => {
    it('should create status polling mechanism', async () => {
      const mockOnUpdate = vi.fn();
      let pollCount = 0;

      mockFetch.mockImplementation(async () => {
        pollCount++;
        const status = pollCount < 3 ? 'processing' : 'completed';
        const progress = pollCount < 3 ? pollCount * 30 : 100;

        return {
          ok: true,
          json: async () => ({
            jobId: 'job-456',
            status,
            progress,
            result: status === 'completed' ? { id: 'result-123' } : undefined
          })
        };
      });

      const cleanup = ocrService.createStatusPolling('job-456', mockOnUpdate, 100);

      // Wait for a few polls
      await new Promise(resolve => setTimeout(resolve, 350));
      cleanup();

      expect(mockOnUpdate).toHaveBeenCalledTimes(3);
      expect(mockOnUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'completed', progress: 100 })
      );
    });

    it('should stop polling on completion', async () => {
      const mockOnUpdate = vi.fn();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          jobId: 'job-456',
          status: 'completed',
          progress: 100,
          result: { id: 'result-123' }
        })
      });

      const cleanup = ocrService.createStatusPolling('job-456', mockOnUpdate, 100);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
      cleanup();
    });

    it('should handle polling errors with backoff', async () => {
      const mockOnUpdate = vi.fn();
      let callCount = 0;

      mockFetch.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network error');
        }
        return {
          ok: true,
          json: async () => ({
            jobId: 'job-456',
            status: 'processing',
            progress: 50
          })
        };
      });

      const cleanup = ocrService.createStatusPolling('job-456', mockOnUpdate, 100);

      await new Promise(resolve => setTimeout(resolve, 350));
      cleanup();

      // Should have made at least 2 calls (first fails, second succeeds)
      expect(callCount).toBeGreaterThanOrEqual(2);
    });
  });
});