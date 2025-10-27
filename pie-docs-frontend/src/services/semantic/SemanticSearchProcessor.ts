import type {
  VectorEmbedding,
  SemanticSearchQuery,
  SemanticSearchResult,
  SemanticSearchAPIResponse,
  SearchSuggestion,
  FuzzyMatchResult
} from '@/types/domain/SemanticSearch';
import type { SearchResult } from '@/types/domain/Search';

export class SemanticSearchProcessor {
  private baseUrl: string;
  private embeddingCache: Map<string, VectorEmbedding> = new Map();
  private abortController: AbortController | null = null;

  constructor(baseUrl: string = '/api/semantic-search') {
    this.baseUrl = baseUrl;
  }

  /**
   * Perform semantic search with concept-based understanding
   */
  async semanticSearch(
    query: SemanticSearchQuery,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SemanticSearchAPIResponse> {
    this.cancelSearch();
    this.abortController = new AbortController();

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(query);

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          queryEmbedding,
          page,
          pageSize,
          includeExplanations: true
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Semantic search failed: ${response.statusText}`);
      }

      const data: SemanticSearchAPIResponse = await response.json();

      // Enhance results with semantic explanations
      data.results = await this.enhanceResultsWithExplanations(data.results, query);

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search was cancelled');
      }
      throw error;
    }
  }

  /**
   * Generate vector embedding for a query
   */
  async generateQueryEmbedding(query: SemanticSearchQuery): Promise<VectorEmbedding> {
    const cacheKey = `query_${JSON.stringify(query)}`;

    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    const response = await fetch(`${this.baseUrl}/embeddings/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.statusText}`);
    }

    const embedding: VectorEmbedding = await response.json();
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generate document embeddings for semantic indexing
   */
  async generateDocumentEmbedding(
    documentId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<VectorEmbedding> {
    const response = await fetch(`${this.baseUrl}/embeddings/document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        content,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Document embedding generation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Calculate semantic similarity between documents
   */
  async calculateSimilarity(
    embedding1: VectorEmbedding,
    embedding2: VectorEmbedding
  ): Promise<number> {
    // Cosine similarity calculation
    const dot = embedding1.vector.reduce((sum, a, i) => sum + a * embedding2.vector[i], 0);
    const mag1 = Math.sqrt(embedding1.vector.reduce((sum, a) => sum + a * a, 0));
    const mag2 = Math.sqrt(embedding2.vector.reduce((sum, a) => sum + a * a, 0));

    return dot / (mag1 * mag2);
  }

  /**
   * Extract concepts from text content
   */
  async extractConcepts(
    content: string,
    language: 'en' | 'ar' | 'auto' = 'auto'
  ): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/concepts/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`Concept extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.concepts;
  }

  /**
   * Perform fuzzy matching for typo and OCR error tolerance
   */
  async fuzzyMatch(
    term: string,
    language: 'en' | 'ar' | 'auto' = 'auto'
  ): Promise<FuzzyMatchResult[]> {
    const response = await fetch(`${this.baseUrl}/fuzzy-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        term,
        language,
        includePhonetic: true,
        includeOCRCorrection: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Fuzzy matching failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get intelligent search suggestions based on context
   */
  async getSearchSuggestions(
    partialQuery: string,
    context?: {
      currentDocument?: string;
      recentSearches?: string[];
      userPreferences?: Record<string, any>;
    }
  ): Promise<SearchSuggestion[]> {
    // Return empty array for very short queries
    if (partialQuery.length < 2) {
      return [];
    }

    const response = await fetch(`${this.baseUrl}/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partialQuery,
        context,
        maxSuggestions: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search suggestions failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions;
  }

  /**
   * Index document for semantic search
   */
  async indexDocument(
    documentId: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/index`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        content,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Document indexing failed: ${response.statusText}`);
    }
  }

  /**
   * Batch index multiple documents
   */
  async batchIndexDocuments(
    documents: Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
    }>
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/index/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents,
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch indexing failed: ${response.statusText}`);
    }
  }

  /**
   * Update semantic search configuration
   */
  async updateConfiguration(config: {
    semanticWeight?: number;
    keywordWeight?: number;
    conceptThreshold?: number;
    enableCrossLanguage?: boolean;
    enableFuzzyMatching?: boolean;
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Configuration update failed: ${response.statusText}`);
    }
  }

  /**
   * Get semantic search health and statistics
   */
  async getSemanticHealth(): Promise<{
    indexedDocuments: number;
    totalEmbeddings: number;
    averageProcessingTime: number;
    lastIndexUpdate: string;
    conceptCoverage: number;
  }> {
    const response = await fetch(`${this.baseUrl}/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Cancel ongoing search
   */
  cancelSearch(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Enhance search results with semantic explanations
   */
  private async enhanceResultsWithExplanations(
    results: SemanticSearchResult[],
    query: SemanticSearchQuery
  ): Promise<SemanticSearchResult[]> {
    return Promise.all(
      results.map(async (result) => {
        if (result.semanticScore > 0.5) {
          try {
            const concepts = await this.extractConcepts(result.content);
            result.relatedConcepts = concepts.slice(0, 5); // Top 5 concepts

            // Generate explanation for high semantic scores
            if (result.semanticScore > 0.8) {
              result.conceptExplanation = `High conceptual relevance based on shared themes: ${concepts.slice(0, 3).join(', ')}`;
            }
          } catch (error) {
            // If concept extraction fails, continue without enhancement
            console.warn('Failed to extract concepts for result enhancement:', error);
          }
        }
        return result;
      })
    );
  }
}