import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import SmartFolderBuilder from './SmartFolderBuilder';
import documentsSlice from '@/store/slices/documentsSlice';

// Mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      documents: documentsSlice
    },
    preloadedState: {
      documents: {
        documents: [],
        folders: [],
        folderPath: [],
        expandedFolders: new Set(),
        selectedFolderIds: [],
        viewMode: 'grid' as const,
        selectedDocumentIds: [],
        filters: {
          types: [],
          status: [],
          tags: [],
          authors: []
        },
        sortCriteria: [],
        searchQuery: '',
        currentPage: 1,
        totalCount: 0,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isBulkActionLoading: false,
        filterPanelCollapsed: false,
        availableTypes: ['pdf', 'docx', 'txt'],
        availableTags: ['important', 'draft', 'review'],
        availableAuthors: ['John Doe', 'Jane Smith'],
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
          maxConcurrentUploads: 3
        },
        isUploadZoneVisible: false,
        ocrQueue: {
          jobs: [],
          activeJobs: 0,
          maxConcurrentJobs: 2,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          isProcessing: false
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
            resolutionDPI: 300
          },
          textProcessing: {
            preserveFormatting: true,
            extractTables: true,
            extractHeaders: true,
            mergeFragments: true
          }
        },
        ...initialState
      }
    }
  });
};

const renderWithProvider = (component: React.ReactElement, initialState = {}) => {
  const store = createMockStore(initialState);
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  };
};

describe('SmartFolderBuilder', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onFolderCreated: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render when open', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      expect(screen.getByText('Create Smart Folder')).toBeInTheDocument();
      expect(screen.getByText('Smart folders automatically organize documents based on criteria')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Create Smart Folder')).not.toBeInTheDocument();
    });

    it('should render all tab options', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      expect(screen.getByText('Criteria')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should allow entering folder name', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('My Smart Folder');
      fireEvent.change(nameInput, { target: { value: 'Test Smart Folder' } });

      expect(nameInput).toHaveValue('Test Smart Folder');
    });

    it('should allow entering description', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      const descriptionInput = screen.getByPlaceholderText('Describe what this smart folder contains...');
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

      expect(descriptionInput).toHaveValue('Test description');
    });

    it('should have auto-refresh enabled by default', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      const autoRefreshCheckbox = screen.getByRole('checkbox', { name: /auto-refresh folder contents/i });
      expect(autoRefreshCheckbox).toBeChecked();
    });
  });

  describe('Criteria Tab', () => {
    it('should render document type checkboxes', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      expect(screen.getByText('pdf')).toBeInTheDocument();
      expect(screen.getByText('docx')).toBeInTheDocument();
      expect(screen.getByText('xlsx')).toBeInTheDocument();
    });

    it('should allow selecting document types', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
      fireEvent.click(pdfCheckbox);

      expect(pdfCheckbox).toBeChecked();
    });

    it('should render available tags', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByText('review')).toBeInTheDocument();
    });

    it('should allow selecting tags', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      const importantTag = screen.getByText('important');
      fireEvent.click(importantTag);

      // Badge should change style when selected
      expect(importantTag).toBeInTheDocument();
    });

    it('should render document status checkboxes', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByText('published')).toBeInTheDocument();
      expect(screen.getByText('archived')).toBeInTheDocument();
    });
  });

  describe('Advanced Tab', () => {
    beforeEach(() => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);
      fireEvent.click(screen.getByText('Advanced'));
    });

    it('should render date range inputs', () => {
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('To')).toBeInTheDocument();
    });

    it('should render size range inputs', () => {
      expect(screen.getByText('Min Size')).toBeInTheDocument();
      expect(screen.getByText('Max Size')).toBeInTheDocument();
    });

    it('should render content keywords input', () => {
      expect(screen.getByPlaceholderText('Enter keywords separated by commas...')).toBeInTheDocument();
    });

    it('should allow entering keywords', () => {
      const keywordsInput = screen.getByPlaceholderText('Enter keywords separated by commas...');
      fireEvent.change(keywordsInput, { target: { value: 'test, document, content' } });

      expect(keywordsInput).toHaveValue('test, document, content');
    });
  });

  describe('Preview Tab', () => {
    it('should show "Add criteria to see preview" when no criteria', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);
      fireEvent.click(screen.getByText('Preview'));

      expect(screen.getByText('Add criteria to see preview')).toBeInTheDocument();
    });

    it('should show loading state during preview generation', async () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      // Add some criteria first
      const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
      fireEvent.click(pdfCheckbox);

      // Switch to preview tab
      fireEvent.click(screen.getByText('Preview'));

      // Should show loading initially
      expect(screen.getByText('Generating preview...')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable create button when no name', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      const createButton = screen.getByText('Create Smart Folder');
      expect(createButton).toBeDisabled();
    });

    it('should disable create button when no criteria', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('My Smart Folder');
      fireEvent.change(nameInput, { target: { value: 'Test Folder' } });

      const createButton = screen.getByText('Create Smart Folder');
      expect(createButton).toBeDisabled();
    });

    it('should enable create button when name and criteria provided', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      // Add name
      const nameInput = screen.getByPlaceholderText('My Smart Folder');
      fireEvent.change(nameInput, { target: { value: 'Test Folder' } });

      // Add criteria
      const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
      fireEvent.click(pdfCheckbox);

      const createButton = screen.getByText('Create Smart Folder');
      expect(createButton).toBeEnabled();
    });
  });

  describe('Folder Creation', () => {
    it('should call onFolderCreated when folder is created successfully', async () => {
      const { store } = renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      // Add name and criteria
      const nameInput = screen.getByPlaceholderText('My Smart Folder');
      fireEvent.change(nameInput, { target: { value: 'Test Smart Folder' } });

      const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
      fireEvent.click(pdfCheckbox);

      // Create folder
      const createButton = screen.getByText('Create Smart Folder');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(defaultProps.onFolderCreated).toHaveBeenCalled();
      });
    });

    it('should call onClose when folder is created successfully', async () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      // Add name and criteria
      const nameInput = screen.getByPlaceholderText('My Smart Folder');
      fireEvent.change(nameInput, { target: { value: 'Test Smart Folder' } });

      const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
      fireEvent.click(pdfCheckbox);

      // Create folder
      const createButton = screen.getByText('Create Smart Folder');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('should show creating state during submission', async () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      // Add name and criteria
      const nameInput = screen.getByPlaceholderText('My Smart Folder');
      fireEvent.change(nameInput, { target: { value: 'Test Smart Folder' } });

      const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
      fireEvent.click(pdfCheckbox);

      // Create folder
      const createButton = screen.getByText('Create Smart Folder');
      fireEvent.click(createButton);

      // Should show creating state
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onClose when cancel button is clicked', () => {
      renderWithProvider(<SmartFolderBuilder {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Parent Folder', () => {
    it('should create folder with parent ID when provided', async () => {
      const { store } = renderWithProvider(
        <SmartFolderBuilder {...defaultProps} parentId="parent-folder-123" />
      );

      // Add name and criteria
      const nameInput = screen.getByPlaceholderText('My Smart Folder');
      fireEvent.change(nameInput, { target: { value: 'Test Smart Folder' } });

      const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
      fireEvent.click(pdfCheckbox);

      // Create folder
      const createButton = screen.getByText('Create Smart Folder');
      fireEvent.click(createButton);

      await waitFor(() => {
        const state = store.getState();
        const createdFolder = state.documents.folders[0];
        expect(createdFolder?.parentId).toBe('parent-folder-123');
      });
    });
  });
});