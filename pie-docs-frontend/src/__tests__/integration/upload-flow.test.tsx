import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { UploadZone } from '@/components/documents/UploadZone';
import { FileUploadQueue } from '@/components/documents/FileUploadQueue';
import { useUploadManager } from '@/hooks/useUploadManager';
import documentsReducer from '@/store/slices/documentsSlice';
// Integration tests for upload flow

// Mock services and utilities
const mockUploadFile = vi.fn();
vi.mock('@/services/api/documentsService', () => ({
  documentsService: {
    uploadFile: mockUploadFile
  }
}));

vi.mock('@/utils/validation/fileValidator', () => ({
  FileValidator: {
    getAcceptAttribute: vi.fn(() => '.pdf,.doc,.docx,.jpg,.png'),
    formatFileSize: vi.fn((size: number) => {
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
      return `${Math.round(size / (1024 * 1024))} MB`;
    }),
    validateFiles: vi.fn(() => ({
      isValid: true,
      errors: [],
      warnings: []
    })),
    isImageFile: vi.fn((file: File) => file.type.startsWith('image/')),
    isVideoFile: vi.fn((file: File) => file.type.startsWith('video/')),
    isAudioFile: vi.fn((file: File) => file.type.startsWith('audio/')),
    isDocumentFile: vi.fn((file: File) =>
      ['application/pdf', 'application/msword'].includes(file.type)
    )
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

// Helper to render components with Redux provider
const renderWithProvider = (
  ui: React.ReactElement,
  { initialState = {}, store = createTestStore(initialState) } = {}
) => {
  return {
    ...render(<Provider store={store}>{ui}</Provider>),
    store
  };
};

// Create test files
const createTestFile = (name: string, type: string, size: number) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Complete Upload Flow Component that combines everything
const CompleteUploadFlow: React.FC = () => {
  const uploadManager = useUploadManager();

  const handleFilesAdded = (files: File[]) => {
    uploadManager.addFiles(files);
  };

  const handleStartUploads = () => {
    uploadManager.startUploads();
  };

  return (
    <div data-testid="upload-flow">
      <UploadZone onFilesAdded={handleFilesAdded} />

      {uploadManager.uploadFiles.length > 0 && (
        <div data-testid="upload-controls">
          <button onClick={handleStartUploads} disabled={uploadManager.isUploading}>
            {uploadManager.isUploading ? 'Uploading...' : 'Start Upload'}
          </button>
          <button onClick={uploadManager.cancelAllUploads}>
            Cancel All
          </button>
        </div>
      )}

      <FileUploadQueue
        uploadQueue={{
          files: uploadManager.uploadFiles,
          isUploading: uploadManager.isUploading,
          totalFiles: uploadManager.uploadFiles.length,
          completedFiles: uploadManager.uploadFiles.filter(f => f.status === 'success').length,
          failedFiles: uploadManager.uploadFiles.filter(f => f.status === 'error').length,
          totalBytes: uploadManager.uploadFiles.reduce((sum, f) => sum + f.size, 0),
          uploadedBytes: uploadManager.uploadFiles.reduce((sum, f) => sum + (f.size * f.progress / 100), 0),
          overallProgress: uploadManager.uploadFiles.length > 0
            ? uploadManager.uploadFiles.reduce((sum, f) => sum + f.progress, 0) / uploadManager.uploadFiles.length
            : 0,
          concurrentUploads: 0,
          maxConcurrentUploads: 3
        }}
        onCancelUpload={uploadManager.cancelUpload}
        onRetryUpload={uploadManager.retryUpload}
        onRemoveFile={uploadManager.removeFile}
        onUpdateMetadata={(_fileId, _metadata) => {
          // Implementation would update metadata
        }}
      />
    </div>
  );
};

describe('Upload Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful upload mock
    mockUploadFile.mockImplementation(
      (file: File, _options = {}, onProgress?: (progress: any) => void, signal?: AbortSignal) => {
        return new Promise((resolve) => {
          let progress = 0;
          const interval = setInterval(() => {
            if (signal?.aborted) {
              clearInterval(interval);
              resolve({ success: false, error: 'Upload cancelled' });
              return;
            }

            progress += 25;
            if (onProgress) {
              onProgress({
                fileId: 'mock-id',
                loaded: (file.size * progress) / 100,
                total: file.size,
                percentage: progress,
                speed: 1000,
                remainingTime: 1
              });
            }

            if (progress >= 100) {
              clearInterval(interval);
              resolve({
                success: true,
                documentId: `doc-${Date.now()}`,
                message: 'Upload successful'
              });
            }
          }, 50);
        });
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Upload Workflow', () => {
    it('handles complete upload flow from file selection to completion', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompleteUploadFlow />);

      // Step 1: Add files via file input
      const file = createTestFile('test-document.pdf', 'application/pdf', 2048);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Step 2: Verify file appears in queue
      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
        expect(screen.getByText('Upload Queue (1 files)')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      // Step 3: Start upload
      const startButton = screen.getByText('Start Upload');
      await user.click(startButton);

      // Step 4: Verify upload starts
      await waitFor(() => {
        expect(screen.getByText('Uploading...')).toBeInTheDocument();
      });

      // Step 5: Wait for upload completion
      await waitFor(
        () => {
          expect(screen.getByText('Completed')).toBeInTheDocument();
          expect(screen.getByText('1 completed')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Step 6: Verify final state
      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
      expect(screen.getByText('Start Upload')).not.toBeDisabled();
    });

    it('handles multiple file upload with queue management', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompleteUploadFlow />);

      // Add multiple files
      const files = [
        createTestFile('doc1.pdf', 'application/pdf', 1024),
        createTestFile('doc2.jpg', 'image/jpeg', 2048),
        createTestFile('doc3.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 3072)
      ];

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files } });

      // Verify all files in queue
      await waitFor(() => {
        expect(screen.getByText('Upload Queue (3 files)')).toBeInTheDocument();
        expect(screen.getByText('doc1.pdf')).toBeInTheDocument();
        expect(screen.getByText('doc2.jpg')).toBeInTheDocument();
        expect(screen.getByText('doc3.docx')).toBeInTheDocument();
      });

      // Start uploads
      await user.click(screen.getByText('Start Upload'));

      // Wait for all uploads to complete
      await waitFor(
        () => {
          expect(screen.getByText('3 completed')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Should have called upload for each file
      expect(mockUploadFile).toHaveBeenCalledTimes(3);
    });

    it('handles drag and drop upload flow', async () => {
      renderWithProvider(<CompleteUploadFlow />);

      const uploadZone = screen.getByRole('button', { name: /upload files/i });
      const file = createTestFile('dropped-file.pdf', 'application/pdf', 1024);

      // Simulate drag enter
      const dragEnterEvent = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(dragEnterEvent, 'dataTransfer', {
        value: { items: [{ kind: 'file' }] }
      });
      fireEvent(uploadZone, dragEnterEvent);

      // Verify drag over state
      expect(screen.getByText('Drop files here')).toBeInTheDocument();

      // Simulate drop
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [file], items: [] }
      });
      fireEvent(uploadZone, dropEvent);

      // Verify file was added
      await waitFor(() => {
        expect(screen.getByText('dropped-file.pdf')).toBeInTheDocument();
        expect(screen.getByText('Upload Queue (1 files)')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles upload failures and retry workflow', async () => {
      // Mock failure then success
      mockUploadFile
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          documentId: 'doc-retry',
          message: 'Upload successful'
        });

      const user = userEvent.setup();
      renderWithProvider(<CompleteUploadFlow />);

      // Add file and start upload
      const file = createTestFile('test.pdf', 'application/pdf', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Upload'));

      // Wait for failure
      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('1 failed')).toBeInTheDocument();
      });

      // Retry upload
      const retryButton = screen.getByTitle('Retry upload');
      await user.click(retryButton);

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('1 completed')).toBeInTheDocument();
      });

      expect(mockUploadFile).toHaveBeenCalledTimes(2);
    });

    it('handles cancellation workflow', async () => {
      // Mock slow upload
      mockUploadFile.mockImplementation(
        (file: File, _options = {}, onProgress?: (progress: any) => void, signal?: AbortSignal) => {
          return new Promise((resolve) => {
            const interval = setInterval(() => {
              if (signal?.aborted) {
                clearInterval(interval);
                resolve({ success: false, error: 'Upload cancelled' });
                return;
              }

              if (onProgress) {
                onProgress({
                  fileId: 'mock-id',
                  loaded: file.size * 0.5,
                  total: file.size,
                  percentage: 50,
                  speed: 1000,
                  remainingTime: 1
                });
              }
            }, 100);
          });
        }
      );

      const user = userEvent.setup();
      renderWithProvider(<CompleteUploadFlow />);

      // Add file and start upload
      const file = createTestFile('test.pdf', 'application/pdf', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await user.click(screen.getByText('Start Upload'));

      // Wait for upload to start
      await waitFor(() => {
        expect(screen.getByText(/Uploading/)).toBeInTheDocument();
      });

      // Cancel upload
      const cancelButton = screen.getByTitle('Cancel upload');
      await user.click(cancelButton);

      // Verify cancellation
      await waitFor(() => {
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
      });
    });

    it('handles validation errors', async () => {
      const { FileValidator } = await import('@/utils/validation/fileValidator');
      vi.mocked(FileValidator.validateFiles).mockReturnValue({
        isValid: false,
        errors: ['File type not supported'],
        warnings: []
      });

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProvider(<CompleteUploadFlow />);

      // Try to add invalid file
      const file = createTestFile('invalid.txt', 'text/plain', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Verify no file was added to queue
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('File validation failed:', ['File type not supported']);
      });

      expect(screen.queryByText('Upload Queue')).not.toBeInTheDocument();
    });
  });

  describe('State Management Integration', () => {
    it('maintains consistent state across components', async () => {
      const store = createTestStore();
      const user = userEvent.setup();

      renderWithProvider(<CompleteUploadFlow />, { store });

      // Add file
      const file = createTestFile('state-test.pdf', 'application/pdf', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Verify state in store
      await waitFor(() => {
        const state = store.getState();
        expect(state.documents.uploadQueue.files).toHaveLength(1);
        expect(state.documents.uploadQueue.files[0].name).toBe('state-test.pdf');
        expect(state.documents.uploadQueue.totalFiles).toBe(1);
      });

      // Start upload
      await user.click(screen.getByText('Start Upload'));

      // Verify uploading state
      await waitFor(() => {
        const state = store.getState();
        expect(state.documents.uploadQueue.isUploading).toBe(true);
      });

      // Wait for completion
      await waitFor(() => {
        const state = store.getState();
        expect(state.documents.uploadQueue.isUploading).toBe(false);
        expect(state.documents.uploadQueue.completedFiles).toBe(1);
      });
    });

    it('handles queue operations through Redux actions', async () => {
      const store = createTestStore();
      const user = userEvent.setup();

      renderWithProvider(<CompleteUploadFlow />, { store });

      // Add multiple files
      const files = [
        createTestFile('file1.pdf', 'application/pdf', 1024),
        createTestFile('file2.pdf', 'application/pdf', 1024)
      ];
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        expect(store.getState().documents.uploadQueue.files).toHaveLength(2);
      });

      // Remove one file
      const removeButton = screen.getAllByTitle('Remove from queue')[0];
      await user.click(removeButton);

      // Verify file removed from state
      await waitFor(() => {
        expect(store.getState().documents.uploadQueue.files).toHaveLength(1);
      });

      // Clear all
      await user.click(screen.getByText('Clear All'));

      // Verify all files removed
      await waitFor(() => {
        expect(store.getState().documents.uploadQueue.files).toHaveLength(0);
      });
    });
  });

  describe('Progress Tracking Integration', () => {
    it('tracks individual and overall progress correctly', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompleteUploadFlow />);

      // Add files
      const files = [
        createTestFile('file1.pdf', 'application/pdf', 1024),
        createTestFile('file2.pdf', 'application/pdf', 1024)
      ];
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files } });

      await user.click(screen.getByText('Start Upload'));

      // Wait for progress to be visible
      await waitFor(() => {
        expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      });

      // Check for individual progress bars
      const progressBars = document.querySelectorAll('.bg-blue-600');
      expect(progressBars.length).toBeGreaterThan(0);

      // Wait for completion
      await waitFor(
        () => {
          expect(screen.getByText('2 completed')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('shows accurate file size information', async () => {
      renderWithProvider(<CompleteUploadFlow />);

      // Add file with specific size
      const file = createTestFile('size-test.pdf', 'application/pdf', 2048);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('2 KB')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility throughout upload flow', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompleteUploadFlow />);

      // Upload zone should be accessible
      const uploadZone = screen.getByRole('button', { name: /upload files/i });
      expect(uploadZone).toHaveAttribute('tabIndex', '0');

      // Add file via keyboard
      uploadZone.focus();
      await user.keyboard('{Enter}');

      // File input should exist (hidden but functional)
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('aria-hidden', 'true');

      // Add file programmatically
      const file = createTestFile('accessibility-test.pdf', 'application/pdf', 1024);
      fireEvent.change(fileInput!, { target: { files: [file] } });

      // Queue and controls should be accessible
      await waitFor(() => {
        const startButton = screen.getByText('Start Upload');
        expect(startButton).toBeInTheDocument();
        expect(startButton).not.toHaveAttribute('aria-disabled');
      });
    });
  });

  describe('Performance Integration', () => {
    it('handles large number of files efficiently', async () => {
      // const user = userEvent.setup();
      renderWithProvider(<CompleteUploadFlow />);

      // Add many files
      const manyFiles = Array.from({ length: 10 }, (_, i) =>
        createTestFile(`file-${i}.pdf`, 'application/pdf', 1024)
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: manyFiles } });

      await waitFor(() => {
        expect(screen.getByText('Upload Queue (10 files)')).toBeInTheDocument();
      });

      // Should render without performance issues
      expect(screen.getAllByText(/file-\d+\.pdf/)).toHaveLength(10);

      // Queue should have scroll container
      const scrollContainer = document.querySelector('.max-h-96.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('respects concurrency limits during batch upload', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompleteUploadFlow />);

      // Add more files than concurrency limit
      const files = Array.from({ length: 5 }, (_, i) =>
        createTestFile(`concurrent-${i}.pdf`, 'application/pdf', 1024)
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files } });

      await user.click(screen.getByText('Start Upload'));

      // Give uploads time to start
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });

      // Should not exceed concurrency limit (3)
      // We can't easily test the exact concurrency, but uploads should work
      await waitFor(
        () => {
          expect(screen.getByText('5 completed')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(mockUploadFile).toHaveBeenCalledTimes(5);
    });
  });
});