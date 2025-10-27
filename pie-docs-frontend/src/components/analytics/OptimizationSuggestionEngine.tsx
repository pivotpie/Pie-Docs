import React, { useState, useEffect, useMemo } from 'react';
import type {
  OptimizationSuggestion,
  AnalyticsFilters,
  FailedSearchMetrics,
  PopularContent
} from '@/types/domain/Analytics';
import { analyticsService } from '@/services/analytics/analyticsService';
import { useTheme } from '@/contexts/ThemeContext';

interface OptimizationSuggestionEngineProps {
  className?: string;
  autoGenerateInsights?: boolean;
  maxSuggestions?: number;
  enableImplementationTracking?: boolean;
}

interface ImplementationStatus {
  suggestionId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  notes?: string;
  implementationDate?: Date;
  estimatedEffort?: 'low' | 'medium' | 'high';
}

export const OptimizationSuggestionEngine: React.FC<OptimizationSuggestionEngineProps> = ({
  className = '',
  autoGenerateInsights = true,
  maxSuggestions = 20,
  enableImplementationTracking = true,
}) => {
  const { theme } = useTheme();
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [implementationStatus, setImplementationStatus] = useState<ImplementationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterType, setFilterType] = useState<'all' | 'tagging' | 'organization' | 'content' | 'search-config'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'cost' | 'implementation'>('priority');

  /**
   * Calculate date range based on selection
   */
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();

    switch (selectedTimeRange) {
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
   * Filter and sort suggestions
   */
  const filteredAndSortedSuggestions = useMemo(() => {
    let filtered = suggestions;

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(suggestion => suggestion.priority === filterPriority);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(suggestion => suggestion.type === filterType);
    }

    // Sort suggestions
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'impact':
          // Sort by expected impact (extracting numbers from impact description)
          const extractImpactValue = (impact: string) => {
            const match = impact.match(/(\d+)%/);
            return match ? parseInt(match[1]) : 0;
          };
          return extractImpactValue(b.expectedImpact) - extractImpactValue(a.expectedImpact);
        case 'cost':
          const costOrder = { low: 1, medium: 2, high: 3 };
          return costOrder[a.implementationCost] - costOrder[b.implementationCost];
        case 'implementation':
          // Sort by implementation status
          const getStatusOrder = (id: string) => {
            const status = implementationStatus.find(s => s.suggestionId === id);
            const order = { pending: 1, 'in-progress': 2, completed: 4, dismissed: 3 };
            return order[status?.status || 'pending'];
          };
          return getStatusOrder(a.id) - getStatusOrder(b.id);
        default:
          return 0;
      }
    });

    return filtered.slice(0, maxSuggestions);
  }, [suggestions, filterPriority, filterType, sortBy, maxSuggestions, implementationStatus]);

  /**
   * Calculate statistics
   */
  const statistics = useMemo(() => {
    const totalSuggestions = suggestions.length;
    const highPriority = suggestions.filter(s => s.priority === 'high').length;
    const mediumPriority = suggestions.filter(s => s.priority === 'medium').length;
    const lowPriority = suggestions.filter(s => s.priority === 'low').length;

    const implemented = implementationStatus.filter(s => s.status === 'completed').length;
    const inProgress = implementationStatus.filter(s => s.status === 'in-progress').length;
    const pending = implementationStatus.filter(s => s.status === 'pending').length;

    const estimatedImpact = suggestions.reduce((sum, suggestion) => {
      const match = suggestion.expectedImpact.match(/(\d+)%/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);

    return {
      totalSuggestions,
      highPriority,
      mediumPriority,
      lowPriority,
      implemented,
      inProgress,
      pending,
      estimatedImpact,
      implementationRate: totalSuggestions > 0 ? implemented / totalSuggestions : 0,
    };
  }, [suggestions, implementationStatus]);

  /**
   * Load optimization suggestions
   */
  const loadOptimizationSuggestions = async () => {
    try {
      setIsLoading(true);
      const data = await analyticsService.getOptimizationSuggestions(analyticsFilters);
      setSuggestions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load optimization suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update implementation status
   */
  const updateImplementationStatus = (suggestionId: string, status: ImplementationStatus) => {
    setImplementationStatus(prev => {
      const existing = prev.findIndex(s => s.suggestionId === suggestionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = status;
        return updated;
      }
      return [...prev, status];
    });
  };

  /**
   * Get status for suggestion
   */
  const getSuggestionStatus = (suggestionId: string): ImplementationStatus | undefined => {
    return implementationStatus.find(s => s.suggestionId === suggestionId);
  };

  /**
   * Get priority color
   */
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return `glass-panel ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} border-red-400/30`;
      case 'medium':
        return `glass-panel ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} border-yellow-400/30`;
      case 'low':
        return `glass-panel ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} border-green-400/30`;
      default:
        return `glass-panel ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} border-white/20`;
    }
  };

  /**
   * Get implementation cost color
   */
  const getCostColor = (cost: string): string => {
    switch (cost) {
      case 'high':
        return theme === 'dark' ? 'text-red-400' : 'text-red-600';
      case 'medium':
        return theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600';
      case 'low':
        return theme === 'dark' ? 'text-green-400' : 'text-green-600';
      default:
        return theme === 'dark' ? 'text-white/70' : 'text-white/70';
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return `glass-panel ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`;
      case 'in-progress':
        return `glass-panel ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`;
      case 'dismissed':
        return `glass-panel ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`;
      default:
        return `glass-panel ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`;
    }
  };

  /**
   * Export suggestions
   */
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const dataToExport = {
        suggestions: filteredAndSortedSuggestions,
        implementationStatus,
        statistics,
        generatedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `optimization-suggestions-${selectedTimeRange}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export suggestions:', err);
    }
  };

  useEffect(() => {
    loadOptimizationSuggestions();
  }, [analyticsFilters]);

  if (isLoading && suggestions.length === 0) {
    return (
      <div className={`optimization-suggestion-engine ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className={`ml-2 ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Generating optimization suggestions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`optimization-suggestion-engine ${className}`}>
        <div className={`text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-500'} p-8`}>
          <div className="text-lg font-semibold mb-2">Failed to Load Suggestions</div>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadOptimizationSuggestions}
            className="mt-4 px-4 py-2 glass-card text-red-400 rounded hover:scale-105 transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`optimization-suggestion-engine ${className}`}>
      {/* Header */}
      <div className="glass-card border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Search Optimization Engine</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mt-1`}>
              AI-powered suggestions for improving search performance and user experience
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-2 glass-panel border border-white/20 rounded-md text-sm transition-all duration-300 hover:scale-105"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('json')}
                className={`px-3 py-2 text-sm ${theme === 'dark' ? 'text-white/70 hover:text-white/90' : 'text-white/70 hover:text-white/90'} transition-all duration-300 hover:scale-105`}
              >
                Export JSON
              </button>
              <button
                onClick={loadOptimizationSuggestions}
                className="px-3 py-2 text-sm glass-card text-blue-400 rounded hover:scale-105 transition-all duration-300"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="glass-panel border-b border-white/10 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="text-center">
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{statistics.totalSuggestions}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Total Suggestions</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>{statistics.highPriority}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>High Priority</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`}>{statistics.mediumPriority}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Medium Priority</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`}>{statistics.lowPriority}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Low Priority</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`}>{statistics.implemented}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Implemented</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>{statistics.inProgress}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>In Progress</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{statistics.pending}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Pending</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>{Math.round(statistics.implementationRate * 100)}%</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Implementation Rate</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Priority:</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="px-2 py-1 glass-panel border border-white/20 rounded text-sm transition-all duration-300 hover:scale-105"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-2 py-1 glass-panel border border-white/20 rounded text-sm transition-all duration-300 hover:scale-105"
              >
                <option value="all">All Types</option>
                <option value="tagging">Tagging</option>
                <option value="organization">Organization</option>
                <option value="content">Content</option>
                <option value="search-config">Search Config</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 glass-panel border border-white/20 rounded text-sm transition-all duration-300 hover:scale-105"
              >
                <option value="priority">Priority</option>
                <option value="impact">Expected Impact</option>
                <option value="cost">Implementation Cost</option>
                <option value="implementation">Implementation Status</option>
              </select>
            </div>
          </div>
          <div className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
            Showing {filteredAndSortedSuggestions.length} of {suggestions.length} suggestions
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="p-6">
        {filteredAndSortedSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-2`}>No Optimization Suggestions</h3>
            <p className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              Your search system is performing well! Check back later for new optimization opportunities.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedSuggestions.map((suggestion) => {
              const status = getSuggestionStatus(suggestion.id);
              return (
                <div key={suggestion.id} className="glass-card border border-white/10 rounded-lg p-6 hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{suggestion.description}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                          {suggestion.priority} priority
                        </span>
                        <span className={`px-2 py-1 glass-panel ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} rounded text-xs font-medium uppercase`}>
                          {suggestion.type}
                        </span>
                      </div>

                      <div className={`flex items-center gap-6 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mb-3`}>
                        <span>💫 {suggestion.expectedImpact}</span>
                        <span className={`${getCostColor(suggestion.implementationCost)}`}>
                          💰 {suggestion.implementationCost} cost
                        </span>
                        <span>📊 {suggestion.supportingData.queries.length} related queries</span>
                      </div>

                      {/* Supporting Data */}
                      <div className="mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-2`}>Related Queries:</h5>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.supportingData.queries.slice(0, 5).map((query, index) => (
                                <span
                                  key={index}
                                  className={`px-2 py-1 glass-panel ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} rounded text-xs`}
                                >
                                  "{query}"
                                </span>
                              ))}
                              {suggestion.supportingData.queries.length > 5 && (
                                <span className={`px-2 py-1 glass-panel ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} rounded text-xs`}>
                                  +{suggestion.supportingData.queries.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <h5 className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-2`}>Metrics:</h5>
                            <div className="space-y-1">
                              {Object.entries(suggestion.supportingData.metrics).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-xs">
                                  <span className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>{key}:</span>
                                  <span className="font-medium">
                                    {typeof value === 'number' && value < 1
                                      ? `${Math.round(value * 100)}%`
                                      : value
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Implementation Status */}
                      {enableImplementationTracking && (
                        <div className="flex items-center gap-4">
                          <span className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Status:</span>
                          <select
                            value={status?.status || 'pending'}
                            onChange={(e) => updateImplementationStatus(suggestion.id, {
                              suggestionId: suggestion.id,
                              status: e.target.value as any,
                              ...status,
                            })}
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status?.status || 'pending')}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="dismissed">Dismissed</option>
                          </select>
                          {status?.assignedTo && (
                            <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                              Assigned to: {status.assignedTo}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizationSuggestionEngine;