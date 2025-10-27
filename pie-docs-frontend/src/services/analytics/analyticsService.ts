import type {
  SearchAnalytics,
  AnalyticsDashboardData,
  AnalyticsFilters,
  RealTimeMetrics,
  SearchAnalyticsConfig,
  FailedSearchMetrics,
  PopularContent,
  QueryPerformanceMetrics,
  UserBehaviorPattern,
  OptimizationSuggestion,
  ContentRecommendation
} from '@/types/domain/Analytics';

export class AnalyticsService {
  private baseUrl: string;
  private config: SearchAnalyticsConfig;

  constructor(baseUrl: string = '/api/analytics') {
    this.baseUrl = baseUrl;
    this.config = this.getDefaultConfig();
  }

  /**
   * Track a search event
   */
  async trackSearch(searchData: Omit<SearchAnalytics, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.privacySettings.storeQueryText) {
      // Hash the query for privacy compliance
      searchData = {
        ...searchData,
        query: this.hashQuery(searchData.query),
      };
    }

    try {
      await fetch(`${this.baseUrl}/track/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...searchData,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.warn('Failed to track search analytics:', error);
    }
  }

  /**
   * Get dashboard analytics data
   */
  async getDashboardData(filters: AnalyticsFilters): Promise<AnalyticsDashboardData> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      return this.generateMockDashboardData(filters);
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/realtime`);

      if (!response.ok) {
        throw new Error(`Real-time metrics request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error);
      return this.generateMockRealTimeMetrics();
    }
  }

  /**
   * Get failed search metrics
   */
  async getFailedSearchMetrics(filters: AnalyticsFilters): Promise<FailedSearchMetrics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/failed-searches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Failed searches request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch failed search metrics:', error);
      return this.generateMockFailedSearchMetrics();
    }
  }

  /**
   * Get popular content analytics
   */
  async getPopularContent(filters: AnalyticsFilters): Promise<PopularContent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/popular-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Popular content request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch popular content:', error);
      return this.generateMockPopularContent();
    }
  }

  /**
   * Get query performance metrics
   */
  async getQueryPerformanceMetrics(filters: AnalyticsFilters): Promise<QueryPerformanceMetrics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/query-performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Query performance request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch query performance metrics:', error);
      return this.generateMockQueryPerformanceMetrics();
    }
  }

  /**
   * Get user behavior patterns
   */
  async getUserBehaviorPatterns(filters: AnalyticsFilters): Promise<UserBehaviorPattern[]> {
    if (!this.config.privacySettings.trackUserSessions) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/user-behavior`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`User behavior request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch user behavior patterns:', error);
      return this.generateMockUserBehaviorPatterns();
    }
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions(filters: AnalyticsFilters): Promise<OptimizationSuggestion[]> {
    try {
      const response = await fetch(`${this.baseUrl}/optimization-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Optimization suggestions request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch optimization suggestions:', error);
      return this.generateMockOptimizationSuggestions();
    }
  }

  /**
   * Get content recommendations
   */
  async getContentRecommendations(filters: AnalyticsFilters): Promise<ContentRecommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/content-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Content recommendations request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch content recommendations:', error);
      return this.generateMockContentRecommendations();
    }
  }

  /**
   * Update analytics configuration
   */
  async updateConfig(newConfig: Partial<SearchAnalyticsConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    try {
      await fetch(`${this.baseUrl}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.config),
      });
    } catch (error) {
      console.error('Failed to update analytics config:', error);
    }
  }

  /**
   * Export analytics data
   */
  async exportData(filters: AnalyticsFilters, format: 'csv' | 'json' | 'xlsx'): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Export request failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private hashQuery(query: string): string {
    // Simple hash for privacy (in production, use proper hashing)
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `query_${Math.abs(hash)}`;
  }

  private getDefaultConfig(): SearchAnalyticsConfig {
    return {
      retentionPeriod: 90,
      anonymizationEnabled: true,
      realTimeUpdates: true,
      alertThresholds: {
        responseTime: 2000,
        errorRate: 0.05,
        failedSearchRate: 0.15,
      },
      privacySettings: {
        trackUserSessions: true,
        storeQueryText: true,
        gdprCompliant: true,
      },
    };
  }

  /**
   * Mock data generation methods for development
   */
  private generateMockDashboardData(filters: AnalyticsFilters): AnalyticsDashboardData {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      timeRange: filters.dateRange,
      totalSearches: 1245,
      successRate: 0.87,
      averageResponseTime: 342,
      topQueries: [
        { query: 'document management', count: 89, successRate: 0.95 },
        { query: 'workflow automation', count: 76, successRate: 0.82 },
        { query: 'security protocols', count: 65, successRate: 0.91 },
        { query: 'api documentation', count: 54, successRate: 0.78 },
        { query: 'user permissions', count: 48, successRate: 0.85 },
      ],
      failedSearches: this.generateMockFailedSearchMetrics(),
      popularContent: this.generateMockPopularContent(),
      performanceMetrics: this.generateMockQueryPerformanceMetrics(),
      userBehaviorSummary: {
        avgSessionDuration: 420,
        avgQueriesPerSession: 3.2,
        refinementRate: 0.34,
        abandonmentRate: 0.12,
      },
      optimizationSuggestions: this.generateMockOptimizationSuggestions(),
      contentRecommendations: this.generateMockContentRecommendations(),
    };
  }

  private generateMockRealTimeMetrics(): RealTimeMetrics {
    return {
      currentActiveUsers: 23,
      searchesInLastHour: 156,
      averageResponseTime: 287,
      errorRate: 0.02,
      systemLoad: 0.67,
      trending: {
        queries: ['new feature', 'integration guide', 'troubleshooting'],
        documents: ['API Reference', 'User Guide', 'Installation Manual'],
      },
    };
  }

  private generateMockFailedSearchMetrics(): FailedSearchMetrics[] {
    return [
      {
        query: 'advanced configuration',
        count: 23,
        lastOccurrence: new Date(),
        suggestedSolutions: ['Create advanced configuration guide', 'Improve search indexing'],
        relatedSuccessfulQueries: ['configuration guide', 'setup instructions'],
      },
      {
        query: 'mobile app integration',
        count: 18,
        lastOccurrence: new Date(),
        suggestedSolutions: ['Add mobile development documentation'],
        relatedSuccessfulQueries: ['api integration', 'sdk documentation'],
      },
    ];
  }

  private generateMockPopularContent(): PopularContent[] {
    return [
      {
        documentId: 'doc-1',
        title: 'Getting Started Guide',
        accessCount: 456,
        searchCount: 289,
        lastAccessed: new Date(),
        trendDirection: 'up',
        categories: ['documentation', 'tutorial'],
      },
      {
        documentId: 'doc-2',
        title: 'API Reference Manual',
        accessCount: 389,
        searchCount: 234,
        lastAccessed: new Date(),
        trendDirection: 'stable',
        categories: ['api', 'reference'],
      },
    ];
  }

  private generateMockQueryPerformanceMetrics(): QueryPerformanceMetrics[] {
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => ({
      averageResponseTime: 250 + Math.random() * 200,
      p95ResponseTime: 450 + Math.random() * 300,
      p99ResponseTime: 800 + Math.random() * 400,
      throughput: 10 + Math.random() * 20,
      errorRate: Math.random() * 0.05,
      timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
      queryComplexity: ['simple', 'medium', 'complex'][Math.floor(Math.random() * 3)] as any,
    }));
  }

  private generateMockUserBehaviorPatterns(): UserBehaviorPattern[] {
    return [
      {
        sessionId: 'session-1',
        searchSequence: ['document', 'document management', 'workflow'],
        sessionDuration: 480,
        successfulQueries: 2,
        refinementCount: 1,
        discoveryPath: ['search', 'document-view', 'related-docs'],
      },
    ];
  }

  private generateMockOptimizationSuggestions(): OptimizationSuggestion[] {
    return [
      {
        id: 'opt-1',
        type: 'tagging',
        priority: 'high',
        description: 'Improve document tagging for workflow-related content',
        expectedImpact: 'Increase search success rate by 15%',
        implementationCost: 'medium',
        supportingData: {
          queries: ['workflow', 'automation', 'process'],
          documentIds: ['doc-1', 'doc-2'],
          metrics: { currentSuccessRate: 0.72, potentialIncrease: 0.15 },
        },
      },
    ];
  }

  private generateMockContentRecommendations(): ContentRecommendation[] {
    return [
      {
        id: 'rec-1',
        type: 'create',
        title: 'Mobile Integration Guide',
        description: 'Create comprehensive mobile app integration documentation',
        urgency: 'high',
        searchGaps: ['mobile app integration', 'sdk setup', 'ios development'],
        potentialImpact: {
          estimatedQueries: 50,
          userSatisfaction: 0.85,
        },
        suggestedContent: {
          title: 'Mobile SDK Integration Guide',
          topics: ['iOS setup', 'Android setup', 'React Native'],
          format: 'step-by-step tutorial',
        },
      },
    ];
  }
}

export const analyticsService = new AnalyticsService();