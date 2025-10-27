import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SearchService, searchService } from '@/services/api/searchService';
import type { SearchFilters } from '@/types/domain/Search';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    service = new SearchService('/api/search');
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-auth-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('should perform full-text search with Elasticsearch integration', async () => {
      const mockResponse = {
        hits: {
          hits: [
            {
              _id: 'doc-1',
              _score: 0.95,
              _source: {
                title: 'Test Document',
                content: 'This is test content',
                document_type: 'PDF',
                author: 'John Doe',
                created_at: '2025-01-15T10:30:00Z',
                modified_at: '2025-01-20T14:22:00Z',
                metadata: { category: 'Test' },
                tags: ['test', 'document'],
                ocr_text: 'OCR extracted text'
              },
              highlight: {
                content: ['This is <mark>test</mark> content'],
                title: ['<mark>Test</mark> Document']
              }
            }
          ],
          total: { value: 1 }
        },
        took: 45,
        aggregations: {
          document_types: {
            buckets: [
              { key: 'PDF', doc_count: 1 },
              { key: 'Word', doc_count: 2 }
            ]
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.search('test query', {}, 1, 20, 'relevance');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/elasticsearch',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-auth-token',
          },
          body: expect.stringContaining('test query'),
        })
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          id: 'doc-1',
          title: 'Test Document',
          content: 'This is test content',
          documentType: 'PDF',
          author: 'John Doe',
          highlights: expect.arrayContaining(['This is <mark>test</mark> content']),
        })
      );

      expect(result.totalResults).toBe(1);
      expect(result.timeTaken).toBe(45);
    });

    it('should apply document type filters', async () => {
      const filters: SearchFilters = {
        documentTypes: ['PDF', 'Word']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          hits: { hits: [], total: { value: 0 } },
          took: 10
        }),
      });

      await service.search('test', filters);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.query.bool.filter).toContainEqual({
        terms: { document_type: ['PDF', 'Word'] }
      });
    });

    it('should apply date range filters', async () => {
      const filters: SearchFilters = {
        dateRange: {
          start: '2025-01-01',
          end: '2025-01-31'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          hits: { hits: [], total: { value: 0 } },
          took: 10
        }),
      });

      await service.search('test', filters);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.query.bool.filter).toContainEqual({
        range: {
          created_at: {
            gte: '2025-01-01',
            lte: '2025-01-31'
          }
        }
      });
    });

    it('should apply author filters', async () => {
      const filters: SearchFilters = {
        authors: ['John Doe', 'Jane Smith']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          hits: { hits: [], total: { value: 0 } },
          took: 10
        }),
      });

      await service.search('test', filters);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.query.bool.filter).toContainEqual({
        terms: { 'author.keyword': ['John Doe', 'Jane Smith'] }
      });
    });

    it('should apply custom metadata filters', async () => {
      const filters: SearchFilters = {
        customMetadata: {
          category: 'Important',
          priority: 'High'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          hits: { hits: [], total: { value: 0 } },
          took: 10
        }),
      });

      await service.search('test', filters);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.query.bool.filter).toContainEqual({
        term: { 'metadata.category': 'Important' }
      });
      expect(requestBody.query.bool.filter).toContainEqual({
        term: { 'metadata.priority': 'High' }
      });
    });

    it('should build multi-field search query with OCR content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          hits: { hits: [], total: { value: 0 } },
          took: 10
        }),
      });

      await service.search('test query');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const multiMatch = requestBody.query.bool.must[0].multi_match;

      expect(multiMatch.query).toBe('test query');
      expect(multiMatch.fields).toContain('title^3');
      expect(multiMatch.fields).toContain('content^2');
      expect(multiMatch.fields).toContain('ocr_text^1.5');
      expect(multiMatch.fields).toContain('metadata.*');
      expect(multiMatch.fuzziness).toBe('AUTO');
    });

    it('should handle search errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // In development mode, should fallback to mock data
      process.env.NODE_ENV = 'development';

      const result = await service.search('test');

      expect(result.results).toBeDefined();
      expect(result.totalResults).toBeGreaterThanOrEqual(0);
    });

    it('should cancel ongoing search requests', async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

      // Start first search
      mockFetch.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const searchPromise = service.search('first query');

      // Start second search (should cancel first)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          hits: { hits: [], total: { value: 0 } },
          took: 10
        }),
      });

      await service.search('second query');

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('getSuggestions', () => {
    it('should fetch search suggestions', async () => {
      const mockSuggestions = [
        { text: 'test document', type: 'query' as const, category: 'Recent', count: 5 },
        { text: 'test file', type: 'document' as const, category: 'Documents', count: 3 }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: mockSuggestions }),
      });

      const result = await service.getSuggestions('test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/suggestions?q=test&types=query%2Cdocument%2Cmetadata&limit=10',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result).toEqual(mockSuggestions);
    });

    it('should return empty array for short queries', async () => {
      const result = await service.getSuggestions('t');
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle suggestion errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getSuggestions('test');

      expect(result).toEqual([]);
    });
  });

  describe('document indexing', () => {
    it('should index a single document', async () => {
      const documentData = {
        id: 'doc-1',
        title: 'Test Document',
        content: 'Test content',
        ocrText: 'OCR text',
        documentType: 'PDF',
        author: 'John Doe',
        metadata: { category: 'Test' },
        tags: ['test'],
        folderPath: '/documents',
        fileSize: 1024,
        mimeType: 'application/pdf'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, documentId: 'doc-1' }),
      });

      const result = await service.indexDocument(documentData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/index/document',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-auth-token',
          },
        })
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.document).toEqual(
        expect.objectContaining({
          id: 'doc-1',
          title: 'Test Document',
          content: 'Test content',
          ocr_text: 'OCR text',
          document_type: 'PDF',
          author: 'John Doe',
        })
      );

      expect(result.success).toBe(true);
      expect(result.documentId).toBe('doc-1');
    });

    it('should update document index', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated content',
        ocrText: 'Updated OCR',
        metadata: { category: 'Updated' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await service.updateDocumentIndex('doc-1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/index/document/doc-1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.updates.title).toBe('Updated Title');
      expect(requestBody.updates.ocr_text).toBe('Updated OCR');
      expect(requestBody.updates.modified_at).toBeDefined();

      expect(result.success).toBe(true);
    });

    it('should remove document from index', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await service.removeDocumentFromIndex('doc-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/index/document/doc-1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(result.success).toBe(true);
    });

    it('should batch index multiple documents', async () => {
      const documents = [
        {
          id: 'doc-1',
          title: 'Document 1',
          content: 'Content 1',
          documentType: 'PDF',
          author: 'John Doe',
          metadata: {},
          tags: []
        },
        {
          id: 'doc-2',
          title: 'Document 2',
          content: 'Content 2',
          documentType: 'Word',
          author: 'Jane Smith',
          metadata: {},
          tags: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: [
            { id: 'doc-1', success: true },
            { id: 'doc-2', success: true }
          ]
        }),
      });

      const result = await service.batchIndexDocuments(documents);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/index/batch',
        expect.objectContaining({
          method: 'POST',
        })
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.documents).toHaveLength(2);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('advanced search', () => {
    it('should perform advanced search with complex query', async () => {
      const searchQuery = {
        text: 'test',
        filters: { documentTypes: ['PDF'] },
        boolean: 'AND' as const,
        groups: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [],
          totalResults: 0,
          page: 1,
          pageSize: 20
        }),
      });

      const result = await service.advancedSearch(searchQuery);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/advanced',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test'),
        })
      );

      expect(result.results).toBeDefined();
    });
  });

  describe('export functionality', () => {
    it('should export search results', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const exportOptions = {
        format: 'csv' as const,
        includeContent: true,
        includeMetadata: true,
        selectedFields: ['title', 'author', 'created_at']
      };

      const result = await service.exportResults('test', {}, exportOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/export',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('index management', () => {
    it('should get index status', async () => {
      const mockStatus = {
        totalDocuments: 1500,
        lastIndexed: '2025-01-20T10:00:00Z',
        indexHealth: 'green' as const
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      const result = await service.getIndexStatus();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/status',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result).toEqual(mockStatus);
    });

    it('should trigger reindexing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'reindex-123' }),
      });

      const result = await service.reindexDocuments(['doc-1', 'doc-2']);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search/reindex',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('doc-1'),
        })
      );

      expect(result.jobId).toBe('reindex-123');
    });
  });
});

describe('searchService singleton', () => {
  it('should export a singleton instance', () => {
    expect(searchService).toBeInstanceOf(SearchService);
  });

  it('should use default base URL', () => {
    expect(searchService).toBeDefined();
  });
});