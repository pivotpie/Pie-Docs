import React, { useState, useEffect, useMemo } from 'react';
import type {
  PopularContent,
  AnalyticsFilters
} from '@/types/domain/Analytics';
import { analyticsService } from '@/services/analytics/analyticsService';
import { useTheme } from '@/contexts/ThemeContext';

interface PopularContentAnalyzerProps {
  className?: string;
  maxItems?: number;
  showTrendingOnly?: boolean;
  showHeatmap?: boolean;
}

export const PopularContentAnalyzer: React.FC<PopularContentAnalyzerProps> = ({
  className = '',
  maxItems = 50,
  showTrendingOnly = false,
  showHeatmap = true,
}) => {
  const { theme } = useTheme();
  const [popularContent, setPopularContent] = useState<PopularContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'heatmap'>('list');
  const [sortBy, setSortBy] = useState<'accessCount' | 'searchCount' | 'trendScore' | 'lastAccessed'>('accessCount');
  const [filterCategory, setFilterCategory] = useState<string>('all');

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
   * Get unique categories
   */
  const categories = useMemo(() => {
    const cats = new Set<string>();
    popularContent.forEach(content => {
      content.categories.forEach(cat => cats.add(cat));
    });
    return Array.from(cats).sort();
  }, [popularContent]);

  /**
   * Filter and sort content
   */
  const filteredAndSortedContent = useMemo(() => {
    let filtered = popularContent;

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(content =>
        content.categories.includes(filterCategory)
      );
    }

    // Filter by trending if enabled
    if (showTrendingOnly) {
      filtered = filtered.filter(content => content.trendDirection === 'up');
    }

    // Sort by selected criteria
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'accessCount':
          return b.accessCount - a.accessCount;
        case 'searchCount':
          return b.searchCount - a.searchCount;
        case 'trendScore':
          const trendScore = (content: PopularContent) => {
            const base = content.accessCount + content.searchCount;
            const multiplier = content.trendDirection === 'up' ? 1.5 :
                            content.trendDirection === 'down' ? 0.5 : 1;
            return base * multiplier;
          };
          return trendScore(b) - trendScore(a);
        case 'lastAccessed':
          return b.lastAccessed.getTime() - a.lastAccessed.getTime();
        default:
          return 0;
      }
    });

    return filtered.slice(0, maxItems);
  }, [popularContent, filterCategory, showTrendingOnly, sortBy, maxItems]);

  /**
   * Calculate statistics
   */
  const statistics = useMemo(() => {
    const totalAccess = popularContent.reduce((sum, content) => sum + content.accessCount, 0);
    const totalSearches = popularContent.reduce((sum, content) => sum + content.searchCount, 0);
    const trendingUp = popularContent.filter(content => content.trendDirection === 'up').length;
    const trendingDown = popularContent.filter(content => content.trendDirection === 'down').length;

    return {
      totalAccess,
      totalSearches,
      totalDocuments: popularContent.length,
      trendingUp,
      trendingDown,
      avgAccessPerDoc: totalAccess / (popularContent.length || 1),
      avgSearchPerDoc: totalSearches / (popularContent.length || 1),
    };
  }, [popularContent]);

  /**
   * Load popular content data
   */
  const loadPopularContent = async () => {
    try {
      setIsLoading(true);
      const data = await analyticsService.getPopularContent(analyticsFilters);
      setPopularContent(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load popular content data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export content data
   */
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await analyticsService.exportData(analyticsFilters, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `popular-content-${selectedTimeRange}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export popular content:', err);
    }
  };

  /**
   * Format number with commas
   */
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  /**
   * Get trend icon and color
   */
  const getTrendDisplay = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return { icon: '📈', color: theme === 'dark' ? 'text-green-400' : '${theme === 'dark' ? 'text-green-400' : 'text-green-500'}', bg: 'glass-panel' };
      case 'down':
        return { icon: '📉', color: theme === 'dark' ? 'text-red-400' : '${theme === 'dark' ? 'text-red-400' : 'text-red-500'}', bg: 'glass-panel' };
      default:
        return { icon: '➡️', color: theme === 'dark' ? 'text-white/70' : 'text-white/70', bg: 'glass-panel' };
    }
  };

  /**
   * Get relative time string
   */
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  useEffect(() => {
    loadPopularContent();
  }, [analyticsFilters]);

  if (isLoading && popularContent.length === 0) {
    return (
      <div className={`popular-content-analyzer ${className}`}>
        <div className={`flex items-center justify-center h-64`}>
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600`}></div>
          <span className={`ml-2 ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Loading popular content data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`popular-content-analyzer ${className}`}>
        <div className={`text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-500'} p-8`}>
          <div className={`text-lg font-semibold mb-2`}>Failed to Load Data</div>
          <p className={`text-sm`}>{error}</p>
          <button
            onClick={loadPopularContent}
            className={`mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`popular-content-analyzer ${className}`}>
      {/* Header */}
      <div className={`glass-card border-b border-white/10 px-6 py-4`}>
        <div className={`flex items-center justify-between`}>
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Popular Content Analytics</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mt-1`}>
              Track document usage and identify trending content
            </p>
          </div>
          <div className={`flex items-center gap-4`}>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className={`px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="day`}>Last 24 Hours</option>
              <option value="week`}>Last 7 Days</option>
              <option value="month`}>Last 30 Days</option>
              <option value="quarter`}>Last 90 Days</option>
            </select>
            <div className={`flex items-center gap-2`}>
              <button
                onClick={() => handleExport('csv')}
                className={`px-3 py-2 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} hover:text-white/90 transition-all duration-300 hover:scale-105"
              >
                Export CSV
              </button>
              <button
                onClick={loadPopularContent}
                className={`px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className={`glass-panel border-b border-white/10 px-6 py-4`}>
        <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4`}>
          <div className={`text-center`}>
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{formatNumber(statistics.totalDocuments)}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Documents</div>
          </div>
          <div className={`text-center`}>
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{formatNumber(statistics.totalAccess)}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Total Access</div>
          </div>
          <div className={`text-center`}>
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{formatNumber(statistics.totalSearches)}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Total Searches</div>
          </div>
          <div className={`text-center`}>
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`}>{statistics.trendingUp}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Trending Up</div>
          </div>
          <div className={`text-center`}>
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>{statistics.trendingDown}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Trending Down</div>
          </div>
          <div className={`text-center`}>
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{Math.round(statistics.avgAccessPerDoc)}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Avg Access/Doc</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`glass-card border-b border-white/10 px-6 py-3`}>
        <div className={`flex items-center justify-between`}>
          <div className={`flex items-center gap-4`}>
            <div className={`flex items-center gap-2`}>
              <label className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Category:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`px-2 py-1 glass-panel border border-white/20 rounded text-sm transition-all duration-300 hover:scale-105"
              >
                <option value="all`}>All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className={`flex items-center gap-2`}>
              <label className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`px-2 py-1 glass-panel border border-white/20 rounded text-sm transition-all duration-300 hover:scale-105"
              >
                <option value="accessCount`}>Access Count</option>
                <option value="searchCount`}>Search Count</option>
                <option value="trendScore`}>Trend Score</option>
                <option value="lastAccessed`}>Last Accessed</option>
              </select>
            </div>
            <label className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              <input
                type="checkbox"
                checked={showTrendingOnly}
                onChange={(e) => setFilterCategory('all')} // Reset category when toggling trending
                className={`rounded"
              />
              Trending only
            </label>
          </div>
          <div className={`flex items-center gap-2`}>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'list' ? 'glass-panel text-blue-400' : '${theme === 'dark' ? 'text-white/70' : 'text-white/70'}'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'glass-panel text-blue-400' : '${theme === 'dark' ? 'text-white/70' : 'text-white/70'}'}`}
            >
              Grid
            </button>
            {showHeatmap && (
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1 text-sm rounded ${viewMode === 'heatmap' ? 'glass-panel text-blue-400' : '${theme === 'dark' ? 'text-white/70' : 'text-white/70'}'}`}
              >
                Heatmap
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Display */}
      <div className={`p-6`}>
        {filteredAndSortedContent.length === 0 ? (
          <div className={`text-center py-12`}>
            <div className={`text-4xl mb-4`}>📄</div>
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-2`}>No Popular Content Found</h3>
            <p className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              {showTrendingOnly
                ? 'No trending content found for the selected filters.'
                : 'No content data available for the selected time period.'
              }
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <div className={`space-y-4`}>
                {filteredAndSortedContent.map((content, index) => {
                  const trend = getTrendDisplay(content.trendDirection);
                  return (
                    <div key={content.documentId} className={`glass-card border border-white/10 rounded-lg p-4`}>
                      <div className={`flex items-start justify-between`}>
                        <div className={`flex-1`}>
                          <div className={`flex items-center gap-3 mb-2`}>
                            <div className={`w-6 h-6 glass-panel rounded text-xs font-medium flex items-center justify-center`}>
                              {index + 1}
                            </div>
                            <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} text-lg`}>{content.title}</h3>
                            <div className={`px-2 py-1 rounded-full ${trend.bg} ${trend.color} text-xs font-medium flex items-center gap-1`}>
                              <span>{trend.icon}</span>
                              {content.trendDirection}
                            </div>
                          </div>

                          <div className={`flex items-center gap-6 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mb-2`}>
                            <span>📊 {formatNumber(content.accessCount)} accesses</span>
                            <span>🔍 {formatNumber(content.searchCount)} searches</span>
                            <span>🕒 {getRelativeTime(content.lastAccessed)}</span>
                          </div>

                          <div className={`flex flex-wrap gap-2`}>
                            {content.categories.map(category => (
                              <span
                                key={category}
                                className={`px-2 py-1 glass-panel ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} rounded text-xs"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className={`text-right ml-4`}>
                          <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                            {formatNumber(content.accessCount + content.searchCount)}
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/60'} uppercase tracking-wide`}>
                            Total Activity
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'grid' && (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
                {filteredAndSortedContent.map((content, index) => {
                  const trend = getTrendDisplay(content.trendDirection);
                  return (
                    <div key={content.documentId} className={`glass-card border border-white/10 rounded-lg p-4`}>
                      <div className={`flex items-center gap-2 mb-3`}>
                        <div className={`w-6 h-6 glass-panel rounded text-xs font-medium flex items-center justify-center`}>
                          {index + 1}
                        </div>
                        <div className={`px-2 py-1 rounded-full ${trend.bg} ${trend.color} text-xs font-medium`}>
                          {trend.icon}
                        </div>
                      </div>

                      <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-2 line-clamp-2`}>{content.title}</h3>

                      <div className={`space-y-2 mb-3`}>
                        <div className={`flex justify-between text-sm`}>
                          <span className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Accesses:</span>
                          <span className={`font-medium`}>{formatNumber(content.accessCount)}</span>
                        </div>
                        <div className={`flex justify-between text-sm`}>
                          <span className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Searches:</span>
                          <span className={`font-medium`}>{formatNumber(content.searchCount)}</span>
                        </div>
                      </div>

                      <div className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/60'} mb-2`}>
                        {getRelativeTime(content.lastAccessed)}
                      </div>

                      <div className={`flex flex-wrap gap-1`}>
                        {content.categories.slice(0, 2).map(category => (
                          <span
                            key={category}
                            className={`px-2 py-1 glass-panel ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} rounded text-xs"
                          >
                            {category}
                          </span>
                        ))}
                        {content.categories.length > 2 && (
                          <span className={`px-2 py-1 glass-panel ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} rounded text-xs`}>
                            +{content.categories.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'heatmap' && (
              <div className={`bg-white rounded-lg border border-gray-200`}>
                <div className={`p-6`}>
                  <div className={`text-center ${theme === 'dark' ? 'text-white/60' : 'text-white/60'} py-12`}>
                    <div className={`text-4xl mb-2`}>🗺️</div>
                    <p>Content usage heatmap will be rendered here</p>
                    <p className={`text-sm`}>Integration with visualization library needed</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PopularContentAnalyzer;