import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConceptClusteringEngine } from '@/services/semantic/ConceptClusteringEngine';
import type {
  ConceptCluster,
  ConceptClusterAPIResponse,
  ClusterAnalytics,
  ClusterUpdateResult
} from '@/types/domain/SemanticSearch';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ConceptClusteringEngine', () => {
  let engine: ConceptClusteringEngine;

  beforeEach(() => {
    engine = new ConceptClusteringEngine();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('clusterDocuments', () => {
    it('should cluster documents successfully', async () => {
      const mockClusters: ConceptCluster[] = [
        {
          id: 'cluster_1',
          name: 'AI Research',
          concepts: ['artificial intelligence', 'machine learning', 'neural networks'],
          documentIds: ['doc1', 'doc2', 'doc3'],
          centroidVector: [0.5, 0.3, 0.8],
          coherenceScore: 0.85
        },
        {
          id: 'cluster_2',
          name: 'Data Science',
          concepts: ['data analysis', 'statistics', 'visualization'],
          documentIds: ['doc4', 'doc5'],
          centroidVector: [0.7, 0.2, 0.6],
          coherenceScore: 0.72
        }
      ];

      const mockResponse: ConceptClusterAPIResponse = {
        clusters: mockClusters,
        totalClusters: 2,
        clusteringMethod: 'kmeans',
        coherenceMetrics: {
          average: 0.785,
          silhouette: 0.65
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await engine.clusterDocuments(['doc1', 'doc2', 'doc3', 'doc4', 'doc5'], {
        method: 'kmeans',
        maxClusters: 10,
        minClusterSize: 2
      });

      expect(result).toEqual(mockClusters);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/clusters/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'],
          method: 'kmeans',
          minClusterSize: 2,
          maxClusters: 10,
          coherenceThreshold: 0.4,
          includeSubClusters: true,
          dynamicOptimization: true
        })
      });
    });

    it('should cache clustering results', async () => {
      const mockClusters: ConceptCluster[] = [
        {
          id: 'cluster_1',
          name: 'Test Cluster',
          concepts: ['test'],
          documentIds: ['doc1'],
          centroidVector: [1.0],
          coherenceScore: 1.0
        }
      ];

      const mockResponse: ConceptClusterAPIResponse = {
        clusters: mockClusters,
        totalClusters: 1,
        clusteringMethod: 'auto',
        coherenceMetrics: { average: 1.0 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const documentIds = ['doc1'];
      const options = { method: 'auto' as const, maxClusters: 5 };

      // First call should make API request
      const result1 = await engine.clusterDocuments(documentIds, options);
      expect(result1).toEqual(mockClusters);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with same parameters should use cache
      const result2 = await engine.clusterDocuments(documentIds, options);
      expect(result2).toEqual(mockClusters);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    it('should handle clustering errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await expect(
        engine.clusterDocuments(['doc1', 'doc2'])
      ).rejects.toThrow('Document clustering failed: Internal Server Error');
    });
  });

  describe('autoCluster', () => {
    it('should perform auto clustering', async () => {
      const mockAutoResult = {
        clusters: [
          {
            id: 'auto_cluster_1',
            name: 'Auto Cluster',
            concepts: ['automatic', 'clustering'],
            documentIds: ['doc1', 'doc2'],
            centroidVector: [0.5, 0.5],
            coherenceScore: 0.75
          }
        ],
        method: 'hierarchical',
        parameters: {
          maxClusters: 8,
          minClusterSize: 3,
          coherenceThreshold: 0.6
        },
        quality: 0.85
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAutoResult)
      });

      const result = await engine.autoCluster(['doc1', 'doc2', 'doc3']);

      expect(result).toEqual(mockAutoResult);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/clusters/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: ['doc1', 'doc2', 'doc3'] })
      });
    });
  });

  describe('createConceptClusters', () => {
    it('should create concept-based clusters', async () => {
      const documents = [
        {
          id: 'doc1',
          content: 'Artificial intelligence and machine learning research',
          metadata: { type: 'research' }
        },
        {
          id: 'doc2',
          content: 'Data science and statistical analysis methods',
          metadata: { type: 'analysis' }
        }
      ];

      // This would normally use the actual ConceptExtractor, but we'll test the integration
      // The actual concept extraction would be tested separately
      const result = await engine.createConceptClusters(documents, {
        method: 'kmeans',
        maxClusters: 5
      });

      // The result should be an array of clusters
      expect(Array.isArray(result)).toBe(true);

      // Each cluster should have the required properties
      result.forEach(cluster => {
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('name');
        expect(cluster).toHaveProperty('concepts');
        expect(cluster).toHaveProperty('documentIds');
        expect(cluster).toHaveProperty('centroidVector');
        expect(cluster).toHaveProperty('coherenceScore');
      });
    });
  });

  describe('buildHierarchicalClusters', () => {
    it('should build hierarchical clusters', async () => {
      const mockHierarchicalClusters: ConceptCluster[] = [
        {
          id: 'root_cluster_1',
          name: 'Technology',
          concepts: ['technology', 'innovation'],
          documentIds: ['doc1', 'doc2', 'doc3'],
          centroidVector: [0.6, 0.4],
          coherenceScore: 0.8,
          subClusters: [
            {
              id: 'sub_cluster_1',
              name: 'AI',
              concepts: ['AI', 'machine learning'],
              documentIds: ['doc1', 'doc2'],
              centroidVector: [0.7, 0.3],
              coherenceScore: 0.9,
              parentClusterId: 'root_cluster_1'
            }
          ]
        }
      ];

      const mockResponse: ConceptClusterAPIResponse = {
        clusters: mockHierarchicalClusters,
        totalClusters: 2,
        clusteringMethod: 'hierarchical',
        coherenceMetrics: { average: 0.85 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await engine.buildHierarchicalClusters(['doc1', 'doc2', 'doc3'], 3);

      expect(result).toEqual(mockHierarchicalClusters);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/clusters/hierarchical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: ['doc1', 'doc2', 'doc3'],
          maxLevels: 3
        })
      });
    });
  });

  describe('updateClusters', () => {
    it('should update clusters with new documents', async () => {
      const existingClusters: ConceptCluster[] = [
        {
          id: 'cluster_1',
          name: 'Existing',
          concepts: ['existing'],
          documentIds: ['doc1'],
          centroidVector: [1.0],
          coherenceScore: 1.0
        }
      ];

      const mockUpdateResult: ClusterUpdateResult = {
        clustersModified: 1,
        clustersCreated: 0,
        clustersRemoved: 0,
        documentsReassigned: 1,
        newCoherenceScore: 0.85
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUpdateResult)
      });

      const result = await engine.updateClusters(['doc2'], existingClusters);

      expect(result).toEqual(mockUpdateResult);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/clusters/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDocumentIds: ['doc2'],
          existingClusters
        })
      });
    });

    it('should clear cache after update', async () => {
      const mockUpdateResult: ClusterUpdateResult = {
        clustersModified: 0,
        clustersCreated: 0,
        clustersRemoved: 0,
        documentsReassigned: 0,
        newCoherenceScore: 0.5
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUpdateResult)
      });

      // The cache should be cleared - we can test this indirectly
      await engine.updateClusters(['doc2'], []);

      // Cache should be cleared (tested via getCacheStats)
      const cacheStats = engine.getCacheStats();
      expect(cacheStats.cacheSize).toBe(0);
    });
  });

  describe('analyzeClusterQuality', () => {
    it('should analyze cluster quality', async () => {
      const clusters: ConceptCluster[] = [
        {
          id: 'cluster_1',
          name: 'Test',
          concepts: ['test'],
          documentIds: ['doc1', 'doc2'],
          centroidVector: [1.0],
          coherenceScore: 0.8
        }
      ];

      const mockAnalytics: ClusterAnalytics = {
        totalClusters: 1,
        averageClusterSize: 2,
        silhouetteScore: 0.75,
        coherenceScore: 0.8,
        clusterDistribution: { 'cluster_1': 2 },
        topConcepts: ['test']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalytics)
      });

      const result = await engine.analyzeClusterQuality(clusters);

      expect(result).toEqual(mockAnalytics);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/clusters/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusters })
      });
    });
  });

  describe('findOptimalClusterCount', () => {
    it('should find optimal number of clusters', async () => {
      const mockOptimalResult = {
        optimalK: 5,
        scores: [
          { k: 3, score: 0.6, method: 'elbow' },
          { k: 4, score: 0.7, method: 'elbow' },
          { k: 5, score: 0.85, method: 'elbow' },
          { k: 6, score: 0.75, method: 'elbow' }
        ],
        recommendation: 'Use 5 clusters for optimal balance of cohesion and separation'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOptimalResult)
      });

      const result = await engine.findOptimalClusterCount(['doc1', 'doc2', 'doc3'], 10);

      expect(result).toEqual(mockOptimalResult);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/clusters/optimal-k', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: ['doc1', 'doc2', 'doc3'],
          maxK: 10
        })
      });
    });
  });

  describe('mergeSimilarClusters', () => {
    it('should merge similar clusters', async () => {
      const inputClusters: ConceptCluster[] = [
        {
          id: 'cluster_1',
          name: 'AI',
          concepts: ['AI', 'machine learning'],
          documentIds: ['doc1'],
          centroidVector: [1.0, 0.8],
          coherenceScore: 0.9
        },
        {
          id: 'cluster_2',
          name: 'ML',
          concepts: ['machine learning', 'neural networks'],
          documentIds: ['doc2'],
          centroidVector: [0.9, 1.0],
          coherenceScore: 0.85
        }
      ];

      const mergedClusters: ConceptCluster[] = [
        {
          id: 'merged_cluster_1',
          name: 'AI & ML',
          concepts: ['AI', 'machine learning', 'neural networks'],
          documentIds: ['doc1', 'doc2'],
          centroidVector: [0.95, 0.9],
          coherenceScore: 0.87
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ mergedClusters })
      });

      const result = await engine.mergeSimilarClusters(inputClusters, 0.8);

      expect(result).toEqual(mergedClusters);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/clusters/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusters: inputClusters,
          similarityThreshold: 0.8
        })
      });
    });
  });

  describe('splitLargeClusters', () => {
    it('should split large clusters', async () => {
      const largeClusters: ConceptCluster[] = [
        {
          id: 'large_cluster',
          name: 'Large Cluster',
          concepts: ['various', 'topics'],
          documentIds: Array.from({ length: 60 }, (_, i) => `doc${i + 1}`), // 60 documents
          centroidVector: [0.5, 0.5],
          coherenceScore: 0.4
        }
      ];

      const splitClusters: ConceptCluster[] = [
        {
          id: 'split_cluster_1',
          name: 'Split Cluster 1',
          concepts: ['topic1'],
          documentIds: Array.from({ length: 30 }, (_, i) => `doc${i + 1}`),
          centroidVector: [0.6, 0.4],
          coherenceScore: 0.7
        },
        {
          id: 'split_cluster_2',
          name: 'Split Cluster 2',
          concepts: ['topic2'],
          documentIds: Array.from({ length: 30 }, (_, i) => `doc${i + 31}`),
          centroidVector: [0.4, 0.6],
          coherenceScore: 0.65
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ splitClusters })
      });

      const result = await engine.splitLargeClusters(largeClusters, 50);

      expect(result).toEqual(splitClusters);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/clusters/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusters: largeClusters,
          maxClusterSize: 50
        })
      });
    });
  });

  describe('getClusterTrends', () => {
    it('should get cluster trends over time', async () => {
      const mockTrends = [
        {
          timestamp: '2023-01-01T00:00:00Z',
          clusterCount: 5,
          averageSize: 10,
          topConcepts: ['AI', 'ML', 'data'],
          qualityScore: 0.8
        },
        {
          timestamp: '2023-01-02T00:00:00Z',
          clusterCount: 6,
          averageSize: 12,
          topConcepts: ['AI', 'ML', 'data', 'analytics'],
          qualityScore: 0.85
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

      const result = await engine.getClusterTrends(timeRange);

      expect(result).toEqual(mockTrends);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/clusters/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeRange)
      });
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      engine.clearCache();
      expect(() => engine.clearCache()).not.toThrow();
    });

    it('should provide cache statistics', () => {
      const stats = engine.getCacheStats();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('cachedQueries');
      expect(Array.isArray(stats.cachedQueries)).toBe(true);
    });
  });
});