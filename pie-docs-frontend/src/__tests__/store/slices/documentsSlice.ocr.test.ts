import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import documentsSlice, {
  startOCRJob,
  updateOCRJob,
  completeOCRJob,
  failOCRJob,
  retryOCRJob,
  removeOCRJob,
  updateOCRProcessingSettings,
  clearOCRQueue,
  startOCREditSession,
  updateOCREditSession,
  completeOCREditSession,
  removeOCREditSession,
  selectOCRJobById,
  selectOCRResultByDocumentId,
  selectOCRProcessingSettings,
  selectIsOCRProcessing,
  selectOCRActiveJobs,
} from '@/store/slices/documentsSlice';
import type { OCRJob, OCRResult, OCRError, OCREditSession } from '@/types/domain/OCR';

// Test store helper
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      documents: documentsSlice,
    },
    preloadedState: {
      documents: {
        documents: [],
        folders: [],
        folderPath: [],
        viewMode: 'grid',
        selectedDocumentIds: [],
        filters: { types: [], status: [], tags: [], authors: [] },
        sortCriteria: [{ field: 'dateModified', order: 'desc' }],
        searchQuery: '',
        currentPage: 1,
        totalCount: 0,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isBulkActionLoading: false,
        filterPanelCollapsed: false,
        availableTypes: [],
        availableTags: [],
        availableAuthors: [],
        cacheTimeout: 300000,
        uploadQueue: {
          files: [],
          isUploading: false,
          totalFiles: 0,
          completedFiles: 0,
          failedFiles: 0,
          totalBytes: 0,
          uploadedBytes: 0,
          overallProgress: 0,
          concurrentUploads: 0,
          maxConcurrentUploads: 3,
        },
        isUploadZoneVisible: false,
        ocrQueue: {
          jobs: [],
          activeJobs: 0,
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: false,
        },
        ocrResults: {},
        ocrJobs: {},
        ocrEditSessions: {},
        ocrProcessingSettings: {
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
        },
        ...initialState,
      },
    },
  });
};

const mockOCRJob: OCRJob = {
  id: 'job-123',
  documentId: 'doc-456',
  status: 'pending',
  progress: 0,
  language: 'auto',
  startTime: '2025-01-15T10:00:00Z',
  processingSettings: {
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
  },
  retryCount: 0,
  maxRetries: 3,
};

const mockOCRResult: OCRResult = {
  id: 'result-123',
  jobId: 'job-123',
  documentId: 'doc-456',
  extractedText: 'Sample extracted text',
  formattedText: 'Sample extracted text\n\nFormatted version',
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
  dateCreated: '2025-01-15T10:22:00Z'
};

