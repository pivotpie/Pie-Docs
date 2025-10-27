import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RelatedDocumentsFinder } from '@/services/semantic/RelatedDocumentsFinder';
import type {
  DocumentSimilarity,
  SimilarDocumentsAPIResponse,
  DocumentRelationship
} from '@/types/domain/SemanticSearch';
import type { SearchResult } from '@/types/domain/Search';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RelatedDocumentsFinder', () => {
  let finder: RelatedDocumentsFinder;

  beforeEach(() => {
    finder = new RelatedDocumentsFinder();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findRelatedDocuments', () => {
    it('should find related documents successfully', async () => {
      const mockSimilarDocuments: DocumentSimilarity[] = [
        {
          documentId: 'doc2',
          similarityScore: 0.85,
          sharedConcepts: ['machine learning', 'AI'],
          relationshipType: 'content'
        },
        {
          documentId: 'doc3',
          similarityScore: 0.72,
          sharedConcepts: ['neural networks'],
          relationshipType: 'topic'
        }
      ];

      const mockResponse: SimilarDocumentsAPIResponse = {
        similarDocuments: mockSimilarDocuments,
        baseDocumentId: 'doc1',
        processingTime: 150
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await finder.findRelatedDocuments('doc1', {
        maxResults: 10,
        minSimilarityScore: 0.3,
        includeMetadataSimilarity: true,
        includeTopicSimilarity: true
      });

      expect(result).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/documents/doc1/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxResults: 10,
          minSimilarityScore: 0.3,
          includeMetadataSimilarity: true,
          includeTopicSimilarity: true,
          includeCitationNetwork: true,
          includeTemporalRelations: false,
          weights: {
            content: 0.6,
            metadata: 0.2,
            topic: 0.2
          }
        })
      });
    });

    it('should cache results for same query', async () => {
      const mockSimilarDocuments: DocumentSimilarity[] = [
        {
          documentId: 'doc2',
          similarityScore: 0.85,
          sharedConcepts: ['AI'],
          relationshipType: 'content'
        }
      ];

      const mockResponse: SimilarDocumentsAPIResponse = {
        similarDocuments: mockSimilarDocuments,
        baseDocumentId: 'doc1',
        processingTime: 150
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const options = { maxResults: 5, minSimilarityScore: 0.5 };

      // First call should make API request
      const result1 = await finder.findRelatedDocuments('doc1', options);
      expect(result1).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with same parameters should use cache
      const result2 = await finder.findRelatedDocuments('doc1', options);
      expect(result2).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await expect(
        finder.findRelatedDocuments('doc1')
      ).rejects.toThrow('Related documents search failed: Internal Server Error');
    });
  });

  describe('findSimilarToResultSet', () => {
    it('should find documents similar to result set', async () => {
      const searchResults: SearchResult[] = [
        {
          id: 'doc1',
          title: 'AI Research',
          content: 'Content about AI',
          snippet: 'AI research...',
          documentType: 'pdf',
          createdAt: '2023-01-01',
          modifiedAt: '2023-01-01',
          author: 'Dr. Smith',
          metadata: {},
          tags: ['AI'],
          score: 0.9,
          highlights: ['artificial intelligence']
        }
      ];

      const mockSimilarDocuments: DocumentSimilarity[] = [
        {
          documentId: 'doc2',
          similarityScore: 0.78,
          sharedConcepts: ['machine learning'],
          relationshipType: 'content'
        }
      ];

      const mockResponse: SimilarDocumentsAPIResponse = {
        similarDocuments: mockSimilarDocuments,
        baseDocumentId: 'doc1',
        processingTime: 120
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await finder.findSimilarToResultSet(searchResults, {
        maxResults: 8,
        minSimilarityScore: 0.4
      });

      expect(result).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/documents/similar-to-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: ['doc1'],
          maxResults: 8,
          minSimilarityScore: 0.4
        })
      });
    });
  });

  describe('calculateDocumentSimilarity', () => {
    it('should calculate similarity between two documents', async () => {
      const mockSimilarityResult = {
        overallSimilarity: 0.75,
        contentSimilarity: 0.8,
        metadataSimilarity: 0.6,
        topicSimilarity: 0.85,
        citationSimilarity: 0.4,
        explanation: 'High similarity due to shared concepts and topics'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSimilarityResult)
      });

      const result = await finder.calculateDocumentSimilarity('doc1', 'doc2', {
        includeContent: true,
        includeMetadata: true,
        includeTopics: true,
        includeCitations: true
      });

      expect(result).toEqual(mockSimilarityResult);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/documents/similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document1Id: 'doc1',
          document2Id: 'doc2',
          includeContent: true,
          includeMetadata: true,
          includeTopics: true,
          includeCitations: true
        })
      });
    });
  });

  describe('getMoreLikeThis', () => {
    it('should get more like this recommendations with default settings', async () => {
      const mockSimilarDocuments: DocumentSimilarity[] = [
        {
          documentId: 'doc2',
          similarityScore: 0.82,
          sharedConcepts: ['AI', 'ML'],
          relationshipType: 'content'
        }
      ];

      const mockResponse: SimilarDocumentsAPIResponse = {
        similarDocuments: mockSimilarDocuments,
        baseDocumentId: 'doc1',
        processingTime: 100
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await finder.getMoreLikeThis('doc1');

      expect(result).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/documents/doc1/related', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxResults: 8,
          minSimilarityScore: 0.4,
          includeMetadataSimilarity: true,
          includeTopicSimilarity: true,
          includeCitationNetwork: false,
          includeTemporalRelations: false,
          weights: {
            content: 0.7,
            metadata: 0.15,
            topic: 0.15
          }
        })
      });
    });
  });

  describe('discoverDocumentRelationships', () => {
    it('should discover document relationships', async () => {
      const mockRelationships: DocumentRelationship[] = [
        {
          documentId: 'doc2',
          relationshipType: 'content',
          score: 0.85,
          explanation: 'Shares similar content themes',
          sharedElements: ['AI', 'machine learning']
        },
        {
          documentId: 'doc3',
          relationshipType: 'citation',
          score: 0.7,
          explanation: 'Cited in references',
          sharedElements: ['Reference 1', 'Reference 3']
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ relationships: mockRelationships })
      });

      const result = await finder.discoverDocumentRelationships('doc1');

      expect(result).toEqual(mockRelationships);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/documents/doc1/relationships', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  describe('buildCitationNetwork', () => {
    it('should build citation network', async () => {
      const mockNetwork = {
        nodes: [
          { id: 'doc1', title: 'Document 1', type: 'research' },
          { id: 'doc2', title: 'Document 2', type: 'review' }
        ],
        edges: [
          { source: 'doc1', target: 'doc2', type: 'cites' as const }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNetwork)
      });

      const result = await finder.buildCitationNetwork(['doc1', 'doc2']);

      expect(result).toEqual(mockNetwork);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/documents/citation-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: ['doc1', 'doc2'] })
      });
    });
  });

  describe('getTemporalRelationships', () => {
    it('should get temporal relationships', async () => {
      const mockTemporalDocs: DocumentSimilarity[] = [
        {
          documentId: 'doc2',
          similarityScore: 0.6,
          sharedConcepts: ['temporal relevance'],
          relationshipType: 'temporal'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ temporalDocuments: mockTemporalDocs })
      });

      const result = await finder.getTemporalRelationships('doc1', {
        before: 14,
        after: 14
      });

      expect(result).toEqual(mockTemporalDocs);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/documents/doc1/temporal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeWindow: { before: 14, after: 14 }
        })
      });
    });
  });

  describe('getPersonalizedRecommendations', () => {
    it('should get personalized recommendations', async () => {
      const mockRecommendations: DocumentSimilarity[] = [
        {
          documentId: 'doc2',
          similarityScore: 0.88,
          sharedConcepts: ['user interest'],
          relationshipType: 'content'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ recommendations: mockRecommendations })
      });

      const result = await finder.getPersonalizedRecommendations('user123', {
        basedOnRecentViews: true,
        basedOnBookmarks: false,
        basedOnSearchHistory: true,
        maxResults: 5
      });

      expect(result).toEqual(mockRecommendations);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/recommendations/user123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basedOnRecentViews: true,
          basedOnBookmarks: false,
          basedOnSearchHistory: true,
          maxResults: 5
        })
      });
    });
  });

  describe('batchCalculateSimilarities', () => {
    it('should calculate similarities in batch', async () => {
      const documentPairs = [
        { doc1: 'doc1', doc2: 'doc2' },
        { doc1: 'doc1', doc2: 'doc3' }
      ];

      const mockSimilarities = {
        'doc1_doc2': 0.85,
        'doc1_doc3': 0.72
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ similarities: mockSimilarities })
      });

      const result = await finder.batchCalculateSimilarities(documentPairs);

      expect(result).toBeInstanceOf(Map);
      expect(result.get('doc1_doc2')).toBe(0.85);
      expect(result.get('doc1_doc3')).toBe(0.72);

      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/documents/batch-similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentPairs })
      });
    });
  });

  describe('updateSimilarityIndex', () => {
    it('should update similarity index for document', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await finder.updateSimilarityIndex('doc1');

      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/documents/doc1/reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    });

    it('should handle update errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      await expect(
        finder.updateSimilarityIndex('nonexistent')
      ).rejects.toThrow('Similarity index update failed: Not Found');
    });
  });

  describe('getSimilarityHealth', () => {
    it('should get similarity health status', async () => {
      const mockHealth = {
        totalDocuments: 1000,
        indexedDocuments: 950,
        averageSimilarityCalculationTime: 125,
        lastIndexUpdate: '2023-01-01T00:00:00Z',
        similarityIndexSize: 2500000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealth)
      });

      const result = await finder.getSimilarityHealth();

      expect(result).toEqual(mockHealth);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similarity/health', {
        method: 'GET'
      });
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      finder.clearCache();
      expect(() => finder.clearCache()).not.toThrow();
    });

    it('should provide cache statistics', () => {
      const stats = finder.getCacheStats();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('cachedQueries');
      expect(Array.isArray(stats.cachedQueries)).toBe(true);
    });
  });
});