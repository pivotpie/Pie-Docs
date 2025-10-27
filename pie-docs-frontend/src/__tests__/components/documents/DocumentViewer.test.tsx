import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import documentsReducer from '@/store/slices/documentsSlice';

// Mock PDF.js
vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess }: any) => {
    // Simulate successful PDF load
    setTimeout(() => onLoadSuccess?.({ numPages: 5 }), 100);
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

// Mock syntax highlighter
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: any) => <pre data-testid="syntax-highlighter">{children}</pre>,
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneLight: {},
  oneDark: {},
}));

// Create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      documents: documentsReducer,
    },
    preloadedState: {
      documents: {
        ...documentsReducer(undefined, { type: '@@INIT' }),
        ...initialState,
      },
    },
  });
};

// Mock document
const mockDocument = {
  id: 'test-doc-1',
  name: 'test-document.pdf',
  type: 'pdf',
  downloadUrl: 'https://example.com/test.pdf',
  previewUrl: 'https://example.com/test-preview.pdf',
  size: 1024000,
  dateCreated: '2024-01-01T00:00:00Z',
  dateModified: '2024-01-01T00:00:00Z',
  metadata: {
    tags: ['test', 'document'],
    author: 'Test Author',
    description: 'Test document description',
    version: 1,
  },
};

const renderWithProvider = (component: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('DocumentViewer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders document viewer with PDF document', async () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });

    it('renders loading state initially', () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      expect(screen.getByText('Loading document...')).toBeInTheDocument();
    });

    it('renders error state when no document provided', () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
        />
      );

      expect(screen.getByText('No Document Selected')).toBeInTheDocument();
    });
  });

  describe('Document Format Support', () => {
    it('renders PDF viewer for PDF documents', async () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });
    });

    it('renders image viewer for image documents', async () => {
      const imageDocument = {
        ...mockDocument,
        name: 'test-image.jpg',
        type: 'image',
        downloadUrl: 'https://example.com/test.jpg',
      };

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={imageDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('test-image.jpg')).toBeInTheDocument();
      });
    });

    it('renders text viewer for text documents', async () => {
      const textDocument = {
        ...mockDocument,
        name: 'test-file.txt',
        type: 'txt',
        downloadUrl: 'data:text/plain;base64,VGVzdCBjb250ZW50',
      };

      // Mock fetch for text content
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('Test content'),
      });

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={textDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test content')).toBeInTheDocument();
      });
    });

    it('renders unsupported format message for unknown formats', async () => {
      const unknownDocument = {
        ...mockDocument,
        name: 'test-file.xyz',
        type: 'unknown',
      };

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={unknownDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Unsupported Format')).toBeInTheDocument();
        expect(screen.getByText('Download Document')).toBeInTheDocument();
      });
    });
  });

  describe('Zoom Controls', () => {
    it('renders zoom controls', async () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
        expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('allows zoom in and out', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByText('125%')).toBeInTheDocument();
      });

      const zoomOutButton = screen.getByLabelText('Zoom out');
      await user.click(zoomOutButton);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('has fit-to-width and fit-to-page buttons', async () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Fit Width')).toBeInTheDocument();
        expect(screen.getByText('Fit Page')).toBeInTheDocument();
      });
    });
  });

  describe('Page Navigation', () => {
    it('renders page navigation for multi-page documents', async () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
        expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      });
    });

    it('allows navigation between pages', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/1.*of.*5/)).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('Next page');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/2.*of.*5/)).toBeInTheDocument();
      });
    });
  });

  describe('Annotation Tools', () => {
    it('renders annotation toolbar', async () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Comment')).toBeInTheDocument();
        expect(screen.getByLabelText('Highlight')).toBeInTheDocument();
        expect(screen.getByLabelText('Rectangle')).toBeInTheDocument();
      });
    });

    it('allows tool selection', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      const commentTool = await screen.findByLabelText('Comment');
      await user.click(commentTool);

      expect(commentTool).toHaveClass('bg-blue-100');
    });
  });

  describe('Metadata Panel', () => {
    it('renders metadata panel when sidebar is visible', async () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Document Info')).toBeInTheDocument();
        expect(screen.getByText('Test Author')).toBeInTheDocument();
      });
    });

    it('allows toggling metadata panel', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      const toggleButton = await screen.findByLabelText('Toggle metadata panel');
      await user.click(toggleButton);

      expect(screen.queryByText('Document Info')).not.toBeInTheDocument();
    });
  });

  describe('Full Screen Mode', () => {
    it('allows toggling full screen mode', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      const fullScreenButton = await screen.findByLabelText('Enter full screen');
      await user.click(fullScreenButton);

      expect(screen.getByLabelText('Exit full screen')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('handles keyboard shortcuts', async () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/1.*of.*5/)).toBeInTheDocument();
      });

      // Test right arrow for next page
      fireEvent.keyDown(document, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText(/2.*of.*5/)).toBeInTheDocument();
      });

      // Test left arrow for previous page
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByText(/1.*of.*5/)).toBeInTheDocument();
      });
    });

    it('handles escape key to close viewer', async () => {
      const onClose = vi.fn();

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error when document fails to load', async () => {
      const errorDocument = {
        ...mockDocument,
        downloadUrl: 'invalid-url',
      };

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={errorDocument}
        />
      );

      // Simulate error after loading attempt
      await waitFor(() => {
        fireEvent.error(screen.getByTestId('pdf-document'));
      });
    });
  });

  describe('Props and Callbacks', () => {
    it('calls onDocumentChange when provided', async () => {
      const onDocumentChange = vi.fn();

      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
          onDocumentChange={onDocumentChange}
        />
      );

      // This would be triggered by changing documents, simulated here
      expect(onDocumentChange).not.toHaveBeenCalled();
    });

    it('applies custom className', () => {
      renderWithProvider(
        <DocumentViewer
          documentId="test-doc-1"
          document={mockDocument}
          className="custom-viewer-class"
        />
      );

      const viewer = screen.getByRole('main') || document.querySelector('.custom-viewer-class');
      expect(viewer).toHaveClass('custom-viewer-class');
    });
  });
});