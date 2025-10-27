import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  AnalyticsDashboardData,
  AnalyticsFilters,
  RealTimeMetrics,
  SearchAnalyticsConfig
} from '@/types/domain/Analytics';
import { analyticsService } from '@/services/analytics/analyticsService';

interface SearchAnalyticsDashboardProps {
  className?: string;
  defaultTimeRange?: 'today' | 'week' | 'month' | 'quarter';
  showRealTime?: boolean;
}

export const SearchAnalyticsDashboard: React.FC<SearchAnalyticsDashboardProps> = ({
  className = '',
  defaultTimeRange = 'week',
  showRealTime = true,
}) => {
  const { theme } = useTheme();
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardData | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(defaultTimeRange);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'behavior' | 'optimization'>('overview');

  /**
   * Calculate date range based on selection
   */
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();

    switch (selectedTimeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
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
   * Load dashboard data
   */
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await analyticsService.getDashboardData(analyticsFilters);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load real-time metrics
   */
  const loadRealTimeMetrics = async () => {
    if (!showRealTime) return;

    try {
      const metrics = await analyticsService.getRealTimeMetrics();
      setRealTimeMetrics(metrics);
    } catch (err) {
      console.warn('Failed to load real-time metrics:', err);
    }
  };

  /**
   * Export analytics data
   */
  const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
    try {
      const blob = await analyticsService.exportData(analyticsFilters, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `search-analytics-${selectedTimeRange}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  /**
   * Format numbers for display
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  /**
   * Format percentage
   */
  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`;
  };

  /**
   * Format response time
   */
  const formatResponseTime = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms)}ms`;
  };

  useEffect(() => {
    loadDashboardData();
  }, [analyticsFilters]);

  useEffect(() => {
    loadRealTimeMetrics();

    if (showRealTime) {
      const interval = setInterval(loadRealTimeMetrics, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [showRealTime]);

  if (isLoading && !dashboardData) {
    return (
      <div className={`search-analytics-dashboard ${className}`}>
        <div className="glass-card flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40"></div>
          <span className={`ml-2 ${theme === 'dark' ? 'text-white/80' : 'text-gray-600'}`}>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`search-analytics-dashboard ${className}`}>
        <div className="glass-card text-center p-8">
          <div className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Failed to Load Analytics</div>
          <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={loadDashboardData}
            className="btn-glass mt-4 px-4 py-2 text-white hover:scale-105 transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`search-analytics-dashboard ${className}`}>
      {/* Header */}
      <div className="glass-panel border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Search Analytics</h1>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
              Insights and optimization for search performance
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className={`px-3 py-2 border border-white/20 rounded-md text-sm bg-white/10 backdrop-blur-sm ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              } hover:bg-white/20 transition-all duration-300`}
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 90 days</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('csv')}
                className={`px-3 py-2 text-sm ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-800'} hover:scale-105 transition-all duration-300`}
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className={`px-3 py-2 text-sm ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-800'} hover:scale-105 transition-all duration-300`}
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Metrics Bar */}
      {showRealTime && realTimeMetrics && (
        <div className="glass-panel border-b border-white/10 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div>
                <span className={`${theme === 'dark' ? 'text-white/90' : 'text-white/90'} font-medium`}>Live:</span>
                <span className={`ml-1 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{realTimeMetrics.currentActiveUsers} active users</span>
              </div>
              <div>
                <span className={`${theme === 'dark' ? 'text-white/90' : 'text-white/90'} font-medium`}>Last hour:</span>
                <span className={`ml-1 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{realTimeMetrics.searchesInLastHour} searches</span>
              </div>
              <div>
                <span className={`${theme === 'dark' ? 'text-white/90' : 'text-white/90'} font-medium`}>Avg response:</span>
                <span className={`ml-1 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{formatResponseTime(realTimeMetrics.averageResponseTime)}</span>
              </div>
              <div>
                <span className={`${theme === 'dark' ? 'text-white/90' : 'text-white/90'} font-medium`}>Error rate:</span>
                <span className={`ml-1 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{formatPercentage(realTimeMetrics.errorRate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'} text-xs`}>Live data</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="glass-panel border-b border-white/10">
        <nav className="px-6 -mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'performance', label: 'Performance', icon: '⚡' },
            { id: 'behavior', label: 'User Behavior', icon: '👥' },
            { id: 'optimization', label: 'Optimization', icon: '🚀' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                selectedTab === tab.id
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

      {/* Main Content */}
      <div className="p-6">
        {selectedTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-card p-6 rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Total Searches</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{formatNumber(dashboardData.totalSearches)}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    🔍
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Success Rate</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{formatPercentage(dashboardData.successRate)}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    ✅
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Avg Response Time</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{formatResponseTime(dashboardData.averageResponseTime)}</p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    ⚡
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Failed Searches</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{dashboardData.failedSearches.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    ⚠️
                  </div>
                </div>
              </div>
            </div>

            {/* Top Queries */}
            <div className="glass-card rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Top Queries</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData.topQueries.map((query, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-gray-100 rounded text-xs font-medium flex items-center justify-center">
                          {index + 1}
                        </div>
                        <span className={`font-medium ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>{query.query}</span>
                      </div>
                      <div className={`flex items-center gap-4 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                        <span>{formatNumber(query.count)} searches</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          query.successRate >= 0.8 ? 'bg-green-100 text-green-800' :
                          query.successRate >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {formatPercentage(query.successRate)} success
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Behavior Summary */}
            <div className="glass-card rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>User Behavior Summary</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                      {Math.round(dashboardData.userBehaviorSummary.avgSessionDuration / 60)}m
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Avg Session Duration</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                      {dashboardData.userBehaviorSummary.avgQueriesPerSession.toFixed(1)}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Queries per Session</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                      {formatPercentage(dashboardData.userBehaviorSummary.refinementRate)}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Refinement Rate</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                      {formatPercentage(dashboardData.userBehaviorSummary.abandonmentRate)}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Abandonment Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'performance' && dashboardData && (
          <div className="space-y-6">
            {/* Performance Chart Placeholder */}
            <div className="glass-card rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Response Time Trends</h3>
              </div>
              <div className="p-6">
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">📈</div>
                    <p>Performance chart will be rendered here</p>
                    <p className="text-sm">Integration with charting library needed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics Table */}
            <div className="glass-card rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Performance Metrics</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Response
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P95
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P99
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Throughput
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Error Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.performanceMetrics.slice(0, 10).map((metric, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.timestamp.toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatResponseTime(metric.averageResponseTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatResponseTime(metric.p95ResponseTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatResponseTime(metric.p99ResponseTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.throughput.toFixed(1)}/min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            metric.errorRate < 0.01 ? 'bg-green-100 text-green-800' :
                            metric.errorRate < 0.05 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {formatPercentage(metric.errorRate)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'behavior' && dashboardData && (
          <div className="space-y-6">
            {/* Behavior insights placeholder */}
            <div className="glass-card rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Search Patterns</h3>
              </div>
              <div className="p-6">
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-2">👥</div>
                  <p>User behavior analysis will be displayed here</p>
                  <p className="text-sm">Search session flows, refinement patterns, and discovery paths</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'optimization' && dashboardData && (
          <div className="space-y-6">
            {/* Optimization Suggestions */}
            <div className="glass-card rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Optimization Suggestions</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData.optimizationSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                              suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {suggestion.priority} priority
                            </span>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                              {suggestion.type}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{suggestion.description}</h4>
                          <p className="text-sm text-gray-600 mb-2">{suggestion.expectedImpact}</p>
                          <div className="text-xs text-gray-500">
                            Implementation cost: {suggestion.implementationCost}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Recommendations */}
            <div className="glass-card rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Content Recommendations</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData.contentRecommendations.map((recommendation) => (
                    <div key={recommendation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              recommendation.urgency === 'high' ? 'bg-red-100 text-red-800' :
                              recommendation.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {recommendation.urgency} urgency
                            </span>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                              {recommendation.type}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{recommendation.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>
                          <div className="text-xs text-gray-500">
                            Estimated {recommendation.potentialImpact.estimatedQueries} queries affected
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchAnalyticsDashboard;