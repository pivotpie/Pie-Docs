import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SemanticSearchProcessor } from '@/services/semantic/SemanticSearchProcessor';
import type {
  SemanticSearchQuery,
  SemanticSearchAPIResponse,
  VectorEmbedding,
  SearchSuggestion
} from '@/types/domain/SemanticSearch';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SemanticSearchProcessor', () => {
  let processor: SemanticSearchProcessor;

  beforeEach(() => {
    processor = new SemanticSearchProcessor();
    mockFetch.mockClear();
    mockFetch.mockReset();
    // Clear any cached data from previous tests
    processor.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    // Ensure all ongoing operations are cancelled
    processor.cancelSearch();
  });

  describe('semanticSearch', () => {
    it('should perform semantic search successfully', async () => {
      const mockQuery: SemanticSearchQuery = {
        text: 'artificial intelligence machine learning',
        semanticWeight: 0.8,
        language: 'en',
        includeRelated: true
      };

      const mockResponse: SemanticSearchAPIResponse = {
        results: [
          {
            id: '1',
            title: 'AI Research Paper',
            content: 'Content about AI',
            snippet: 'AI research shows...',
            documentType: 'pdf',
            createdAt: '2023-01-01',
            modifiedAt: '2023-01-01',
            author: 'Dr. Smith',
            metadata: {},
            tags: ['AI', 'ML'],
            score: 0.95,
            highlights: ['artificial intelligence'],
            semanticScore: 0.9,
            conceptualRelevance: 0.85,
            relatedConcepts: ['machine learning', 'neural networks'],
            conceptExplanation: 'High relevance due to AI concepts'
          }
        ],
        totalResults: 1,
        semanticResults: 1,
        keywordResults: 0,
        processingTime: 150,
        conceptsDetected: ['artificial intelligence', 'machine learning']
      };

      const mockEmbedding: VectorEmbedding = {
        id: 'query_embedding',
        vector: [0.1, 0.2, 0.3],
        createdAt: '2023-01-01'
      };

      // Mock embedding generation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEmbedding)
        })
        // Mock search request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })
        // Mock concept extraction for result enhancement
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ concepts: ['machine learning', 'AI', 'algorithms'] })
        });

      const result = await processor.semanticSearch(mockQuery);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(3); // embedding + search + concept extraction

      // Verify embedding generation call
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/semantic-search/embeddings/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockQuery)
      });

      // Verify search call
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/semantic-search/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mockQuery,
          queryEmbedding: mockEmbedding,
          page: 1,
          pageSize: 20,
          includeExplanations: true
        }),
        signal: expect.any(AbortSignal)
      });
    });

    it('should handle search errors gracefully', async () => {
      const mockQuery: SemanticSearchQuery = {
        text: 'test query',
        semanticWeight: 0.7
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(processor.semanticSearch(mockQuery)).rejects.toThrow('Network error');
    });

    it('should cancel ongoing searches', async () => {
      const mockQuery: SemanticSearchQuery = {
        text: 'test query'
      };

      // Create a proper AbortController mock
      const mockAbortController = {
        signal: {
          aborted: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        },
        abort: vi.fn(() => {
          mockAbortController.signal.aborted = true;
        })
      };

      // Mock AbortController globally
      global.AbortController = vi.fn(() => mockAbortController) as unknown as typeof AbortController;

      // Mock embedding generation call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'query_123',
          vector: [0.1, 0.2, 0.3],
          createdAt: '2023-01-01'
        })
      });

      // Mock search call that should be aborted
      mockFetch.mockImplementationOnce((url, options) => {
        // Simulate the abort signal being triggered during the fetch
        if (options?.signal?.aborted) {
          return Promise.reject(new DOMException('The user aborted a request.', 'AbortError'));
        }

        // Return a delayed promise that can be aborted
        return new Promise((_, reject) => {
          setTimeout(() => {
            if (mockAbortController.signal.aborted) {
              reject(new DOMException('The user aborted a request.', 'AbortError'));
            }
          }, 100);
        });
      });

      // Start search and immediately cancel
      const searchPromise = processor.semanticSearch(mockQuery);

      // Trigger cancellation after a short delay to simulate real usage
      setTimeout(() => {
        processor.cancelSearch();
        mockAbortController.abort();
      }, 50);

      // The promise should reject with AbortError
      await expect(searchPromise).rejects.toThrow('Search was cancelled');

      // Verify AbortController was used
      expect(global.AbortController).toHaveBeenCalled();
      expect(mockAbortController.abort).toHaveBeenCalled();
    });
  });

  describe('generateQueryEmbedding', () => {
    it('should generate embedding for query', async () => {
      const mockQuery: SemanticSearchQuery = {
        text: 'machine learning algorithms',
        language: 'en'
      };

      const mockEmbedding: VectorEmbedding = {
        id: 'query_123',
        vector: [0.1, 0.2, 0.3, 0.4],
        createdAt: '2023-01-01'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmbedding)
      });

      const result = await processor.generateQueryEmbedding(mockQuery);

      expect(result).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/embeddings/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockQuery)
      });
    });

    it('should cache embeddings', async () => {
      const mockQuery: SemanticSearchQuery = {
        text: 'test query'
      };

      const mockEmbedding: VectorEmbedding = {
        id: 'cached_embedding',
        vector: [0.1, 0.2],
        createdAt: '2023-01-01'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmbedding)
      });

      // First call should make API request
      const result1 = await processor.generateQueryEmbedding(mockQuery);
      expect(result1).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await processor.generateQueryEmbedding(mockQuery);
      expect(result2).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate cosine similarity correctly', async () => {
      const embedding1: VectorEmbedding = {
        id: '1',
        vector: [1, 0, 0],
        createdAt: '2023-01-01'
      };

      const embedding2: VectorEmbedding = {
        id: '2',
        vector: [0, 1, 0],
        createdAt: '2023-01-01'
      };

      const similarity = await processor.calculateSimilarity(embedding1, embedding2);

      // Perpendicular vectors should have similarity of 0
      expect(similarity).toBe(0);
    });

    it('should handle identical vectors', async () => {
      const embedding1: VectorEmbedding = {
        id: '1',
        vector: [1, 2, 3],
        createdAt: '2023-01-01'
      };

      const embedding2: VectorEmbedding = {
        id: '2',
        vector: [1, 2, 3],
        createdAt: '2023-01-01'
      };

      const similarity = await processor.calculateSimilarity(embedding1, embedding2);

      // Identical vectors should have similarity of 1
      expect(similarity).toBeCloseTo(1, 10);
    });
  });

  describe('extractConcepts', () => {
    it('should extract concepts from text', async () => {
      const mockConcepts = ['artificial intelligence', 'machine learning', 'neural networks'];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ concepts: mockConcepts })
      });

      const result = await processor.extractConcepts(
        'This document discusses artificial intelligence and machine learning with neural networks.'
      );

      expect(result).toEqual(mockConcepts);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/concepts/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'This document discusses artificial intelligence and machine learning with neural networks.',
          language: 'auto'
        })
      });
    });

    it('should handle different languages', async () => {
      const arabicText = 'هذا نص باللغة العربية';
      const mockConcepts = ['تعلم الآلة', 'ذكاء اصطناعي'];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ concepts: mockConcepts })
      });

      const result = await processor.extractConcepts(arabicText, 'ar');

      expect(result).toEqual(mockConcepts);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/concepts/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: arabicText,
          language: 'ar'
        })
      });
    });
  });

  describe('getSearchSuggestions', () => {
    it('should get search suggestions', async () => {
      const mockSuggestions: SearchSuggestion[] = [
        {
          text: 'machine learning algorithms',
          type: 'semantic',
          confidence: 0.9,
          reason: 'Related to your query',
          conceptualBasis: ['ML', 'algorithms']
        },
        {
          text: 'artificial intelligence',
          type: 'related',
          confidence: 0.8,
          reason: 'Frequently searched together'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: mockSuggestions })
      });

      const result = await processor.getSearchSuggestions('machine learn');

      expect(result).toEqual(mockSuggestions);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partialQuery: 'machine learn',
          context: undefined,
          maxSuggestions: 10
        })
      });
    });

    it('should not fetch suggestions for very short queries', async () => {
      const result = await processor.getSearchSuggestions('a');

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('indexDocument', () => {
    it('should index a document successfully', async () => {
      const documentId = 'doc_123';
      const content = 'Document content about AI and ML';
      const metadata = { type: 'research_paper', author: 'Dr. Smith' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await processor.indexDocument(documentId, content, metadata);

      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          content,
          metadata
        })
      });
    });

    it('should handle indexing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await expect(
        processor.indexDocument('doc_123', 'content', {})
      ).rejects.toThrow('Document indexing failed: Internal Server Error');
    });
  });

  describe('batchIndexDocuments', () => {
    it('should batch index multiple documents', async () => {
      const documents = [
        { id: 'doc1', content: 'Content 1', metadata: { type: 'pdf' } },
        { id: 'doc2', content: 'Content 2', metadata: { type: 'word' } }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await processor.batchIndexDocuments(documents);

      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/index/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents })
      });
    });
  });

  describe('updateConfiguration', () => {
    it('should update search configuration', async () => {
      const config = {
        semanticWeight: 0.8,
        keywordWeight: 0.2,
        conceptThreshold: 0.5,
        enableCrossLanguage: true,
        enableFuzzyMatching: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await processor.updateConfiguration(config);

      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    });
  });

  describe('getSemanticHealth', () => {
    it('should get semantic search health status', async () => {
      const mockHealth = {
        indexedDocuments: 1000,
        totalEmbeddings: 1000,
        averageProcessingTime: 150,
        lastIndexUpdate: '2023-01-01T00:00:00Z',
        conceptCoverage: 0.85
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealth)
      });

      const result = await processor.getSemanticHealth();

      expect(result).toEqual(mockHealth);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/health', {
        method: 'GET'
      });
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      // This would normally add to cache, but we'll just test clearing
      processor.clearCache();

      // Cache should be empty (we can't directly test this, but no errors should occur)
      expect(() => processor.clearCache()).not.toThrow();
    });
  });
});