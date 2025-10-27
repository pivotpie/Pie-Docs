import type { SearchSuggestion } from '@/types/domain/SemanticSearch';

export interface UserBehaviorContext {
  userId?: string;
  recentSearches?: string[];
  clickedDocuments?: string[];
  bookmarkedDocuments?: string[];
  searchHistory?: Array<{
    query: string;
    timestamp: string;
    results: number;
    clicked: boolean;
  }>;
  preferences?: {
    language: 'en' | 'ar' | 'auto';
    documentTypes: string[];
    topics: string[];
  };
}

export interface DocumentContext {
  currentDocument?: {
    id: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
  };
  relatedDocuments?: string[];
  currentTopic?: string;
  currentSearch?: string;
}

export interface SuggestionOptions {
  maxSuggestions?: number;
  includeSemanticSuggestions?: boolean;
  includePersonalized?: boolean;
  includeContextual?: boolean;
  includePopular?: boolean;
  includeTrending?: boolean;
  includeCorrections?: boolean;
  minConfidence?: number;
}

export interface AutoCompletionResult {
  completions: Array<{
    text: string;
    type: 'word' | 'phrase' | 'query';
    confidence: number;
    frequency: number;
  }>;
  suggestions: SearchSuggestion[];
  corrections: Array<{
    original: string;
    corrected: string;
    confidence: number;
  }>;
}

export interface QueryExpansion {
  originalQuery: string;
  expandedTerms: string[];
  synonyms: Record<string, string[]>;
  relatedConcepts: string[];
  contextualTerms: string[];
  confidence: number;
}

export class SearchSuggestionEngine {
  private baseUrl: string;
  private suggestionCache: Map<string, SearchSuggestion[]> = new Map();
  private completionCache: Map<string, AutoCompletionResult> = new Map();

