import type {
  TopicHierarchy,
  TopicNavigationAPIResponse
} from '@/types/domain/SemanticSearch';

export interface TopicDetectionOptions {
  algorithm: 'lda' | 'nmf' | 'bert' | 'auto';
  numTopics?: number;
  minTopicSize?: number;
  coherenceThreshold?: number;
  includeCrossLanguage?: boolean;
  detectTrends?: boolean;
}

export interface TopicClassification {
  topicId: string;
  topicName: string;
  confidence: number;
  keywords: string[];
  documentCount: number;
  parentTopicId?: string;
  subTopics: TopicClassification[];
}

export interface TopicTrend {
  topicId: string;
  topicName: string;
  timeRange: {
    start: string;
    end: string;
  };
  documentCounts: Array<{
    timestamp: string;
    count: number;
  }>;
  trendDirection: 'increasing' | 'decreasing' | 'stable' | 'emerging' | 'declining';
  growthRate: number;
  relatedTopics: string[];
}

export interface TopicFilter {
  topicIds?: string[];
  keywords?: string[];
  languages?: ('en' | 'ar')[];
  dateRange?: {
    start: string;
    end: string;
  };
  minDocumentCount?: number;
  includeSubTopics?: boolean;
}

export interface TopicSuggestion {
  topicId: string;
  topicName: string;
  relevanceScore: number;
  reason: string;
  keywords: string[];
}

export class TopicNavigator {
  private baseUrl: string;
  private topicCache: Map<string, TopicHierarchy[]> = new Map();
  private classificationCache: Map<string, TopicClassification[]> = new Map();

  constructor(baseUrl: string = '/api/semantic-search') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get topic hierarchy for navigation
   */
  async getTopicHierarchy(
    documentIds?: string[],
    options: TopicDetectionOptions = {}
  ): Promise<TopicHierarchy[]> {
    const {
      algorithm = 'auto',
      numTopics = 20,
      minTopicSize = 5,
      coherenceThreshold = 0.4,
      includeCrossLanguage = true,
      detectTrends = false
    } = options;

    const cacheKey = `hierarchy_${JSON.stringify({ documentIds, options })}`;

    if (this.topicCache.has(cacheKey)) {
      return this.topicCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/topics/hierarchy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds,
          algorithm,
          numTopics,
          minTopicSize,
          coherenceThreshold,
          includeCrossLanguage,
          detectTrends
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic hierarchy retrieval failed: ${response.statusText}`);
      }

      const data: TopicNavigationAPIResponse = await response.json();
      this.topicCache.set(cacheKey, data.hierarchy);

      return data.hierarchy;
    } catch (error) {
      console.error('Failed to get topic hierarchy:', error);
      throw error;
    }
  }

  /**
   * Detect and classify topics automatically
   */
  async detectTopics(
    documentIds: string[],
    options: TopicDetectionOptions = {}
  ): Promise<TopicClassification[]> {
    const {
      algorithm = 'auto',
      numTopics = 15,
      minTopicSize = 3,
      coherenceThreshold = 0.3
    } = options;

    const cacheKey = `detect_${JSON.stringify({ documentIds, options })}`;

    if (this.classificationCache.has(cacheKey)) {
      return this.classificationCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/topics/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds,
          algorithm,
          numTopics,
          minTopicSize,
          coherenceThreshold
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic detection failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.classificationCache.set(cacheKey, data.topics);

      return data.topics;
    } catch (error) {
      console.error('Failed to detect topics:', error);
      throw error;
    }
  }

  /**
   * Classify a document into topics
   */
  async classifyDocument(
    documentId: string,
    content?: string
  ): Promise<TopicClassification[]> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/classify/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`Document classification failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.classifications;
    } catch (error) {
      console.error('Failed to classify document:', error);
      throw error;
    }
  }

