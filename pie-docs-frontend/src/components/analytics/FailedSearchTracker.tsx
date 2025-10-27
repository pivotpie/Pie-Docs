import React, { useState, useEffect, useMemo } from 'react';
import type {
  FailedSearchMetrics,
  AnalyticsFilters,
  SearchAnalyticsConfig
} from '@/types/domain/Analytics';
import { analyticsService } from '@/services/analytics/analyticsService';
import { useTheme } from '@/contexts/ThemeContext';

interface FailedSearchTrackerProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
  showAlerts?: boolean;
}

export const FailedSearchTracker: React.FC<FailedSearchTrackerProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 300, // 5 minutes
  showAlerts = true,
}) => {
  const { theme } = useTheme();
  const [failedSearches, setFailedSearches] = useState<FailedSearchMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [sortBy, setSortBy] = useState<'count' | 'lastOccurrence' | 'query'>('count');
  const [alertThreshold, setAlertThreshold] = useState(10);

  /**
   * Calculate date range based on selection
   */
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();

    switch (selectedTimeRange) {
      case 'hour':
        start.setHours(now.getHours() - 1);
        break;
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
    successOnly: false,
  }), [dateRange]);

  /**
   * Sort failed searches by selected criteria
   */
  const sortedFailedSearches = useMemo(() => {
    return [...failedSearches].sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return b.count - a.count;
        case 'lastOccurrence':
          return b.lastOccurrence.getTime() - a.lastOccurrence.getTime();
        case 'query':
          return a.query.localeCompare(b.query);
        default:
          return 0;
      }
    });
  }, [failedSearches, sortBy]);

  /**
   * Get high-priority failed searches (above threshold)
   */
  const highPriorityFailures = useMemo(() => {
    return sortedFailedSearches.filter(search => search.count >= alertThreshold);
  }, [sortedFailedSearches, alertThreshold]);

  /**
   * Load failed search metrics
   */
  const loadFailedSearches = async () => {
    try {
      setIsLoading(true);
      const data = await analyticsService.getFailedSearchMetrics(analyticsFilters);
      setFailedSearches(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load failed search metrics');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export failed searches data
   */
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await analyticsService.exportData(analyticsFilters, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `failed-searches-${selectedTimeRange}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export failed searches:', err);
    }
  };

  /**
   * Format relative time
   */
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return date.toLocaleDateString();
  };

  /**
   * Get priority color based on failure count
   */
  const getPriorityColor = (count: number): string => {
    if (count >= alertThreshold * 2) return `glass-panel ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} border-red-400/30`;
    if (count >= alertThreshold) return `glass-panel ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} border-yellow-400/30`;
    return `glass-panel ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} border-white/20`;
  };

  useEffect(() => {
    loadFailedSearches();
  }, [analyticsFilters]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(loadFailedSearches, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, analyticsFilters]);

  if (isLoading && failedSearches.length === 0) {
    return (
      <div className={`failed-search-tracker ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400"></div>
          <span className={`ml-2 ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Loading failed search data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`failed-search-tracker ${className}`}>
        <div className={`text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-500'} p-8`}>
          <div className="text-lg font-semibold mb-2">Failed to Load Data</div>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadFailedSearches}
            className="mt-4 px-4 py-2 glass-card text-red-400 rounded hover:scale-105 transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`failed-search-tracker ${className}`}>
      {/* Header */}
      <div className="glass-card border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Failed Search Tracker</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mt-1`}>
              Monitor zero-result queries and identify content gaps
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Alert threshold:</label>
              <input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-16 px-2 py-1 glass-panel border border-white/20 rounded text-sm transition-all duration-300 hover:scale-105"
                min="1"
              />
            </div>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-2 glass-panel border border-white/20 rounded-md text-sm transition-all duration-300 hover:scale-105"
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('csv')}
                className={`px-3 py-2 text-sm ${theme === 'dark' ? 'text-white/70 hover:text-white/90' : 'text-white/70 hover:text-white/90'} transition-all duration-300 hover:scale-105`}
              >
                Export CSV
              </button>
              <button
                onClick={loadFailedSearches}
                className="px-3 py-2 text-sm glass-card text-blue-400 rounded hover:scale-105 transition-all duration-300"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Summary */}
      {showAlerts && highPriorityFailures.length > 0 && (
        <div className="glass-panel border-b border-red-400/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 glass-panel rounded-full flex items-center justify-center">
                ⚠️
              </div>
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                {highPriorityFailures.length} High-Priority Failed Searches
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-red-400/80' : 'text-red-600/80'}`}>
                These queries have failed {alertThreshold}+ times and may indicate content gaps
              </p>
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
              Total failures: {highPriorityFailures.reduce((sum, item) => sum + item.count, 0)}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="glass-panel border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 glass-panel border border-white/20 rounded text-sm transition-all duration-300 hover:scale-105"
              >
                <option value="count">Failure Count</option>
                <option value="lastOccurrence">Last Occurrence</option>
                <option value="query">Query Text</option>
              </select>
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              {sortedFailedSearches.length} failed queries found
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              {autoRefresh ? `Auto-refresh ${refreshInterval}s` : 'Manual refresh'}
            </span>
          </div>
        </div>
      </div>

      {/* Failed Searches List */}
      <div className="p-6">
        {sortedFailedSearches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-2`}>No Failed Searches</h3>
            <p className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>All searches in this time period returned results!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedFailedSearches.map((failedSearch, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getPriorityColor(failedSearch.count)} hover:scale-[1.02] transition-all duration-300`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} text-lg`}>
                        "{failedSearch.query}"
                      </h4>
                      <span className="px-2 py-1 glass-card rounded-full text-xs font-medium">
                        {failedSearch.count} failures
                      </span>
                    </div>

                    <div className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mb-3`}>
                      Last occurred: {formatRelativeTime(failedSearch.lastOccurrence)}
                    </div>

                    {/* Suggested Solutions */}
                    {failedSearch.suggestedSolutions.length > 0 && (
                      <div className="mb-3">
                        <h5 className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>Suggested Solutions:</h5>
                        <ul className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} space-y-1`}>
                          {failedSearch.suggestedSolutions.map((solution, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} mt-1`}>•</span>
                              {solution}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Related Successful Queries */}
                    {failedSearch.relatedSuccessfulQueries.length > 0 && (
                      <div>
                        <h5 className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>Related Successful Queries:</h5>
                        <div className="flex flex-wrap gap-2">
                          {failedSearch.relatedSuccessfulQueries.map((query, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 glass-panel ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} rounded text-xs`}
                            >
                              "{query}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                        {failedSearch.count}
                      </div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/60'} uppercase tracking-wide`}>
                        Failures
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FailedSearchTracker;