  constructor(baseUrl: string = '/api/semantic-search') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get intelligent search suggestions based on context
   */
  async getSearchSuggestions(
    partialQuery: string,
    userContext: UserBehaviorContext = {},
    documentContext: DocumentContext = {},
    options: SuggestionOptions = {}
  ): Promise<SearchSuggestion[]> {
    const {
      maxSuggestions = 10,
      includeSemanticSuggestions = true,
      includePersonalized = true,
      includeContextual = true,
      includePopular = true,
      includeTrending = false,
      includeCorrections = true,
      minConfidence = 0.3
    } = options;

    const cacheKey = JSON.stringify({ partialQuery, userContext, documentContext, options });

    if (this.suggestionCache.has(cacheKey)) {
      return this.suggestionCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/suggestions/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partialQuery,
          userContext,
          documentContext,
          maxSuggestions,
          includeSemanticSuggestions,
          includePersonalized,
          includeContextual,
          includePopular,
          includeTrending,
          includeCorrections,
          minConfidence
        }),
      });

      if (!response.ok) {
        throw new Error(`Search suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.suggestionCache.set(cacheKey, data.suggestions);

      return data.suggestions;
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      throw error;
    }
  }

  /**
   * Get query auto-completion with semantic understanding
   */
  async getAutoCompletion(
    partialQuery: string,
    userContext: UserBehaviorContext = {},
    options: {
      maxCompletions?: number;
      includeQueries?: boolean;
      includePhrases?: boolean;
      includeWords?: boolean;
      semanticExpansion?: boolean;
    } = {}
  ): Promise<AutoCompletionResult> {
    const {
      maxCompletions = 8,
      includeQueries = true,
      includePhrases = true,
      includeWords = false,
      semanticExpansion = true
    } = options;

    const cacheKey = JSON.stringify({ partialQuery, userContext, options });

    if (this.completionCache.has(cacheKey)) {
      return this.completionCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/suggestions/autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partialQuery,
          userContext,
          maxCompletions,
          includeQueries,
          includePhrases,
          includeWords,
          semanticExpansion
        }),
      });

      if (!response.ok) {
        throw new Error(`Auto-completion failed: ${response.statusText}`);
      }

      const data: AutoCompletionResult = await response.json();
      this.completionCache.set(cacheKey, data);

      return data;
    } catch (error) {
      console.error('Failed to get auto-completion:', error);
      throw error;
    }
  }

  /**
   * Get contextual suggestions based on current document
   */
  async getContextualSuggestions(
    documentContext: DocumentContext,
    userContext: UserBehaviorContext = {},
    maxSuggestions: number = 6
  ): Promise<SearchSuggestion[]> {
    try {
      const response = await fetch(`${this.baseUrl}/suggestions/contextual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContext,
          userContext,
          maxSuggestions
        }),
      });

      if (!response.ok) {
        throw new Error(`Contextual suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions;
    } catch (error) {
      console.error('Failed to get contextual suggestions:', error);
      throw error;
    }
  }

  /**
   * Get personalized suggestions based on user behavior
   */
  async getPersonalizedSuggestions(
    userContext: UserBehaviorContext,
    options: {
      maxSuggestions?: number;
      timeWindow?: 'recent' | 'week' | 'month' | 'all';
      includeBookmarks?: boolean;
      includeHistory?: boolean;
      includePreferences?: boolean;
    } = {}
  ): Promise<SearchSuggestion[]> {
    const {
      maxSuggestions = 8,
      timeWindow = 'recent',
      includeBookmarks = true,
      includeHistory = true,
      includePreferences = true
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/suggestions/personalized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userContext,
          maxSuggestions,
          timeWindow,
          includeBookmarks,
          includeHistory,
          includePreferences
        }),
      });

      if (!response.ok) {
        throw new Error(`Personalized suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions;
    } catch (error) {
      console.error('Failed to get personalized suggestions:', error);
      throw error;
    }
  }

  /**
   * Get trending search suggestions
   */
  async getTrendingSuggestions(
    timeFrame: 'hour' | 'day' | 'week' | 'month' = 'day',
    category?: string,
    maxSuggestions: number = 10
  ): Promise<SearchSuggestion[]> {
    try {
      const response = await fetch(`${this.baseUrl}/suggestions/trending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeFrame,
          category,
          maxSuggestions
        }),
      });

      if (!response.ok) {
        throw new Error(`Trending suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions;
    } catch (error) {
      console.error('Failed to get trending suggestions:', error);
      throw error;
    }
  }

  /**
   * Get popular search suggestions
   */
  async getPopularSuggestions(
    category?: string,
    language?: 'en' | 'ar',
    maxSuggestions: number = 10
  ): Promise<SearchSuggestion[]> {
    try {
      const response = await fetch(`${this.baseUrl}/suggestions/popular`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          language,
          maxSuggestions
        }),
      });

      if (!response.ok) {
        throw new Error(`Popular suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions;
    } catch (error) {
      console.error('Failed to get popular suggestions:', error);
      throw error;
    }
  }

  /**
   * Expand query with semantic understanding
   */
  async expandQuery(
    query: string,
    options: {
      includeSynonyms?: boolean;
      includeRelatedTerms?: boolean;
      includeContextualTerms?: boolean;
      maxExpansions?: number;
      language?: 'en' | 'ar' | 'auto';
    } = {}
  ): Promise<QueryExpansion> {
    const {
      includeSynonyms = true,
      includeRelatedTerms = true,
      includeContextualTerms = false,
      maxExpansions = 10,
      language = 'auto'
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/suggestions/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          includeSynonyms,
          includeRelatedTerms,
          includeContextualTerms,
          maxExpansions,
          language
        }),
      });

      if (!response.ok) {
        throw new Error(`Query expansion failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to expand query:', error);
      throw error;
    }
  }

  /**
   * Get query corrections and suggestions
   */
  async getQueryCorrections(
    query: string,
    language: 'en' | 'ar' | 'auto' = 'auto'
  ): Promise<Array<{
    original: string;
    corrected: string;
    type: 'spelling' | 'grammar' | 'semantic';
    confidence: number;
    explanation?: string;
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/suggestions/corrections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          language
        }),
      });

      if (!response.ok) {
        throw new Error(`Query corrections failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.corrections;
    } catch (error) {
      console.error('Failed to get query corrections:', error);
      throw error;
    }
  }

  /**
   * Learn from user interactions
   */
  async learnFromInteraction(
    query: string,
    suggestion: SearchSuggestion,
    interaction: 'clicked' | 'ignored' | 'accepted' | 'rejected',
    userContext: UserBehaviorContext = {}
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/suggestions/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          suggestion,
          interaction,
          userContext,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Failed to learn from interaction:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get suggestion analytics
   */
  async getSuggestionAnalytics(
    timeRange: {
      start: string;
      end: string;
    },
    filters?: {
      userId?: string;
      suggestionType?: string;
      category?: string;
    }
  ): Promise<{
    totalSuggestions: number;
    acceptanceRate: number;
    topSuggestions: Array<{
      text: string;
      count: number;
      acceptanceRate: number;
    }>;
    userEngagement: {
      averageInteractions: number;
      retentionRate: number;
    };
    performanceMetrics: {
      averageResponseTime: number;
      cacheHitRate: number;
    };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/suggestions/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange,
          filters
        }),
      });

      if (!response.ok) {
        throw new Error(`Suggestion analytics failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get suggestion analytics:', error);
      throw error;
    }
  }

  /**
   * Configure suggestion preferences
   */
  async updateSuggestionPreferences(
    userId: string,
    preferences: {
      enablePersonalized?: boolean;
      enableContextual?: boolean;
      enableTrending?: boolean;
      enableCorrections?: boolean;
      preferredLanguage?: 'en' | 'ar' | 'auto';
      maxSuggestions?: number;
      categories?: string[];
    }
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/suggestions/preferences/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      // Clear cache for this user
      this.clearUserCache(userId);
    } catch (error) {
      console.error('Failed to update suggestion preferences:', error);
      throw error;
    }
  }

  /**
   * Get suggestion performance metrics
   */
  async getSuggestionMetrics(): Promise<{
    totalQueries: number;
    suggestionEngagement: number;
    averageResponseTime: number;
    cacheEfficiency: number;
    accuracyScore: number;
    userSatisfaction: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/suggestions/metrics`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Suggestion metrics failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get suggestion metrics:', error);
      throw error;
    }
  }

  /**
   * Optimize suggestion algorithms
   */
  async optimizeSuggestionAlgorithms(): Promise<{
    optimizationsApplied: string[];
    performanceImprovement: number;
    accuracyImprovement: number;
    recommendations: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/suggestions/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Suggestion optimization failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Clear all caches after optimization
      this.clearCache();

      return result;
    } catch (error) {
      console.error('Failed to optimize suggestion algorithms:', error);
      throw error;
    }
  }

  /**
   * Clear cache for specific user
   */
  private clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.suggestionCache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }

    for (const key of this.completionCache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.suggestionCache.delete(key);
      this.completionCache.delete(key);
    });
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.suggestionCache.clear();
    this.completionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    suggestionCacheSize: number;
    completionCacheSize: number;
    totalCacheSize: number;
  } {
    return {
      suggestionCacheSize: this.suggestionCache.size,
      completionCacheSize: this.completionCache.size,
      totalCacheSize: this.suggestionCache.size + this.completionCache.size
    };
  }
}