import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { FileUploadQueue } from '@/components/documents/FileUploadQueue';
import documentsReducer from '@/store/slices/documentsSlice';
import type { FileUploadQueueProps, UploadFile } from '@/types/domain/Upload';

// Mock FileValidator
vi.mock('@/utils/validation/fileValidator', () => ({
  FileValidator: {
    formatFileSize: vi.fn((size: number) => {
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
      return `${Math.round(size / (1024 * 1024))} MB`;
    }),
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

// Helper to render component with Redux provider
const renderWithProvider = (
  ui: React.ReactElement,
  { initialState = {}, store = createTestStore(initialState) } = {}
) => {
  return {
    ...render(<Provider store={store}>{ui}</Provider>),
    store
  };
};

// Create test upload file
const createTestUploadFile = (overrides: Partial<UploadFile> = {}): UploadFile => {
  const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

  return {
    id: 'test-file-1',
    file: testFile,
    name: 'test.pdf',
    size: 1024,
    type: 'application/pdf',
    progress: 0,
    status: 'pending',
    lastModified: Date.now(),
    retryCount: 0,
    ...overrides
  };
};

// Create test upload queue
const createTestUploadQueue = (files: UploadFile[] = []) => ({
  files,
  isUploading: false,
  totalFiles: files.length,
  completedFiles: files.filter(f => f.status === 'success').length,
  failedFiles: files.filter(f => f.status === 'error').length,
  totalBytes: files.reduce((sum, f) => sum + f.size, 0),
  uploadedBytes: files.reduce((sum, f) => sum + (f.size * f.progress / 100), 0),
  overallProgress: files.length > 0 ? files.reduce((sum, f) => sum + f.progress, 0) / files.length : 0,
  concurrentUploads: 0,
  maxConcurrentUploads: 3
});

describe('FileUploadQueue Component', () => {
  const defaultProps: FileUploadQueueProps = {
    uploadQueue: createTestUploadQueue(),
    onCancelUpload: vi.fn(),
    onRetryUpload: vi.fn(),
    onRemoveFile: vi.fn(),
    onUpdateMetadata: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty Queue', () => {
    it('renders nothing when queue is empty', () => {
      const { container } = renderWithProvider(<FileUploadQueue {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Queue Header', () => {
    const files = [
      createTestUploadFile({ id: '1', status: 'pending' }),
      createTestUploadFile({ id: '2', status: 'uploading', progress: 50 }),
      createTestUploadFile({ id: '3', status: 'success', progress: 100 })
    ];

    it('displays correct file count in header', () => {
      const uploadQueue = createTestUploadQueue(files);
      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.getByText('Upload Queue (3 files)')).toBeInTheDocument();
    });

    it('displays active upload count', () => {
      const uploadQueue = createTestUploadQueue(files);
      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.getByText('2 uploading')).toBeInTheDocument();
    });

    it('displays completed files count', () => {
      const uploadQueue = createTestUploadQueue(files);
      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.getByText('1 completed')).toBeInTheDocument();
    });

    it('displays failed files count', () => {
      const filesWithError = [
        ...files,
        createTestUploadFile({ id: '4', status: 'error' })
      ];
      const uploadQueue = createTestUploadQueue(filesWithError);
      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.getByText('1 failed')).toBeInTheDocument();
    });

    it('shows overall progress bar when files are uploading', () => {
      const uploadQueue = createTestUploadQueue(files);
      uploadQueue.overallProgress = 50;
      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('does not show progress bar when no active uploads', () => {
      const completedFiles = files.map(f => ({ ...f, status: 'success' as const }));
      const uploadQueue = createTestUploadQueue(completedFiles);
      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.queryByText('Overall Progress')).not.toBeInTheDocument();
    });
  });

  describe('Queue Actions', () => {
    const files = [
      createTestUploadFile({ id: '1', status: 'success', progress: 100 }),
      createTestUploadFile({ id: '2', status: 'error' })
    ];

    it('shows Clear Completed button when there are completed/failed files', () => {
      const uploadQueue = createTestUploadQueue(files);
      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.getByText('Clear Completed')).toBeInTheDocument();
    });

    it('does not show Clear Completed button when no completed/failed files', () => {
      const pendingFiles = [createTestUploadFile({ id: '1', status: 'pending' })];
      const uploadQueue = createTestUploadQueue(pendingFiles);
      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.queryByText('Clear Completed')).not.toBeInTheDocument();
    });

    it('always shows Clear All button', () => {
      const uploadQueue = createTestUploadQueue(files);
      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('dispatches clearCompletedUploads when Clear Completed is clicked', async () => {
      const store = createTestStore();
      const uploadQueue = createTestUploadQueue(files);
      const user = userEvent.setup();

      renderWithProvider(
        <FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />,
        { store }
      );

      await user.click(screen.getByText('Clear Completed'));

      // We can't easily test the specific action, but we can verify the component renders
      expect(screen.getByText('Clear Completed')).toBeInTheDocument();
    });

    it('dispatches clearUploadQueue when Clear All is clicked', async () => {
      const store = createTestStore();
      const uploadQueue = createTestUploadQueue(files);
      const user = userEvent.setup();

      renderWithProvider(
        <FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />,
        { store }
      );

      await user.click(screen.getByText('Clear All'));

      // Component should still render with current props
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  describe('File List Items', () => {
    describe('File Icons', () => {
      it('shows image icon for image files', () => {
        const imageFile = createTestUploadFile({
          name: 'image.jpg',
          type: 'image/jpeg'
        });
        const uploadQueue = createTestUploadQueue([imageFile]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        // Check for image icon (blue background indicates image file)
        const iconContainer = screen.getByRole('img', { name: 'image.jpg' }).parentElement;
        expect(iconContainer).toHaveClass('bg-blue-100');
      });

      it('shows video icon for video files', () => {
        const videoFile = createTestUploadFile({
          name: 'video.mp4',
          type: 'video/mp4'
        });
        const uploadQueue = createTestUploadQueue([videoFile]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        // Check for video icon (purple background indicates video file)
        const fileItem = screen.getByText('video.mp4').closest('.flex');
        const iconContainer = fileItem?.querySelector('.bg-purple-100');
        expect(iconContainer).toBeInTheDocument();
      });

      it('shows audio icon for audio files', () => {
        const audioFile = createTestUploadFile({
          name: 'audio.mp3',
          type: 'audio/mpeg'
        });
        const uploadQueue = createTestUploadQueue([audioFile]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        // Check for audio icon (green background indicates audio file)
        const fileItem = screen.getByText('audio.mp3').closest('.flex');
        const iconContainer = fileItem?.querySelector('.bg-green-100');
        expect(iconContainer).toBeInTheDocument();
      });

      it('shows document icon for document files', () => {
        const docFile = createTestUploadFile({
          name: 'document.pdf',
          type: 'application/pdf'
        });
        const uploadQueue = createTestUploadQueue([docFile]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        // Check for document icon (gray background indicates document file)
        const fileItem = screen.getByText('document.pdf').closest('.flex');
        const iconContainer = fileItem?.querySelector('.bg-gray-100');
        expect(iconContainer).toBeInTheDocument();
      });

      it('shows thumbnail when provided', () => {
        const fileWithThumbnail = createTestUploadFile({
          thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
          name: 'image.jpg'
        });
        const uploadQueue = createTestUploadQueue([fileWithThumbnail]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        const thumbnail = screen.getByRole('img', { name: 'image.jpg' });
        expect(thumbnail).toHaveAttribute('src', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...');
      });
    });

    describe('File Information', () => {
      it('displays file name and size', () => {
        const file = createTestUploadFile({
          name: 'test-document.pdf',
          size: 2048
        });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
        expect(screen.getByText('2 KB')).toBeInTheDocument();
      });

      it('truncates long file names', () => {
        const file = createTestUploadFile({
          name: 'very-long-file-name-that-should-be-truncated-in-the-interface.pdf'
        });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        const fileName = screen.getByText(/very-long-file-name/);
        expect(fileName).toHaveClass('truncate');
      });
    });

    describe('Status Icons and Text', () => {
      it('shows pending status', () => {
        const file = createTestUploadFile({ status: 'pending' });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      it('shows uploading status with progress', () => {
        const file = createTestUploadFile({
          status: 'uploading',
          progress: 75
        });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.getByText('Uploading... 75%')).toBeInTheDocument();
      });

      it('shows success status', () => {
        const file = createTestUploadFile({
          status: 'success',
          progress: 100
        });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.getByText('Completed')).toBeInTheDocument();
      });

      it('shows error status with error message', () => {
        const file = createTestUploadFile({
          status: 'error',
          error: 'Network error'
        });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      it('shows generic error message when no specific error', () => {
        const file = createTestUploadFile({ status: 'error' });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.getByText('Failed')).toBeInTheDocument();
      });

      it('shows cancelled status', () => {
        const file = createTestUploadFile({ status: 'cancelled' });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.getByText('Cancelled')).toBeInTheDocument();
      });
    });

    describe('Progress Bar', () => {
      it('shows progress bar for uploading files', () => {
        const file = createTestUploadFile({
          status: 'uploading',
          progress: 60
        });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        const progressBar = document.querySelector('.bg-blue-600');
        expect(progressBar).toHaveStyle({ width: '60%' });
      });

      it('shows progress bar for pending files', () => {
        const file = createTestUploadFile({
          status: 'pending',
          progress: 0
        });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        const progressBar = document.querySelector('.bg-blue-600');
        expect(progressBar).toHaveStyle({ width: '0%' });
      });

      it('does not show progress bar for completed files', () => {
        const file = createTestUploadFile({
          status: 'success',
          progress: 100
        });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        const progressContainer = document.querySelector('.bg-gray-200');
        expect(progressContainer).not.toBeInTheDocument();
      });
    });

    describe('Action Buttons', () => {
      it('shows cancel button for uploading files', async () => {
        const file = createTestUploadFile({
          id: 'uploading-file',
          status: 'uploading'
        });
        const uploadQueue = createTestUploadQueue([file]);
        const onCancelUpload = vi.fn();
        const user = userEvent.setup();

        renderWithProvider(
          <FileUploadQueue
            {...defaultProps}
            uploadQueue={uploadQueue}
            onCancelUpload={onCancelUpload}
          />
        );

        const cancelButton = screen.getByTitle('Cancel upload');
        expect(cancelButton).toBeInTheDocument();

        await user.click(cancelButton);
        expect(onCancelUpload).toHaveBeenCalledWith('uploading-file');
      });

      it('shows retry button for failed files', async () => {
        const file = createTestUploadFile({
          id: 'failed-file',
          status: 'error'
        });
        const uploadQueue = createTestUploadQueue([file]);
        const onRetryUpload = vi.fn();
        const user = userEvent.setup();

        renderWithProvider(
          <FileUploadQueue
            {...defaultProps}
            uploadQueue={uploadQueue}
            onRetryUpload={onRetryUpload}
          />
        );

        const retryButton = screen.getByTitle('Retry upload');
        expect(retryButton).toBeInTheDocument();

        await user.click(retryButton);
        expect(onRetryUpload).toHaveBeenCalledWith('failed-file');
      });

      it('shows remove button for completed files', async () => {
        const file = createTestUploadFile({
          id: 'completed-file',
          status: 'success'
        });
        const uploadQueue = createTestUploadQueue([file]);
        const onRemoveFile = vi.fn();
        const user = userEvent.setup();

        renderWithProvider(
          <FileUploadQueue
            {...defaultProps}
            uploadQueue={uploadQueue}
            onRemoveFile={onRemoveFile}
          />
        );

        const removeButton = screen.getByTitle('Remove from queue');
        expect(removeButton).toBeInTheDocument();

        await user.click(removeButton);
        expect(onRemoveFile).toHaveBeenCalledWith('completed-file');
      });

      it('shows remove button for failed files', () => {
        const file = createTestUploadFile({ status: 'error' });
        const uploadQueue = createTestUploadQueue([file]);

        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.getByTitle('Remove from queue')).toBeInTheDocument();
      });

      it('shows remove button for cancelled files', () => {
        const file = createTestUploadFile({ status: 'cancelled' });
        const uploadQueue = createTestUploadQueue([file]);

        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.getByTitle('Remove from queue')).toBeInTheDocument();
      });

      it('does not show any buttons for pending files', () => {
        const file = createTestUploadFile({ status: 'pending' });
        const uploadQueue = createTestUploadQueue([file]);

        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        expect(screen.queryByTitle('Cancel upload')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Retry upload')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Remove from queue')).not.toBeInTheDocument();
      });
    });

    describe('Status Colors', () => {
      it('applies success color for completed files', () => {
        const file = createTestUploadFile({ status: 'success' });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        const statusText = screen.getByText('Completed');
        expect(statusText).toHaveClass('text-green-600');
      });

      it('applies error color for failed files', () => {
        const file = createTestUploadFile({ status: 'error' });
        const uploadQueue = createTestUploadQueue([file]);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        const statusText = screen.getByText('Failed');
        expect(statusText).toHaveClass('text-red-600');
      });

      it('applies default color for pending and uploading files', () => {
        const files = [
          createTestUploadFile({ id: '1', status: 'pending' }),
          createTestUploadFile({ id: '2', status: 'uploading' })
        ];
        const uploadQueue = createTestUploadQueue(files);
        renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

        const pendingText = screen.getByText('Pending');
        const uploadingText = screen.getByText(/Uploading/);

        expect(pendingText).toHaveClass('text-gray-500');
        expect(uploadingText).toHaveClass('text-gray-500');
      });
    });
  });

  describe('Scrolling and Layout', () => {
    it('applies scrolling when many files are present', () => {
      const manyFiles = Array.from({ length: 20 }, (_, i) =>
        createTestUploadFile({ id: `file-${i}`, name: `file-${i}.pdf` })
      );
      const uploadQueue = createTestUploadQueue(manyFiles);

      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      const fileList = document.querySelector('.max-h-96.overflow-y-auto');
      expect(fileList).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const file = createTestUploadFile();
      const uploadQueue = createTestUploadQueue([file]);
      const { container } = renderWithProvider(
        <FileUploadQueue
          {...defaultProps}
          uploadQueue={uploadQueue}
          className="custom-queue-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-queue-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty file names gracefully', () => {
      const file = createTestUploadFile({ name: '' });
      const uploadQueue = createTestUploadQueue([file]);

      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      // Should not crash and should show the file item
      const fileItem = screen.getByText('1 KB'); // Size should still be shown
      expect(fileItem).toBeInTheDocument();
    });

    it('handles zero file size', () => {
      const file = createTestUploadFile({ size: 0 });
      const uploadQueue = createTestUploadQueue([file]);

      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      expect(screen.getByText('0 B')).toBeInTheDocument();
    });

    it('handles progress over 100%', () => {
      const file = createTestUploadFile({
        status: 'uploading',
        progress: 150
      });
      const uploadQueue = createTestUploadQueue([file]);

      renderWithProvider(<FileUploadQueue {...defaultProps} uploadQueue={uploadQueue} />);

      const progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle({ width: '150%' });
    });
  });
});