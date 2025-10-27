import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import EnhancedFolderTreeView from './EnhancedFolderTreeView';
import documentsSlice from '@/store/slices/documentsSlice';
import type { DocumentFolder } from '@/types/domain/Document';

// Mock folders with hierarchy
const mockFolders: DocumentFolder[] = [
  {
    id: 'folder-1',
    name: 'Documents',
    path: '/documents',
    type: 'regular',
    childFolders: ['folder-2', 'folder-3'],
    documentCount: 10,
    totalSize: 2048,
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
      documentCount: 10,
      totalSize: 2048,
      averageFileSize: 204.8,
      lastActivity: '2024-01-01T00:00:00Z',
      fileTypeDistribution: { pdf: 6, docx: 4 }
    }
  },
  {
    id: 'folder-2',
    name: 'Projects',
    path: '/documents/projects',
    type: 'regular',
    parentId: 'folder-1',
    childFolders: [],
    documentCount: 5,
    totalSize: 1024,
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
      documentCount: 5,
      totalSize: 1024,
      averageFileSize: 204.8,
      lastActivity: '2024-01-02T00:00:00Z',
      fileTypeDistribution: { pdf: 3, docx: 2 }
    }
  },
  {
    id: 'folder-3',
    name: 'Archive',
    path: '/documents/archive',
    type: 'smart',
    parentId: 'folder-1',
    childFolders: [],
    documentCount: 15,
    totalSize: 3072,
    dateCreated: '2024-01-03T00:00:00Z',
    dateModified: '2024-01-03T00:00:00Z',
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
      documentCount: 15,
      totalSize: 3072,
      averageFileSize: 204.8,
      lastActivity: '2024-01-03T00:00:00Z',
      fileTypeDistribution: { pdf: 10, docx: 5 }
    }
  }
];