  /**
   * Browse documents by topic
   */
  async browseByTopic(
    topicId: string,
    filter: TopicFilter = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    documents: Array<{
      id: string;
      title: string;
      snippet: string;
      topicRelevance: number;
      relatedTopics: string[];
    }>;
    totalDocuments: number;
    topicInfo: TopicClassification;
    relatedTopics: TopicClassification[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/${topicId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter,
          page,
          pageSize
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic browsing failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to browse by topic:', error);
      throw error;
    }
  }

  /**
   * Get topic trends over time
   */
  async getTopicTrends(
    timeRange: {
      start: string;
      end: string;
      interval: 'day' | 'week' | 'month';
    },
    topicFilter?: TopicFilter
  ): Promise<TopicTrend[]> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange,
          filter: topicFilter
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic trends retrieval failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get topic trends:', error);
      throw error;
    }
  }

  /**
   * Search topics by keywords or phrases
   */
  async searchTopics(
    query: string,
    options: {
      fuzzyMatch?: boolean;
      language?: 'en' | 'ar' | 'auto';
      includeDescendants?: boolean;
      maxResults?: number;
    } = {}
  ): Promise<TopicClassification[]> {
    const {
      fuzzyMatch = true,
      language = 'auto',
      includeDescendants = true,
      maxResults = 10
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/topics/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          fuzzyMatch,
          language,
          includeDescendants,
          maxResults
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.topics;
    } catch (error) {
      console.error('Failed to search topics:', error);
      throw error;
    }
  }

  /**
   * Get suggested topics based on user behavior
   */
  async getTopicSuggestions(
    userId: string,
    context: {
      currentDocument?: string;
      recentTopics?: string[];
      searchHistory?: string[];
    } = {},
    maxSuggestions: number = 8
  ): Promise<TopicSuggestion[]> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/suggestions/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          maxSuggestions
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions;
    } catch (error) {
      console.error('Failed to get topic suggestions:', error);
      throw error;
    }
  }

  /**
   * Create custom topic from user input
   */
  async createCustomTopic(
    name: string,
    keywords: string[],
    description?: string,
    parentTopicId?: string
  ): Promise<TopicClassification> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          keywords,
          description,
          parentTopicId
        }),
      });

      if (!response.ok) {
        throw new Error(`Custom topic creation failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Clear relevant caches
      this.clearCache();

      return data.topic;
    } catch (error) {
      console.error('Failed to create custom topic:', error);
      throw error;
    }
  }

  /**
   * Update topic hierarchy
   */
  async updateTopicHierarchy(
    topicId: string,
    updates: {
      name?: string;
      keywords?: string[];
      parentTopicId?: string;
      description?: string;
    }
  ): Promise<TopicClassification> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/${topicId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Topic update failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Clear relevant caches
      this.clearCache();

      return data.topic;
    } catch (error) {
      console.error('Failed to update topic:', error);
      throw error;
    }
  }

  /**
   * Merge similar topics
   */
  async mergeTopics(
    primaryTopicId: string,
    secondaryTopicIds: string[],
    mergedName?: string
  ): Promise<TopicClassification> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryTopicId,
          secondaryTopicIds,
          mergedName
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic merging failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Clear relevant caches
      this.clearCache();

      return data.mergedTopic;
    } catch (error) {
      console.error('Failed to merge topics:', error);
      throw error;
    }
  }

  /**
   * Split a topic into sub-topics
   */
  async splitTopic(
    topicId: string,
    numSubTopics: number = 3,
    algorithm: 'kmeans' | 'hierarchical' = 'kmeans'
  ): Promise<TopicClassification[]> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/${topicId}/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numSubTopics,
          algorithm
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic splitting failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Clear relevant caches
      this.clearCache();

      return data.subTopics;
    } catch (error) {
      console.error('Failed to split topic:', error);
      throw error;
    }
  }

  /**
   * Get topic analytics and insights
   */
  async getTopicAnalytics(
    topicId?: string,
    timeRange?: {
      start: string;
      end: string;
    }
  ): Promise<{
    topicCount: number;
    documentDistribution: Record<string, number>;
    popularTopics: Array<{
      id: string;
      name: string;
      documentCount: number;
      growthRate: number;
    }>;
    emergingTopics: Array<{
      id: string;
      name: string;
      emergenceScore: number;
      keywords: string[];
    }>;
    topicCoherence: number;
    languageDistribution: Record<string, number>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId,
          timeRange
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic analytics retrieval failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get topic analytics:', error);
      throw error;
    }
  }

  /**
   * Export topic hierarchy
   */
  async exportTopicHierarchy(
    format: 'json' | 'csv' | 'xml' = 'json',
    includeDocuments: boolean = false
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          includeDocuments
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to export topic hierarchy:', error);
      throw error;
    }
  }

  /**
   * Import topic hierarchy from external source
   */
  async importTopicHierarchy(
    file: File,
    format: 'json' | 'csv' | 'xml',
    mergeStrategy: 'replace' | 'merge' | 'append' = 'merge'
  ): Promise<{
    importedTopics: number;
    skippedTopics: number;
    conflictTopics: number;
    errors: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);
      formData.append('mergeStrategy', mergeStrategy);

      const response = await fetch(`${this.baseUrl}/topics/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Topic import failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Clear caches after import
      this.clearCache();

      return data;
    } catch (error) {
      console.error('Failed to import topic hierarchy:', error);
      throw error;
    }
  }

  /**
   * Optimize topic model parameters
   */
  async optimizeTopicModel(
    documentIds: string[],
    targetMetrics: {
      coherence?: number;
      perplexity?: number;
      topicCount?: number;
    } = {}
  ): Promise<{
    optimizedParameters: {
      algorithm: string;
      numTopics: number;
      coherenceThreshold: number;
      minTopicSize: number;
    };
    metrics: {
      coherence: number;
      perplexity: number;
      silhouette: number;
    };
    recommendation: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/topics/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds,
          targetMetrics
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic model optimization failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to optimize topic model:', error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.topicCache.clear();
    this.classificationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    topicCacheSize: number;
    classificationCacheSize: number;
    totalCacheSize: number;
  } {
    return {
      topicCacheSize: this.topicCache.size,
      classificationCacheSize: this.classificationCache.size,
      totalCacheSize: this.topicCache.size + this.classificationCache.size
    };
  }
}