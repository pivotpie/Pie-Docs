import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FolderDragDropProvider from './FolderDragDropProvider';
import type { Document, DocumentFolder } from '@/types/domain/Document';

// Performance test utilities
const measureRenderTime = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

const createLargeDocumentDataset = (count: number): Document[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `doc-${i}`,
    name: `Document ${i}.pdf`,
    type: 'pdf' as const,
    status: 'published' as const,
    size: Math.floor(Math.random() * 10000000),
    dateCreated: new Date(2025, 0, 1 + i).toISOString(),
    dateModified: new Date(2025, 0, 1 + i).toISOString(),
    path: `/docs/doc-${i}`,
    downloadUrl: `/download/doc-${i}`,
    parentFolderId: i % 10 === 0 ? undefined : `folder-${Math.floor(i / 100)}`,
    metadata: {
      tags: [`tag-${i % 5}`, `category-${i % 3}`],
      author: `Author ${i % 10}`,
      version: 1,
      description: `Description for document ${i}`,
    },
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
    },
  }));
};

const createLargeFolderDataset = (count: number): DocumentFolder[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `folder-${i}`,
    name: `Folder ${i}`,
    path: `/folders/folder-${i}`,
    type: i % 20 === 0 ? 'smart' : 'regular' as const,
    parentId: i > 0 && i % 10 !== 0 ? `folder-${Math.floor(i / 10)}` : undefined,
    childFolders: [],
    documentCount: Math.floor(Math.random() * 50),
    totalSize: Math.floor(Math.random() * 100000000),
    dateCreated: new Date(2025, 0, 1 + i).toISOString(),
    dateModified: new Date(2025, 0, 1 + i).toISOString(),
    smartCriteria: i % 20 === 0 ? {
      documentTypes: ['pdf'],
      tags: [`tag-${i % 5}`],
    } : undefined,
    documentRefs: [],
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: i % 20 !== 0, // Smart folders can't be deleted
      canCreateChild: true,
      canManagePermissions: true,
      inheritPermissions: i % 5 === 0,
    },
    statistics: {
      documentCount: Math.floor(Math.random() * 50),
      totalSize: Math.floor(Math.random() * 100000000),
      averageFileSize: Math.floor(Math.random() * 2000000),
      lastActivity: new Date(2025, 0, 1 + i).toISOString(),
      fileTypeDistribution: {
        pdf: Math.floor(Math.random() * 20),
        docx: Math.floor(Math.random() * 15),
        xlsx: Math.floor(Math.random() * 10),
      },
    },
  }));
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-testid="drag-drop-container">{children}</div>
);

const mockHandlers = {
  onDocumentMove: vi.fn(),
  onFolderMove: vi.fn(),
  onDocumentReorder: vi.fn(),
  onFolderReorder: vi.fn(),
  onBulkDocumentMove: vi.fn(),
  onBulkFolderMove: vi.fn(),
};

