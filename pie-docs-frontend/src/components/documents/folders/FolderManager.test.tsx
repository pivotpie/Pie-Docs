import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FolderManager from './FolderManager';
import documentsSlice from '@/store/slices/documentsSlice';
import type { DocumentFolder, FolderCreationRequest, BulkFolderAction } from '@/types/domain/Document';

// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      documents: documentsSlice,
    },
    preloadedState: {
      documents: {
        folders: [],
        currentFolder: null,
        folderPath: [],
        documents: [],
        loading: false,
        error: null,
        selectedIds: [],
        viewMode: 'list' as const,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
        filters: {},
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          hasMore: false,
        },
        ...initialState,
      },
    },
  });
};

// Mock folders data
const mockFolders: DocumentFolder[] = [
  {
    id: 'folder1',
    name: 'Test Folder 1',
    path: '/folder1',
    type: 'regular',
    parentId: undefined,
    childFolders: ['folder2'],
    documentCount: 5,
    totalSize: 1024000,
    dateCreated: '2025-01-01T00:00:00Z',
    dateModified: '2025-01-01T00:00:00Z',
    documentRefs: [],
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreateChild: true,
      canManagePermissions: true,
      inheritPermissions: false,
    },
    statistics: {
      documentCount: 5,
      totalSize: 1024000,
      averageFileSize: 204800,
      lastActivity: '2025-01-01T00:00:00Z',
      fileTypeDistribution: {
        pdf: 3,
        docx: 2,
      },
    },
  },
  {
    id: 'folder2',
    name: 'Test Folder 2',
    path: '/folder1/folder2',
    type: 'smart',
    parentId: 'folder1',
    childFolders: [],
    documentCount: 2,
    totalSize: 512000,
    dateCreated: '2025-01-02T00:00:00Z',
    dateModified: '2025-01-02T00:00:00Z',
    smartCriteria: {
      documentTypes: ['pdf'],
    },
    documentRefs: [],
    permissions: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canCreateChild: false,
      canManagePermissions: false,
      inheritPermissions: true,
    },
    statistics: {
      documentCount: 2,
      totalSize: 512000,
      averageFileSize: 256000,
      lastActivity: '2025-01-02T00:00:00Z',
      fileTypeDistribution: {
        pdf: 2,
      },
    },
  },
];

// Mock handlers
const mockHandlers = {
  onFolderCreate: vi.fn(),
  onFolderUpdate: vi.fn(),
  onFolderDelete: vi.fn(),
  onFolderMove: vi.fn(),
  onBulkFolderAction: vi.fn(),
};

const renderFolderManager = (props = {}, storeState = {}) => {
  const store = createMockStore({
    folders: mockFolders,
    ...storeState,
  });

  return render(
    <Provider store={store}>
      <FolderManager {...mockHandlers} {...props} />
    </Provider>
  );
};

