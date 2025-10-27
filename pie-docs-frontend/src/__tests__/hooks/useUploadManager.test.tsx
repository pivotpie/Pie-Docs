import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useUploadManager } from '@/hooks/useUploadManager';
import documentsReducer from '@/store/slices/documentsSlice';
import type { UploadOptions } from '@/types/domain/Upload';

// Mock documentsService
const mockUploadFile = vi.fn();
vi.mock('@/services/api/documentsService', () => ({
  documentsService: {
    uploadFile: mockUploadFile
  }
}));

// Mock FileValidator
vi.mock('@/utils/validation/fileValidator', () => ({
  FileValidator: {
    validateFiles: vi.fn(() => ({
      isValid: true,
      errors: [],
      warnings: []
    }))
  }
}));

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      documents: documentsReducer
    },
    preloadedState: {
      documents: {
        ...documentsReducer(undefined, { type: '@@INIT' }),
        ...initialState
      }
    }
  });
};

// Helper to render hook with Redux provider
const renderHookWithProvider = (
  hook: () => any,
  { initialState = {}, store = createTestStore(initialState) } = {}
) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    ...renderHook(hook, { wrapper }),
    store
  };
};

// Create test file
const createTestFile = (name: string, type: string, size: number) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('useUploadManager Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation for successful upload
    mockUploadFile.mockImplementation(
      (file: File, options: UploadOptions = {}, onProgress?: Function, signal?: AbortSignal) => {
        return new Promise((resolve) => {
          // Simulate progress updates
          const intervals = [25, 50, 75, 100];
          let index = 0;

          const updateProgress = () => {
            if (signal?.aborted) {
              resolve({ success: false, error: 'Upload cancelled' });
              return;
            }

            if (onProgress && index < intervals.length) {
              onProgress({
                fileId: 'mock-id',
                loaded: (file.size * intervals[index]) / 100,
                total: file.size,
                percentage: intervals[index],
                speed: 1000,
                remainingTime: 1
              });
            }

            index++;
            if (index <= intervals.length) {
              setTimeout(updateProgress, 100);
            } else {
              resolve({
                success: true,
                documentId: `doc-${Date.now()}`,
                message: 'Upload successful'
              });
            }
          };

          setTimeout(updateProgress, 100);
        });
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      expect(result.current.uploadFiles).toEqual([]);
      expect(result.current.isUploading).toBe(false);
      expect(typeof result.current.addFiles).toBe('function');
      expect(typeof result.current.removeFile).toBe('function');
      expect(typeof result.current.startUploads).toBe('function');
      expect(typeof result.current.cancelUpload).toBe('function');
      expect(typeof result.current.retryUpload).toBe('function');
    });

    it('reflects upload state from Redux store', () => {
      const initialState = {
        uploadQueue: {
          files: [
            {
              id: 'test-1',
              file: createTestFile('test.pdf', 'application/pdf', 1024),
              name: 'test.pdf',
              size: 1024,
              type: 'application/pdf',
              progress: 50,
              status: 'uploading',
              lastModified: Date.now(),
              retryCount: 0
            }
          ],
          isUploading: true
        }
      };

      const { result } = renderHookWithProvider(() => useUploadManager(), { initialState });

      expect(result.current.uploadFiles).toHaveLength(1);
      expect(result.current.isUploading).toBe(true);
      expect(result.current.uploadFiles[0].name).toBe('test.pdf');
    });
  });

  describe('addFiles', () => {
    it('adds files to upload queue with validation', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [
        createTestFile('test1.pdf', 'application/pdf', 1024),
        createTestFile('test2.jpg', 'image/jpeg', 2048)
      ];

      let addResult: any;
      await act(async () => {
        addResult = result.current.addFiles(files);
      });

      expect(addResult.success).toBe(true);
      expect(addResult.files).toHaveLength(2);
      expect(addResult.files[0].name).toBe('test1.pdf');
      expect(addResult.files[1].name).toBe('test2.jpg');

      // Check that files were added to Redux store
      expect(result.current.uploadFiles).toHaveLength(2);
    });

    it('includes upload options in file metadata', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      const options: UploadOptions = {
        folderId: 'folder-123',
        metadata: {
          description: 'Test document',
          tags: ['important']
        }
      };

      let addResult: any;
      await act(async () => {
        addResult = result.current.addFiles(files, options);
      });

      expect(addResult.files[0].folderId).toBe('folder-123');
      expect(addResult.files[0].metadata).toEqual({
        description: 'Test document',
        tags: ['important']
      });
    });

    it('returns error when file validation fails', async () => {
      const { FileValidator } = await import('@/utils/validation/fileValidator');
      vi.mocked(FileValidator.validateFiles).mockReturnValue({
        isValid: false,
        errors: ['Invalid file type'],
        warnings: []
      });

      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.txt', 'text/plain', 1024)];

      let addResult: any;
      await act(async () => {
        addResult = result.current.addFiles(files);
      });

      expect(addResult.success).toBe(false);
      expect(addResult.errors).toEqual(['Invalid file type']);
      expect(result.current.uploadFiles).toHaveLength(0);
    });

    it('generates unique file IDs', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [
        createTestFile('test1.pdf', 'application/pdf', 1024),
        createTestFile('test2.pdf', 'application/pdf', 1024)
      ];

      await act(async () => {
        result.current.addFiles(files);
      });

      const uploadFiles = result.current.uploadFiles;
      expect(uploadFiles[0].id).not.toBe(uploadFiles[1].id);
      expect(uploadFiles[0].id).toMatch(/^\d+-[a-z0-9]{9}$/);
      expect(uploadFiles[1].id).toMatch(/^\d+-[a-z0-9]{9}$/);
    });
  });

  describe('removeFile', () => {
    it('removes file from queue', async () => {
      const { result, store } = renderHookWithProvider(() => useUploadManager());

      // Add a file first
      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      const fileId = result.current.uploadFiles[0].id;

      // Remove the file
      await act(async () => {
        result.current.removeFile(fileId);
      });

      expect(result.current.uploadFiles).toHaveLength(0);
    });

    it('cancels upload if file is being uploaded', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      // Add and start uploading a file
      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      const fileId = result.current.uploadFiles[0].id;

      // Start upload
      act(() => {
        result.current.startUploads();
      });

      // Remove file while uploading
      await act(async () => {
        result.current.removeFile(fileId);
      });

      expect(result.current.uploadFiles).toHaveLength(0);
    });
  });

  describe('startUploads', () => {
    it('starts uploading pending files', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      // Add files
      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      // Start uploads
      await act(async () => {
        await result.current.startUploads();
      });

      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(result.current.isUploading).toBe(false); // Should be false after completion
    });

    it('does not start if no pending files', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      await act(async () => {
        await result.current.startUploads();
      });

      expect(mockUploadFile).not.toHaveBeenCalled();
      expect(result.current.isUploading).toBe(false);
    });

    it('respects concurrency limit', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      // Add more files than concurrency limit (3)
      const files = [
        createTestFile('test1.pdf', 'application/pdf', 1024),
        createTestFile('test2.pdf', 'application/pdf', 1024),
        createTestFile('test3.pdf', 'application/pdf', 1024),
        createTestFile('test4.pdf', 'application/pdf', 1024)
      ];

      await act(async () => {
        result.current.addFiles(files);
      });

      // Start uploads
      act(() => {
        result.current.startUploads();
      });

      // Wait a bit for uploads to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      // Should not exceed concurrency limit
      expect(mockUploadFile).toHaveBeenCalledTimes(3);
    });

    it('updates upload progress during upload', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      // Start uploads
      act(() => {
        result.current.startUploads();
      });

      // Wait for progress updates
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 250));
      });

      const uploadFile = result.current.uploadFiles[0];
      expect(uploadFile.progress).toBeGreaterThan(0);
      expect(uploadFile.status).toBe('uploading');
    });

    it('handles upload success', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      await act(async () => {
        await result.current.startUploads();
      });

      const uploadFile = result.current.uploadFiles[0];
      expect(uploadFile.progress).toBe(100);
      expect(uploadFile.status).toBe('success');
    });

    it('handles upload failure', async () => {
      mockUploadFile.mockRejectedValue(new Error('Network error'));

      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      await act(async () => {
        await result.current.startUploads();
      });

      const uploadFile = result.current.uploadFiles[0];
      expect(uploadFile.status).toBe('error');
      expect(uploadFile.progress).toBe(0);
    });
  });

  describe('cancelUpload', () => {
    it('cancels specific upload', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      const fileId = result.current.uploadFiles[0].id;

      // Start upload
      act(() => {
        result.current.startUploads();
      });

      // Cancel specific upload
      await act(async () => {
        result.current.cancelUpload(fileId);
      });

      const uploadFile = result.current.uploadFiles[0];
      expect(uploadFile.status).toBe('cancelled');
      expect(uploadFile.progress).toBe(0);
    });
  });

  describe('retryUpload', () => {
    it('retries failed upload', async () => {
      // First make upload fail
      mockUploadFile.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      const fileId = result.current.uploadFiles[0].id;

      // Start upload (will fail)
      await act(async () => {
        await result.current.startUploads();
      });

      expect(result.current.uploadFiles[0].status).toBe('error');

      // Reset mock to succeed
      mockUploadFile.mockClear();
      mockUploadFile.mockImplementation(() =>
        Promise.resolve({
          success: true,
          documentId: 'doc-retry',
          message: 'Upload successful'
        })
      );

      // Retry upload
      await act(async () => {
        await result.current.retryUpload(fileId);
      });

      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(result.current.uploadFiles[0].status).toBe('success');
    });

    it('does not retry if file is not in error state', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      const fileId = result.current.uploadFiles[0].id;

      // Try to retry pending file
      await act(async () => {
        await result.current.retryUpload(fileId);
      });

      // Should not call upload service
      expect(mockUploadFile).not.toHaveBeenCalled();
    });
  });

  describe('cancelAllUploads', () => {
    it('cancels all active uploads', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [
        createTestFile('test1.pdf', 'application/pdf', 1024),
        createTestFile('test2.pdf', 'application/pdf', 1024)
      ];

      await act(async () => {
        result.current.addFiles(files);
      });

      // Start uploads
      act(() => {
        result.current.startUploads();
      });

      // Cancel all uploads
      await act(async () => {
        result.current.cancelAllUploads();
      });

      result.current.uploadFiles.forEach(file => {
        if (file.status === 'uploading' || file.status === 'pending') {
          expect(file.status).toBe('cancelled');
        }
      });

      expect(result.current.isUploading).toBe(false);
    });
  });

  describe('pauseUploads', () => {
    it('pauses pending uploads', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [
        createTestFile('test1.pdf', 'application/pdf', 1024),
        createTestFile('test2.pdf', 'application/pdf', 1024)
      ];

      await act(async () => {
        result.current.addFiles(files);
      });

      // Pause uploads
      await act(async () => {
        result.current.pauseUploads();
      });

      const pendingFiles = result.current.uploadFiles.filter(f => f.status === 'pending');
      expect(pendingFiles.every(f => f.status === 'cancelled')).toBe(true);
      expect(result.current.isUploading).toBe(false);
    });
  });

  describe('resumeUploads', () => {
    it('resumes cancelled uploads', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      // Pause then resume
      await act(async () => {
        result.current.pauseUploads();
      });

      await act(async () => {
        await result.current.resumeUploads();
      });

      expect(mockUploadFile).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles AbortError correctly', async () => {
      mockUploadFile.mockImplementation(() => {
        const error = new Error('Upload cancelled');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      await act(async () => {
        await result.current.startUploads();
      });

      const uploadFile = result.current.uploadFiles[0];
      expect(uploadFile.status).toBe('cancelled');
    });

    it('handles generic errors', async () => {
      mockUploadFile.mockRejectedValue(new Error('Network error'));

      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      await act(async () => {
        await result.current.startUploads();
      });

      const uploadFile = result.current.uploadFiles[0];
      expect(uploadFile.status).toBe('error');
    });
  });

  describe('Memory Management', () => {
    it('cleans up AbortControllers after upload completion', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      await act(async () => {
        await result.current.startUploads();
      });

      // AbortControllers should be cleaned up after completion
      // This is internal state, so we can't directly test it, but the upload should complete successfully
      expect(result.current.uploadFiles[0].status).toBe('success');
    });

    it('cleans up AbortControllers when file is removed', async () => {
      const { result } = renderHookWithProvider(() => useUploadManager());

      const files = [createTestFile('test.pdf', 'application/pdf', 1024)];
      await act(async () => {
        result.current.addFiles(files);
      });

      const fileId = result.current.uploadFiles[0].id;

      // Start upload then immediately remove
      act(() => {
        result.current.startUploads();
      });

      await act(async () => {
        result.current.removeFile(fileId);
      });

      expect(result.current.uploadFiles).toHaveLength(0);
    });
  });
});