const createMockStore = (expandedFolders: string[] = [], selectedFolders: string[] = []) => {
  return configureStore({
    reducer: {
      documents: documentsSlice
    },
    preloadedState: {
      documents: {
        documents: [],
        folders: mockFolders,
        folderPath: [],
        expandedFolders: expandedFolders,
        selectedFolderIds: selectedFolders,
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

const renderWithProvider = (component: React.ReactElement, expandedFolders: string[] = [], selectedFolders: string[] = []) => {
  const store = createMockStore(expandedFolders, selectedFolders);
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  };
};

describe('EnhancedFolderTreeView', () => {
  const defaultProps = {
    onFolderSelect: vi.fn(),
    onFolderContextMenu: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render folder tree', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should show document counts for folders', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      expect(screen.getByText('10')).toBeInTheDocument(); // Documents folder count
    });

    it('should display correct folder icons', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      // Regular folder should show folder icon
      const documentsFolder = screen.getByText('Documents').closest('div');
      expect(documentsFolder).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should render search input when searchable enabled', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} searchable={true} />);

      expect(screen.getByPlaceholderText('Search folders...')).toBeInTheDocument();
    });

    it('should not render search input when searchable disabled', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} searchable={false} />);

      expect(screen.queryByPlaceholderText('Search folders...')).not.toBeInTheDocument();
    });

    it('should filter folders based on search query', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} searchable={true} />);

      const searchInput = screen.getByPlaceholderText('Search folders...');
      fireEvent.change(searchInput, { target: { value: 'archive' } });

      expect(screen.getByText('Archive')).toBeInTheDocument();
    });

    it('should show no results message when search has no matches', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} searchable={true} />);

      const searchInput = screen.getByPlaceholderText('Search folders...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No folders match your search')).toBeInTheDocument();
    });
  });

  describe('Folder Expansion', () => {
    it('should show expand/collapse indicators for folders with children', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      // Documents folder has children, should show expand indicator
      const expandButton = screen.getByLabelText('Expand folder');
      expect(expandButton).toBeInTheDocument();
    });

    it('should expand folder when expand button clicked', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      const expandButton = screen.getByLabelText('Expand folder');
      fireEvent.click(expandButton);

      expect(screen.getByLabelText('Collapse folder')).toBeInTheDocument();
    });

    it('should show child folders when parent is expanded', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />, ['folder-1']);

      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
    });

    it('should toggle expansion on double click', () => {
      const { store } = renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.doubleClick(documentsFolder);

      // Check if toggle action was dispatched
      const state = store.getState();
      expect(state.documents.expandedFolders.includes('folder-1')).toBe(true);
    });
  });

  describe('Folder Selection', () => {
    it('should select folder on click', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.click(documentsFolder);

      expect(defaultProps.onFolderSelect).toHaveBeenCalledWith('folder-1');
    });

    it('should handle multi-select with Ctrl key', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.click(documentsFolder, { ctrlKey: true });

      expect(defaultProps.onFolderSelect).toHaveBeenCalledWith('folder-1');
    });

    it('should handle range select with Shift key', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />, [], ['folder-1']);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.click(documentsFolder, { shiftKey: true });

      expect(defaultProps.onFolderSelect).toHaveBeenCalledWith('folder-1');
    });

    it('should show selected state for selected folders', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />, [], ['folder-1']);

      const documentsFolder = screen.getByText('Documents').closest('div');
      expect(documentsFolder).toHaveClass('bg-blue-100');
    });
  });

  describe('Context Menu', () => {
    it('should show context menu on right click when enabled', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      expect(screen.getByText('Create Folder')).toBeInTheDocument();
      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not show context menu when disabled', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={false} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      expect(screen.queryByText('Create Folder')).not.toBeInTheDocument();
    });

    it('should call onFolderContextMenu when context menu opened', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      expect(defaultProps.onFolderContextMenu).toHaveBeenCalled();
    });

    it('should hide context menu when clicking outside', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      expect(screen.getByText('Create Folder')).toBeInTheDocument();

      fireEvent.click(document.body);

      expect(screen.queryByText('Create Folder')).not.toBeInTheDocument();
    });
  });

  describe('Folder Operations', () => {
    it('should support folder creation from context menu', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      const createButton = screen.getByText('Create Folder');
      fireEvent.click(createButton);

      // Context menu should close after operation
      expect(screen.queryByText('Create Folder')).not.toBeInTheDocument();
    });

    it('should support folder deletion from context menu', () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this folder?');

      confirmSpy.mockRestore();
    });

    it('should enter rename mode when rename selected', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      const renameButton = screen.getByText('Rename');
      fireEvent.click(renameButton);

      expect(screen.getByDisplayValue('Documents')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Enter key for selection when enabled', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} enableKeyboardNavigation={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.keyDown(documentsFolder, { key: 'Enter' });

      expect(defaultProps.onFolderSelect).toHaveBeenCalledWith('folder-1');
    });

    it('should support F2 key for rename when enabled', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} enableKeyboardNavigation={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.keyDown(documentsFolder, { key: 'F2' });

      expect(screen.getByDisplayValue('Documents')).toBeInTheDocument();
    });

    it('should support arrow keys for expansion when enabled', () => {
      const { store } = renderWithProvider(<EnhancedFolderTreeView {...defaultProps} enableKeyboardNavigation={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.keyDown(documentsFolder, { key: 'ArrowRight' });

      const state = store.getState();
      expect(state.documents.expandedFolders.includes('folder-1')).toBe(true);
    });

    it('should not handle keyboard events when disabled', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} enableKeyboardNavigation={false} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.keyDown(documentsFolder, { key: 'Enter' });

      expect(defaultProps.onFolderSelect).not.toHaveBeenCalled();
    });
  });

  describe('Rename Functionality', () => {
    it('should save rename on Enter key', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      const renameButton = screen.getByText('Rename');
      fireEvent.click(renameButton);

      const renameInput = screen.getByDisplayValue('Documents');
      fireEvent.change(renameInput, { target: { value: 'New Name' } });
      fireEvent.keyDown(renameInput, { key: 'Enter' });

      expect(screen.queryByDisplayValue('New Name')).not.toBeInTheDocument();
    });

    it('should cancel rename on Escape key', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      const renameButton = screen.getByText('Rename');
      fireEvent.click(renameButton);

      const renameInput = screen.getByDisplayValue('Documents');
      fireEvent.change(renameInput, { target: { value: 'New Name' } });
      fireEvent.keyDown(renameInput, { key: 'Escape' });

      expect(screen.queryByDisplayValue('New Name')).not.toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    it('should save rename on blur', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} showContextMenu={true} />);

      const documentsFolder = screen.getByText('Documents');
      fireEvent.contextMenu(documentsFolder);

      const renameButton = screen.getByText('Rename');
      fireEvent.click(renameButton);

      const renameInput = screen.getByDisplayValue('Documents');
      fireEvent.change(renameInput, { target: { value: 'New Name' } });
      fireEvent.blur(renameInput);

      expect(screen.queryByDisplayValue('New Name')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles and labels', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      expect(screen.getByRole('tree')).toBeInTheDocument();
      expect(screen.getByRole('treeitem')).toBeInTheDocument();
    });

    it('should have proper ARIA expanded states', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />, ['folder-1']);

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper ARIA selected states', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />, [], ['folder-1']);

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-selected', 'true');
    });

    it('should be keyboard navigable with tabindex', () => {
      renderWithProvider(<EnhancedFolderTreeView {...defaultProps} />);

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Empty States', () => {
    it('should show message when no folders exist', () => {
      const store = configureStore({
        reducer: { documents: documentsSlice },
        preloadedState: {
          documents: {
            folders: [],
            // ... other required state
          } as any
        }
      });

      render(
        <Provider store={store}>
          <EnhancedFolderTreeView {...defaultProps} />
        </Provider>
      );

      expect(screen.getByText('No folders found')).toBeInTheDocument();
    });
  });
});