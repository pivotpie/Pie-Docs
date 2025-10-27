import type {
  DocumentSimilarity,
  VectorEmbedding
} from '@/types/domain/SemanticSearch';
import type { SearchResult } from '@/types/domain/Search';
import { cosineSimilarity, euclideanDistance } from '@/utils/semantic/vectorUtils';

export interface ContentFingerprint {
  documentId: string;
  textFingerprint: string[];
  semanticFingerprint: number[];
  structuralFingerprint: {
    paragraphs: number;
    sentences: number;
    avgSentenceLength: number;
    headingCount: number;
    listCount: number;
  };
  metadataFingerprint: Record<string, any>;
  createdAt: string;
}

export interface SimilarityExplanation {
  overallScore: number;
  textSimilarity: number;
  semanticSimilarity: number;
  structuralSimilarity: number;
  metadataSimilarity: number;
  explanation: string;
  keyFactors: string[];
  confidence: number;
}

export interface SimilarDocumentOptions {
  includeTextSimilarity?: boolean;
  includeSemanticSimilarity?: boolean;
  includeStructuralSimilarity?: boolean;
  includeMetadataSimilarity?: boolean;
  textWeight?: number;
  semanticWeight?: number;
  structuralWeight?: number;
  metadataWeight?: number;
  minSimilarityScore?: number;
  maxResults?: number;
  explainSimilarity?: boolean;
}

export class SimilarDocumentDiscovery {
  private baseUrl: string;
  private fingerprintCache: Map<string, ContentFingerprint> = new Map();
  private similarityCache: Map<string, DocumentSimilarity[]> = new Map();

  constructor(baseUrl: string = '/api/semantic-search') {
    this.baseUrl = baseUrl;
  }

