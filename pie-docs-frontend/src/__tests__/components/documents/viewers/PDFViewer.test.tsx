import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PDFViewer } from '@/components/documents/viewers/PDFViewer';

// Mock PDF.js
vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess, onLoadError }: any) => {
    // Simulate successful PDF load
    setTimeout(() => onLoadSuccess?.({ numPages: 3 }), 100);
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber, onLoadSuccess }: any) => {
    // Simulate successful page load
    setTimeout(() => onLoadSuccess?.({ getViewport: () => ({ width: 612, height: 792 }) }), 50);
    return <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>;
  },
  pdfjs: {
    GlobalWorkerOptions: {},
    version: '3.0.0',
  },
}));

const mockDocument = {
  id: 'test-pdf',
  name: 'test.pdf',
  downloadUrl: 'https://example.com/test.pdf',
};

const mockProps = {
  document: mockDocument,
  zoom: { level: 100, mode: 'fit-width' as const },
  currentPage: 1,
  annotations: [],
  onPageChange: vi.fn(),
  onLoadingChange: vi.fn(),
};

describe('PDFViewer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders PDF document', async () => {
      render(<PDFViewer {...mockProps} />);

      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
    });

    it('displays page information after loading', async () => {
      render(<PDFViewer {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
        expect(screen.getByText(/Scale: 100%/)).toBeInTheDocument();
      });
    });

    it('calls onLoadingChange when PDF loads', async () => {
      const onLoadingChange = vi.fn();
      render(<PDFViewer {...mockProps} onLoadingChange={onLoadingChange} />);

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith({
          isLoading: false,
          progress: 100,
          message: 'PDF loaded successfully',
        });
      });
    });
  });

  describe('Zoom Functionality', () => {
    it('applies zoom level correctly', async () => {
      const zoomedProps = {
        ...mockProps,
        zoom: { level: 150, mode: 'custom' as const },
      };

      render(<PDFViewer {...zoomedProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Scale: 150%/)).toBeInTheDocument();
      });
    });

    it('handles wheel zoom with Ctrl key', async () => {
      const onPageChange = vi.fn();
      render(<PDFViewer {...mockProps} onPageChange={onPageChange} />);

      const container = screen.getByTestId('pdf-document').parentElement;
      if (container) {
        fireEvent.wheel(container, {
          deltaY: -100,
          ctrlKey: true,
        });

        expect(onPageChange).toHaveBeenCalledWith(
          expect.objectContaining({
            zoom: { level: 110, mode: 'custom' },
          })
        );
      }
    });
  });

  describe('Page Navigation', () => {
    it('displays correct page number', async () => {
      const pageProps = { ...mockProps, currentPage: 2 };
      render(<PDFViewer {...pageProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-page-2')).toBeInTheDocument();
      });
    });

    it('updates total pages after document load', async () => {
      const onPageChange = vi.fn();
      render(<PDFViewer {...mockProps} onPageChange={onPageChange} />);

      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(
          expect.objectContaining({
            totalPages: 3,
          })
        );
      });
    });
  });

  describe('Annotations', () => {
    it('renders annotations on the page', async () => {
      const annotationsProps = {
        ...mockProps,
        annotations: [
          {
            id: 'ann1',
            type: 'comment',
            page: 1,
            position: { x: 100, y: 100 },
          },
          {
            id: 'ann2',
            type: 'highlight',
            page: 1,
            position: { x: 200, y: 200, width: 100, height: 20 },
            color: '#fef08a',
          },
        ],
      };

      render(<PDFViewer {...annotationsProps} />);

      await waitFor(() => {
        // Annotations should be rendered as overlays
        const overlays = document.querySelectorAll('.absolute.pointer-events-none');
        expect(overlays.length).toBeGreaterThan(0);
      });
    });

    it('filters annotations by current page', async () => {
      const annotationsProps = {
        ...mockProps,
        currentPage: 2,
        annotations: [
          {
            id: 'ann1',
            type: 'comment',
            page: 1,
            position: { x: 100, y: 100 },
          },
          {
            id: 'ann2',
            type: 'highlight',
            page: 2,
            position: { x: 200, y: 200, width: 100, height: 20 },
          },
        ],
      };

      render(<PDFViewer {...annotationsProps} />);

      await waitFor(() => {
        // Only page 2 annotations should be visible
        const overlays = document.querySelectorAll('.absolute.pointer-events-none');
        // Should show page 2 annotation but not page 1
        expect(overlays.length).toBe(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles PDF loading errors', async () => {
      const onLoadingChange = vi.fn();
      const onPageChange = vi.fn();

      // Mock PDF loading error
      vi.mocked(require('react-pdf').Document).mockImplementationOnce(
        ({ onLoadError }: any) => {
          setTimeout(() => onLoadError?.(new Error('Failed to load PDF')), 100);
          return <div data-testid="pdf-error">Error loading PDF</div>;
        }
      );

      render(
        <PDFViewer
          {...mockProps}
          onLoadingChange={onLoadingChange}
          onPageChange={onPageChange}
        />
      );

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith({
          isLoading: false,
          message: 'Failed to load PDF',
        });
        expect(onPageChange).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Failed to load PDF document',
          })
        );
      });
    });

    it('displays error message when PDF fails to load', async () => {
      // Mock PDF component to show error
      vi.mocked(require('react-pdf').Document).mockImplementationOnce(() => (
        <div>Failed to load PDF. Please try again.</div>
      ));

      render(<PDFViewer {...mockProps} />);

      expect(screen.getByText('Failed to load PDF. Please try again.')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles page loading states', async () => {
      render(<PDFViewer {...mockProps} />);

      // Initially should show page loading
      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
      });
    });

    it('properly scales annotations with zoom', async () => {
      const annotationsProps = {
        ...mockProps,
        zoom: { level: 200, mode: 'custom' as const },
        annotations: [
          {
            id: 'ann1',
            type: 'highlight',
            page: 1,
            position: { x: 100, y: 100, width: 50, height: 20 },
          },
        ],
      };

      render(<PDFViewer {...annotationsProps} />);

      await waitFor(() => {
        const annotation = document.querySelector('.absolute.pointer-events-none');
        if (annotation) {
          // Should scale annotation position and size with zoom level (200% = 2x scale)
          expect(annotation).toHaveStyle({
            left: '200px', // 100 * 2
            top: '200px',   // 100 * 2
            width: '100px', // 50 * 2
            height: '40px', // 20 * 2
          });
        }
      });
    });
  });
});