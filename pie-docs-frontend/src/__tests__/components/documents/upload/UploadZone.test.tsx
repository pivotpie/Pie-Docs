import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { UploadZone } from '@/components/documents/UploadZone';
import documentsReducer from '@/store/slices/documentsSlice';
import type { UploadZoneProps } from '@/types/domain/Upload';

// Mock FileValidator
vi.mock('@/utils/validation/fileValidator', () => ({
  FileValidator: {
    getAcceptAttribute: vi.fn(() => '.pdf,.doc,.docx,.jpg,.png'),
    formatFileSize: vi.fn((size: number) => `${size} bytes`),
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

// Create test files
const createTestFile = (name: string, type: string, size: number) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('UploadZone Component', () => {
  const defaultProps: UploadZoneProps = {
    onFilesAdded: vi.fn(),
    onFolderAdded: vi.fn(),
    disabled: false,
    maxFiles: 50,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders upload zone with default content', () => {
      renderWithProvider(<UploadZone {...defaultProps} />);

      expect(screen.getByText('Upload your documents')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop files here, or click to browse')).toBeInTheDocument();
      expect(screen.getByText(/Supports: PDF, Word, Excel/)).toBeInTheDocument();
    });

    it('renders custom children when provided', () => {
      const customContent = <div>Custom Upload Content</div>;
      renderWithProvider(
        <UploadZone {...defaultProps}>
          {customContent}
        </UploadZone>
      );

      expect(screen.getByText('Custom Upload Content')).toBeInTheDocument();
      expect(screen.queryByText('Upload your documents')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderWithProvider(
        <UploadZone {...defaultProps} className="custom-class" />
      );

      const uploadButton = screen.getByRole('button');
      expect(uploadButton.parentElement).toHaveClass('custom-class');
    });
  });

  describe('Disabled State', () => {
    it('shows disabled state when disabled prop is true', () => {
      renderWithProvider(<UploadZone {...defaultProps} disabled={true} />);

      const uploadZone = screen.getByRole('button');
      expect(uploadZone).toHaveAttribute('aria-disabled', 'true');
      expect(uploadZone).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('shows disabled state when uploading', () => {
      const initialState = {
        uploadQueue: { isUploading: true }
      };

      renderWithProvider(<UploadZone {...defaultProps} />, { initialState });

      const uploadZone = screen.getByRole('button');
      expect(uploadZone).toHaveAttribute('aria-disabled', 'true');
    });

    it('shows uploading indicator when uploading', () => {
      const initialState = {
        uploadQueue: { isUploading: true }
      };

      renderWithProvider(<UploadZone {...defaultProps} />, { initialState });

      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  describe('Click to Upload', () => {
    it('opens file dialog when clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<UploadZone {...defaultProps} />);

      const uploadZone = screen.getByRole('button');
      await user.click(uploadZone);

      // File input should be clicked (though we can't directly test the file dialog)
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('opens file dialog when Enter key is pressed', async () => {
      const user = userEvent.setup();
      renderWithProvider(<UploadZone {...defaultProps} />);

      const uploadZone = screen.getByRole('button');
      uploadZone.focus();
      await user.keyboard('{Enter}');

      // File input should exist
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('opens file dialog when Space key is pressed', async () => {
      const user = userEvent.setup();
      renderWithProvider(<UploadZone {...defaultProps} />);

      const uploadZone = screen.getByRole('button');
      uploadZone.focus();
      await user.keyboard(' ');

      // File input should exist
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('does not respond to clicks when disabled', async () => {
      const user = userEvent.setup();
      renderWithProvider(<UploadZone {...defaultProps} disabled={true} />);

      const uploadZone = screen.getByRole('button');
      await user.click(uploadZone);

      // Should not focus or activate
      expect(uploadZone).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('File Input Handling', () => {
    it('processes files when file input changes', async () => {
      const onFilesAdded = vi.fn();
      renderWithProvider(<UploadZone {...defaultProps} onFilesAdded={onFilesAdded} />);

      const file = createTestFile('test.pdf', 'application/pdf', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(onFilesAdded).toHaveBeenCalledWith([file]);
      });
    });

    it('resets file input value after processing', async () => {
      renderWithProvider(<UploadZone {...defaultProps} />);

      const file = createTestFile('test.pdf', 'application/pdf', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });
    });

    it('handles multiple files', async () => {
      const onFilesAdded = vi.fn();
      renderWithProvider(<UploadZone {...defaultProps} onFilesAdded={onFilesAdded} />);

      const files = [
        createTestFile('test1.pdf', 'application/pdf', 1024),
        createTestFile('test2.jpg', 'image/jpeg', 2048)
      ];
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        expect(onFilesAdded).toHaveBeenCalledWith(files);
      });
    });

    it('limits number of files based on maxFiles prop', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      renderWithProvider(<UploadZone {...defaultProps} maxFiles={2} />);

      const files = [
        createTestFile('test1.pdf', 'application/pdf', 1024),
        createTestFile('test2.pdf', 'application/pdf', 1024),
        createTestFile('test3.pdf', 'application/pdf', 1024)
      ];
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files } });

      expect(consoleWarn).toHaveBeenCalledWith('Too many files selected. Maximum 2 files allowed.');
    });
  });

  describe('Drag and Drop', () => {
    let uploadZone: HTMLElement;

    beforeEach(() => {
      renderWithProvider(<UploadZone {...defaultProps} />);
      uploadZone = screen.getByRole('button');
    });

    it('shows drag over state when files are dragged over', () => {
      const dragEvent = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      // Mock dataTransfer.items
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {
          items: [{ kind: 'file' }],
          dropEffect: 'none'
        }
      });

      fireEvent(uploadZone, dragEvent);

      expect(uploadZone).toHaveClass('border-blue-500', 'bg-blue-100', 'scale-105');
      expect(screen.getByText('Drop files here')).toBeInTheDocument();
    });

    it('removes drag over state when drag leaves', () => {
      // Enter drag state first
      const dragEnterEvent = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(dragEnterEvent, 'dataTransfer', {
        value: { items: [{ kind: 'file' }] }
      });
      fireEvent(uploadZone, dragEnterEvent);

      // Then leave
      const dragLeaveEvent = new DragEvent('dragleave', {
        bubbles: true,
        cancelable: true
      });
      fireEvent(uploadZone, dragLeaveEvent);

      expect(uploadZone).not.toHaveClass('border-blue-500', 'bg-blue-100', 'scale-105');
    });

    it('processes dropped files', async () => {
      const onFilesAdded = vi.fn();
      renderWithProvider(<UploadZone {...defaultProps} onFilesAdded={onFilesAdded} />);
      uploadZone = screen.getByRole('button');

      const file = createTestFile('test.pdf', 'application/pdf', 1024);
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true
      });

      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [file],
          items: []
        }
      });

      fireEvent(uploadZone, dropEvent);

      await waitFor(() => {
        expect(onFilesAdded).toHaveBeenCalledWith([file]);
      });
    });

    it('sets correct drop effect on drag over', () => {
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true
      });

      const dataTransfer = { dropEffect: 'none' };
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: dataTransfer,
        writable: true
      });

      fireEvent(uploadZone, dragOverEvent);

      expect(dataTransfer.dropEffect).toBe('copy');
    });

    it('does not respond to drag events when disabled', () => {
      renderWithProvider(<UploadZone {...defaultProps} disabled={true} />);
      uploadZone = screen.getByRole('button');

      const dragEvent = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: { items: [{ kind: 'file' }] }
      });

      fireEvent(uploadZone, dragEvent);

      expect(uploadZone).not.toHaveClass('border-blue-500', 'bg-blue-100');
    });
  });

  describe('File Validation Integration', () => {
    it('calls FileValidator.validateFiles before processing', async () => {
      const { FileValidator } = await import('@/utils/validation/fileValidator');
      renderWithProvider(<UploadZone {...defaultProps} />);

      const file = createTestFile('test.pdf', 'application/pdf', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(FileValidator.validateFiles).toHaveBeenCalledWith([file]);
      });
    });

    it('does not process files when validation fails', async () => {
      const { FileValidator } = await import('@/utils/validation/fileValidator');
      vi.mocked(FileValidator.validateFiles).mockReturnValue({
        isValid: false,
        errors: ['Invalid file type'],
        warnings: []
      });

      const onFilesAdded = vi.fn();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProvider(<UploadZone {...defaultProps} onFilesAdded={onFilesAdded} />);

      const file = createTestFile('test.txt', 'text/plain', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(onFilesAdded).not.toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalledWith('File validation failed:', ['Invalid file type']);
      });
    });

    it('shows warnings but still processes valid files', async () => {
      const { FileValidator } = await import('@/utils/validation/fileValidator');
      vi.mocked(FileValidator.validateFiles).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['Large file warning']
      });

      const onFilesAdded = vi.fn();
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderWithProvider(<UploadZone {...defaultProps} onFilesAdded={onFilesAdded} />);

      const file = createTestFile('test.pdf', 'application/pdf', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(onFilesAdded).toHaveBeenCalledWith([file]);
        expect(consoleWarn).toHaveBeenCalledWith('File validation warnings:', ['Large file warning']);
      });
    });
  });

  describe('Redux Integration', () => {
    it('dispatches addFilesToQueue action when files are processed', async () => {
      const store = createTestStore();
      const onFilesAdded = vi.fn();

      renderWithProvider(
        <UploadZone {...defaultProps} onFilesAdded={onFilesAdded} />,
        { store }
      );

      const file = createTestFile('test.pdf', 'application/pdf', 1024);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const state = store.getState();
        expect(state.documents.uploadQueue.files).toHaveLength(1);
        expect(state.documents.uploadQueue.files[0].name).toBe('test.pdf');
      });
    });

    it('generates unique IDs for uploaded files', async () => {
      const store = createTestStore();

      renderWithProvider(<UploadZone {...defaultProps} />, { store });

      const files = [
        createTestFile('test1.pdf', 'application/pdf', 1024),
        createTestFile('test2.pdf', 'application/pdf', 1024)
      ];
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        const state = store.getState();
        const uploadFiles = state.documents.uploadQueue.files;
        expect(uploadFiles).toHaveLength(2);
        expect(uploadFiles[0].id).not.toBe(uploadFiles[1].id);
        expect(uploadFiles[0].id).toMatch(/^\d+-[a-z0-9]{9}$/);
      });
    });
  });

  describe('Folder Upload', () => {
    it('renders folder input when onFolderAdded is provided', () => {
      renderWithProvider(<UploadZone {...defaultProps} onFolderAdded={vi.fn()} />);

      const folderInput = document.querySelector('input[webkitdirectory]');
      expect(folderInput).toBeInTheDocument();
    });

    it('does not render folder input when onFolderAdded is not provided', () => {
      renderWithProvider(<UploadZone {...defaultProps} onFolderAdded={undefined} />);

      const folderInput = document.querySelector('input[webkitdirectory]');
      expect(folderInput).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProvider(<UploadZone {...defaultProps} />);

      const uploadZone = screen.getByRole('button');
      expect(uploadZone).toHaveAttribute('aria-label', 'Upload files by clicking or dragging and dropping');
      expect(uploadZone).toHaveAttribute('tabIndex', '0');
    });

    it('has proper ARIA attributes when disabled', () => {
      renderWithProvider(<UploadZone {...defaultProps} disabled={true} />);

      const uploadZone = screen.getByRole('button');
      expect(uploadZone).toHaveAttribute('aria-disabled', 'true');
      expect(uploadZone).toHaveAttribute('tabIndex', '-1');
    });

    it('hidden file inputs have aria-hidden', () => {
      renderWithProvider(<UploadZone {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('aria-hidden', 'true');
    });
  });
});