  /**
   * Find documents similar to a specific document
   */
  async findSimilarDocuments(
    documentId: string,
    options: SimilarDocumentOptions = {}
  ): Promise<DocumentSimilarity[]> {
    const {
      includeTextSimilarity = true,
      includeSemanticSimilarity = true,
      includeStructuralSimilarity = false,
      includeMetadataSimilarity = true,
      textWeight = 0.4,
      semanticWeight = 0.4,
      structuralWeight = 0.1,
      metadataWeight = 0.1,
      minSimilarityScore = 0.3,
      maxResults = 10,
      explainSimilarity = false
    } = options;

    const cacheKey = `${documentId}_${JSON.stringify(options)}`;

    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/similar-documents/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeTextSimilarity,
          includeSemanticSimilarity,
          includeStructuralSimilarity,
          includeMetadataSimilarity,
          weights: {
            text: textWeight,
            semantic: semanticWeight,
            structural: structuralWeight,
            metadata: metadataWeight
          },
          minSimilarityScore,
          maxResults,
          explainSimilarity
        }),
      });

      if (!response.ok) {
        throw new Error(`Similar document discovery failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.similarityCache.set(cacheKey, data.similarDocuments);

      return data.similarDocuments;
    } catch (error) {
      console.error('Failed to find similar documents:', error);
      throw error;
    }
  }

  /**
   * Generate content fingerprint for a document
   */
  async generateContentFingerprint(
    documentId: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<ContentFingerprint> {
    if (this.fingerprintCache.has(documentId)) {
      return this.fingerprintCache.get(documentId)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/fingerprint/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          content,
          metadata
        }),
      });

      if (!response.ok) {
        throw new Error(`Fingerprint generation failed: ${response.statusText}`);
      }

      const fingerprint: ContentFingerprint = await response.json();
      this.fingerprintCache.set(documentId, fingerprint);

      return fingerprint;
    } catch (error) {
      console.error('Failed to generate content fingerprint:', error);
      throw error;
    }
  }

  /**
   * Calculate contextual similarity beyond keyword matching
   */
  async calculateContextualSimilarity(
    document1Id: string,
    document2Id: string,
    context?: {
      userIntent?: string;
      domainContext?: string;
      temporalContext?: string;
    }
  ): Promise<SimilarityExplanation> {
    try {
      const response = await fetch(`${this.baseUrl}/similarity/contextual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document1Id,
          document2Id,
          context
        }),
      });

      if (!response.ok) {
        throw new Error(`Contextual similarity calculation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to calculate contextual similarity:', error);
      throw error;
    }
  }

  /**
   * Get similarity explanation for why documents are considered similar
   */
  async explainSimilarity(
    baseDocumentId: string,
    similarDocumentId: string
  ): Promise<SimilarityExplanation> {
    try {
      const response = await fetch(`${this.baseUrl}/similarity/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseDocumentId,
          similarDocumentId
        }),
      });

      if (!response.ok) {
        throw new Error(`Similarity explanation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to explain similarity:', error);
      throw error;
    }
  }

  /**
   * Find documents with similar content patterns
   */
  async findDocumentsByPattern(
    pattern: {
      type: 'structure' | 'style' | 'topic' | 'format';
      characteristics: Record<string, any>;
    },
    maxResults: number = 10
  ): Promise<DocumentSimilarity[]> {
    try {
      const response = await fetch(`${this.baseUrl}/similar-documents/pattern`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern,
          maxResults
        }),
      });

      if (!response.ok) {
        throw new Error(`Pattern-based document discovery failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.similarDocuments;
    } catch (error) {
      console.error('Failed to find documents by pattern:', error);
      throw error;
    }
  }

  /**
   * Discover documents similar to a text snippet or query
   */
  async findSimilarToText(
    text: string,
    options: SimilarDocumentOptions = {}
  ): Promise<DocumentSimilarity[]> {
    const {
      maxResults = 10,
      minSimilarityScore = 0.4
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/similar-documents/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          maxResults,
          minSimilarityScore,
          ...options
        }),
      });

      if (!response.ok) {
        throw new Error(`Text similarity search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.similarDocuments;
    } catch (error) {
      console.error('Failed to find similar documents to text:', error);
      throw error;
    }
  }

  /**
   * Get document similarity trends over time
   */
  async getSimilarityTrends(
    documentId: string,
    timeRange: {
      start: string;
      end: string;
      interval: 'day' | 'week' | 'month';
    }
  ): Promise<Array<{
    timestamp: string;
    averageSimilarity: number;
    topSimilarDocuments: string[];
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/similarity/trends/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timeRange),
      });

      if (!response.ok) {
        throw new Error(`Similarity trends retrieval failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get similarity trends:', error);
      throw error;
    }
  }

  /**
   * Batch process similarity calculations for multiple documents
   */
  async batchSimilarityAnalysis(
    documentIds: string[],
    options: SimilarDocumentOptions = {}
  ): Promise<Map<string, DocumentSimilarity[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/similar-documents/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds,
          options
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch similarity analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      const resultMap = new Map<string, DocumentSimilarity[]>();

      for (const [docId, similarities] of Object.entries(data.results)) {
        resultMap.set(docId, similarities as DocumentSimilarity[]);
      }

      return resultMap;
    } catch (error) {
      console.error('Failed to perform batch similarity analysis:', error);
      throw error;
    }
  }

  /**
   * Update similarity index for a document
   */
  async updateDocumentSimilarityIndex(
    documentId: string,
    content?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/similar-documents/index/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          metadata
        }),
      });

      if (!response.ok) {
        throw new Error(`Similarity index update failed: ${response.statusText}`);
      }

      // Clear cache for this document
      this.fingerprintCache.delete(documentId);
      this.clearSimilarityCacheForDocument(documentId);

    } catch (error) {
      console.error('Failed to update similarity index:', error);
      throw error;
    }
  }

  /**
   * Remove document from similarity index
   */
  async removeFromSimilarityIndex(documentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/similar-documents/index/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Document removal from index failed: ${response.statusText}`);
      }

      // Clear cache
      this.fingerprintCache.delete(documentId);
      this.clearSimilarityCacheForDocument(documentId);

    } catch (error) {
      console.error('Failed to remove document from index:', error);
      throw error;
    }
  }

  /**
   * Get similarity index health and statistics
   */
  async getSimilarityIndexHealth(): Promise<{
    totalDocuments: number;
    indexedDocuments: number;
    averageProcessingTime: number;
    indexSize: number;
    lastUpdate: string;
    qualityMetrics: {
      averageAccuracy: number;
      falsePositiveRate: number;
      coverageScore: number;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/similar-documents/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get similarity index health:', error);
      throw error;
    }
  }

  /**
   * Optimize similarity matching algorithms based on usage patterns
   */
  async optimizeSimilarityAlgorithms(): Promise<{
    optimizationsApplied: string[];
    performanceImprovement: number;
    accuracyChange: number;
    recommendations: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/similar-documents/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Algorithm optimization failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to optimize similarity algorithms:', error);
      throw error;
    }
  }

  /**
   * Calculate content fingerprint locally (for offline use)
   */
  calculateLocalFingerprint(
    content: string,
    metadata: Record<string, any> = {}
  ): ContentFingerprint {
    // Text fingerprint (n-grams and key phrases)
    const textFingerprint = this.extractTextFingerprint(content);

    // Structural fingerprint
    const structuralFingerprint = this.extractStructuralFingerprint(content);

    // Simple semantic fingerprint (would normally use embeddings)
    const semanticFingerprint = this.extractSemanticFingerprint(content);

    return {
      documentId: 'local',
      textFingerprint,
      semanticFingerprint,
      structuralFingerprint,
      metadataFingerprint: metadata,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Clear similarity cache for a specific document
   */
  private clearSimilarityCacheForDocument(documentId: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.similarityCache.keys()) {
      if (key.includes(documentId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.similarityCache.delete(key));
  }

  /**
   * Extract text fingerprint using n-grams and key phrases
   */
  private extractTextFingerprint(content: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Generate 2-grams and 3-grams
    const fingerprint: string[] = [];

    // 2-grams
    for (let i = 0; i < words.length - 1; i++) {
      fingerprint.push(`${words[i]} ${words[i + 1]}`);
    }

    // 3-grams
    for (let i = 0; i < words.length - 2; i++) {
      fingerprint.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }

    // Return most frequent n-grams
    const frequencyMap = new Map<string, number>();
    fingerprint.forEach(gram => {
      frequencyMap.set(gram, (frequencyMap.get(gram) || 0) + 1);
    });

    return Array.from(frequencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(entry => entry[0]);
  }

  /**
   * Extract structural fingerprint
   */
  private extractStructuralFingerprint(content: string): {
    paragraphs: number;
    sentences: number;
    avgSentenceLength: number;
    headingCount: number;
    listCount: number;
  } {
    const paragraphs = content.split(/\n\s*\n/).length;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
    const headingCount = (content.match(/^#+\s/gm) || []).length;
    const listCount = (content.match(/^[-*+]\s/gm) || []).length;

    return {
      paragraphs,
      sentences: sentences.length,
      avgSentenceLength: Math.round(avgSentenceLength),
      headingCount,
      listCount
    };
  }

  /**
   * Extract basic semantic fingerprint
   */
  private extractSemanticFingerprint(content: string): number[] {
    // This is a simplified version - would normally use proper embeddings
    const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const vocab = [...new Set(words)].sort();

    // Create a simple TF vector
    const vector = new Array(Math.min(vocab.length, 100)).fill(0);

    vocab.slice(0, 100).forEach((word, index) => {
      const tf = words.filter(w => w === word).length / words.length;
      vector[index] = tf;
    });

    return vector;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.fingerprintCache.clear();
    this.similarityCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    fingerprintCacheSize: number;
    similarityCacheSize: number;
    totalCacheSize: number;
  } {
    return {
      fingerprintCacheSize: this.fingerprintCache.size,
      similarityCacheSize: this.similarityCache.size,
      totalCacheSize: this.fingerprintCache.size + this.similarityCache.size
    };
  }
}