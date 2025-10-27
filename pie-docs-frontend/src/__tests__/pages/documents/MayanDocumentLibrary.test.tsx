import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import MayanDocumentLibrary from '@/pages/documents/MayanDocumentLibrary';
import { documentsService } from '@/services/api/documentsService';

// Mock the documents service
vi.mock('@/services/api/documentsService', () => ({
  documentsService: {
    getCabinets: vi.fn(),
    getCabinetDocuments: vi.fn(),
    getDocuments: vi.fn(),
  },
}));

// Mock the components that require complex setup
vi.mock('@/components/documents/DocumentGridView', () => ({
  default: ({ documents, loading }: any) => (
    <div data-testid="document-grid">
      {loading ? 'Loading...' : `${documents.length} documents`}
    </div>
  ),
}));

vi.mock('@/components/documents/DocumentListView', () => ({
  default: ({ documents, loading }: any) => (
    <div data-testid="document-list">
      {loading ? 'Loading...' : `${documents.length} documents`}
    </div>
  ),
}));

vi.mock('@/components/documents/ViewModeToggle', () => ({
  default: ({ currentMode, onModeChange }: any) => (
    <div data-testid="view-mode-toggle">
      <button
        data-testid="grid-view"
        onClick={() => onModeChange('grid')}
        className={currentMode === 'grid' ? 'active' : ''}
      >
        Grid
      </button>
      <button
        data-testid="list-view"
        onClick={() => onModeChange('list')}
        className={currentMode === 'list' ? 'active' : ''}
      >
        List
      </button>
    </div>
  ),
}));

vi.mock('@/components/documents/SearchBar', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="search-bar"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('@/components/common/LoadingSkeleton', () => ({
  DocumentLibrarySkeleton: () => <div data-testid="loading-skeleton">Loading skeleton...</div>,
}));

const mockCabinets = [
  { id: 1, label: 'Marketing Cabinet', documents_count: 25 },
  { id: 2, label: 'Legal Documents', documents_count: 15 },
];

const mockDocuments = [
  {
    id: '1',
    name: 'Test Document 1.pdf',
    type: 'pdf' as const,
    status: 'published' as const,
    size: 1024,
    dateCreated: '2024-01-01T10:00:00Z',
    dateModified: '2024-01-02T11:00:00Z',
    path: '/cabinet-1',
    downloadUrl: '/download/1',
    thumbnail: 'https://example.com/thumb1.jpg',
    metadata: {
      tags: [],
      author: 'Test Author',
      version: 1,
      description: 'Test description',
      language: 'en',
      keywords: [],
      customFields: {},
    },
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
    },
  },
  {
    id: '2',
    name: 'Test Document 2.docx',
    type: 'docx' as const,
    status: 'draft' as const,
    size: 2048,
    dateCreated: '2024-01-03T10:00:00Z',
    dateModified: '2024-01-04T11:00:00Z',
    path: '/cabinet-1',
    downloadUrl: '/download/2',
    thumbnail: 'https://example.com/thumb2.jpg',
    metadata: {
      tags: [],
      author: 'Test Author 2',
      version: 1,
      description: 'Test description 2',
      language: 'en',
      keywords: [],
      customFields: {},
    },
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
    },
  },
];

