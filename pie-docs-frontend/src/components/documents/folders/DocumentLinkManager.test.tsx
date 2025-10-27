import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import DocumentLinkManager from './DocumentLinkManager';
import documentsSlice from '@/store/slices/documentsSlice';
import type { Document, DocumentFolder } from '@/types/domain/Document';

// Mock data
const mockDocument: Document = {
  id: 'doc-1',
  name: 'Test Document.pdf',
  type: 'pdf',
  status: 'published',
  size: 1024 * 1024, // 1MB
  dateCreated: '2024-01-01T00:00:00Z',
  dateModified: '2024-01-01T00:00:00Z',
  path: '/folder1/Test Document.pdf',
  downloadUrl: 'http://example.com/doc1.pdf',
  parentFolderId: 'folder-1',
  metadata: {
    tags: ['test'],
    author: 'Test Author',
    version: 1
  },
  permissions: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canShare: true
  }
};

const mockFolders: DocumentFolder[] = [
  {
    id: 'folder-1',
    name: 'Primary Folder',
    path: '/Primary Folder',
    type: 'regular',
    childFolders: [],
    documentCount: 1,
    totalSize: 1024 * 1024,
    dateCreated: '2024-01-01T00:00:00Z',
    dateModified: '2024-01-01T00:00:00Z',
    documentRefs: [],
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreateChild: true,
      canManagePermissions: true,
      inheritPermissions: true
    },
    statistics: {
      documentCount: 1,
      totalSize: 1024 * 1024,
      averageFileSize: 1024 * 1024,
      lastActivity: '2024-01-01T00:00:00Z',
      fileTypeDistribution: { pdf: 1 } as any
    }
  },
  {
    id: 'folder-2',
    name: 'Secondary Folder',
    path: '/Secondary Folder',
    type: 'regular',
    childFolders: [],
    documentCount: 0,
    totalSize: 0,
    dateCreated: '2024-01-01T00:00:00Z',
    dateModified: '2024-01-01T00:00:00Z',
    documentRefs: [],
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreateChild: true,
      canManagePermissions: true,
      inheritPermissions: true
    },
    statistics: {
      documentCount: 0,
      totalSize: 0,
      averageFileSize: 0,
      lastActivity: '2024-01-01T00:00:00Z',
      fileTypeDistribution: {}
    }
  },
  {
    id: 'folder-3',
    name: 'Linked Folder',
    path: '/Linked Folder',
    type: 'regular',
    childFolders: [],
    documentCount: 1,
    totalSize: 0,
    dateCreated: '2024-01-01T00:00:00Z',
    dateModified: '2024-01-01T00:00:00Z',
    documentRefs: ['doc-1'], // Already linked
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreateChild: true,
      canManagePermissions: true,
      inheritPermissions: true
    },
    statistics: {
      documentCount: 1,
      totalSize: 0,
      averageFileSize: 0,
      lastActivity: '2024-01-01T00:00:00Z',
      fileTypeDistribution: {}
    }
  }
];

// Mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      documents: documentsSlice
    },
    preloadedState: {
      documents: {
        documents: [mockDocument],
        folders: mockFolders,
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
        totalCount: 1,
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

describe('DocumentLinkManager', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    documentId: 'doc-1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render when open', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      expect(screen.getByText('Manage Document Locations')).toBeInTheDocument();
      expect(screen.getByText('Add this document to multiple folders without creating duplicates')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Manage Document Locations')).not.toBeInTheDocument();
    });

    it('should show document information', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      expect(screen.getByText('Document: Test Document.pdf')).toBeInTheDocument();
      expect(screen.getByText('Type: PDF')).toBeInTheDocument();
      expect(screen.getByText('Size: 1.00 MB')).toBeInTheDocument();
    });
  });

  describe('Primary Folder Display', () => {
    it('should show primary folder information', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      expect(screen.getByText('Original Location')).toBeInTheDocument();
      expect(screen.getByText('/Primary Folder')).toBeInTheDocument();
      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    it('should explain that primary location cannot be removed', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      expect(screen.getByText(/This is where the document actually resides/)).toBeInTheDocument();
    });
  });

  describe('Folder List', () => {
    it('should show all available folders', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      expect(screen.getByText('Primary Folder')).toBeInTheDocument();
      expect(screen.getByText('Secondary Folder')).toBeInTheDocument();
      expect(screen.getByText('Linked Folder')).toBeInTheDocument();
    });

    it('should show primary folder as checked and disabled', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const primaryCheckbox = screen.getAllByRole('checkbox').find(cb =>
        cb.closest('div')?.textContent?.includes('Primary Folder')
      );

      expect(primaryCheckbox).toBeChecked();
      expect(primaryCheckbox).toBeDisabled();
    });

    it('should show linked folder as checked', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const linkedCheckbox = screen.getAllByRole('checkbox').find(cb =>
        cb.closest('div')?.textContent?.includes('Linked Folder')
      );

      expect(linkedCheckbox).toBeChecked();
      expect(linkedCheckbox).not.toBeDisabled();
    });

    it('should show unlinked folder as unchecked', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const secondaryCheckbox = screen.getAllByRole('checkbox').find(cb =>
        cb.closest('div')?.textContent?.includes('Secondary Folder')
      );

      expect(secondaryCheckbox).not.toBeChecked();
      expect(secondaryCheckbox).not.toBeDisabled();
    });
  });

  describe('Search Functionality', () => {
    it('should filter folders based on search query', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search by folder name or path...');
      fireEvent.change(searchInput, { target: { value: 'Secondary' } });

      expect(screen.getByText('Secondary Folder')).toBeInTheDocument();
      expect(screen.queryByText('Primary Folder')).not.toBeInTheDocument();
      expect(screen.queryByText('Linked Folder')).not.toBeInTheDocument();
    });

    it('should show "No folders found" when search has no results', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search by folder name or path...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No folders found matching your search.')).toBeInTheDocument();
    });
  });

  describe('Folder Selection', () => {
    it('should allow selecting unlinked folders', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const secondaryCheckbox = screen.getAllByRole('checkbox').find(cb =>
        cb.closest('div')?.textContent?.includes('Secondary Folder')
      );

      fireEvent.click(secondaryCheckbox!);
      expect(secondaryCheckbox).toBeChecked();
    });

    it('should allow deselecting linked folders (except primary)', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const linkedCheckbox = screen.getAllByRole('checkbox').find(cb =>
        cb.closest('div')?.textContent?.includes('Linked Folder')
      );

      fireEvent.click(linkedCheckbox!);
      expect(linkedCheckbox).not.toBeChecked();
    });
  });

  describe('Summary Display', () => {
    it('should show folder count summary', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      expect(screen.getByText(/Total folders selected:/)).toBeInTheDocument();
      expect(screen.getByText(/Additional references:/)).toBeInTheDocument();
    });

    it('should update summary when selections change', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      // Initially: Primary (1) + Linked (1) = 2 total, 1 additional
      expect(screen.getByText('Total folders selected: 2')).toBeInTheDocument();
      expect(screen.getByText('Additional references: 1')).toBeInTheDocument();

      // Add secondary folder
      const secondaryCheckbox = screen.getAllByRole('checkbox').find(cb =>
        cb.closest('div')?.textContent?.includes('Secondary Folder')
      );
      fireEvent.click(secondaryCheckbox!);

      // Now: Primary (1) + Linked (1) + Secondary (1) = 3 total, 2 additional
      expect(screen.getByText('Total folders selected: 3')).toBeInTheDocument();
      expect(screen.getByText('Additional references: 2')).toBeInTheDocument();
    });
  });

  describe('Saving Changes', () => {
    it('should call onClose when save is successful', async () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('should show updating state during save', async () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });

    it('should disable save button during update', async () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      expect(saveButton).toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onClose when cancel is clicked', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should not render when document is not found', () => {
      renderWithProvider(<DocumentLinkManager {...defaultProps} documentId="nonexistent" />);

      expect(screen.queryByText('Manage Document Locations')).not.toBeInTheDocument();
    });
  });
});