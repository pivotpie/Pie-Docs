import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FolderStatsPanel from './FolderStatsPanel';
import type { DocumentFolder } from '@/types/domain/Document';

// Performance test utilities
const measureRenderTime = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

const measureStatisticsCalculationTime = (folders: DocumentFolder[]): number => {
  const start = performance.now();

  // Simulate the same calculations as FolderStatsPanel
  const totalDocuments = folders.reduce((sum, f) => sum + f.statistics.documentCount, 0);
  const totalSize = folders.reduce((sum, f) => sum + f.statistics.totalSize, 0);
  const averageFileSize = totalDocuments > 0 ? totalSize / totalDocuments : 0;

  // File type distribution calculation
  const fileTypeMap = new Map<string, { count: number; size: number }>();
  folders.forEach(folder => {
    Object.entries(folder.statistics.fileTypeDistribution).forEach(([type, count]) => {
      const existing = fileTypeMap.get(type) || { count: 0, size: 0 };
      fileTypeMap.set(type, {
        count: existing.count + count,
        size: existing.size + (count * folder.statistics.averageFileSize),
      });
    });
  });

  const end = performance.now();
  return end - start;
};

const createLargeFolderDataset = (count: number): DocumentFolder[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `folder-${i}`,
    name: `Performance Test Folder ${i}`,
    path: `/perf-test/folder-${i}`,
    type: i % 20 === 0 ? 'smart' : 'regular' as const,
    parentId: i > 0 && i % 10 !== 0 ? `folder-${Math.floor(i / 10)}` : undefined,
    childFolders: [],
    documentCount: Math.floor(Math.random() * 100) + 10, // 10-110 documents per folder
    totalSize: Math.floor(Math.random() * 50000000) + 1000000, // 1-51 MB per folder
    dateCreated: new Date(2025, 0, 1 + i).toISOString(),
    dateModified: new Date(2025, 0, 1 + i + Math.floor(Math.random() * 30)).toISOString(),
    documentRefs: [],
    permissions: {
      canView: true,
      canEdit: i % 5 !== 0,
      canDelete: i % 10 !== 0,
      canCreateChild: i % 3 !== 0,
      canManagePermissions: i % 15 === 0,
      inheritPermissions: i % 7 === 0,
    },
    statistics: {
      documentCount: Math.floor(Math.random() * 100) + 10,
      totalSize: Math.floor(Math.random() * 50000000) + 1000000,
      averageFileSize: Math.floor(Math.random() * 500000) + 50000, // 50KB-550KB average
      lastActivity: new Date(2025, 0, 1 + i + Math.floor(Math.random() * 30)).toISOString(),
      fileTypeDistribution: {
        pdf: Math.floor(Math.random() * 20),
        docx: Math.floor(Math.random() * 15),
        xlsx: Math.floor(Math.random() * 10),
        txt: Math.floor(Math.random() * 5),
        image: Math.floor(Math.random() * 25),
        video: Math.floor(Math.random() * 3),
      },
    },
    ...(i % 20 === 0 && {
      smartCriteria: {
        documentTypes: ['pdf', 'docx'],
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
  allFolders: [],
};

describe('FolderStatsPanel Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Large Dataset Rendering Performance', () => {
    it('renders efficiently with 1000 folders', () => {
      const largeFolderDataset = createLargeFolderDataset(1000);

      const renderTime = measureRenderTime(() => {
        render(<FolderStatsPanel {...defaultProps} allFolders={largeFolderDataset} />);
      });

      // Should render within 500ms for 1000 folders
      expect(renderTime).toBeLessThan(500);
      expect(largeFolderDataset).toHaveLength(1000);
    });

    it('renders efficiently with 5000 folders', () => {
      const massiveFolderDataset = createLargeFolderDataset(5000);

      const renderTime = measureRenderTime(() => {
        render(<FolderStatsPanel {...defaultProps} allFolders={massiveFolderDataset} />);
      });

      // Should render within 2 seconds for 5000 folders
      expect(renderTime).toBeLessThan(2000);
      expect(massiveFolderDataset).toHaveLength(5000);
    });

    it('handles empty dataset efficiently', () => {
      const renderTime = measureRenderTime(() => {
        render(<FolderStatsPanel {...defaultProps} allFolders={[]} />);
      });

      // Should render very quickly with empty dataset
      expect(renderTime).toBeLessThan(50);
    });
  });

  describe('Statistics Calculation Performance', () => {
    it('calculates statistics efficiently for 1000 folders', () => {
      const largeFolderDataset = createLargeFolderDataset(1000);

      const calculationTime = measureStatisticsCalculationTime(largeFolderDataset);

      // Statistics calculation should complete within 100ms
      expect(calculationTime).toBeLessThan(100);
    });

    it('calculates statistics efficiently for 5000 folders', () => {
      const massiveFolderDataset = createLargeFolderDataset(5000);

      const calculationTime = measureStatisticsCalculationTime(massiveFolderDataset);

      // Statistics calculation should complete within 300ms even for 5000 folders
      expect(calculationTime).toBeLessThan(300);
    });

    it('handles complex file type distributions efficiently', () => {
      const complexDataset = createLargeFolderDataset(1000).map(folder => ({
        ...folder,
        statistics: {
          ...folder.statistics,
          fileTypeDistribution: {
            pdf: Math.floor(Math.random() * 50),
            docx: Math.floor(Math.random() * 40),
            xlsx: Math.floor(Math.random() * 30),
            pptx: Math.floor(Math.random() * 25),
            txt: Math.floor(Math.random() * 20),
            md: Math.floor(Math.random() * 15),
            image: Math.floor(Math.random() * 60),
            video: Math.floor(Math.random() * 10),
            audio: Math.floor(Math.random() * 5),
            zip: Math.floor(Math.random() * 8),
          },
        },
      }));

      const calculationTime = measureStatisticsCalculationTime(complexDataset);

      // Complex file type calculations should still be fast
      expect(calculationTime).toBeLessThan(150);
    });
  });

  describe('Re-render Performance', () => {
    it('efficiently handles prop updates with large datasets', () => {
      const largeFolderDataset = createLargeFolderDataset(1000);

      const { rerender } = render(<FolderStatsPanel {...defaultProps} allFolders={largeFolderDataset} />);

      const rerenderTime = measureRenderTime(() => {
        rerender(<FolderStatsPanel {...defaultProps} allFolders={largeFolderDataset} folder={largeFolderDataset[0]} />);
      });

      // Re-render with prop changes should be fast
      expect(rerenderTime).toBeLessThan(200);
    });

    it('efficiently updates when switching between different folders', () => {
      const largeFolderDataset = createLargeFolderDataset(500);

      const { rerender } = render(<FolderStatsPanel {...defaultProps} allFolders={largeFolderDataset} />);

      // Measure multiple folder switches
      const switchTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const switchTime = measureRenderTime(() => {
          rerender(<FolderStatsPanel {...defaultProps} allFolders={largeFolderDataset} folder={largeFolderDataset[i]} />);
        });
        switchTimes.push(switchTime);
      }

      const averageSwitchTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;

      // Average folder switch should be very fast
      expect(averageSwitchTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('does not create excessive objects during statistics calculation', () => {
      const largeFolderDataset = createLargeFolderDataset(1000);

      // Measure memory usage indirectly by checking for memory leaks
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Render multiple times to check for memory accumulation
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<FolderStatsPanel {...defaultProps} allFolders={largeFolderDataset} />);
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB) after multiple renders
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Edge Case Performance', () => {
    it('handles folders with no statistics efficiently', () => {
      const foldersWithoutStats = createLargeFolderDataset(500).map(folder => ({
        ...folder,
        statistics: {
          documentCount: 0,
          totalSize: 0,
          averageFileSize: 0,
          lastActivity: folder.dateCreated,
          fileTypeDistribution: {},
        },
      }));

      const renderTime = measureRenderTime(() => {
        render(<FolderStatsPanel {...defaultProps} allFolders={foldersWithoutStats} />);
      });

      expect(renderTime).toBeLessThan(300);
    });

    it('handles folders with extreme values efficiently', () => {
      const extremeDataset = createLargeFolderDataset(100).map(folder => ({
        ...folder,
        statistics: {
          documentCount: Math.random() > 0.5 ? 0 : 10000, // Either empty or very full
          totalSize: Math.random() > 0.5 ? 0 : 100000000000, // Either empty or 100GB
          averageFileSize: Math.random() > 0.5 ? 1 : 10000000, // Either tiny or huge files
          lastActivity: folder.dateCreated,
          fileTypeDistribution: {
            pdf: Math.floor(Math.random() * 1000),
            bigdata: Math.floor(Math.random() * 500),
          },
        },
      }));

      const renderTime = measureRenderTime(() => {
        render(<FolderStatsPanel {...defaultProps} allFolders={extremeDataset} />);
      });

      expect(renderTime).toBeLessThan(400);
    });
  });

  describe('Memoization Performance', () => {
    it('efficiently uses memoization for repeated renders with same data', () => {
      const folderDataset = createLargeFolderDataset(500);

      // First render
      const firstRenderTime = measureRenderTime(() => {
        render(<FolderStatsPanel {...defaultProps} allFolders={folderDataset} />);
      });

      // Second render with same data (should be faster due to memoization)
      const { rerender } = render(<FolderStatsPanel {...defaultProps} allFolders={folderDataset} />);

      const secondRenderTime = measureRenderTime(() => {
        rerender(<FolderStatsPanel {...defaultProps} allFolders={folderDataset} />);
      });

      // Second render should be significantly faster (or at least not much slower)
      expect(secondRenderTime).toBeLessThanOrEqual(firstRenderTime * 1.2);
    });
  });
});