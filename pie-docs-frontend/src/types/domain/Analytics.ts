/**
 * Analytics domain types for search analytics and optimization
 */

export interface SearchAnalytics {
  id: string;
  query: string;
  timestamp: Date;
  responseTime: number;
  resultCount: number;
  wasSuccessful: boolean;
  userId?: string; // Anonymous user identifier
  sessionId: string;
  source: 'basic' | 'advanced' | 'nlp' | 'voice';
  filters?: Record<string, any>;
}

export interface FailedSearchMetrics {
  query: string;
  count: number;
  lastOccurrence: Date;
  suggestedSolutions: string[];
  relatedSuccessfulQueries: string[];
}

export interface PopularContent {
  documentId: string;
  title: string;
  accessCount: number;
  searchCount: number;
  lastAccessed: Date;
  trendDirection: 'up' | 'down' | 'stable';
  categories: string[];
}

export interface QueryPerformanceMetrics {
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  timestamp: Date;
  queryComplexity: 'simple' | 'medium' | 'complex';
}

export interface UserBehaviorPattern {
  sessionId: string;
  searchSequence: string[];
  sessionDuration: number;
  successfulQueries: number;
  refinementCount: number;
  abandonmentPoint?: string;
  discoveryPath: string[];
}

export interface OptimizationSuggestion {
  id: string;
  type: 'tagging' | 'organization' | 'content' | 'search-config';
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImpact: string;
  implementationCost: 'low' | 'medium' | 'high';
  supportingData: {
    queries: string[];
    documentIds: string[];
    metrics: Record<string, number>;
  };
}

export interface ContentRecommendation {
  id: string;
  type: 'create' | 'acquire' | 'improve';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  searchGaps: string[];
  potentialImpact: {
    estimatedQueries: number;
    userSatisfaction: number;
  };
  suggestedContent: {
    title: string;
    topics: string[];
    format: string;
  };
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  isActive: boolean;
  trafficAllocation: number; // 0-100
}

export interface ABTestResults {
  variantId: string;
  metrics: {
    searchSuccessRate: number;
    averageResponseTime: number;
    userSatisfaction: number;
    conversionRate: number;
  };
  sampleSize: number;
  confidenceLevel: number;
  statisticalSignificance: boolean;
}

export interface AnalyticsDashboardData {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalSearches: number;
  successRate: number;
  averageResponseTime: number;
  topQueries: Array<{
    query: string;
    count: number;
    successRate: number;
  }>;
  failedSearches: FailedSearchMetrics[];
  popularContent: PopularContent[];
  performanceMetrics: QueryPerformanceMetrics[];
  userBehaviorSummary: {
    avgSessionDuration: number;
    avgQueriesPerSession: number;
    refinementRate: number;
    abandonmentRate: number;
  };
  optimizationSuggestions: OptimizationSuggestion[];
  contentRecommendations: ContentRecommendation[];
}

export interface AnalyticsFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  searchSource?: 'basic' | 'advanced' | 'nlp' | 'voice';
  userSegment?: 'all' | 'new' | 'returning' | 'power-users';
  contentType?: string[];
  queryComplexity?: 'simple' | 'medium' | 'complex';
  successOnly?: boolean;
}

export interface RealTimeMetrics {
  currentActiveUsers: number;
  searchesInLastHour: number;
  averageResponseTime: number;
  errorRate: number;
  systemLoad: number;
  trending: {
    queries: string[];
    documents: string[];
  };
}

export interface SearchAnalyticsConfig {
  retentionPeriod: number; // days
  anonymizationEnabled: boolean;
  realTimeUpdates: boolean;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    failedSearchRate: number;
  };
  privacySettings: {
    trackUserSessions: boolean;
    storeQueryText: boolean;
    gdprCompliant: boolean;
  };
}