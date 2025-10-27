import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DownloadControls } from '@/components/documents/viewer/DownloadControls';
import type { Document } from '@/types/domain/Document';
import type { HighlightAnnotation } from '@/types/domain/DocumentViewer';

// Mock document
const mockDocument: Document = {
  id: 'test-doc-1',
  name: 'test-document.pdf',
  type: 'pdf',
  size: 1024000,
  downloadUrl: 'https://example.com/test-document.pdf',
  dateCreated: '2025-01-01T00:00:00Z',
  dateModified: '2025-01-01T00:00:00Z',
  metadata: {
    tags: [],
    author: 'Test Author',
    version: '1.0'
  },
};

const mockAnnotations: HighlightAnnotation[] = [
  {
    id: 'annotation-1',
    type: 'highlight',
    page: 1,
    position: { x: 100, y: 100, width: 200, height: 20 },
    author: 'test-user',
    timestamp: '2025-01-01T00:00:00Z',
    text: 'highlighted text',
    color: '#ffff00',
  },
];

describe('DownloadControls Component', () => {
  beforeEach(() => {
    // Mock window.print
    Object.assign(window, {
      print: vi.fn(),
    });

    // Mock URL.createObjectURL and URL.revokeObjectURL for download functionality
    global.URL.createObjectURL = vi.fn(() => 'mocked-object-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock the link creation for downloads only when clicked
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        const mockLink = {
          href: '',
          download: '',
          style: { display: '' },
          click: vi.fn(),
        };
        return mockLink as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    });

    // Mock appendChild and removeChild only for link elements
    const originalAppendChild = document.body.appendChild.bind(document.body);
    const originalRemoveChild = document.body.removeChild.bind(document.body);

    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node && (node as HTMLElement).tagName === 'A') {
        return node;
      }
      return originalAppendChild(node);
    });

    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
      if (node && (node as HTMLElement).tagName === 'A') {
        return node;
      }
      return originalRemoveChild(node);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders download and print buttons', () => {
    render(
      <DownloadControls
        document={mockDocument}
        annotations={mockAnnotations}
      />
    );

    const downloadButton = screen.getByLabelText('Download options');
    const printButton = screen.getByLabelText('Print document');

    expect(downloadButton).toBeInTheDocument();
    expect(printButton).toBeInTheDocument();
  });

  it('shows download menu when download button is clicked', async () => {
    render(
      <DownloadControls
        document={mockDocument}
        annotations={mockAnnotations}
      />
    );

    const downloadButton = screen.getByLabelText('Download options');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText('Download Options')).toBeInTheDocument();
      expect(screen.getByText('Original Format')).toBeInTheDocument();
      expect(screen.getByText('PDF with Annotations')).toBeInTheDocument();
      expect(screen.getByText('Clean PDF')).toBeInTheDocument();
      expect(screen.getByText('Image (PNG)')).toBeInTheDocument();
    });
  });

  it('triggers print when print button is clicked', () => {
    render(
      <DownloadControls
        document={mockDocument}
        annotations={mockAnnotations}
      />
    );

    const printButton = screen.getByLabelText('Print document');
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalled();
  });

  it('handles original format download', async () => {
    render(
      <DownloadControls
        document={mockDocument}
        annotations={mockAnnotations}
      />
    );

    const downloadButton = screen.getByLabelText('Download options');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      const originalFormatButton = screen.getByText('Original Format');
      fireEvent.click(originalFormatButton);
    });

    // Verify progress indicator appears
    await waitFor(() => {
      expect(screen.getByText('Downloading...')).toBeInTheDocument();
    });
  });

  it('disables controls when disabled prop is true', () => {
    render(
      <DownloadControls
        document={mockDocument}
        annotations={mockAnnotations}
        disabled={true}
      />
    );

    const downloadButton = screen.getByLabelText('Download options');
    const printButton = screen.getByLabelText('Print document');

    expect(downloadButton).toBeDisabled();
    expect(printButton).toBeDisabled();
  });

  it('shows annotation count in PDF with annotations option', async () => {
    render(
      <DownloadControls
        document={mockDocument}
        annotations={mockAnnotations}
      />
    );

    const downloadButton = screen.getByLabelText('Download options');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText('PDF with Annotations')).toBeInTheDocument();
      expect(screen.getByText('Include all annotations and comments')).toBeInTheDocument();
    });
  });

  it('handles empty annotations array', () => {
    render(
      <DownloadControls
        document={mockDocument}
        annotations={[]}
      />
    );

    const downloadButton = screen.getByLabelText('Download options');
    expect(downloadButton).toBeInTheDocument();
  });
});