describe('Documents Slice - OCR State Management', () => {
  describe('OCR Job Lifecycle (AC3: Processing Status)', () => {
    it('should start an OCR job correctly', () => {
      const store = createTestStore();

      store.dispatch(startOCRJob(mockOCRJob));

      const state = store.getState().documents;
      expect(state.ocrJobs[mockOCRJob.id]).toEqual(mockOCRJob);
      expect(state.ocrQueue.jobs).toContain(mockOCRJob);
      expect(state.ocrQueue.activeJobs).toBe(1);
      expect(state.ocrQueue.isProcessing).toBe(true);
    });

    it('should update OCR job progress and status', () => {
      const store = createTestStore({
        ocrJobs: { [mockOCRJob.id]: mockOCRJob },
        ocrQueue: {
          jobs: [mockOCRJob],
          activeJobs: 1,
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: true,
        }
      });

      store.dispatch(updateOCRJob({
        jobId: mockOCRJob.id,
        updates: {
          status: 'processing',
          progress: 50,
          estimatedTimeRemaining: 15,
          detectedLanguage: 'en'
        }
      }));

      const state = store.getState().documents;
      const updatedJob = state.ocrJobs[mockOCRJob.id];

      expect(updatedJob.status).toBe('processing');
      expect(updatedJob.progress).toBe(50);
      expect(updatedJob.estimatedTimeRemaining).toBe(15);
      expect(updatedJob.detectedLanguage).toBe('en');
    });

    it('should complete OCR job and store result', () => {
      const processingJob = { ...mockOCRJob, status: 'processing' as const };
      const store = createTestStore({
        ocrJobs: { [mockOCRJob.id]: processingJob },
        ocrQueue: {
          jobs: [processingJob],
          activeJobs: 1,
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: true,
        }
      });

      store.dispatch(completeOCRJob({
        jobId: mockOCRJob.id,
        result: mockOCRResult
      }));

      const state = store.getState().documents;
      const completedJob = state.ocrJobs[mockOCRJob.id];

      expect(completedJob.status).toBe('completed');
      expect(completedJob.progress).toBe(100);
      expect(completedJob.endTime).toBeDefined();
      expect(state.ocrResults[mockOCRResult.documentId]).toEqual(mockOCRResult);
      expect(state.ocrQueue.activeJobs).toBe(0);
      expect(state.ocrQueue.isProcessing).toBe(false);
      expect(state.ocrQueue.totalProcessingTime).toBe(mockOCRResult.processingTime);
      expect(state.ocrQueue.averageProcessingTime).toBe(mockOCRResult.processingTime);
    });

    it('should handle OCR job failures', () => {
      const processingJob = { ...mockOCRJob, status: 'processing' as const };
      const store = createTestStore({
        ocrJobs: { [mockOCRJob.id]: processingJob },
        ocrQueue: {
          jobs: [processingJob],
          activeJobs: 1,
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: true,
        }
      });

      const error: OCRError = {
        code: 'PROCESSING_FAILED',
        message: 'Unable to extract text',
        timestamp: '2025-01-15T10:30:00Z',
        recoverable: true
      };

      store.dispatch(failOCRJob({
        jobId: mockOCRJob.id,
        error
      }));

      const state = store.getState().documents;
      const failedJob = state.ocrJobs[mockOCRJob.id];

      expect(failedJob.status).toBe('failed');
      expect(failedJob.error).toEqual(error);
      expect(failedJob.endTime).toBeDefined();
      expect(state.ocrQueue.activeJobs).toBe(0);
      expect(state.ocrQueue.isProcessing).toBe(false);
    });
  });

  describe('Manual Retry Functionality (AC5)', () => {
    it('should retry OCR job with updated settings', () => {
      const failedJob = {
        ...mockOCRJob,
        status: 'failed' as const,
        retryCount: 1
      };

      const store = createTestStore({
        ocrJobs: { [mockOCRJob.id]: failedJob },
        ocrQueue: {
          jobs: [failedJob],
          activeJobs: 0,
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: false,
        }
      });

      const newSettings = {
        qualityThreshold: 85,
        imagePreprocessing: {
          enhanceContrast: true,
          denoiseImage: true,
          deskewImage: true,
          resolutionDPI: 600,
        }
      };

      store.dispatch(retryOCRJob({
        jobId: mockOCRJob.id,
        newSettings
      }));

      const state = store.getState().documents;
      const retriedJob = state.ocrJobs[mockOCRJob.id];

      expect(retriedJob.status).toBe('retrying');
      expect(retriedJob.retryCount).toBe(2);
      expect(retriedJob.progress).toBe(0);
      expect(retriedJob.error).toBeUndefined();
      expect(retriedJob.processingSettings.qualityThreshold).toBe(85);
      expect(retriedJob.processingSettings.imagePreprocessing.resolutionDPI).toBe(600);
      expect(state.ocrQueue.activeJobs).toBe(1);
      expect(state.ocrQueue.isProcessing).toBe(true);
    });

    it('should not retry job that has exceeded max retries', () => {
      const exhaustedJob = {
        ...mockOCRJob,
        status: 'failed' as const,
        retryCount: 3, // At max retries
        maxRetries: 3
      };

      const store = createTestStore({
        ocrJobs: { [mockOCRJob.id]: exhaustedJob },
        ocrQueue: {
          jobs: [exhaustedJob],
          activeJobs: 0,
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: false,
        }
      });

      store.getState().documents;

      store.dispatch(retryOCRJob({
        jobId: mockOCRJob.id
      }));

      const finalState = store.getState().documents;

      // State should remain unchanged
      expect(finalState.ocrJobs[mockOCRJob.id]).toEqual(exhaustedJob);
      expect(finalState.ocrQueue.activeJobs).toBe(0);
    });

    it('should remove OCR job from queue', () => {
      const store = createTestStore({
        ocrJobs: { [mockOCRJob.id]: mockOCRJob },
        ocrQueue: {
          jobs: [mockOCRJob],
          activeJobs: 1,
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: true,
        }
      });

      store.dispatch(removeOCRJob(mockOCRJob.id));

      const state = store.getState().documents;

      expect(state.ocrJobs[mockOCRJob.id]).toBeUndefined();
      expect(state.ocrQueue.jobs).toHaveLength(0);
      expect(state.ocrQueue.activeJobs).toBe(0);
      expect(state.ocrQueue.isProcessing).toBe(false);
    });
  });

  describe('OCR Processing Settings (AC2: Bilingual Support)', () => {
    it('should update OCR processing settings', () => {
      const store = createTestStore();

      const newSettings = {
        targetLanguages: ['ar', 'en', 'fr'],
        qualityThreshold: 85,
        imagePreprocessing: {
          enhanceContrast: false,
          denoiseImage: true,
          deskewImage: true,
          resolutionDPI: 600,
        }
      };

      store.dispatch(updateOCRProcessingSettings(newSettings));

      const state = store.getState().documents;

      expect(state.ocrProcessingSettings.targetLanguages).toEqual(['ar', 'en', 'fr']);
      expect(state.ocrProcessingSettings.qualityThreshold).toBe(85);
      expect(state.ocrProcessingSettings.imagePreprocessing.resolutionDPI).toBe(600);
      expect(state.ocrProcessingSettings.imagePreprocessing.enhanceContrast).toBe(false);
      // Other settings should remain unchanged
      expect(state.ocrProcessingSettings.enableLanguageDetection).toBe(true);
    });
  });

  describe('OCR Edit Sessions (AC6: Text Preview)', () => {
    const mockEditSession: OCREditSession = {
      id: 'session-123',
      ocrResultId: 'result-123',
      originalText: 'Original text',
      editedText: 'Original text',
      changes: [],
      dateStarted: '2025-01-15T11:00:00Z',
      dateLastModified: '2025-01-15T11:00:00Z',
      isCompleted: false
    };

    it('should start OCR edit session', () => {
      const store = createTestStore();

      store.dispatch(startOCREditSession(mockEditSession));

      const state = store.getState().documents;
      expect(state.ocrEditSessions[mockEditSession.id]).toEqual(mockEditSession);
    });

    it('should update OCR edit session', () => {
      const store = createTestStore({
        ocrEditSessions: { [mockEditSession.id]: mockEditSession }
      });

      const updates = {
        editedText: 'Updated text content',
        changes: [{
          id: 'change-1',
          blockId: 'block-1',
          originalText: 'Original',
          newText: 'Updated',
          changeType: 'correction' as const,
          timestamp: '2025-01-15T11:05:00Z'
        }]
      };

      store.dispatch(updateOCREditSession({
        sessionId: mockEditSession.id,
        updates
      }));

      const state = store.getState().documents;
      const session = state.ocrEditSessions[mockEditSession.id];

      expect(session.editedText).toBe('Updated text content');
      expect(session.changes).toHaveLength(1);
      expect(session.dateLastModified).not.toBe(mockEditSession.dateLastModified);
    });

    it('should complete OCR edit session and update result', () => {
      const store = createTestStore({
        ocrEditSessions: { [mockEditSession.id]: mockEditSession },
        ocrResults: { [mockOCRResult.documentId]: mockOCRResult }
      });

      const finalText = 'Final corrected text';

      store.dispatch(completeOCREditSession({
        sessionId: mockEditSession.id,
        finalText
      }));

      const state = store.getState().documents;
      const session = state.ocrEditSessions[mockEditSession.id];
      const result = state.ocrResults[mockOCRResult.documentId];

      expect(session.editedText).toBe(finalText);
      expect(session.isCompleted).toBe(true);
      expect(result.extractedText).toBe(finalText);
    });

    it('should remove OCR edit session', () => {
      const store = createTestStore({
        ocrEditSessions: { [mockEditSession.id]: mockEditSession }
      });

      store.dispatch(removeOCREditSession(mockEditSession.id));

      const state = store.getState().documents;
      expect(state.ocrEditSessions[mockEditSession.id]).toBeUndefined();
    });
  });

  describe('Queue Management and Concurrency', () => {
    it('should respect max concurrent jobs limit', () => {
      const store = createTestStore({
        ocrQueue: {
          jobs: [],
          activeJobs: 2, // At max capacity
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: true,
        }
      });

      const newJob = { ...mockOCRJob, id: 'job-new' };
      store.dispatch(startOCRJob(newJob));

      const state = store.getState().documents;

      // Job should be added to queue but not marked as active
      expect(state.ocrJobs[newJob.id]).toEqual(newJob);
      expect(state.ocrQueue.jobs).toContain(newJob);
      expect(state.ocrQueue.activeJobs).toBe(2); // Still at max
    });

    it('should clear entire OCR queue', () => {
      const store = createTestStore({
        ocrJobs: {
          'job-1': { ...mockOCRJob, id: 'job-1' },
          'job-2': { ...mockOCRJob, id: 'job-2' }
        },
        ocrQueue: {
          jobs: [
            { ...mockOCRJob, id: 'job-1' },
            { ...mockOCRJob, id: 'job-2' }
          ],
          activeJobs: 2,
          maxConcurrentJobs: 2,
          totalProcessingTime: 100,
          averageProcessingTime: 50,
          isProcessing: true,
        }
      });

      store.dispatch(clearOCRQueue());

      const state = store.getState().documents;

      expect(Object.keys(state.ocrJobs)).toHaveLength(0);
      expect(state.ocrQueue.jobs).toHaveLength(0);
      expect(state.ocrQueue.activeJobs).toBe(0);
      expect(state.ocrQueue.totalProcessingTime).toBe(0);
      expect(state.ocrQueue.averageProcessingTime).toBe(0);
      expect(state.ocrQueue.isProcessing).toBe(false);
    });
  });

  describe('Selectors', () => {
    const stateWithOCRData = {
      ocrJobs: { [mockOCRJob.id]: mockOCRJob },
      ocrResults: { [mockOCRResult.documentId]: mockOCRResult },
      ocrQueue: {
        jobs: [mockOCRJob],
        activeJobs: 1,
        maxConcurrentJobs: 2,
        totalProcessingTime: 50,
        averageProcessingTime: 25,
        isProcessing: true,
      },
      ocrProcessingSettings: {
        enableLanguageDetection: true,
        targetLanguages: ['ar', 'en'],
        qualityThreshold: 80,
        imagePreprocessing: {
          enhanceContrast: true,
          denoiseImage: true,
          deskewImage: true,
          resolutionDPI: 400,
        },
        textProcessing: {
          preserveFormatting: true,
          extractTables: true,
          extractHeaders: true,
          mergeFragments: true,
        },
      }
    };

    it('should select OCR job by ID', () => {
      const state = { documents: stateWithOCRData };
      const job = selectOCRJobById(mockOCRJob.id)(state);
      expect(job).toEqual(mockOCRJob);
    });

    it('should select OCR result by document ID', () => {
      const state = { documents: stateWithOCRData };
      const result = selectOCRResultByDocumentId(mockOCRResult.documentId)(state);
      expect(result).toEqual(mockOCRResult);
    });

    it('should select OCR processing settings', () => {
      const state = { documents: stateWithOCRData };
      const settings = selectOCRProcessingSettings(state);
      expect(settings.qualityThreshold).toBe(80);
      expect(settings.targetLanguages).toEqual(['ar', 'en']);
    });

    it('should select OCR processing status', () => {
      const state = { documents: stateWithOCRData };
      const isProcessing = selectIsOCRProcessing(state);
      const activeJobs = selectOCRActiveJobs(state);

      expect(isProcessing).toBe(true);
      expect(activeJobs).toBe(1);
    });
  });

  describe('Performance and Statistics Tracking (AC8)', () => {
    it('should calculate average processing time correctly', () => {
      const store = createTestStore({
        ocrQueue: {
          jobs: [],
          activeJobs: 0,
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: false,
        }
      });

      // Complete first job
      const job1 = { ...mockOCRJob, id: 'job-1' };
      const result1 = { ...mockOCRResult, id: 'result-1', jobId: 'job-1', processingTime: 20 };

      store.dispatch(startOCRJob(job1));
      store.dispatch(completeOCRJob({ jobId: 'job-1', result: result1 }));

      let state = store.getState().documents;
      expect(state.ocrQueue.totalProcessingTime).toBe(20);
      expect(state.ocrQueue.averageProcessingTime).toBe(20);

      // Complete second job
      const job2 = { ...mockOCRJob, id: 'job-2' };
      const result2 = { ...mockOCRResult, id: 'result-2', jobId: 'job-2', processingTime: 30 };

      store.dispatch(startOCRJob(job2));
      store.dispatch(completeOCRJob({ jobId: 'job-2', result: result2 }));

      state = store.getState().documents;
      expect(state.ocrQueue.totalProcessingTime).toBe(50);
      expect(state.ocrQueue.averageProcessingTime).toBe(25);
    });
  });
});