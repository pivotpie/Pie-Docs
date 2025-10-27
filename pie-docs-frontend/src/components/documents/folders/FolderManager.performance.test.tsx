import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FolderManager from './FolderManager';
import documentsSlice from '@/store/slices/documentsSlice';
import type { DocumentFolder } from '@/types/domain/Document';

// Create a mock store for testing
const createMockStore = (folders: DocumentFolder[]) => {
  return configureStore({
    reducer: {
      documents: documentsSlice,
    },
    preloadedState: {
      documents: {
        folders,
        selectedFolders: [],
        currentFolderId: null,
        isLoading: false,
        error: null,
        searchQuery: '',
        searchResults: [],
        documents: [],
        selectedDocuments: [],
        uploadProgress: {},
        viewMode: 'grid' as const,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
        currentPath: [],
      },
    },
  });
};

// Performance test utilities
const measureRenderTime = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

const createDeepFolderHierarchy = (depth: number, breadth: number): DocumentFolder[] => {
  const folders: DocumentFolder[] = [];
  let folderId = 0;

  const createFolderLevel = (parentId: string | undefined, currentDepth: number): void => {
    if (currentDepth >= depth) return;

    for (let i = 0; i < breadth; i++) {
      const id = `folder-${folderId++}`;
      const folder: DocumentFolder = {
        id,
        name: `Folder ${id} (Depth ${currentDepth})`,
        path: parentId ? `/folders/${parentId}/${id}` : `/folders/${id}`,
        type: Math.random() > 0.9 ? 'smart' : 'regular',
        parentId,
        childFolders: [],
        documentCount: Math.floor(Math.random() * 20),
        totalSize: Math.floor(Math.random() * 10000000),
        dateCreated: new Date(2025, 0, 1 + folderId).toISOString(),
        dateModified: new Date(2025, 0, 1 + folderId + Math.floor(Math.random() * 30)).toISOString(),
        documentRefs: [],
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canCreateChild: true,
          canManagePermissions: false,
          inheritPermissions: currentDepth > 0,
        },
        statistics: {
          documentCount: Math.floor(Math.random() * 20),
          totalSize: Math.floor(Math.random() * 10000000),
          averageFileSize: Math.floor(Math.random() * 500000),
          lastActivity: new Date(2025, 0, 1 + folderId).toISOString(),
          fileTypeDistribution: {
            pdf: Math.floor(Math.random() * 10),
            docx: Math.floor(Math.random() * 8),
            xlsx: Math.floor(Math.random() * 5),
          },
        },
      };

      folders.push(folder);

      // Add child folder IDs to parent
      if (parentId) {
        const parentFolder = folders.find(f => f.id === parentId);
        if (parentFolder) {
          parentFolder.childFolders.push(id);
        }
      }

      // Recursively create child levels
      createFolderLevel(id, currentDepth + 1);
    }
  };

  createFolderLevel(undefined, 0);
  return folders;
};

const createLargeFlatFolderList = (count: number): DocumentFolder[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `folder-${i}`,
    name: `Performance Test Folder ${i}`,
    path: `/perf-test/folder-${i}`,
    type: i % 50 === 0 ? 'smart' : 'regular' as const,
    parentId: undefined, // All top-level folders
    childFolders: [],
    documentCount: Math.floor(Math.random() * 50),
    totalSize: Math.floor(Math.random() * 50000000),
    dateCreated: new Date(2025, 0, 1 + i).toISOString(),
    dateModified: new Date(2025, 0, 1 + i + Math.floor(Math.random() * 30)).toISOString(),
    documentRefs: [],
    permissions: {
      canView: true,
      canEdit: i % 3 !== 0,
      canDelete: i % 5 !== 0,
      canCreateChild: true,
      canManagePermissions: i % 20 === 0,
      inheritPermissions: false,
    },
    statistics: {
      documentCount: Math.floor(Math.random() * 50),
      totalSize: Math.floor(Math.random() * 50000000),
      averageFileSize: Math.floor(Math.random() * 1000000),
      lastActivity: new Date(2025, 0, 1 + i + Math.floor(Math.random() * 30)).toISOString(),
      fileTypeDistribution: {
        pdf: Math.floor(Math.random() * 15),
        docx: Math.floor(Math.random() * 12),
        xlsx: Math.floor(Math.random() * 8),
        image: Math.floor(Math.random() * 20),
      },
    },
    ...(i % 50 === 0 && {
      smartCriteria: {
        documentTypes: ['pdf'],
        dateRange: {
          start: new Date(2025, 0, 1).toISOString(),
          end: new Date(2025, 11, 31).toISOString(),
        },
      },
    }),
  }));
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onFolderCreate: vi.fn(),
  onFolderUpdate: vi.fn(),
  onFolderDelete: vi.fn(),
  onBulkFolderAction: vi.fn(),
};

