import type {
  DocumentSimilarity,
  SimilarDocumentsAPIResponse,
  VectorEmbedding
} from '@/types/domain/SemanticSearch';
import type { SearchResult } from '@/types/domain/Search';
import { cosineSimilarity } from '@/utils/semantic/vectorUtils';

export interface RelatedDocumentOptions {
  maxResults?: number;
  minSimilarityScore?: number;
  includeMetadataSimilarity?: boolean;
  includeTopicSimilarity?: boolean;
  includeCitationNetwork?: boolean;
  includeTemporalRelations?: boolean;
  weightContentSimilarity?: number;
  weightMetadataSimilarity?: number;
  weightTopicSimilarity?: number;
}

export interface DocumentRelationship {
  documentId: string;
  relationshipType: 'content' | 'topic' | 'citation' | 'temporal' | 'metadata';
  score: number;
  explanation: string;
  sharedElements: string[];
}

export class RelatedDocumentsFinder {
  private baseUrl: string;
  private similarityCache: Map<string, DocumentSimilarity[]> = new Map();

  constructor(baseUrl: string = '/api/semantic-search') {
    this.baseUrl = baseUrl;
  }

  /**
   * Find documents related to a specific document
   */
  async findRelatedDocuments(
    documentId: string,
    options: RelatedDocumentOptions = {}
  ): Promise<DocumentSimilarity[]> {
    const {
      maxResults = 10,
      minSimilarityScore = 0.3,
      includeMetadataSimilarity = true,
      includeTopicSimilarity = true,
      includeCitationNetwork = true,
      includeTemporalRelations = false,
      weightContentSimilarity = 0.6,
      weightMetadataSimilarity = 0.2,
      weightTopicSimilarity = 0.2
    } = options;

    const cacheKey = `${documentId}_${JSON.stringify(options)}`;

    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/related`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxResults,
          minSimilarityScore,
          includeMetadataSimilarity,
          includeTopicSimilarity,
          includeCitationNetwork,
          includeTemporalRelations,
          weights: {
            content: weightContentSimilarity,
            metadata: weightMetadataSimilarity,
            topic: weightTopicSimilarity
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Related documents search failed: ${response.statusText}`);
      }

      const data: SimilarDocumentsAPIResponse = await response.json();

      // Cache the results
      this.similarityCache.set(cacheKey, data.similarDocuments);

      return data.similarDocuments;
    } catch (error) {
      console.error('Failed to find related documents:', error);
      throw error;
    }
  }

  /**
   * Find documents similar to a search result set
   */
  async findSimilarToResultSet(
    results: SearchResult[],
    options: RelatedDocumentOptions = {}
  ): Promise<DocumentSimilarity[]> {
    const documentIds = results.map(r => r.id);

    try {
      const response = await fetch(`${this.baseUrl}/documents/similar-to-set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds,
          ...options
        }),
      });

      if (!response.ok) {
        throw new Error(`Similar documents search failed: ${response.statusText}`);
      }

      const data: SimilarDocumentsAPIResponse = await response.json();
      return data.similarDocuments;
    } catch (error) {
      console.error('Failed to find similar documents to result set:', error);
      throw error;
    }
  }

  /**
   * Calculate document similarity score based on multiple factors
   */
  async calculateDocumentSimilarity(
    document1Id: string,
    document2Id: string,
    options: {
      includeContent?: boolean;
      includeMetadata?: boolean;
      includeTopics?: boolean;
      includeCitations?: boolean;
    } = {}
  ): Promise<{
    overallSimilarity: number;
    contentSimilarity: number;
    metadataSimilarity: number;
    topicSimilarity: number;
    citationSimilarity: number;
    explanation: string;
  }> {
    const {
      includeContent = true,
      includeMetadata = true,
      includeTopics = true,
      includeCitations = true
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/documents/similarity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document1Id,
          document2Id,
          includeContent,
          includeMetadata,
          includeTopics,
          includeCitations
        }),
      });

      if (!response.ok) {
        throw new Error(`Similarity calculation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to calculate document similarity:', error);
      throw error;
    }
  }

  /**
   * Get "More like this" recommendations for a document
   */
  async getMoreLikeThis(
    documentId: string,
    maxResults: number = 8
  ): Promise<DocumentSimilarity[]> {
    return this.findRelatedDocuments(documentId, {
      maxResults,
      minSimilarityScore: 0.4,
      includeMetadataSimilarity: true,
      includeTopicSimilarity: true,
      includeCitationNetwork: false,
      includeTemporalRelations: false,
      weightContentSimilarity: 0.7,
      weightMetadataSimilarity: 0.15,
      weightTopicSimilarity: 0.15
    });
  }

  /**
   * Discover document relationships through content analysis
   */
  async discoverDocumentRelationships(
    documentId: string
  ): Promise<DocumentRelationship[]> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/relationships`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Relationship discovery failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.relationships;
    } catch (error) {
      console.error('Failed to discover document relationships:', error);
      throw error;
    }
  }

  /**
   * Build citation network for document discovery
   */
  async buildCitationNetwork(documentIds: string[]): Promise<{
    nodes: Array<{ id: string; title: string; type: string }>;
    edges: Array<{ source: string; target: string; type: 'cites' | 'cited_by' | 'cross_reference' }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/citation-network`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds }),
      });

      if (!response.ok) {
        throw new Error(`Citation network building failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to build citation network:', error);
      throw error;
    }
  }

  /**
   * Get temporal document relationships
   */
  async getTemporalRelationships(
    documentId: string,
    timeWindow: {
      before: number; // days
      after: number; // days
    } = { before: 30, after: 30 }
  ): Promise<DocumentSimilarity[]> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/temporal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeWindow }),
      });

      if (!response.ok) {
        throw new Error(`Temporal relationships search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.temporalDocuments;
    } catch (error) {
      console.error('Failed to get temporal relationships:', error);
      throw error;
    }
  }

  /**
   * Recommend documents based on user behavior and preferences
   */
  async getPersonalizedRecommendations(
    userId: string,
    options: {
      basedOnRecentViews?: boolean;
      basedOnBookmarks?: boolean;
      basedOnSearchHistory?: boolean;
      maxResults?: number;
    } = {}
  ): Promise<DocumentSimilarity[]> {
    const {
      basedOnRecentViews = true,
      basedOnBookmarks = true,
      basedOnSearchHistory = true,
      maxResults = 10
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/recommendations/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          basedOnRecentViews,
          basedOnBookmarks,
          basedOnSearchHistory,
          maxResults
        }),
      });

      if (!response.ok) {
        throw new Error(`Personalized recommendations failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recommendations;
    } catch (error) {
      console.error('Failed to get personalized recommendations:', error);
      throw error;
    }
  }

  /**
   * Batch process document similarities for performance optimization
   */
  async batchCalculateSimilarities(
    documentPairs: Array<{ doc1: string; doc2: string }>
  ): Promise<Map<string, number>> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/batch-similarity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentPairs }),
      });

      if (!response.ok) {
        throw new Error(`Batch similarity calculation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return new Map(Object.entries(data.similarities));
    } catch (error) {
      console.error('Failed to calculate batch similarities:', error);
      throw error;
    }
  }

  /**
   * Update document similarity index
   */
  async updateSimilarityIndex(documentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/reindex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Similarity index update failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update similarity index:', error);
      throw error;
    }
  }

  /**
   * Get similarity index health and statistics
   */
  async getSimilarityHealth(): Promise<{
    totalDocuments: number;
    indexedDocuments: number;
    averageSimilarityCalculationTime: number;
    lastIndexUpdate: string;
    similarityIndexSize: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/similarity/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Similarity health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get similarity health:', error);
      throw error;
    }
  }

  /**
   * Clear similarity cache
   */
  clearCache(): void {
    this.similarityCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cacheSize: number;
    cachedQueries: string[];
  } {
    return {
      cacheSize: this.similarityCache.size,
      cachedQueries: Array.from(this.similarityCache.keys())
    };
  }
}