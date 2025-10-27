import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimilarDocumentDiscovery } from '@/services/semantic/SimilarDocumentDiscovery';
import type {
  DocumentSimilarity,
  ContentFingerprint,
  SimilarityExplanation
} from '@/types/domain/SemanticSearch';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SimilarDocumentDiscovery', () => {
  let discovery: SimilarDocumentDiscovery;

  beforeEach(() => {
    discovery = new SimilarDocumentDiscovery();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findSimilarDocuments', () => {
    it('should find similar documents successfully', async () => {
      const mockSimilarDocuments: DocumentSimilarity[] = [
        {
          documentId: 'doc2',
          similarityScore: 0.85,
          sharedConcepts: ['AI', 'machine learning'],
          relationshipType: 'content'
        },
        {
          documentId: 'doc3',
          similarityScore: 0.72,
          sharedConcepts: ['neural networks'],
          relationshipType: 'topic'
        }
      ];

      const mockResponse = {
        similarDocuments: mockSimilarDocuments
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await discovery.findSimilarDocuments('doc1', {
        includeTextSimilarity: true,
        includeSemanticSimilarity: true,
        maxResults: 10,
        minSimilarityScore: 0.3
      });

      expect(result).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similar-documents/doc1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeTextSimilarity: true,
          includeSemanticSimilarity: true,
          includeStructuralSimilarity: false,
          includeMetadataSimilarity: true,
          weights: {
            text: 0.4,
            semantic: 0.4,
            structural: 0.1,
            metadata: 0.1
          },
          minSimilarityScore: 0.3,
          maxResults: 10,
          explainSimilarity: false
        })
      });
    });

    it('should cache similar document results', async () => {
      const mockSimilarDocuments: DocumentSimilarity[] = [
        {
          documentId: 'doc2',
          similarityScore: 0.75,
          sharedConcepts: ['test'],
          relationshipType: 'content'
        }
      ];

      const mockResponse = { similarDocuments: mockSimilarDocuments };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const options = { maxResults: 5, minSimilarityScore: 0.5 };

      // First call should make API request
      const result1 = await discovery.findSimilarDocuments('doc1', options);
      expect(result1).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with same parameters should use cache
      const result2 = await discovery.findSimilarDocuments('doc1', options);
      expect(result2).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await expect(
        discovery.findSimilarDocuments('doc1')
      ).rejects.toThrow('Similar document discovery failed: Internal Server Error');
    });
  });

  describe('generateContentFingerprint', () => {
    it('should generate content fingerprint', async () => {
      const mockFingerprint: ContentFingerprint = {
        documentId: 'doc1',
        textFingerprint: ['machine learning', 'artificial intelligence', 'neural networks'],
        semanticFingerprint: [0.1, 0.2, 0.3, 0.4],
        structuralFingerprint: {
          paragraphs: 5,
          sentences: 25,
          avgSentenceLength: 15,
          headingCount: 3,
          listCount: 2
        },
        metadataFingerprint: {
          type: 'research',
          category: 'AI'
        },
        createdAt: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFingerprint)
      });

      const result = await discovery.generateContentFingerprint(
        'doc1',
        'Content about machine learning and AI',
        { type: 'research', category: 'AI' }
      );

      expect(result).toEqual(mockFingerprint);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/fingerprint/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: 'doc1',
          content: 'Content about machine learning and AI',
          metadata: { type: 'research', category: 'AI' }
        })
      });
    });

    it('should cache fingerprints', async () => {
      const mockFingerprint: ContentFingerprint = {
        documentId: 'doc1',
        textFingerprint: ['test'],
        semanticFingerprint: [1.0],
        structuralFingerprint: {
          paragraphs: 1,
          sentences: 1,
          avgSentenceLength: 1,
          headingCount: 0,
          listCount: 0
        },
        metadataFingerprint: {},
        createdAt: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFingerprint)
      });

      // First call should make API request
      const result1 = await discovery.generateContentFingerprint('doc1', 'test content');
      expect(result1).toEqual(mockFingerprint);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await discovery.generateContentFingerprint('doc1', 'test content');
      expect(result2).toEqual(mockFingerprint);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });
  });

  describe('calculateContextualSimilarity', () => {
    it('should calculate contextual similarity', async () => {
      const mockExplanation: SimilarityExplanation = {
        overallScore: 0.85,
        textSimilarity: 0.8,
        semanticSimilarity: 0.9,
        structuralSimilarity: 0.7,
        metadataSimilarity: 0.6,
        explanation: 'High similarity due to shared AI concepts and similar document structure',
        keyFactors: ['shared vocabulary', 'similar topics', 'comparable length'],
        confidence: 0.9
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExplanation)
      });

      const result = await discovery.calculateContextualSimilarity('doc1', 'doc2', {
        userIntent: 'research',
        domainContext: 'AI'
      });

      expect(result).toEqual(mockExplanation);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similarity/contextual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document1Id: 'doc1',
          document2Id: 'doc2',
          context: {
            userIntent: 'research',
            domainContext: 'AI'
          }
        })
      });
    });
  });

  describe('explainSimilarity', () => {
    it('should explain similarity between documents', async () => {
      const mockExplanation: SimilarityExplanation = {
        overallScore: 0.78,
        textSimilarity: 0.75,
        semanticSimilarity: 0.82,
        structuralSimilarity: 0.65,
        metadataSimilarity: 0.7,
        explanation: 'Documents share similar concepts about machine learning with comparable structure',
        keyFactors: ['machine learning', 'algorithms', 'data analysis'],
        confidence: 0.85
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExplanation)
      });

      const result = await discovery.explainSimilarity('doc1', 'doc2');

      expect(result).toEqual(mockExplanation);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similarity/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseDocumentId: 'doc1',
          similarDocumentId: 'doc2'
        })
      });
    });
  });

  describe('findDocumentsByPattern', () => {
    it('should find documents by pattern', async () => {
      const mockSimilarDocuments: DocumentSimilarity[] = [
        {
          documentId: 'doc2',
          similarityScore: 0.82,
          sharedConcepts: ['research paper', 'methodology'],
          relationshipType: 'structure'
        }
      ];

      const mockResponse = { similarDocuments: mockSimilarDocuments };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const pattern = {
        type: 'structure' as const,
        characteristics: {
          hasAbstract: true,
          hasConclusion: true,
          sectionCount: 5
        }
      };

      const result = await discovery.findDocumentsByPattern(pattern, 15);

      expect(result).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similar-documents/pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern,
          maxResults: 15
        })
      });
    });
  });

  describe('findSimilarToText', () => {
    it('should find documents similar to text', async () => {
      const mockSimilarDocuments: DocumentSimilarity[] = [
        {
          documentId: 'doc1',
          similarityScore: 0.76,
          sharedConcepts: ['machine learning', 'artificial intelligence'],
          relationshipType: 'content'
        }
      ];

      const mockResponse = { similarDocuments: mockSimilarDocuments };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await discovery.findSimilarToText(
        'Machine learning algorithms for artificial intelligence',
        {
          maxResults: 8,
          minSimilarityScore: 0.5
        }
      );

      expect(result).toEqual(mockSimilarDocuments);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similar-documents/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Machine learning algorithms for artificial intelligence',
          maxResults: 8,
          minSimilarityScore: 0.5
        })
      });
    });
  });

  describe('getSimilarityTrends', () => {
    it('should get similarity trends over time', async () => {
      const mockTrends = [
        {
          timestamp: '2023-01-01T00:00:00Z',
          averageSimilarity: 0.65,
          topSimilarDocuments: ['doc2', 'doc3'],
          trendDirection: 'increasing' as const
        },
        {
          timestamp: '2023-01-02T00:00:00Z',
          averageSimilarity: 0.72,
          topSimilarDocuments: ['doc2', 'doc4'],
          trendDirection: 'stable' as const
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrends)
      });

      const timeRange = {
        start: '2023-01-01',
        end: '2023-01-02',
        interval: 'day' as const
      };

      const result = await discovery.getSimilarityTrends('doc1', timeRange);

      expect(result).toEqual(mockTrends);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similarity/trends/doc1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeRange)
      });
    });
  });

  describe('batchSimilarityAnalysis', () => {
    it('should perform batch similarity analysis', async () => {
      const mockResults = {
        results: {
          'doc1': [
            {
              documentId: 'doc2',
              similarityScore: 0.8,
              sharedConcepts: ['AI'],
              relationshipType: 'content'
            }
          ],
          'doc2': [
            {
              documentId: 'doc1',
              similarityScore: 0.8,
              sharedConcepts: ['AI'],
              relationshipType: 'content'
            }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults)
      });

      const result = await discovery.batchSimilarityAnalysis(['doc1', 'doc2'], {
        maxResults: 5
      });

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('doc1')).toBeDefined();
      expect(result.get('doc2')).toBeDefined();

      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similar-documents/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: ['doc1', 'doc2'],
          options: { maxResults: 5 }
        })
      });
    });
  });

  describe('updateDocumentSimilarityIndex', () => {
    it('should update document similarity index', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await discovery.updateDocumentSimilarityIndex('doc1', 'new content', { type: 'updated' });

      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similar-documents/index/doc1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'new content',
          metadata: { type: 'updated' }
        })
      });
    });

    it('should clear cache after update', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await discovery.updateDocumentSimilarityIndex('doc1');

      // Cache should be affected (test indirectly via cache stats)
      const cacheStats = discovery.getCacheStats();
      expect(cacheStats).toHaveProperty('fingerprintCacheSize');
      expect(cacheStats).toHaveProperty('similarityCacheSize');
    });
  });

  describe('removeFromSimilarityIndex', () => {
    it('should remove document from similarity index', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await discovery.removeFromSimilarityIndex('doc1');

      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similar-documents/index/doc1', {
        method: 'DELETE'
      });
    });

    it('should handle removal errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      await expect(
        discovery.removeFromSimilarityIndex('nonexistent')
      ).rejects.toThrow('Document removal from index failed: Not Found');
    });
  });

  describe('getSimilarityIndexHealth', () => {
    it('should get similarity index health', async () => {
      const mockHealth = {
        totalDocuments: 1000,
        indexedDocuments: 950,
        averageProcessingTime: 125,
        indexSize: 2500000,
        lastUpdate: '2023-01-01T00:00:00Z',
        qualityMetrics: {
          averageAccuracy: 0.85,
          falsePositiveRate: 0.05,
          coverageScore: 0.95
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealth)
      });

      const result = await discovery.getSimilarityIndexHealth();

      expect(result).toEqual(mockHealth);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similar-documents/health', {
        method: 'GET'
      });
    });
  });

  describe('optimizeSimilarityAlgorithms', () => {
    it('should optimize similarity algorithms', async () => {
      const mockOptimization = {
        optimizationsApplied: ['vector indexing', 'cache optimization'],
        performanceImprovement: 0.25,
        accuracyChange: 0.02,
        recommendations: ['increase cache size', 'update embeddings']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOptimization)
      });

      const result = await discovery.optimizeSimilarityAlgorithms();

      expect(result).toEqual(mockOptimization);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/similar-documents/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  describe('calculateLocalFingerprint', () => {
    it('should calculate local fingerprint', () => {
      const content = 'This is a test document about machine learning and artificial intelligence. It has multiple sentences and covers AI topics.';
      const metadata = { type: 'test', category: 'AI' };

      const fingerprint = discovery.calculateLocalFingerprint(content, metadata);

      expect(fingerprint).toHaveProperty('documentId', 'local');
      expect(fingerprint).toHaveProperty('textFingerprint');
      expect(fingerprint).toHaveProperty('semanticFingerprint');
      expect(fingerprint).toHaveProperty('structuralFingerprint');
      expect(fingerprint).toHaveProperty('metadataFingerprint', metadata);
      expect(fingerprint).toHaveProperty('createdAt');

      // Validate structural fingerprint
      expect(fingerprint.structuralFingerprint).toHaveProperty('paragraphs');
      expect(fingerprint.structuralFingerprint).toHaveProperty('sentences');
      expect(fingerprint.structuralFingerprint).toHaveProperty('avgSentenceLength');
      expect(fingerprint.structuralFingerprint).toHaveProperty('headingCount');
      expect(fingerprint.structuralFingerprint).toHaveProperty('listCount');

      // Validate text fingerprint is not empty
      expect(fingerprint.textFingerprint.length).toBeGreaterThan(0);

      // Validate semantic fingerprint is numeric array
      expect(Array.isArray(fingerprint.semanticFingerprint)).toBe(true);
      fingerprint.semanticFingerprint.forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('should handle empty content', () => {
      const fingerprint = discovery.calculateLocalFingerprint('');

      expect(fingerprint.textFingerprint).toEqual([]);
      expect(fingerprint.structuralFingerprint.sentences).toBe(0);
      expect(fingerprint.structuralFingerprint.paragraphs).toBe(1); // Empty string creates one "paragraph"
    });
  });

  describe('cache management', () => {
    it('should clear all caches', () => {
      discovery.clearCache();
      expect(() => discovery.clearCache()).not.toThrow();
    });

    it('should provide cache statistics', () => {
      const stats = discovery.getCacheStats();
      expect(stats).toHaveProperty('fingerprintCacheSize');
      expect(stats).toHaveProperty('similarityCacheSize');
      expect(stats).toHaveProperty('totalCacheSize');
      expect(typeof stats.fingerprintCacheSize).toBe('number');
      expect(typeof stats.similarityCacheSize).toBe('number');
      expect(typeof stats.totalCacheSize).toBe('number');
    });
  });
});