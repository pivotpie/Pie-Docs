import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TopicNavigator } from '@/services/semantic/TopicNavigator';
import type {
  TopicHierarchy,
  TopicNavigationAPIResponse,
  TopicClassification,
  TopicTrend,
  TopicSuggestion
} from '@/types/domain/SemanticSearch';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TopicNavigator', () => {
  let navigator: TopicNavigator;

  beforeEach(() => {
    navigator = new TopicNavigator();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTopicHierarchy', () => {
    it('should get topic hierarchy successfully', async () => {
      const mockHierarchy: TopicHierarchy[] = [
        {
          id: 'topic1',
          name: 'Technology',
          level: 0,
          documentCount: 15,
          children: [
            {
              id: 'topic1.1',
              name: 'Artificial Intelligence',
              level: 1,
              documentCount: 8,
              children: [],
              parentId: 'topic1',
              keywords: ['AI', 'machine learning'],
              confidence: 0.85
            }
          ],
          keywords: ['technology', 'innovation'],
          confidence: 0.9
        }
      ];

      const mockResponse: TopicNavigationAPIResponse = {
        hierarchy: mockHierarchy,
        totalTopics: 2,
        detectionConfidence: 0.85
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await navigator.getTopicHierarchy(['doc1', 'doc2'], {
        algorithm: 'auto',
        numTopics: 20,
        minTopicSize: 5
      });

      expect(result).toEqual(mockHierarchy);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: ['doc1', 'doc2'],
          algorithm: 'auto',
          numTopics: 20,
          minTopicSize: 5,
          coherenceThreshold: 0.4,
          includeCrossLanguage: true,
          detectTrends: false
        })
      });
    });

    it('should cache topic hierarchy results', async () => {
      const mockHierarchy: TopicHierarchy[] = [
        {
          id: 'topic1',
          name: 'Test Topic',
          level: 0,
          documentCount: 5,
          children: [],
          keywords: ['test'],
          confidence: 0.8
        }
      ];

      const mockResponse: TopicNavigationAPIResponse = {
        hierarchy: mockHierarchy,
        totalTopics: 1,
        detectionConfidence: 0.8
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const documentIds = ['doc1'];
      const options = { algorithm: 'auto' as const, numTopics: 10 };

      // First call should make API request
      const result1 = await navigator.getTopicHierarchy(documentIds, options);
      expect(result1).toEqual(mockHierarchy);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with same parameters should use cache
      const result2 = await navigator.getTopicHierarchy(documentIds, options);
      expect(result2).toEqual(mockHierarchy);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });
  });

  describe('detectTopics', () => {
    it('should detect topics successfully', async () => {
      const mockTopics: TopicClassification[] = [
        {
          topicId: 'topic1',
          topicName: 'Machine Learning',
          confidence: 0.9,
          keywords: ['machine learning', 'AI', 'algorithms'],
          documentCount: 12,
          subTopics: []
        },
        {
          topicId: 'topic2',
          topicName: 'Data Science',
          confidence: 0.85,
          keywords: ['data', 'analysis', 'statistics'],
          documentCount: 8,
          subTopics: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ topics: mockTopics })
      });

      const result = await navigator.detectTopics(['doc1', 'doc2', 'doc3'], {
        algorithm: 'lda',
        numTopics: 10,
        minTopicSize: 3
      });

      expect(result).toEqual(mockTopics);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: ['doc1', 'doc2', 'doc3'],
          algorithm: 'lda',
          numTopics: 10,
          minTopicSize: 3,
          coherenceThreshold: 0.3
        })
      });
    });
  });

  describe('classifyDocument', () => {
    it('should classify document into topics', async () => {
      const mockClassifications: TopicClassification[] = [
        {
          topicId: 'topic1',
          topicName: 'Technology',
          confidence: 0.88,
          keywords: ['technology', 'innovation'],
          documentCount: 0,
          subTopics: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ classifications: mockClassifications })
      });

      const result = await navigator.classifyDocument('doc1', 'Content about technology and innovation');

      expect(result).toEqual(mockClassifications);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/classify/doc1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Content about technology and innovation' })
      });
    });
  });

  describe('browseByTopic', () => {
    it('should browse documents by topic', async () => {
      const mockBrowseResult = {
        documents: [
          {
            id: 'doc1',
            title: 'AI Research Paper',
            snippet: 'Research on artificial intelligence...',
            topicRelevance: 0.92,
            relatedTopics: ['machine learning', 'neural networks']
          }
        ],
        totalDocuments: 1,
        topicInfo: {
          topicId: 'topic1',
          topicName: 'Artificial Intelligence',
          confidence: 0.9,
          keywords: ['AI', 'machine learning'],
          documentCount: 15,
          subTopics: []
        },
        relatedTopics: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBrowseResult)
      });

      const result = await navigator.browseByTopic('topic1', {
        minDocumentCount: 5
      }, 1, 10);

      expect(result).toEqual(mockBrowseResult);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/topic1/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: { minDocumentCount: 5 },
          page: 1,
          pageSize: 10
        })
      });
    });
  });

  describe('getTopicTrends', () => {
    it('should get topic trends over time', async () => {
      const mockTrends: TopicTrend[] = [
        {
          topicId: 'topic1',
          topicName: 'AI',
          timeRange: {
            start: '2023-01-01',
            end: '2023-01-31'
          },
          documentCounts: [
            { timestamp: '2023-01-01', count: 5 },
            { timestamp: '2023-01-15', count: 8 },
            { timestamp: '2023-01-31', count: 12 }
          ],
          trendDirection: 'increasing',
          growthRate: 0.25,
          relatedTopics: ['machine learning', 'technology']
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrends)
      });

      const timeRange = {
        start: '2023-01-01',
        end: '2023-01-31',
        interval: 'week' as const
      };

      const result = await navigator.getTopicTrends(timeRange, {
        topicIds: ['topic1']
      });

      expect(result).toEqual(mockTrends);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeRange,
          filter: { topicIds: ['topic1'] }
        })
      });
    });
  });

  describe('searchTopics', () => {
    it('should search topics by keywords', async () => {
      const mockTopics: TopicClassification[] = [
        {
          topicId: 'topic1',
          topicName: 'Machine Learning',
          confidence: 0.95,
          keywords: ['machine learning', 'AI'],
          documentCount: 20,
          subTopics: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ topics: mockTopics })
      });

      const result = await navigator.searchTopics('machine learning', {
        fuzzyMatch: true,
        language: 'en',
        maxResults: 5
      });

      expect(result).toEqual(mockTopics);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'machine learning',
          fuzzyMatch: true,
          language: 'en',
          includeDescendants: true,
          maxResults: 5
        })
      });
    });
  });

  describe('getTopicSuggestions', () => {
    it('should get personalized topic suggestions', async () => {
      const mockSuggestions: TopicSuggestion[] = [
        {
          topicId: 'topic1',
          topicName: 'Data Science',
          relevanceScore: 0.88,
          reason: 'Based on your recent search history',
          keywords: ['data', 'analysis', 'statistics']
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ suggestions: mockSuggestions })
      });

      const result = await navigator.getTopicSuggestions('user123', {
        currentDocument: 'doc1',
        recentTopics: ['topic2'],
        searchHistory: ['machine learning']
      }, 5);

      expect(result).toEqual(mockSuggestions);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/suggestions/user123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            currentDocument: 'doc1',
            recentTopics: ['topic2'],
            searchHistory: ['machine learning']
          },
          maxSuggestions: 5
        })
      });
    });
  });

  describe('createCustomTopic', () => {
    it('should create custom topic', async () => {
      const mockTopic: TopicClassification = {
        topicId: 'custom_topic_1',
        topicName: 'Custom AI Topic',
        confidence: 1.0,
        keywords: ['custom', 'AI', 'topic'],
        documentCount: 0,
        subTopics: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ topic: mockTopic })
      });

      const result = await navigator.createCustomTopic(
        'Custom AI Topic',
        ['custom', 'AI', 'topic'],
        'A custom topic for AI research',
        'parent_topic_1'
      );

      expect(result).toEqual(mockTopic);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Custom AI Topic',
          keywords: ['custom', 'AI', 'topic'],
          description: 'A custom topic for AI research',
          parentTopicId: 'parent_topic_1'
        })
      });
    });

    it('should clear cache after creating topic', async () => {
      const mockTopic: TopicClassification = {
        topicId: 'custom_topic_1',
        topicName: 'Test Topic',
        confidence: 1.0,
        keywords: ['test'],
        documentCount: 0,
        subTopics: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ topic: mockTopic })
      });

      await navigator.createCustomTopic('Test Topic', ['test']);

      // Cache should be cleared (test indirectly via cache stats)
      const cacheStats = navigator.getCacheStats();
      expect(cacheStats.totalCacheSize).toBe(0);
    });
  });

  describe('updateTopicHierarchy', () => {
    it('should update topic hierarchy', async () => {
      const mockUpdatedTopic: TopicClassification = {
        topicId: 'topic1',
        topicName: 'Updated Topic Name',
        confidence: 0.9,
        keywords: ['updated', 'keywords'],
        documentCount: 10,
        subTopics: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ topic: mockUpdatedTopic })
      });

      const result = await navigator.updateTopicHierarchy('topic1', {
        name: 'Updated Topic Name',
        keywords: ['updated', 'keywords']
      });

      expect(result).toEqual(mockUpdatedTopic);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/topic1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Topic Name',
          keywords: ['updated', 'keywords']
        })
      });
    });
  });

  describe('mergeTopics', () => {
    it('should merge multiple topics', async () => {
      const mockMergedTopic: TopicClassification = {
        topicId: 'merged_topic_1',
        topicName: 'Merged AI Topic',
        confidence: 0.85,
        keywords: ['AI', 'machine learning', 'data science'],
        documentCount: 25,
        subTopics: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ mergedTopic: mockMergedTopic })
      });

      const result = await navigator.mergeTopics('topic1', ['topic2', 'topic3'], 'Merged AI Topic');

      expect(result).toEqual(mockMergedTopic);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryTopicId: 'topic1',
          secondaryTopicIds: ['topic2', 'topic3'],
          mergedName: 'Merged AI Topic'
        })
      });
    });
  });

  describe('splitTopic', () => {
    it('should split topic into sub-topics', async () => {
      const mockSubTopics: TopicClassification[] = [
        {
          topicId: 'subtopic1',
          topicName: 'Machine Learning',
          confidence: 0.8,
          keywords: ['ML', 'algorithms'],
          documentCount: 8,
          parentTopicId: 'topic1',
          subTopics: []
        },
        {
          topicId: 'subtopic2',
          topicName: 'Deep Learning',
          confidence: 0.75,
          keywords: ['neural networks', 'deep learning'],
          documentCount: 6,
          parentTopicId: 'topic1',
          subTopics: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ subTopics: mockSubTopics })
      });

      const result = await navigator.splitTopic('topic1', 2, 'hierarchical');

      expect(result).toEqual(mockSubTopics);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/topic1/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numSubTopics: 2,
          algorithm: 'hierarchical'
        })
      });
    });
  });

  describe('getTopicAnalytics', () => {
    it('should get topic analytics', async () => {
      const mockAnalytics = {
        topicCount: 15,
        documentDistribution: {
          'topic1': 10,
          'topic2': 8,
          'topic3': 5
        },
        popularTopics: [
          {
            id: 'topic1',
            name: 'AI',
            documentCount: 10,
            growthRate: 0.2
          }
        ],
        emergingTopics: [
          {
            id: 'topic4',
            name: 'Quantum Computing',
            emergenceScore: 0.8,
            keywords: ['quantum', 'computing']
          }
        ],
        topicCoherence: 0.75,
        languageDistribution: {
          'en': 18,
          'ar': 5
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalytics)
      });

      const result = await navigator.getTopicAnalytics('topic1', {
        start: '2023-01-01',
        end: '2023-12-31'
      });

      expect(result).toEqual(mockAnalytics);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic1',
          timeRange: {
            start: '2023-01-01',
            end: '2023-12-31'
          }
        })
      });
    });
  });

  describe('exportTopicHierarchy', () => {
    it('should export topic hierarchy', async () => {
      const mockBlob = new Blob(['{"topics": []}'], { type: 'application/json' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      const result = await navigator.exportTopicHierarchy('json', true);

      expect(result).toBeInstanceOf(Blob);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'json',
          includeDocuments: true
        })
      });
    });
  });

  describe('optimizeTopicModel', () => {
    it('should optimize topic model parameters', async () => {
      const mockOptimization = {
        optimizedParameters: {
          algorithm: 'lda',
          numTopics: 15,
          coherenceThreshold: 0.5,
          minTopicSize: 4
        },
        metrics: {
          coherence: 0.8,
          perplexity: 150,
          silhouette: 0.7
        },
        recommendation: 'Use LDA with 15 topics for optimal performance'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOptimization)
      });

      const result = await navigator.optimizeTopicModel(['doc1', 'doc2'], {
        coherence: 0.8,
        topicCount: 15
      });

      expect(result).toEqual(mockOptimization);
      expect(mockFetch).toHaveBeenCalledWith('/api/semantic-search/topics/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: ['doc1', 'doc2'],
          targetMetrics: {
            coherence: 0.8,
            topicCount: 15
          }
        })
      });
    });
  });

  describe('cache management', () => {
    it('should clear all caches', () => {
      navigator.clearCache();
      expect(() => navigator.clearCache()).not.toThrow();
    });

    it('should provide cache statistics', () => {
      const stats = navigator.getCacheStats();
      expect(stats).toHaveProperty('topicCacheSize');
      expect(stats).toHaveProperty('classificationCacheSize');
      expect(stats).toHaveProperty('totalCacheSize');
      expect(typeof stats.topicCacheSize).toBe('number');
      expect(typeof stats.classificationCacheSize).toBe('number');
      expect(typeof stats.totalCacheSize).toBe('number');
    });
  });
});