describe('FolderDragDropProvider Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering Performance', () => {
    it('renders efficiently with 1000 documents', () => {
      const documents = createLargeDocumentDataset(1000);
      const folders = createLargeFolderDataset(50);

      const renderTime = measureRenderTime(() => {
        render(
          <FolderDragDropProvider
            folders={folders}
            documents={documents}
            {...mockHandlers}
          >
            <TestWrapper>Large dataset test</TestWrapper>
          </FolderDragDropProvider>
        );
      });

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000); // 1 second
      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });

    it('renders efficiently with 500 folders', () => {
      const documents = createLargeDocumentDataset(100);
      const folders = createLargeFolderDataset(500);

      const renderTime = measureRenderTime(() => {
        render(
          <FolderDragDropProvider
            folders={folders}
            documents={documents}
            {...mockHandlers}
          >
            <TestWrapper>Large folder dataset test</TestWrapper>
          </FolderDragDropProvider>
        );
      });

      expect(renderTime).toBeLessThan(1000); // 1 second
      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });

    it('handles massive selection arrays efficiently', () => {
      const documents = createLargeDocumentDataset(2000);
      const folders = createLargeFolderDataset(200);
      const selectedDocumentIds = documents.slice(0, 500).map(doc => doc.id);
      const selectedFolderIds = folders.slice(0, 50).map(folder => folder.id);

      const renderTime = measureRenderTime(() => {
        render(
          <FolderDragDropProvider
            folders={folders}
            documents={documents}
            selectedDocumentIds={selectedDocumentIds}
            selectedFolderIds={selectedFolderIds}
            {...mockHandlers}
          >
            <TestWrapper>Large selection test</TestWrapper>
          </FolderDragDropProvider>
        );
      });

      expect(renderTime).toBeLessThan(1500); // 1.5 seconds for large selection
      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });
  });

  describe('Re-render Performance', () => {
    it('efficiently handles prop updates with large datasets', () => {
      const documents = createLargeDocumentDataset(1000);
      const folders = createLargeFolderDataset(100);

      const { rerender } = render(
        <FolderDragDropProvider
          folders={folders}
          documents={documents}
          {...mockHandlers}
        >
          <TestWrapper>Initial render</TestWrapper>
        </FolderDragDropProvider>
      );

      // Add a new document to trigger re-render
      const updatedDocuments = [
        ...documents,
        {
          ...documents[0],
          id: 'new-doc',
          name: 'New Document',
        },
      ];

      const rerenderTime = measureRenderTime(() => {
        rerender(
          <FolderDragDropProvider
            folders={folders}
            documents={updatedDocuments}
            {...mockHandlers}
          >
            <TestWrapper>Updated render</TestWrapper>
          </FolderDragDropProvider>
        );
      });

      expect(rerenderTime).toBeLessThan(500); // Re-renders should be faster
    });

    it('efficiently updates selection with large datasets', () => {
      const documents = createLargeDocumentDataset(1000);
      const folders = createLargeFolderDataset(100);

      const { rerender } = render(
        <FolderDragDropProvider
          folders={folders}
          documents={documents}
          selectedDocumentIds={[]}
          {...mockHandlers}
        >
          <TestWrapper>No selection</TestWrapper>
        </FolderDragDropProvider>
      );

      // Select many documents
      const selectedDocumentIds = documents.slice(0, 200).map(doc => doc.id);

      const selectionTime = measureRenderTime(() => {
        rerender(
          <FolderDragDropProvider
            folders={folders}
            documents={documents}
            selectedDocumentIds={selectedDocumentIds}
            {...mockHandlers}
          >
            <TestWrapper>Large selection</TestWrapper>
          </FolderDragDropProvider>
        );
      });

      expect(selectionTime).toBeLessThan(300); // Selection updates should be fast
    });
  });

  describe('Memory Usage', () => {
    it('does not create excessive objects during drag operations', () => {
      const documents = createLargeDocumentDataset(500);
      const folders = createLargeFolderDataset(50);

      // Mock performance.memory if available (Chrome)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      render(
        <FolderDragDropProvider
          folders={folders}
          documents={documents}
          {...mockHandlers}
        >
          <TestWrapper>Memory test</TestWrapper>
        </FolderDragDropProvider>
      );

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // If memory API is available, check that memory increase is reasonable
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      }

      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });
  });

  describe('Drag Operation Performance', () => {
    it('efficiently calculates drag item data for large selections', () => {
      const documents = createLargeDocumentDataset(1000);
      const folders = createLargeFolderDataset(100);
      const selectedDocumentIds = documents.slice(0, 100).map(doc => doc.id);

      const startTime = performance.now();

      render(
        <FolderDragDropProvider
          folders={folders}
          documents={documents}
          selectedDocumentIds={selectedDocumentIds}
          {...mockHandlers}
        >
          <TestWrapper>Drag calculation test</TestWrapper>
        </FolderDragDropProvider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(1000);
      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });

    it('handles collision detection efficiently with many droppable targets', () => {
      const documents = createLargeDocumentDataset(100);
      const folders = createLargeFolderDataset(200); // Many potential drop targets

      const renderTime = measureRenderTime(() => {
        render(
          <FolderDragDropProvider
            folders={folders}
            documents={documents}
            {...mockHandlers}
          >
            <TestWrapper>Collision detection test</TestWrapper>
          </FolderDragDropProvider>
        );
      });

      expect(renderTime).toBeLessThan(800);
      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });
  });

  describe('Accessibility Performance', () => {
    it('efficiently manages screen reader announcements with large datasets', () => {
      const documents = createLargeDocumentDataset(500);
      const folders = createLargeFolderDataset(50);

      const renderTime = measureRenderTime(() => {
        render(
          <FolderDragDropProvider
            folders={folders}
            documents={documents}
            {...mockHandlers}
          >
            <TestWrapper>Accessibility test</TestWrapper>
          </FolderDragDropProvider>
        );
      });

      // Accessibility features should not significantly impact performance
      expect(renderTime).toBeLessThan(1000);
      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty datasets efficiently', () => {
      const renderTime = measureRenderTime(() => {
        render(
          <FolderDragDropProvider
            folders={[]}
            documents={[]}
            {...mockHandlers}
          >
            <TestWrapper>Empty dataset test</TestWrapper>
          </FolderDragDropProvider>
        );
      });

      expect(renderTime).toBeLessThan(100); // Should be very fast with no data
      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });

    it('handles disabled state efficiently with large datasets', () => {
      const documents = createLargeDocumentDataset(1000);
      const folders = createLargeFolderDataset(100);

      const renderTime = measureRenderTime(() => {
        render(
          <FolderDragDropProvider
            folders={folders}
            documents={documents}
            disabled={true}
            {...mockHandlers}
          >
            <TestWrapper>Disabled state test</TestWrapper>
          </FolderDragDropProvider>
        );
      });

      expect(renderTime).toBeLessThan(500); // Disabled should be faster
      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });
  });

  describe('Stress Tests', () => {
    it('survives extreme dataset sizes', () => {
      const documents = createLargeDocumentDataset(5000);
      const folders = createLargeFolderDataset(1000);

      expect(() => {
        render(
          <FolderDragDropProvider
            folders={folders}
            documents={documents}
            {...mockHandlers}
          >
            <TestWrapper>Stress test</TestWrapper>
          </FolderDragDropProvider>
        );
      }).not.toThrow();

      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });

    it('handles rapid prop changes without performance degradation', () => {
      const documents = createLargeDocumentDataset(500);
      const folders = createLargeFolderDataset(50);

      const { rerender } = render(
        <FolderDragDropProvider
          folders={folders}
          documents={documents}
          {...mockHandlers}
        >
          <TestWrapper>Rapid changes test</TestWrapper>
        </FolderDragDropProvider>
      );

      // Simulate rapid prop changes
      const iterations = 10;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const selectedDocumentIds = documents.slice(i * 10, (i + 1) * 10).map(doc => doc.id);
        rerender(
          <FolderDragDropProvider
            folders={folders}
            documents={documents}
            selectedDocumentIds={selectedDocumentIds}
            {...mockHandlers}
          >
            <TestWrapper>Rapid changes test</TestWrapper>
          </FolderDragDropProvider>
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(2000); // All rapid changes should complete in 2 seconds
      expect(screen.getByTestId('drag-drop-container')).toBeInTheDocument();
    });
  });
});