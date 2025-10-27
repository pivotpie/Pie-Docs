import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  UserBehaviorPattern,
  AnalyticsFilters,
  SearchAnalyticsConfig
} from '@/types/domain/Analytics';
import { analyticsService } from '@/services/analytics/analyticsService';

interface UserBehaviorAnalyzerProps {
  className?: string;
  privacyMode?: 'strict' | 'standard' | 'detailed';
  showSessionFlows?: boolean;
  showAbandonmentAnalysis?: boolean;
}

interface BehaviorInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'opportunity';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  recommendations: string[];
  dataPoints: number;
}

export const UserBehaviorAnalyzer: React.FC<UserBehaviorAnalyzerProps> = ({
  className = '',
  privacyMode = 'standard',
  showSessionFlows = true,
  showAbandonmentAnalysis = true,
}) => {
  const { theme } = useTheme();
  const [behaviorPatterns, setBehaviorPatterns] = useState<UserBehaviorPattern[]>([]);
  const [insights, setInsights] = useState<BehaviorInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [selectedView, setSelectedView] = useState<'overview' | 'sessions' | 'patterns' | 'insights'>('overview');
  const [privacyNotice, setPrivacyNotice] = useState(true);

  /**
   * Calculate date range based on selection
   */
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();

    switch (selectedTimeRange) {
      case 'day':
        start.setDate(now.getDate() - 1);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
    }

    return { start, end: now };
  }, [selectedTimeRange]);

  /**
   * Create analytics filters
   */
  const analyticsFilters: AnalyticsFilters = useMemo(() => ({
    dateRange,
    userSegment: 'all',
  }), [dateRange]);

  /**
   * Calculate behavior statistics
   */
  const behaviorStats = useMemo(() => {
    if (behaviorPatterns.length === 0) {
      return {
        totalSessions: 0,
        avgSessionDuration: 0,
        avgQueriesPerSession: 0,
        refinementRate: 0,
        abandonmentRate: 0,
        successfulSessions: 0,
        commonPatterns: [],
        peakUsageHours: [],
      };
    }

    const totalSessions = behaviorPatterns.length;
    const totalDuration = behaviorPatterns.reduce((sum, pattern) => sum + pattern.sessionDuration, 0);
    const totalQueries = behaviorPatterns.reduce((sum, pattern) => sum + pattern.searchSequence.length, 0);
    const totalRefinements = behaviorPatterns.reduce((sum, pattern) => sum + pattern.refinementCount, 0);
    const abandonedSessions = behaviorPatterns.filter(pattern => pattern.abandonmentPoint).length;
    const successfulSessions = behaviorPatterns.filter(pattern => pattern.successfulQueries > 0).length;

    // Analyze common search patterns
    const sequenceMap = new Map<string, number>();
    behaviorPatterns.forEach(pattern => {
      pattern.searchSequence.forEach((query, index) => {
        if (index > 0) {
          const sequence = `${pattern.searchSequence[index - 1]} → ${query}`;
          sequenceMap.set(sequence, (sequenceMap.get(sequence) || 0) + 1);
        }
      });
    });

    const commonPatterns = Array.from(sequenceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));

    return {
      totalSessions,
      avgSessionDuration: totalDuration / totalSessions,
      avgQueriesPerSession: totalQueries / totalSessions,
      refinementRate: totalRefinements / totalQueries,
      abandonmentRate: abandonedSessions / totalSessions,
      successfulSessions,
      commonPatterns,
      peakUsageHours: [], // Would be calculated from timestamp analysis
    };
  }, [behaviorPatterns]);

  /**
   * Generate behavioral insights
   */
  const generateInsights = (patterns: UserBehaviorPattern[]): BehaviorInsight[] => {
    const insights: BehaviorInsight[] = [];

    // High abandonment rate insight
    if (behaviorStats.abandonmentRate > 0.3) {
      insights.push({
        id: 'high-abandonment',
        type: 'anomaly',
        title: 'High Search Abandonment Rate',
        description: `${Math.round(behaviorStats.abandonmentRate * 100)}% of search sessions are abandoned before completion`,
        impact: 'high',
        confidence: 0.85,
        recommendations: [
          'Improve search result relevance',
          'Add search suggestions and auto-complete',
          'Optimize search interface usability',
          'Provide better filtering options'
        ],
        dataPoints: patterns.length,
      });
    }

    // Query refinement pattern
    if (behaviorStats.refinementRate > 0.4) {
      insights.push({
        id: 'high-refinement',
        type: 'pattern',
        title: 'High Query Refinement Rate',
        description: `Users refine their searches ${Math.round(behaviorStats.refinementRate * 100)}% of the time, indicating initial queries may be too broad`,
        impact: 'medium',
        confidence: 0.75,
        recommendations: [
          'Improve initial search suggestions',
          'Add faceted search filters',
          'Implement query auto-completion',
          'Show related search terms'
        ],
        dataPoints: patterns.length,
      });
    }

    // Long session pattern
    if (behaviorStats.avgSessionDuration > 600) { // 10 minutes
      insights.push({
        id: 'long-sessions',
        type: 'pattern',
        title: 'Extended Search Sessions',
        description: `Average search session lasts ${Math.round(behaviorStats.avgSessionDuration / 60)} minutes, suggesting complex information needs`,
        impact: 'medium',
        confidence: 0.70,
        recommendations: [
          'Add session bookmarking',
          'Implement search history',
          'Provide result saving functionality',
          'Add workspace or collection features'
        ],
        dataPoints: patterns.length,
      });
    }

    // Success rate opportunity
    const successRate = behaviorStats.successfulSessions / behaviorStats.totalSessions;
    if (successRate < 0.7) {
      insights.push({
        id: 'low-success-rate',
        type: 'opportunity',
        title: 'Search Success Rate Improvement Opportunity',
        description: `Only ${Math.round(successRate * 100)}% of sessions result in successful searches`,
        impact: 'high',
        confidence: 0.80,
        recommendations: [
          'Enhance search algorithm',
          'Improve content tagging',
          'Add semantic search capabilities',
          'Implement user feedback mechanisms'
        ],
        dataPoints: patterns.length,
      });
    }

    return insights;
  };

  /**
   * Load user behavior patterns
   */
  const loadBehaviorPatterns = async () => {
    try {
      setIsLoading(true);
      const data = await analyticsService.getUserBehaviorPatterns(analyticsFilters);
      setBehaviorPatterns(data);

      // Generate insights based on the data
      const generatedInsights = generateInsights(data);
      setInsights(generatedInsights);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user behavior data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  /**
   * Get privacy compliance message
   */
  const getPrivacyMessage = (): string => {
    switch (privacyMode) {
      case 'strict':
        return 'All user data is anonymized and aggregated. No personal identifiers are stored or displayed.';
      case 'detailed':
        return 'Session data includes pseudonymized user identifiers for detailed analysis while maintaining privacy.';
      default:
        return 'User behavior data is anonymized and used only for improving search experience.';
    }
  };

  /**
   * Get insight color
   */
  const getInsightColor = (type: string, impact: string): string => {
    if (impact === 'high') {
      return type === 'opportunity' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200';
    }
    if (impact === 'medium') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  useEffect(() => {
    loadBehaviorPatterns();
  }, [analyticsFilters]);

  if (isLoading && behaviorPatterns.length === 0) {
    return (
      <div className={`user-behavior-analyzer ${className}`}>
        <div className="glass-card flex items-center justify-center h-64">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'dark' ? 'border-white/60' : 'border-white/60'}`}></div>
          <span className={`ml-2 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>Loading user behavior data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`user-behavior-analyzer ${className}`}>
        <div className="glass-card text-center p-8">
          <div className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-400'}`}>Failed to Load User Behavior Data</div>
          <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>{error}</p>
          <button
            onClick={loadBehaviorPatterns}
            className="mt-4 px-4 py-2 btn-glass hover:scale-105 transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`user-behavior-analyzer ${className}`}>
      {/* Privacy Notice */}
      {privacyNotice && (
        <div className="glass-panel border-l-4 border-white/40 p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 text-blue-400">🔒</div>
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>
                <strong>Privacy Notice:</strong> {getPrivacyMessage()}
              </p>
            </div>
            <button
              onClick={() => setPrivacyNotice(false)}
              className={`${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'} transition-all duration-300 hover:scale-110`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>User Behavior Analytics</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mt-1`}>
              Privacy-compliant analysis of search patterns and user journeys
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className={`px-3 py-2 border border-white/20 rounded-md text-sm glass ${theme === 'dark' ? 'text-white' : 'text-white/90'} hover:bg-white/20 transition-all duration-300`}
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <button
              onClick={loadBehaviorPatterns}
              className="px-3 py-2 text-sm btn-glass hover:scale-105 transition-all duration-300"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="glass-panel border-b border-white/10">
        <nav className="px-6 -mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'sessions', label: 'Session Analysis', icon: '🔍' },
            { id: 'patterns', label: 'Search Patterns', icon: '🔄' },
            { id: 'insights', label: 'Behavioral Insights', icon: '💡' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedView(tab.id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                selectedView === tab.id
                  ? `border-white/60 ${theme === 'dark' ? 'text-white' : 'text-white'}`
                  : `border-transparent ${theme === 'dark' ? 'text-white/60 hover:text-white/80 hover:border-white/30' : 'text-white/60 hover:text-white/80 hover:border-white/30'}`
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card p-6 rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Total Sessions</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{behaviorStats.totalSessions}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    👥
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Avg Session Duration</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{formatDuration(Math.round(behaviorStats.avgSessionDuration))}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    ⏱️
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Queries per Session</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{behaviorStats.avgQueriesPerSession.toFixed(1)}</p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    🔍
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Success Rate</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                      {Math.round((behaviorStats.successfulSessions / behaviorStats.totalSessions) * 100)}%
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    ✅
                  </div>
                </div>
              </div>
            </div>

            {/* Behavior Summary */}
            <div className="glass-card rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Behavior Summary</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-3`}>Search Patterns</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Refinement Rate:</span>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>{Math.round(behaviorStats.refinementRate * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Abandonment Rate:</span>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>{Math.round(behaviorStats.abandonmentRate * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Successful Sessions:</span>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>{behaviorStats.successfulSessions}/{behaviorStats.totalSessions}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-3`}>Common Search Sequences</h4>
                    <div className="space-y-2">
                      {behaviorStats.commonPatterns.slice(0, 3).map((pattern, index) => (
                        <div key={index} className="text-xs">
                          <div className={`font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{pattern.pattern}</div>
                          <div className={`${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>{pattern.count} occurrences</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'insights' && (
          <div className="space-y-6">
            {insights.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💡</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Behavioral Insights</h3>
                <p className="text-gray-600">
                  User behavior appears normal. More data may be needed for detailed insights.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div key={insight.id} className={`border rounded-lg p-6 ${getInsightColor(insight.type, insight.impact)}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{insight.title}</h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-50">
                            {insight.impact} impact
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-50">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm mb-4">{insight.description}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Recommendations:</h4>
                      <ul className="space-y-1">
                        {insight.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 text-xs opacity-75">
                      Based on {insight.dataPoints} data points
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(selectedView === 'sessions' || selectedView === 'patterns') && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedView === 'sessions' ? 'Session Analysis' : 'Search Patterns'}
            </h3>
            <p className="text-gray-600">
              {selectedView === 'sessions'
                ? 'Detailed session flow analysis will be displayed here'
                : 'Visual search pattern analysis will be displayed here'
              }
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Advanced visualization components needed for this view
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserBehaviorAnalyzer;