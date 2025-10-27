import type {
  SearchFilters,
  SearchResult,
  SearchSuggestion,
  SearchQuery,
  SearchExportOptions
} from '@/types/domain/Search';

// API response types
interface SearchAPIResponse {
  results: SearchResult[];
  totalResults: number;
  page: number;
  pageSize: number;
  facets?: Record<string, any>;
  timeTaken: number;
}

interface SuggestionsAPIResponse {
  suggestions: SearchSuggestion[];
}

interface IndexStatusResponse {
  totalDocuments: number;
  lastIndexed: string;
  indexHealth: 'green' | 'yellow' | 'red';
}

export class SearchService {
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor(baseUrl: string = 'http://localhost:8001/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Perform full-text search with filters
   */
  async search(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'relevance',
    searchType: 'keyword' | 'semantic' | 'hybrid' = 'semantic'
  ): Promise<SearchAPIResponse> {
    // Cancel any ongoing search
    this.cancelSearch();

    // Create new abort controller for this search
    this.abortController = new AbortController();

    // Build request body for RAG-based search
    const requestBody = {
      query: query,
      search_type: searchType,
      top_k: pageSize,
      filters: filters
    };

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const searchResponse = await response.json();

      // Transform backend response to SearchAPIResponse
      const transformedResults = this.transformBackendResults(searchResponse.results || [], query);

      return {
        results: transformedResults,
        totalResults: searchResponse.results_count || 0,
        page,
        pageSize,
        facets: {},
        timeTaken: 0,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search was cancelled');
      }

      // Fallback to mock data for development
      console.warn('Search API unavailable, using mock data:', error);
      return this.getMockSearchResults(query, filters, page, pageSize);
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(
    query: string,
    types: string[] = ['query', 'document', 'metadata']
  ): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const searchParams = new URLSearchParams({
      q: query,
      limit: '10',
    });

    try {
      const response = await fetch(`${this.baseUrl}/search/suggestions?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Suggestions failed: ${response.status} ${response.statusText}`);
      }

      const data: SuggestionsAPIResponse = await response.json();
      return data.suggestions;
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      return [];
    }
  }

  /**
   * Get search history for current user
   */
  async getSearchHistory(limit: number = 20): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/history?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get history failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Failed to fetch search history:', error);
      return [];
    }
  }

  /**
   * Delete a search history entry
   */
  async deleteSearchHistory(historyId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/search/history/${historyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete history failed: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete search history:', error);
      return false;
    }
  }

  /**
   * Get search statistics and analytics
   */
  async getSearchStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/search/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get stats failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch search stats:', error);
      return {
        total_searches: 0,
        top_queries: [],
        search_types: [],
        average_results: 0
      };
    }
  }

  /**
   * Perform advanced search with complex queries
   * Routes to main search endpoint with hybrid search type
   */
  async advancedSearch(
    searchQuery: SearchQuery,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SearchAPIResponse> {
    try {
      // Build query string from SearchQuery object
      const queryText = this.buildQueryFromSearchQuery(searchQuery);

      // Use main search endpoint with hybrid search
      return await this.search(
        queryText,
        searchQuery.filters || {},
        page,
        pageSize,
        'relevance'
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Helper: Build query string from SearchQuery object
   */
  private buildQueryFromSearchQuery(searchQuery: SearchQuery): string {
    const parts: string[] = [];

    if (searchQuery.query) {
      parts.push(searchQuery.query);
    }

    if (searchQuery.must && searchQuery.must.length > 0) {
      parts.push(searchQuery.must.join(' '));
    }

    if (searchQuery.should && searchQuery.should.length > 0) {
      parts.push(searchQuery.should.join(' OR '));
    }

    return parts.join(' ').trim() || '*';
  }

  /**
   * Export search results
   */
  async exportResults(
    query: string,
    filters: SearchFilters,
    options: SearchExportOptions
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          filters,
          options,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get index status and health
   */
  async getIndexStatus(): Promise<IndexStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Trigger reindexing of documents
   */
  async reindexDocuments(documentIds?: string[]): Promise<{ jobId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/reindex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          documentIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Reindexing failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Index a single document after upload/processing
   */
  async indexDocument(documentData: {
    id: string;
    title: string;
    content: string;
    ocrText?: string;
    documentType: string;
    author: string;
    metadata: Record<string, any>;
    tags: string[];
    folderPath?: string;
    fileSize?: number;
    mimeType?: string;
  }): Promise<{ success: boolean; documentId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/index/document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          document: {
            id: documentData.id,
            title: documentData.title,
            content: documentData.content,
            ocr_text: documentData.ocrText,
            document_type: documentData.documentType,
            author: documentData.author,
            metadata: documentData.metadata,
            tags: documentData.tags,
            folder_path: documentData.folderPath,
            file_size: documentData.fileSize,
            mime_type: documentData.mimeType,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Document indexing failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to index document:', error);
      throw error;
    }
  }

  /**
   * Update document index after modifications
   */
  async updateDocumentIndex(
    documentId: string,
    updates: Partial<{
      title: string;
      content: string;
      ocrText: string;
      metadata: Record<string, any>;
      tags: string[];
    }>
  ): Promise<{ success: boolean }> {
    try {
      const updateBody: any = {
        ...updates,
        modified_at: new Date().toISOString(),
      };

      // Rename fields to match Elasticsearch index
      if (updates.ocrText) {
        updateBody.ocr_text = updates.ocrText;
        delete updateBody.ocrText;
      }

      const response = await fetch(`${this.baseUrl}/index/document/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({ updates: updateBody }),
      });

      if (!response.ok) {
        throw new Error(`Document update failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update document index:', error);
      throw error;
    }
  }

  /**
   * Remove document from search index
   */
  async removeDocumentFromIndex(documentId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/index/document/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Document removal failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to remove document from index:', error);
      throw error;
    }
  }

  /**
   * RAG Query - Ask questions and get AI-generated answers with sources
   */
  async ragQuery(
    query: string,
    top_k: number = 5
  ): Promise<{
    query: string;
    answer: string;
    confidence: number;
    relevant_chunks: Array<{
      content: string;
      document_title: string;
      similarity: number;
    }>;
    sources: Array<{
      title: string;
      document_type: string;
      chunks: Array<{
        content: string;
        similarity: number;
      }>;
    }>;
    timeTaken: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/search/rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          query,
          top_k,
          include_sources: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('RAG query error:', error);
      throw error;
    }
  }

  /**
   * Search document chunks with semantic similarity
   */
  async searchChunks(
    query: string,
    top_k: number = 10
  ): Promise<{
    query: string;
    chunks: Array<{
      chunk_id: string;
      document_id: string;
      document_title: string;
      document_type: string;
      content: string;
      chunk_index: number;
      similarity: number;
      metadata: Record<string, any>;
    }>;
    results_count: number;
    timeTaken: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/search/chunks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          query,
          top_k,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chunk search failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Chunk search error:', error);
      throw error;
    }
  }

  /**
   * Find similar documents based on semantic similarity
   */
  async findSimilarDocuments(
    documentId: string,
    limit: number = 5
  ): Promise<{
    document_id: string;
    document_title: string;
    similar_documents: Array<{
      id: string;
      title: string;
      document_type: string;
      author: string;
      tags: string[];
      similarity: number;
      created_at: string;
      metadata: Record<string, any>;
    }>;
    results_count: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/search/similar/${documentId}?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Similar documents search failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Similar documents error:', error);
      throw error;
    }
  }

  /**
   * Batch index multiple documents (useful for bulk uploads)
   */
  async batchIndexDocuments(documents: Array<{
    id: string;
    title: string;
    content: string;
    ocrText?: string;
    documentType: string;
    author: string;
    metadata: Record<string, any>;
    tags: string[];
    folderPath?: string;
    fileSize?: number;
    mimeType?: string;
  }>): Promise<{ success: boolean; results: Array<{ id: string; success: boolean; error?: string }> }> {
    try {
      const response = await fetch(`${this.baseUrl}/index/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          documents: documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            ocr_text: doc.ocrText,
            document_type: doc.documentType,
            author: doc.author,
            metadata: doc.metadata,
            tags: doc.tags,
            folder_path: doc.folderPath,
            file_size: doc.fileSize,
            mime_type: doc.mimeType,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch indexing failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to batch index documents:', error);
      throw error;
    }
  }

  /**
   * Cancel ongoing search request
   */
  cancelSearch(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Extract highlighted terms from search result
   */
  private extractHighlights(result: SearchResult, query: string): string[] {
    if (result.highlights && result.highlights.length > 0) {
      return result.highlights;
    }

    // Fallback: generate highlights from query terms
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const highlights: string[] = [];

    // Check title for matches
    queryTerms.forEach(term => {
      if (result.title.toLowerCase().includes(term)) {
        highlights.push(this.highlightText(result.title, term));
      }
    });

    // Check content/snippet for matches
    const content = result.snippet || result.content || '';
    queryTerms.forEach(term => {
      if (content.toLowerCase().includes(term)) {
        highlights.push(this.highlightText(content, term));
      }
    });

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  /**
   * Highlight search terms in text
   */
  private highlightText(text: string, term: string): string {
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Build Elasticsearch query with full-text search and filters
   */
  private buildElasticsearchQuery(query: string, filters: SearchFilters, sortBy: string) {
    const mustQueries: any[] = [];
    const filterQueries: any[] = [];

    // Full-text search across multiple fields including OCR content
    if (query.trim()) {
      mustQueries.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'title^3',           // Boost title matches
            'content^2',         // Boost content matches
            'ocr_text^1.5',      // Boost OCR text matches
            'metadata.*',        // Search in all metadata fields
            'tags',              // Search in tags
            'author',            // Search in author field
            'folder_path'        // Search in folder paths
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'and'
        }
      });
    }

    // Document type filters
    if (filters.documentTypes?.length) {
      filterQueries.push({
        terms: { document_type: filters.documentTypes }
      });
    }

    // Date range filters
    if (filters.dateRange?.start || filters.dateRange?.end) {
      const dateRange: any = {};
      if (filters.dateRange.start) dateRange.gte = filters.dateRange.start;
      if (filters.dateRange.end) dateRange.lte = filters.dateRange.end;

      filterQueries.push({
        range: { created_at: dateRange }
      });
    }

    // Author filters
    if (filters.authors?.length) {
      filterQueries.push({
        terms: { 'author.keyword': filters.authors }
      });
    }

    // Status filters
    if (filters.status?.length) {
      filterQueries.push({
        terms: { 'metadata.status': filters.status }
      });
    }

    // Tags filters
    if (filters.tags?.length) {
      filterQueries.push({
        terms: { tags: filters.tags }
      });
    }

    // Folder filters
    if (filters.folders?.length) {
      filterQueries.push({
        terms: { 'folder_path.keyword': filters.folders }
      });
    }

    // Custom metadata filters
    if (filters.customMetadata) {
      Object.entries(filters.customMetadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          filterQueries.push({
            term: { [`metadata.${key}`]: value }
          });
        }
      });
    }

    // Build sort configuration
    const sort = this.buildSortConfiguration(sortBy);

    // Build aggregations for faceted search
    const aggs = this.buildAggregations();

    return {
      query: {
        bool: {
          must: mustQueries.length ? mustQueries : [{ match_all: {} }],
          filter: filterQueries
        }
      },
      sort,
      aggs
    };
  }

  /**
   * Build sort configuration based on sort type
   */
  private buildSortConfiguration(sortBy: string) {
    switch (sortBy) {
      case 'relevance':
        return [{ _score: { order: 'desc' } }];
      case 'date':
        return [{ created_at: { order: 'desc' } }];
      case 'title':
        return [{ 'title.keyword': { order: 'asc' } }];
      case 'author':
        return [{ 'author.keyword': { order: 'asc' } }];
      case 'size':
        return [{ file_size: { order: 'desc' } }];
      default:
        return [{ _score: { order: 'desc' } }];
    }
  }

  /**
   * Build aggregations for faceted filtering
   */
  private buildAggregations() {
    return {
      document_types: {
        terms: { field: 'document_type', size: 20 }
      },
      authors: {
        terms: { field: 'author.keyword', size: 50 }
      },
      tags: {
        terms: { field: 'tags', size: 100 }
      },
      folders: {
        terms: { field: 'folder_path.keyword', size: 50 }
      },
      status: {
        terms: { field: 'metadata.status', size: 20 }
      },
      date_histogram: {
        date_histogram: {
          field: 'created_at',
          calendar_interval: 'month',
          min_doc_count: 1
        }
      }
    };
  }

  /**
   * Transform backend RAG results to SearchResult format
   */
  private transformBackendResults(results: any[], query: string): SearchResult[] {
    return results.map((result: any) => {
      const doc = result.document || result;

      return {
        id: doc.id || doc.document_id || '',
        title: doc.title || 'Untitled Document',
        content: doc.content || '',
        snippet: doc.content ? doc.content.substring(0, 200) + '...' : '',
        documentType: doc.document_type || 'Unknown',
        createdAt: doc.created_at || new Date().toISOString(),
        modifiedAt: doc.modified_at || doc.created_at || new Date().toISOString(),
        author: doc.author || 'Unknown',
        metadata: doc.metadata || {},
        tags: doc.tags || [],
        score: result.score || result.similarity || 0,
        highlights: [],
        thumbnailUrl: doc.thumbnail_url,
        previewUrl: doc.preview_url,
        downloadUrl: doc.download_url,
      };
    });
  }

  /**
   * Transform Elasticsearch results to SearchResult format
   */
  private transformElasticsearchResults(elasticResponse: any, query: string): SearchResult[] {
    return elasticResponse.hits.hits.map((hit: any) => {
      const source = hit._source;
      const highlights = this.extractElasticsearchHighlights(hit.highlight || {});

      return {
        id: hit._id,
        title: source.title || 'Untitled Document',
        content: source.content || '',
        snippet: this.generateSnippet(source.content, source.ocr_text, highlights, query),
        documentType: source.document_type || 'Unknown',
        createdAt: source.created_at || new Date().toISOString(),
        modifiedAt: source.modified_at || source.created_at || new Date().toISOString(),
        author: source.author || 'Unknown',
        metadata: source.metadata || {},
        tags: source.tags || [],
        score: hit._score ? Math.min(hit._score / 10, 1) : 0, // Normalize score
        highlights,
        thumbnailUrl: source.thumbnail_url,
        previewUrl: source.preview_url,
        downloadUrl: source.download_url,
      };
    });
  }

  /**
   * Extract highlights from Elasticsearch response
   */
  private extractElasticsearchHighlights(highlights: any): string[] {
    const extractedHighlights: string[] = [];

    // Extract highlights from all fields
    Object.values(highlights).forEach((fieldHighlights: any) => {
      if (Array.isArray(fieldHighlights)) {
        extractedHighlights.push(...fieldHighlights);
      }
    });

    return extractedHighlights.slice(0, 5); // Limit to 5 highlights
  }

  /**
   * Generate snippet from content and OCR text with highlights
   */
  private generateSnippet(
    content: string,
    ocrText: string,
    highlights: string[],
    query: string
  ): string {
    // If we have highlights, use the first one as snippet
    if (highlights.length > 0) {
      return highlights[0];
    }

    // Fallback: generate snippet from content or OCR text
    const text = content || ocrText || '';
    if (!text) return '';

    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const textLower = text.toLowerCase();

    // Find first occurrence of any query term
    let snippetStart = 0;
    for (const term of queryTerms) {
      const index = textLower.indexOf(term);
      if (index !== -1) {
        snippetStart = Math.max(0, index - 75);
        break;
      }
    }

    // Extract snippet and add ellipsis if needed
    const snippet = text.substring(snippetStart, snippetStart + 200);
    const prefix = snippetStart > 0 ? '...' : '';
    const suffix = snippetStart + 200 < text.length ? '...' : '';

    return prefix + snippet + suffix;
  }

  /**
   * Extract facets from Elasticsearch aggregations
   */
  private extractFacets(aggregations: any): Record<string, any> {
    if (!aggregations) return {};

    const facets: Record<string, any> = {};

    Object.entries(aggregations).forEach(([key, agg]: [string, any]) => {
      if (agg.buckets) {
        facets[key] = agg.buckets.map((bucket: any) => ({
          value: bucket.key,
          count: bucket.doc_count,
        }));
      }
    });

    return facets;
  }

  /**
   * Get authentication token for API requests
   */
  private getAuthToken(): string {
    // TODO: Integrate with actual auth system
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Mock search results for development when Elasticsearch is unavailable
   */
  private async getMockSearchResults(
    query: string,
    filters: SearchFilters,
    page: number,
    pageSize: number
  ): Promise<SearchAPIResponse> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const filteredResults = mockSearchResults.filter(result => {
      // Apply basic text filtering
      if (query) {
        const searchText = `${result.title} ${result.content} ${result.tags.join(' ')}`.toLowerCase();
        const queryTerms = query.toLowerCase().split(/\s+/);
        if (!queryTerms.some(term => searchText.includes(term))) {
          return false;
        }
      }

      // Apply document type filter
      if (filters.documentTypes?.length && !filters.documentTypes.includes(result.documentType)) {
        return false;
      }

      // Apply author filter
      if (filters.authors?.length && !filters.authors.includes(result.author)) {
        return false;
      }

      // Apply tags filter
      if (filters.tags?.length && !filters.tags.some(tag => result.tags.includes(tag))) {
        return false;
      }

      return true;
    });

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      results: filteredResults.slice(startIndex, endIndex),
      totalResults: filteredResults.length,
      page,
      pageSize,
      facets: this.generateMockFacets(filteredResults),
      timeTaken: 45,
    };
  }

  /**
   * Generate mock facets for development
   */
  private generateMockFacets(results: SearchResult[]): Record<string, any> {
    const documentTypes = new Map<string, number>();
    const authors = new Map<string, number>();
    const tags = new Map<string, number>();

    results.forEach(result => {
      documentTypes.set(result.documentType, (documentTypes.get(result.documentType) || 0) + 1);
      authors.set(result.author, (authors.get(result.author) || 0) + 1);
      result.tags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
    });

    return {
      document_types: Array.from(documentTypes, ([value, count]) => ({ value, count })),
      authors: Array.from(authors, ([value, count]) => ({ value, count })),
      tags: Array.from(tags, ([value, count]) => ({ value, count })),
    };
  }
}

// Create singleton instance with environment variable or fallback
const API_BASE_URL = import.meta.env.VITE_RAG_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
export const searchService = new SearchService(API_BASE_URL);

// Mock data for development/testing when API is not available
export const mockSearchResults: SearchResult[] = [
  {
    id: 'doc-1',
    title: 'Project Requirements Document',
    content: 'This document outlines the requirements for the new search functionality...',
    snippet: 'This document outlines the requirements for the new search functionality with advanced filtering capabilities.',
    documentType: 'PDF',
    createdAt: '2025-01-15T10:30:00Z',
    modifiedAt: '2025-01-20T14:22:00Z',
    author: 'John Smith',
    metadata: {
      category: 'Requirements',
      priority: 'High',
      department: 'Engineering'
    },
    tags: ['requirements', 'search', 'project'],
    score: 0.95,
    highlights: ['<mark>search</mark> functionality', 'advanced <mark>filtering</mark>'],
    thumbnailUrl: '/api/documents/doc-1/thumbnail',
    previewUrl: '/api/documents/doc-1/preview',
    downloadUrl: '/api/documents/doc-1/download',
  },
  {
    id: 'doc-2',
    title: 'User Interface Mockups',
    content: 'Design mockups for the search interface showing various states and interactions...',
    snippet: 'Design mockups for the search interface showing various states and interactions including filters and results.',
    documentType: 'Image',
    createdAt: '2025-01-10T09:15:00Z',
    modifiedAt: '2025-01-18T16:45:00Z',
    author: 'Sarah Johnson',
    metadata: {
      category: 'Design',
      version: '2.1',
      status: 'Approved'
    },
    tags: ['design', 'mockups', 'ui'],
    score: 0.87,
    highlights: ['<mark>search</mark> interface', 'various states'],
    thumbnailUrl: '/api/documents/doc-2/thumbnail',
    previewUrl: '/api/documents/doc-2/preview',
    downloadUrl: '/api/documents/doc-2/download',
  },
  {
    id: 'doc-3',
    title: 'API Documentation',
    content: 'Technical documentation for the search API endpoints and data models...',
    snippet: 'Technical documentation for the search API endpoints and data models including request/response formats.',
    documentType: 'Text',
    createdAt: '2025-01-12T11:20:00Z',
    modifiedAt: '2025-01-19T13:30:00Z',
    author: 'Mike Chen',
    metadata: {
      category: 'Documentation',
      version: '1.0',
      audience: 'Developers'
    },
    tags: ['api', 'documentation', 'technical'],
    score: 0.78,
    highlights: ['<mark>search</mark> API', 'data models'],
    thumbnailUrl: '/api/documents/doc-3/thumbnail',
    previewUrl: '/api/documents/doc-3/preview',
    downloadUrl: '/api/documents/doc-3/download',
  }
];

export const mockSuggestions: SearchSuggestion[] = [
  { text: 'search functionality', type: 'query', category: 'Recent', count: 15 },
  { text: 'search interface', type: 'query', category: 'Popular', count: 23 },
  { text: 'search API', type: 'document', category: 'Documents', count: 8 },
  { text: 'requirements', type: 'metadata', category: 'Tags', count: 45 },
  { text: 'design mockups', type: 'query', category: 'Suggested', count: 12 },
];