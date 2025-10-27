import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  ContentRecommendation,
  AnalyticsFilters,
  FailedSearchMetrics
} from '@/types/domain/Analytics';
import { analyticsService } from '@/services/analytics/analyticsService';

interface ContentRecommendationEngineProps {
  className?: string;
  maxRecommendations?: number;
  showContentPlanning?: boolean;
  enableWorkflowIntegration?: boolean;
}

interface ContentPlanningItem {
  id: string;
  recommendationId: string;
  title: string;
  description: string;
  estimatedEffort: 'small' | 'medium' | 'large';
  targetDate: Date;
  assignedTo?: string;
  status: 'planned' | 'in-progress' | 'review' | 'published' | 'cancelled';
  priority: number;
  expectedImpact: {
    searchQueries: number;
    userSatisfaction: number;
  };
}

export const ContentRecommendationEngine: React.FC<ContentRecommendationEngineProps> = ({
  className = '',
  maxRecommendations = 25,
  showContentPlanning = true,
  enableWorkflowIntegration = true,
}) => {
  const { theme } = useTheme();
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [contentPlan, setContentPlan] = useState<ContentPlanningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterType, setFilterType] = useState<'all' | 'create' | 'acquire' | 'improve'>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'impact' | 'gaps' | 'date'>('urgency');
  const [selectedView, setSelectedView] = useState<'recommendations' | 'planning' | 'insights'>('recommendations');

  /**
   * Calculate date range based on selection
   */
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();

    switch (selectedTimeRange) {
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
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
   * Filter and sort recommendations
   */
  const filteredAndSortedRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Filter by urgency
    if (filterUrgency !== 'all') {
      filtered = filtered.filter(rec => rec.urgency === filterUrgency);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(rec => rec.type === filterType);
    }

    // Sort recommendations
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'urgency':
          const urgencyOrder = { high: 3, medium: 2, low: 1 };
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        case 'impact':
          return b.potentialImpact.estimatedQueries - a.potentialImpact.estimatedQueries;
        case 'gaps':
          return b.searchGaps.length - a.searchGaps.length;
        case 'date':
          return new Date(b.id).getTime() - new Date(a.id).getTime();
        default:
          return 0;
      }
    });

    return filtered.slice(0, maxRecommendations);
  }, [recommendations, filterUrgency, filterType, sortBy, maxRecommendations]);

  /**
   * Calculate statistics
   */
  const statistics = useMemo(() => {
    const totalRecommendations = recommendations.length;
    const highUrgency = recommendations.filter(r => r.urgency === 'high').length;
    const mediumUrgency = recommendations.filter(r => r.urgency === 'medium').length;
    const lowUrgency = recommendations.filter(r => r.urgency === 'low').length;

    const createRecommendations = recommendations.filter(r => r.type === 'create').length;
    const acquireRecommendations = recommendations.filter(r => r.type === 'acquire').length;
    const improveRecommendations = recommendations.filter(r => r.type === 'improve').length;

    const totalEstimatedQueries = recommendations.reduce((sum, r) => sum + r.potentialImpact.estimatedQueries, 0);
    const avgUserSatisfaction = recommendations.reduce((sum, r) => sum + r.potentialImpact.userSatisfaction, 0) / (recommendations.length || 1);

    const plannedItems = contentPlan.filter(p => p.status === 'planned').length;
    const inProgressItems = contentPlan.filter(p => p.status === 'in-progress').length;
    const publishedItems = contentPlan.filter(p => p.status === 'published').length;

    return {
      totalRecommendations,
      highUrgency,
      mediumUrgency,
      lowUrgency,
      createRecommendations,
      acquireRecommendations,
      improveRecommendations,
      totalEstimatedQueries,
      avgUserSatisfaction,
      plannedItems,
      inProgressItems,
      publishedItems,
    };
  }, [recommendations, contentPlan]);

  /**
   * Load content recommendations
   */
  const loadContentRecommendations = async () => {
    try {
      setIsLoading(true);
      const data = await analyticsService.getContentRecommendations(analyticsFilters);
      setRecommendations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add recommendation to content plan
   */
  const addToContentPlan = (recommendation: ContentRecommendation) => {
    const newPlanItem: ContentPlanningItem = {
      id: `plan-${Date.now()}`,
      recommendationId: recommendation.id,
      title: recommendation.suggestedContent.title,
      description: recommendation.description,
      estimatedEffort: 'medium',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'planned',
      priority: recommendation.urgency === 'high' ? 3 : recommendation.urgency === 'medium' ? 2 : 1,
      expectedImpact: recommendation.potentialImpact,
    };

    setContentPlan(prev => [...prev, newPlanItem]);
  };

  /**
   * Update content plan item
   */
  const updateContentPlanItem = (id: string, updates: Partial<ContentPlanningItem>) => {
    setContentPlan(prev =>
      prev.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  };

  /**
   * Remove from content plan
   */
  const removeFromContentPlan = (id: string) => {
    setContentPlan(prev => prev.filter(item => item.id !== id));
  };

  /**
   * Get urgency color
   */
  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'glass-panel text-white/80 border-white/20';
    }
  };

  /**
   * Get type icon
   */
  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'create':
        return '✏️';
      case 'acquire':
        return '📥';
      case 'improve':
        return '🔧';
      default:
        return '📄';
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'review':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'planned':
        return 'glass-panel text-white/80';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'glass-panel text-white/80';
    }
  };

  /**
   * Export recommendations
   */
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const dataToExport = {
        recommendations: filteredAndSortedRecommendations,
        contentPlan,
        statistics,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `content-recommendations-${selectedTimeRange}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export recommendations:', err);
    }
  };

  useEffect(() => {
    loadContentRecommendations();
  }, [analyticsFilters]);

  if (isLoading && recommendations.length === 0) {
    return (
      <div className={`content-recommendation-engine ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Analyzing content gaps...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`content-recommendation-engine ${className}`}>
        <div className="text-center text-red-600 p-8">
          <div className="text-lg font-semibold mb-2">Failed to Load Recommendations</div>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadContentRecommendations}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`content-recommendation-engine ${className}`}>
      {/* Header */}
      <div className="glass-card border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Content Recommendation Engine</h2>
            <p className="text-sm text-gray-600 mt-1">
              Data-driven content suggestions based on search gaps and user needs
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('json')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Export JSON
              </button>
              <button
                onClick={loadContentRecommendations}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="glass-panel border-b border-white/10 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{statistics.totalRecommendations}</div>
            <div className="text-xs text-gray-600">Total Recommendations</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{statistics.highUrgency}</div>
            <div className="text-xs text-gray-600">High Urgency</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{statistics.createRecommendations}</div>
            <div className="text-xs text-gray-600">Create Content</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{statistics.acquireRecommendations}</div>
            <div className="text-xs text-gray-600">Acquire Content</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">{statistics.improveRecommendations}</div>
            <div className="text-xs text-gray-600">Improve Content</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{statistics.totalEstimatedQueries}</div>
            <div className="text-xs text-gray-600">Est. Queries Affected</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{Math.round(statistics.avgUserSatisfaction * 100)}%</div>
            <div className="text-xs text-gray-600">Avg Expected Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{statistics.plannedItems}</div>
            <div className="text-xs text-gray-600">In Content Plan</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="glass-card border-b border-white/10">
        <nav className="px-6 -mb-px flex space-x-8">
          {[
            { id: 'recommendations', label: 'Recommendations', icon: '💡' },
            { id: 'planning', label: 'Content Planning', icon: '📋' },
            { id: 'insights', label: 'Gap Analysis', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedView(tab.id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        {selectedView === 'recommendations' && (
          <>
            {/* Filters */}
            <div className="glass-card border border-white/10 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Urgency:</label>
                    <select
                      value={filterUrgency}
                      onChange={(e) => setFilterUrgency(e.target.value as any)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="all">All Urgency</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Type:</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="create">Create</option>
                      <option value="acquire">Acquire</option>
                      <option value="improve">Improve</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="urgency">Urgency</option>
                      <option value="impact">Expected Impact</option>
                      <option value="gaps">Search Gaps</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredAndSortedRecommendations.length} recommendations
                </div>
              </div>
            </div>

            {/* Recommendations List */}
            {filteredAndSortedRecommendations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Recommendations</h3>
                <p className="text-gray-600">
                  Your content library appears to be comprehensive! New recommendations will appear as search patterns evolve.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredAndSortedRecommendations.map((recommendation) => (
                  <div key={recommendation.id} className="glass-card border border-white/10 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getTypeIcon(recommendation.type)}</span>
                          <h3 className="font-semibold text-lg text-gray-900">{recommendation.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(recommendation.urgency)}`}>
                            {recommendation.urgency} urgency
                          </span>
                          <span className="px-2 py-1 glass-panel text-white/80 rounded text-xs font-medium uppercase">
                            {recommendation.type}
                          </span>
                        </div>

                        <p className="text-gray-700 mb-4">{recommendation.description}</p>

                        {/* Suggested Content Details */}
                        <div className="glass-panel rounded-lg p-4 mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Suggested Content:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <span className="text-sm text-gray-600">Title:</span>
                              <p className="font-medium">{recommendation.suggestedContent.title}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Format:</span>
                              <p className="font-medium">{recommendation.suggestedContent.format}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Topics:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {recommendation.suggestedContent.topics.map((topic, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Search Gaps */}
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Search Gaps Addressed:</h5>
                          <div className="flex flex-wrap gap-2">
                            {recommendation.searchGaps.map((gap, index) => (
                              <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                "{gap}"
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Impact Metrics */}
                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                          <span>📊 {recommendation.potentialImpact.estimatedQueries} queries affected</span>
                          <span>😊 {Math.round(recommendation.potentialImpact.userSatisfaction * 100)}% satisfaction increase</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        {showContentPlanning && (
                          <button
                            onClick={() => addToContentPlan(recommendation)}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Add to Content Plan
                          </button>
                        )}
                        <button className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
                          View Details
                        </button>
                        <button className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
                          Dismiss
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Priority Score: {recommendation.urgency === 'high' ? '90-100' : recommendation.urgency === 'medium' ? '70-89' : '50-69'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selectedView === 'planning' && showContentPlanning && (
          <div className="space-y-6">
            {contentPlan.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Planned</h3>
                <p className="text-gray-600">
                  Add recommendations to your content plan to track progress and manage content creation workflow.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {contentPlan.map((item) => (
                  <div key={item.id} className="glass-card border border-white/10 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="px-2 py-1 glass-panel text-white/80 rounded text-xs font-medium">
                            {item.estimatedEffort} effort
                          </span>
                        </div>

                        <p className="text-gray-700 mb-4">{item.description}</p>

                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <span>📅 Target: {item.targetDate.toLocaleDateString()}</span>
                          {item.assignedTo && <span>👤 Assigned: {item.assignedTo}</span>}
                          <span>📈 Impact: {item.expectedImpact.searchQueries} queries</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={item.status}
                          onChange={(e) => updateContentPlanItem(item.id, { status: e.target.value as any })}
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}
                        >
                          <option value="planned">Planned</option>
                          <option value="in-progress">In Progress</option>
                          <option value="review">In Review</option>
                          <option value="published">Published</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => removeFromContentPlan(item.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedView === 'insights' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Content Gap Analysis</h3>
            <p className="text-gray-600">
              Detailed gap analysis and content strategy insights will be displayed here
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Advanced analytics visualization components needed for this view
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentRecommendationEngine;