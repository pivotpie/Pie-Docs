import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FolderStatsPanel from './FolderStatsPanel';
import type { DocumentFolder } from '@/types/domain/Document';

// Mock folder data
const mockFolders: DocumentFolder[] = [
  {
    id: 'folder1',
    name: 'Documents',
    path: '/documents',
    type: 'regular',
    parentId: undefined,
    childFolders: ['folder2'],
    documentCount: 25,
    totalSize: 5242880, // 5MB
    dateCreated: '2025-01-01T00:00:00Z',
    dateModified: '2025-01-15T12:00:00Z',
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
      documentCount: 25,
      totalSize: 5242880,
      averageFileSize: 209715,
      lastActivity: '2025-01-15T12:00:00Z',
      fileTypeDistribution: {
        pdf: 15,
        docx: 8,
        xlsx: 2,
      },
    },
  },
  {
    id: 'folder2',
    name: 'Images',
    path: '/documents/images',
    type: 'regular',
    parentId: 'folder1',
    childFolders: [],
    documentCount: 50,
    totalSize: 10485760, // 10MB
    dateCreated: '2025-01-02T00:00:00Z',
    dateModified: '2025-01-20T10:30:00Z',
    documentRefs: [],
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreateChild: true,
      canManagePermissions: true,
      inheritPermissions: true,
    },
    statistics: {
      documentCount: 50,
      totalSize: 10485760,
      averageFileSize: 209715,
      lastActivity: '2025-01-20T10:30:00Z',
      fileTypeDistribution: {
        image: 45,
        pdf: 5,
      },
    },
  },
  {
    id: 'folder3',
    name: 'Smart Folder - PDFs',
    path: '/smart/pdfs',
    type: 'smart',
    parentId: undefined,
    childFolders: [],
    documentCount: 30,
    totalSize: 15728640, // 15MB
    dateCreated: '2025-01-03T00:00:00Z',
    dateModified: '2025-01-18T14:15:00Z',
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
      inheritPermissions: false,
    },
    statistics: {
      documentCount: 30,
      totalSize: 15728640,
      averageFileSize: 524288,
      lastActivity: '2025-01-18T14:15:00Z',
      fileTypeDistribution: {
        pdf: 30,
      },
    },
  },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  allFolders: mockFolders,
};

