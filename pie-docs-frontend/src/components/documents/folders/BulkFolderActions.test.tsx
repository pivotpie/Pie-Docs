import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import BulkFolderActions from './BulkFolderActions';
import documentsSlice from '@/store/slices/documentsSlice';
import type { DocumentFolder } from '@/types/domain/Document';

// Mock folders
const mockFolders: DocumentFolder[] = [
  {
    id: 'folder-1',
    name: 'Test Folder 1',
    path: '/test-folder-1',
    type: 'regular',
    childFolders: [],
    documentCount: 5,
    totalSize: 1024,
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
      documentCount: 5,
      totalSize: 1024,
      averageFileSize: 204.8,
      lastActivity: '2024-01-01T00:00:00Z',
      fileTypeDistribution: { pdf: 3, docx: 2 }
    }
  },
  {
    id: 'folder-2',
    name: 'Test Folder 2',
    path: '/test-folder-2',
    type: 'smart',
    childFolders: [],
    documentCount: 3,
    totalSize: 512,
    dateCreated: '2024-01-02T00:00:00Z',
    dateModified: '2024-01-02T00:00:00Z',
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
      documentCount: 3,
      totalSize: 512,
      averageFileSize: 170.7,
      lastActivity: '2024-01-02T00:00:00Z',
      fileTypeDistribution: { pdf: 2, xlsx: 1 }
    }
  }
];

const createMockStore = (selectedFolderIds: string[] = []) => {
  return configureStore({
    reducer: {
      documents: documentsSlice
    },
    preloadedState: {
      documents: {
        documents: [],
        folders: mockFolders,
        folderPath: [],
        expandedFolders: new Set(),
        selectedFolderIds,
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
        }
      }
    }
  });
};

const renderWithProvider = (component: React.ReactElement, selectedFolderIds: string[] = []) => {
  const store = createMockStore(selectedFolderIds);
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  };
};

describe('BulkFolderActions', () => {
  const defaultProps = {
    isVisible: true,
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility Control', () => {
    it('should not render when not visible', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} isVisible={false} />, ['folder-1']);

      expect(screen.queryByText(/folder selected/)).not.toBeInTheDocument();
    });

    it('should not render when no folders selected', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, []);

      expect(screen.queryByText(/folder selected/)).not.toBeInTheDocument();
    });

    it('should render when visible and folders selected', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      expect(screen.getByText('1 folder selected')).toBeInTheDocument();
    });

    it('should show correct folder count for multiple selections', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1', 'folder-2']);

      expect(screen.getByText('2 folders selected')).toBeInTheDocument();
    });
  });

  describe('Operation Selection', () => {
    it('should show all operation buttons', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      expect(screen.getByText('Move')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should allow selecting move operation', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Move'));

      expect(screen.getByText('Move Folders')).toBeInTheDocument();
    });

    it('should allow selecting copy operation', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Copy'));

      expect(screen.getByText('Copy Folders')).toBeInTheDocument();
    });

    it('should allow selecting delete operation', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByText('Delete Folders')).toBeInTheDocument();
    });
  });

  describe('Move Operation', () => {
    it('should show target folder selection for move', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Move'));

      expect(screen.getByText('Target Folder')).toBeInTheDocument();
    });

    it('should enable move button when target selected', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Move'));

      const moveButton = screen.getByRole('button', { name: 'Move Folders' });
      expect(moveButton).toBeInTheDocument();
    });

    it('should allow going back from move configuration', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Move'));
      fireEvent.click(screen.getByText('Back'));

      expect(screen.getByText('1 folder selected')).toBeInTheDocument();
    });
  });

  describe('Copy Operation', () => {
    it('should show preserve structure option for copy', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Copy'));

      expect(screen.getByText('Preserve folder structure')).toBeInTheDocument();
    });

    it('should have preserve structure checked by default', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Copy'));

      const checkbox = screen.getByRole('checkbox', { name: /preserve folder structure/i });
      expect(checkbox).toBeChecked();
    });

    it('should allow toggling preserve structure option', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Copy'));

      const checkbox = screen.getByRole('checkbox', { name: /preserve folder structure/i });
      fireEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Delete Operation', () => {
    it('should show confirmation warning for delete', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByText(/This action will permanently delete/)).toBeInTheDocument();
    });

    it('should require confirmation text for delete', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByPlaceholderText('delete')).toBeInTheDocument();
    });

    it('should disable delete button until confirmation entered', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Delete'));

      const deleteButton = screen.getByRole('button', { name: 'Delete Folders' });
      expect(deleteButton).toBeDisabled();
    });

    it('should enable delete button when correct confirmation entered', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Delete'));

      const confirmInput = screen.getByPlaceholderText('delete');
      fireEvent.change(confirmInput, { target: { value: 'delete' } });

      const deleteButton = screen.getByRole('button', { name: 'Delete Folders' });
      expect(deleteButton).toBeEnabled();
    });
  });

  describe('Progress Tracking', () => {
    it('should show progress during operation execution', async () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Delete'));

      const confirmInput = screen.getByPlaceholderText('delete');
      fireEvent.change(confirmInput, { target: { value: 'delete' } });

      const deleteButton = screen.getByRole('button', { name: 'Delete Folders' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Deleting Folders...')).toBeInTheDocument();
      });
    });

    it('should show progress bar during operation', async () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Move'));

      const moveButton = screen.getByRole('button', { name: 'Move Folders' });
      fireEvent.click(moveButton);

      await waitFor(() => {
        expect(screen.getByText(/completed/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error messages for failed operations', async () => {
      // Mock a failing operation
      vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Move'));

      const moveButton = screen.getByRole('button', { name: 'Move Folders' });
      fireEvent.click(moveButton);

      // Wait for operation completion
      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Cancel and Close', () => {
    it('should call onClose when cancel is clicked', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Cancel'));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should reset operation when back is clicked', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Move'));
      fireEvent.click(screen.getByText('Back'));

      expect(screen.getByText('1 folder selected')).toBeInTheDocument();
    });

    it('should not allow closing during operation', async () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Delete'));

      const confirmInput = screen.getByPlaceholderText('delete');
      fireEvent.change(confirmInput, { target: { value: 'delete' } });

      const deleteButton = screen.getByRole('button', { name: 'Delete Folders' });
      fireEvent.click(deleteButton);

      // Should not have cancel button during processing
      await waitFor(() => {
        expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles and labels', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('should provide clear operation descriptions', () => {
      renderWithProvider(<BulkFolderActions {...defaultProps} />, ['folder-1']);

      fireEvent.click(screen.getByText('Delete'));

      expect(screen.getByText(/permanently delete 1 folder/)).toBeInTheDocument();
    });
  });
});