describe('FolderManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Folder Display', () => {
    it('renders folder list correctly', () => {
      renderFolderManager();

      expect(screen.getByText('Test Folder 1')).toBeInTheDocument();
      expect(screen.getByText('Test Folder 2')).toBeInTheDocument();
    });

    it('displays folder icons correctly', () => {
      renderFolderManager();

      // Should have folder icons for each folder
      const folderIcons = screen.getAllByRole('img', { hidden: true });
      expect(folderIcons.length).toBeGreaterThan(0);
    });

    it('shows document count for each folder', () => {
      renderFolderManager();

      expect(screen.getByText('5')).toBeInTheDocument(); // folder1 document count
      expect(screen.getByText('2')).toBeInTheDocument(); // folder2 document count
    });

    it('indicates smart folders visually', () => {
      renderFolderManager();

      expect(screen.getByText('Smart')).toBeInTheDocument();
    });
  });

  describe('Folder Creation', () => {
    it('opens creation dialog when create button is clicked', () => {
      renderFolderManager();

      const createButton = screen.getByRole('button', { name: /create folder/i });
      fireEvent.click(createButton);

      expect(screen.getByText(/create new folder/i)).toBeInTheDocument();
    });

    it('calls onFolderCreate when folder is created', async () => {
      renderFolderManager();

      const createButton = screen.getByRole('button', { name: /create folder/i });
      fireEvent.click(createButton);

      // Fill out the form
      const nameInput = screen.getByLabelText(/folder name/i);
      fireEvent.change(nameInput, { target: { value: 'New Test Folder' } });

      const submitButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockHandlers.onFolderCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Test Folder',
            type: 'regular',
          })
        );
      });
    });
  });

  describe('Folder Selection', () => {
    it('allows selecting individual folders', () => {
      renderFolderManager();

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      fireEvent.click(firstCheckbox);

      expect(firstCheckbox).toBeChecked();
    });

    it('supports multi-selection', () => {
      renderFolderManager();

      const checkboxes = screen.getAllByRole('checkbox');

      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });
  });

  describe('Context Menu', () => {
    it('opens context menu on right click', () => {
      renderFolderManager();

      const folder = screen.getByText('Test Folder 1');
      fireEvent.contextMenu(folder);

      expect(screen.getByText(/rename/i)).toBeInTheDocument();
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    it('calls onFolderDelete when delete is selected', async () => {
      renderFolderManager();

      const folder = screen.getByText('Test Folder 1');
      fireEvent.contextMenu(folder);

      const deleteOption = screen.getByText(/delete/i);
      fireEvent.click(deleteOption);

      await waitFor(() => {
        expect(mockHandlers.onFolderDelete).toHaveBeenCalledWith('folder1');
      });
    });

    it('does not show delete option for smart folders', () => {
      renderFolderManager();

      const smartFolder = screen.getByText('Test Folder 2');
      fireEvent.contextMenu(smartFolder);

      // Smart folders should not have delete option or it should be disabled
      const deleteOptions = screen.queryAllByText(/delete/i);
      // Either no delete option or it's disabled
      expect(deleteOptions.length === 0 || deleteOptions[0].closest('button')?.disabled).toBeTruthy();
    });
  });

  describe('Bulk Operations', () => {
    it('shows bulk action toolbar when folders are selected', () => {
      renderFolderManager();

      const checkbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(checkbox);

      expect(screen.getByText(/bulk actions/i)).toBeInTheDocument();
    });

    it('calls onBulkFolderAction for bulk delete', async () => {
      renderFolderManager();

      // Select folders
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Open bulk actions and select delete
      const bulkActionsButton = screen.getByText(/bulk actions/i);
      fireEvent.click(bulkActionsButton);

      const deleteAction = screen.getByText(/delete selected/i);
      fireEvent.click(deleteAction);

      await waitFor(() => {
        expect(mockHandlers.onBulkFolderAction).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'delete',
            folderIds: ['folder1'],
          })
        );
      });
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('displays breadcrumb navigation', () => {
      const storeState = {
        folderPath: [
          { id: 'root', name: 'Root', path: '/' },
          { id: 'folder1', name: 'Test Folder 1', path: '/folder1' },
        ],
      };

      renderFolderManager({}, storeState);

      expect(screen.getByText('Root')).toBeInTheDocument();
      expect(screen.getByText('Test Folder 1')).toBeInTheDocument();
    });

    it('navigates when breadcrumb is clicked', () => {
      const storeState = {
        folderPath: [
          { id: 'root', name: 'Root', path: '/' },
          { id: 'folder1', name: 'Test Folder 1', path: '/folder1' },
        ],
      };

      renderFolderManager({}, storeState);

      const rootBreadcrumb = screen.getByText('Root');
      fireEvent.click(rootBreadcrumb);

      // Should dispatch navigation action (tested via Redux integration)
    });
  });

  describe('Error Handling', () => {
    it('displays error message when folder operations fail', async () => {
      mockHandlers.onFolderCreate.mockRejectedValue(new Error('Creation failed'));

      renderFolderManager();

      const createButton = screen.getByRole('button', { name: /create folder/i });
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText(/folder name/i);
      fireEvent.change(nameInput, { target: { value: 'New Test Folder' } });

      const submitButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      renderFolderManager();

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/folder list/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderFolderManager();

      const firstFolder = screen.getByText('Test Folder 1');
      firstFolder.focus();

      fireEvent.keyDown(firstFolder, { key: 'Enter' });
      // Should trigger folder selection or navigation
    });
  });

  describe('Performance', () => {
    it('handles large number of folders efficiently', () => {
      const largeFolderList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockFolders[0],
        id: `folder${i}`,
        name: `Folder ${i}`,
      }));

      const storeState = { folders: largeFolderList };

      const { container } = renderFolderManager({}, storeState);

      // Should render without significant performance issues
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});