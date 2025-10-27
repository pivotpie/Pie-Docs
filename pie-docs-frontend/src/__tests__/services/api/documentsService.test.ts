import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentsService } from '@/services/api/documentsService';
import type { DocumentQueryParams } from '@/types/domain/Document';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
const originalEnv = import.meta.env;

// Mock the service to avoid testing with real environment variables
vi.mock('@/services/api/documentsService', async () => {
  const actual = await vi.importActual('@/services/api/documentsService');
  return {
    ...actual,
    documentsService: {
      getCabinets: vi.fn(),
      getCabinetDocuments: vi.fn(),
      getDocuments: vi.fn(),
      getDocumentThumbnailUrl: vi.fn(),
      getDocumentFiles: vi.fn(),
    },
  };
});

describe('DocumentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCabinets', () => {
    it('should fetch cabinets successfully', async () => {
      const mockCabinets = [
        { id: 1, label: 'Marketing Cabinet', documents_count: 25 },
        { id: 2, label: 'Legal Documents', documents_count: 15 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockCabinets }),
      });

      const result = await documentsService.getCabinets();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/v4/cabinets/',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            Authorization: expect.stringMatching(/Basic/),
          }),
        })
      );
      expect(result).toEqual(mockCabinets);
    });

    it('should handle cabinets fetch error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await documentsService.getCabinets();

      expect(result).toEqual([]);
    });

    it('should return mock data when USE_MOCK_DATA is true', async () => {
      import.meta.env.VITE_USE_MOCK_DATA = 'true';

      const result = await documentsService.getCabinets();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual([
        { id: 1, label: 'Marketing Cabinet', documents_count: 25 },
        { id: 2, label: 'Legal Documents', documents_count: 15 },
        { id: 3, label: 'Financial Reports', documents_count: 30 },
        { id: 4, label: 'HR Documents', documents_count: 12 },
      ]);
    });
  });

  describe('getCabinetDocuments', () => {
    it('should fetch cabinet documents successfully', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            label: 'Test Document.pdf',
            datetime_created: '2024-01-01T10:00:00Z',
            datetime_modified: '2024-01-02T11:00:00Z',
            description: 'Test description',
          },
        ],
        count: 1,
        next: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const params: DocumentQueryParams = {
        page: 1,
        limit: 20,
        searchQuery: 'test',
      };

      const result = await documentsService.getCabinetDocuments('1', params);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/v4/cabinets/1/documents/?page=1&page_size=20&search=test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            Authorization: expect.stringMatching(/Basic/),
          }),
        })
      );

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual(
        expect.objectContaining({
          id: '1',
          name: 'Test Document.pdf',
          type: 'pdf',
          status: 'published',
          path: '/cabinet-1',
          thumbnail: expect.stringContaining('/documents/1/files/1/pages/1/image/'),
        })
      );
    });

    it('should handle cabinet documents fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await documentsService.getCabinetDocuments('1');

      expect(result.documents).toEqual(expect.any(Array));
      expect(result.totalCount).toBeGreaterThan(0);
    });
  });

  describe('getDocumentThumbnailUrl', () => {
    it('should generate correct thumbnail URL', () => {
      const url = documentsService.getDocumentThumbnailUrl('123');
      expect(url).toBe('http://test-api.com/api/v4/documents/123/files/1/pages/1/image/');
    });

    it('should generate correct thumbnail URL with fileId and pageId', () => {
      const url = documentsService.getDocumentThumbnailUrl('123', '2', '3');
      expect(url).toBe('http://test-api.com/api/v4/documents/123/files/2/pages/3/image/');
    });

    it('should return mock URL when USE_MOCK_DATA is true', () => {
      import.meta.env.VITE_USE_MOCK_DATA = 'true';

      const url = documentsService.getDocumentThumbnailUrl('123');
      expect(url).toBe('https://picsum.photos/200/300?random=123');
    });
  });

  describe('getDocumentFiles', () => {
    it('should fetch document files successfully', async () => {
      const mockFiles = [
        { id: 1, pages_count: 5 },
        { id: 2, pages_count: 3 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockFiles }),
      });

      const result = await documentsService.getDocumentFiles('123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/v4/documents/123/files/',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            Authorization: expect.stringMatching(/Basic/),
          }),
        })
      );
      expect(result).toEqual(mockFiles);
    });

    it('should handle document files fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await documentsService.getDocumentFiles('123');

      expect(result).toEqual([{ id: 1, pages_count: 1 }]);
    });
  });

  describe('getDocuments', () => {
    it('should fetch documents with thumbnails', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            label: 'Test Document.pdf',
            datetime_created: '2024-01-01T10:00:00Z',
            datetime_modified: '2024-01-02T11:00:00Z',
          },
        ],
        count: 1,
        next: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await documentsService.getDocuments({ page: 1, limit: 10 });

      expect(result.documents[0]).toEqual(
        expect.objectContaining({
          id: '1',
          name: 'Test Document.pdf',
          thumbnail: expect.stringContaining('/documents/1/files/1/pages/1/image/'),
        })
      );
    });
  });

  describe('authentication headers', () => {
    it('should use basic auth when username and password are provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await documentsService.getCabinets();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=', // base64 of testuser:testpass
          }),
        })
      );
    });

    it('should use token auth when token is provided', async () => {
      import.meta.env.VITE_MAYAN_API_TOKEN = 'test-token';
      delete import.meta.env.VITE_MAYAN_USERNAME;
      delete import.meta.env.VITE_MAYAN_PASSWORD;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await documentsService.getCabinets();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Token test-token',
          }),
        })
      );
    });
  });
});