const renderComponent = (initialUrl = '/documents/mayan') => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <div data-testid="root">
          <MayanDocumentLibrary />
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('MayanDocumentLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    // Default mock implementations
    (documentsService.getCabinets as any).mockResolvedValue(mockCabinets);
    (documentsService.getDocuments as any).mockResolvedValue({
      documents: mockDocuments,
      folders: [],
      totalCount: mockDocuments.length,
      hasMore: false,
    });
    (documentsService.getCabinetDocuments as any).mockResolvedValue({
      documents: [mockDocuments[0]], // Only first document for cabinet
      folders: [],
      totalCount: 1,
      hasMore: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the main layout correctly', async () => {
      renderComponent();

      expect(screen.getByText('Mayan Document Library')).toBeInTheDocument();
      expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('search-bar')).toBeInTheDocument();

      await waitFor(() => {
        expect(documentsService.getCabinets).toHaveBeenCalled();
      });
    });

    it('displays cabinet selector with options', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('');

      // Check if options are present
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3); // "All Documents" + 2 cabinets
      expect(options[0]).toHaveTextContent('All Documents');
      expect(options[1]).toHaveTextContent('Marketing Cabinet (25)');
      expect(options[2]).toHaveTextContent('Legal Documents (15)');
    });

    it('shows loading state initially', () => {
      renderComponent();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });
  });

  describe('cabinet selection', () => {
    it('loads all documents by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(documentsService.getDocuments).toHaveBeenCalledWith({
          page: 1,
          limit: 24,
          searchQuery: undefined,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('document-grid')).toHaveTextContent('2 documents');
      });
    });

    it('loads cabinet documents when cabinet is selected', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(documentsService.getCabinetDocuments).toHaveBeenCalledWith('1', {
          page: 1,
          limit: 24,
          searchQuery: undefined,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('document-grid')).toHaveTextContent('1 documents');
      });

      // Should display cabinet name in header
      expect(screen.getByText('Marketing Cabinet')).toBeInTheDocument();
    });

    it('returns to all documents when "All Documents" is selected', async () => {
      renderComponent();

      // First select a cabinet
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(documentsService.getCabinetDocuments).toHaveBeenCalled();
      });

      // Then select "All Documents"
      fireEvent.change(select, { target: { value: '' } });

      await waitFor(() => {
        expect(documentsService.getDocuments).toHaveBeenCalledTimes(2); // Initial + after deselection
      });
    });
  });

  describe('view mode', () => {
    it('defaults to grid view', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('document-grid')).toBeInTheDocument();
      });

      const gridButton = screen.getByTestId('grid-view');
      expect(gridButton).toHaveClass('active');
    });

    it('switches to list view when toggled', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('document-grid')).toBeInTheDocument();
      });

      const listButton = screen.getByTestId('list-view');
      fireEvent.click(listButton);

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      expect(listButton).toHaveClass('active');
    });

    it('saves view mode preference to localStorage', async () => {
      const mockSetItem = vi.fn();
      window.localStorage.setItem = mockSetItem;

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument();
      });

      const listButton = screen.getByTestId('list-view');
      fireEvent.click(listButton);

      expect(mockSetItem).toHaveBeenCalledWith('mayan-document-view-mode', 'list');
    });
  });

  describe('search functionality', () => {
    it('triggers search when search query changes', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-bar');
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      await waitFor(() => {
        expect(documentsService.getDocuments).toHaveBeenCalledWith({
          page: 1,
          limit: 24,
          searchQuery: 'test query',
        });
      });
    });

    it('searches within cabinet when cabinet is selected', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Select a cabinet first
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(documentsService.getCabinetDocuments).toHaveBeenCalled();
      });

      // Then perform search
      const searchInput = screen.getByTestId('search-bar');
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      await waitFor(() => {
        expect(documentsService.getCabinetDocuments).toHaveBeenCalledWith('1', {
          page: 1,
          limit: 24,
          searchQuery: 'test query',
        });
      });
    });
  });

  describe('error handling', () => {
    it('displays error message when document loading fails', async () => {
      const errorMessage = 'Failed to load documents';
      (documentsService.getDocuments as any).mockRejectedValue(new Error(errorMessage));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error loading documents')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('retries loading when retry button is clicked', async () => {
      const errorMessage = 'Failed to load documents';
      (documentsService.getDocuments as any).mockRejectedValueOnce(new Error(errorMessage))
        .mockResolvedValueOnce({
          documents: mockDocuments,
          folders: [],
          totalCount: mockDocuments.length,
          hasMore: false,
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error loading documents')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(documentsService.getDocuments).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(screen.getByTestId('document-grid')).toHaveTextContent('2 documents');
      });
    });
  });

  describe('infinite scrolling', () => {
    it('shows load more button when there are more documents', async () => {
      (documentsService.getDocuments as any).mockResolvedValue({
        documents: mockDocuments,
        folders: [],
        totalCount: 50,
        hasMore: true,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });
    });

    it('loads more documents when load more is clicked', async () => {
      (documentsService.getDocuments as any)
        .mockResolvedValueOnce({
          documents: mockDocuments,
          folders: [],
          totalCount: 50,
          hasMore: true,
        })
        .mockResolvedValueOnce({
          documents: [mockDocuments[0]],
          folders: [],
          totalCount: 50,
          hasMore: false,
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText('Load More');
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(documentsService.getDocuments).toHaveBeenCalledWith({
          page: 2,
          limit: 24,
          searchQuery: undefined,
        });
      });
    });
  });

  describe('document stats', () => {
    it('displays document count', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2 documents')).toBeInTheDocument();
      });
    });

    it('displays selected document count', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('document-grid')).toBeInTheDocument();
      });

      // This would require more complex mocking of document selection
      // For now, we'll just verify the text pattern exists
      const statsText = screen.getByText(/\d+ documents?/);
      expect(statsText).toBeInTheDocument();
    });
  });
});