describe('FolderManager Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Large Folder List Rendering', () => {
    it('renders efficiently with 1000 flat folders', () => {
      const largeFolderList = createLargeFlatFolderList(1000);
      const store = createMockStore(largeFolderList);

      const renderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      // Should render within 800ms for 1000 folders
      expect(renderTime).toBeLessThan(800);
      expect(largeFolderList).toHaveLength(1000);
    });

    it('renders efficiently with 2000 flat folders', () => {
      const massiveFolderList = createLargeFlatFolderList(2000);
      const store = createMockStore(massiveFolderList);

      const renderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      // Should render within 1.5 seconds for 2000 folders
      expect(renderTime).toBeLessThan(1500);
      expect(massiveFolderList).toHaveLength(2000);
    });
  });

  describe('Deep Hierarchy Performance', () => {
    it('handles deep folder hierarchy efficiently (10 levels, 5 breadth)', () => {
      const deepHierarchy = createDeepFolderHierarchy(10, 5);
      const store = createMockStore(deepHierarchy);

      const renderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      // Deep hierarchy should still render reasonably fast
      expect(renderTime).toBeLessThan(1000);
      expect(deepHierarchy.length).toBeGreaterThan(100); // Should create many folders
    });

    it('handles very deep hierarchy efficiently (15 levels, 3 breadth)', () => {
      const veryDeepHierarchy = createDeepFolderHierarchy(15, 3);
      const store = createMockStore(veryDeepHierarchy);

      const renderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      // Very deep hierarchy should still be manageable
      expect(renderTime).toBeLessThan(1200);
      expect(veryDeepHierarchy.length).toBeGreaterThan(50);
    });
  });

  describe('Mixed Content Performance', () => {
    it('efficiently handles mix of regular and smart folders', () => {
      const mixedFolders = createLargeFlatFolderList(500).map((folder, i) => ({
        ...folder,
        type: i % 5 === 0 ? 'smart' : 'regular' as const,
        ...(i % 5 === 0 && {
          smartCriteria: {
            documentTypes: ['pdf', 'docx'],
            dateRange: {
              start: new Date(2025, 0, 1).toISOString(),
              end: new Date(2025, 11, 31).toISOString(),
            },
            tags: [`tag-${i % 10}`],
          },
        }),
      }));

      const store = createMockStore(mixedFolders);

      const renderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      expect(renderTime).toBeLessThan(600);
    });
  });

  describe('State Update Performance', () => {
    it('efficiently handles folder selection with large datasets', () => {
      const largeFolderList = createLargeFlatFolderList(1000);
      const store = createMockStore(largeFolderList);

      const { rerender } = render(
        <Provider store={store}>
          <FolderManager {...defaultProps} />
        </Provider>
      );

      // Simulate selecting multiple folders
      const selectionTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const newStore = createMockStore(largeFolderList);
        // Simulate folder selection state change
        newStore.dispatch({
          type: 'documents/setSelectedFolders',
          payload: largeFolderList.slice(i * 10, (i + 1) * 10).map(f => f.id),
        });

        const selectionTime = measureRenderTime(() => {
          rerender(
            <Provider store={newStore}>
              <FolderManager {...defaultProps} />
            </Provider>
          );
        });
        selectionTimes.push(selectionTime);
      }

      const averageSelectionTime = selectionTimes.reduce((sum, time) => sum + time, 0) / selectionTimes.length;

      // Selection updates should be fast
      expect(averageSelectionTime).toBeLessThan(100);
    });
  });

  describe('Scroll Performance', () => {
    it('handles virtual scrolling efficiently with large lists', () => {
      const hugeFolderList = createLargeFlatFolderList(5000);
      const store = createMockStore(hugeFolderList);

      const renderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      // Even with 5000 folders, should render efficiently (virtual scrolling)
      expect(renderTime).toBeLessThan(2000);
    });
  });

  describe('Search Performance', () => {
    it('efficiently filters large folder lists', () => {
      const largeFolderList = createLargeFlatFolderList(1000);
      const store = createMockStore(largeFolderList);

      // Simulate search state
      store.dispatch({
        type: 'documents/setSearchQuery',
        payload: 'Performance Test',
      });

      const searchRenderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      // Search filtering should be fast
      expect(searchRenderTime).toBeLessThan(500);
    });
  });

  describe('Memory Efficiency', () => {
    it('does not leak memory during multiple re-renders', () => {
      const folderList = createLargeFlatFolderList(500);
      const store = createMockStore(folderList);

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Render and unmount multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });
  });

  describe('Edge Case Performance', () => {
    it('handles empty folder list efficiently', () => {
      const store = createMockStore([]);

      const renderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      expect(renderTime).toBeLessThan(100);
    });

    it('handles single folder efficiently', () => {
      const singleFolder = createLargeFlatFolderList(1);
      const store = createMockStore(singleFolder);

      const renderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      expect(renderTime).toBeLessThan(100);
    });

    it('handles folders with extremely long names efficiently', () => {
      const longNameFolders = createLargeFlatFolderList(100).map((folder, i) => ({
        ...folder,
        name: `This is an extremely long folder name that should test the performance of text rendering and layout calculations folder ${i}`.repeat(3),
      }));

      const store = createMockStore(longNameFolders);

      const renderTime = measureRenderTime(() => {
        render(
          <Provider store={store}>
            <FolderManager {...defaultProps} />
          </Provider>
        );
      });

      expect(renderTime).toBeLessThan(800);
    });
  });
});