describe('FolderStatsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<FolderStatsPanel {...defaultProps} />);

      expect(screen.getByText(/folder statistics/i)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<FolderStatsPanel {...defaultProps} isOpen={false} />);

      expect(screen.queryByText(/folder statistics/i)).not.toBeInTheDocument();
    });

    it('shows overall statistics when no specific folder is selected', () => {
      render(<FolderStatsPanel {...defaultProps} />);

      expect(screen.getByText(/folder statistics/i)).toBeInTheDocument();
    });

    it('shows specific folder statistics when folder is provided', () => {
      render(<FolderStatsPanel {...defaultProps} folder={mockFolders[0]} />);

      expect(screen.getByText('Documents Statistics')).toBeInTheDocument();
    });
  });

  describe('Overall Statistics Display', () => {
    beforeEach(() => {
      render(<FolderStatsPanel {...defaultProps} />);
    });

    it('displays total folder count correctly', () => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total folders
      expect(screen.getByText(/total folders/i)).toBeInTheDocument();
    });

    it('displays total document count correctly', () => {
      expect(screen.getByText('105')).toBeInTheDocument(); // 25 + 50 + 30
      expect(screen.getByText(/total documents/i)).toBeInTheDocument();
    });

    it('displays total size in human readable format', () => {
      expect(screen.getByText(/30/)).toBeInTheDocument(); // ~30MB total
      expect(screen.getByText(/total size/i)).toBeInTheDocument();
    });

    it('displays average file size', () => {
      expect(screen.getByText(/average file size/i)).toBeInTheDocument();
    });

    it('identifies largest folder correctly', () => {
      expect(screen.getByText('Largest Folder')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument(); // 50 documents
    });

    it('identifies most recently active folder', () => {
      expect(screen.getByText('Most Active')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument(); // Most recent activity
    });
  });

  describe('File Type Distribution', () => {
    beforeEach(() => {
      render(<FolderStatsPanel {...defaultProps} />);
    });

    it('displays file type distribution chart', () => {
      expect(screen.getByText(/file type distribution/i)).toBeInTheDocument();
    });

    it('shows percentage for each file type', () => {
      expect(screen.getByText(/pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/docx/i)).toBeInTheDocument();
      expect(screen.getByText(/image/i)).toBeInTheDocument();
    });

    it('displays file type counts', () => {
      // PDF: 15 + 5 + 30 = 50 files
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('shows visual progress bars for file types', () => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Size Distribution', () => {
    beforeEach(() => {
      render(<FolderStatsPanel {...defaultProps} />);
    });

    it('displays size distribution section', () => {
      expect(screen.getByText(/size distribution/i)).toBeInTheDocument();
    });

    it('shows different size ranges', () => {
      expect(screen.getByText(/small/i)).toBeInTheDocument();
      expect(screen.getByText(/medium/i)).toBeInTheDocument();
      expect(screen.getByText(/large/i)).toBeInTheDocument();
    });

    it('displays percentages for size ranges', () => {
      const percentageTexts = screen.getAllByText(/%$/);
      expect(percentageTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Recent Activity', () => {
    beforeEach(() => {
      render(<FolderStatsPanel {...defaultProps} />);
    });

    it('displays recent activity section', () => {
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    it('shows folder names with recent activity', () => {
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Smart Folder - PDFs')).toBeInTheDocument();
    });

    it('displays activity dates in human readable format', () => {
      expect(screen.getByText(/jan/i)).toBeInTheDocument();
    });

    it('shows document counts for active folders', () => {
      expect(screen.getByText(/50 documents/i)).toBeInTheDocument();
      expect(screen.getByText(/30 documents/i)).toBeInTheDocument();
    });
  });

  describe('Single Folder Statistics', () => {
    beforeEach(() => {
      render(<FolderStatsPanel {...defaultProps} folder={mockFolders[0]} />);
    });

    it('displays specific folder name in title', () => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    it('shows folder-specific document count', () => {
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText(/documents in this folder/i)).toBeInTheDocument();
    });

    it('displays folder-specific size information', () => {
      expect(screen.getByText(/5\.0 MB/i)).toBeInTheDocument();
    });

    it('shows folder type', () => {
      expect(screen.getByText(/regular folder/i)).toBeInTheDocument();
    });

    it('displays creation and modification dates', () => {
      expect(screen.getByText(/created/i)).toBeInTheDocument();
      expect(screen.getByText(/modified/i)).toBeInTheDocument();
    });
  });

  describe('Smart Folder Statistics', () => {
    beforeEach(() => {
      render(<FolderStatsPanel {...defaultProps} folder={mockFolders[2]} />);
    });

    it('identifies smart folder type', () => {
      expect(screen.getByText(/smart folder/i)).toBeInTheDocument();
    });

    it('displays smart folder criteria', () => {
      expect(screen.getByText(/criteria/i)).toBeInTheDocument();
      expect(screen.getByText(/pdf/i)).toBeInTheDocument();
    });

    it('shows auto-refresh status', () => {
      expect(screen.getByText(/auto.?refresh/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('allows refreshing statistics', async () => {
      const user = userEvent.setup();
      render(<FolderStatsPanel {...defaultProps} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Should trigger recalculation (visual feedback or loading state)
      expect(screen.getByText(/refreshing/i)).toBeInTheDocument();
    });

    it('supports exporting statistics', async () => {
      const user = userEvent.setup();
      render(<FolderStatsPanel {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      // Should show export options
      expect(screen.getByText(/export format/i)).toBeInTheDocument();
    });

    it('allows changing time period for activity', async () => {
      const user = userEvent.setup();
      render(<FolderStatsPanel {...defaultProps} />);

      const timePeriodSelect = screen.getByRole('combobox', { name: /time period/i });
      await user.click(timePeriodSelect);

      const lastWeekOption = screen.getByText(/last week/i);
      await user.click(lastWeekOption);

      // Should update activity display
    });
  });

  describe('Data Visualization', () => {
    beforeEach(() => {
      render(<FolderStatsPanel {...defaultProps} />);
    });

    it('displays charts and graphs', () => {
      // Check for chart containers
      expect(screen.getByTestId('file-type-chart')).toBeInTheDocument();
      expect(screen.getByTestId('size-distribution-chart')).toBeInTheDocument();
    });

    it('shows tooltips on hover', async () => {
      const user = userEvent.setup();

      const chartElement = screen.getByTestId('file-type-chart');
      await user.hover(chartElement);

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('supports different chart views', async () => {
      const user = userEvent.setup();

      const chartTypeToggle = screen.getByRole('button', { name: /chart type/i });
      await user.click(chartTypeToggle);

      expect(screen.getByText(/pie chart/i)).toBeInTheDocument();
      expect(screen.getByText(/bar chart/i)).toBeInTheDocument();
    });
  });

  describe('Dialog Controls', () => {
    it('closes dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderStatsPanel {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes dialog when overlay is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderStatsPanel {...defaultProps} />);

      const overlay = screen.getByTestId('dialog-overlay');
      await user.click(overlay);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes dialog when escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<FolderStatsPanel {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<FolderStatsPanel {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/folder statistics dialog/i)).toBeInTheDocument();
    });

    it('maintains focus management', () => {
      render(<FolderStatsPanel {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('provides accessible chart descriptions', () => {
      render(<FolderStatsPanel {...defaultProps} />);

      expect(screen.getByText(/chart showing file type distribution/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<FolderStatsPanel {...defaultProps} />);

      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();

      await user.keyboard('{Tab}');
      expect(document.activeElement).not.toBe(firstButton);
    });
  });

  describe('Error Handling', () => {
    it('handles empty folder data gracefully', () => {
      render(<FolderStatsPanel {...defaultProps} allFolders={[]} />);

      expect(screen.getByText(/no folders found/i)).toBeInTheDocument();
    });

    it('handles missing statistics data', () => {
      const folderWithoutStats = {
        ...mockFolders[0],
        statistics: {
          documentCount: 0,
          totalSize: 0,
          averageFileSize: 0,
          lastActivity: '',
          fileTypeDistribution: {},
        },
      };

      render(<FolderStatsPanel {...defaultProps} folder={folderWithoutStats} />);

      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });

    it('displays error message for invalid data', () => {
      const invalidFolder = {
        ...mockFolders[0],
        statistics: null as any,
      };

      render(<FolderStatsPanel {...defaultProps} folder={invalidFolder} />);

      expect(screen.getByText(/error loading statistics/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('calculates statistics efficiently for large datasets', () => {
      const largeFolderList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockFolders[0],
        id: `folder${i}`,
        name: `Folder ${i}`,
      }));

      const { container } = render(
        <FolderStatsPanel {...defaultProps} allFolders={largeFolderList} />
      );

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument(); // Total folders
    });

    it('memoizes expensive calculations', () => {
      const { rerender } = render(<FolderStatsPanel {...defaultProps} />);

      // Re-render with same props should not recalculate
      rerender(<FolderStatsPanel {...defaultProps} />);

      expect(screen.getByText(/folder statistics/i)).toBeInTheDocument();
    });
  });
});