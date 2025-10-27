import React, { useState, useEffect, useCallback } from 'react';
import {
  TreePine,
  Search,
  TrendingUp,
  Filter,
  Plus,
  Settings,
  Download,
  Upload,
  BarChart3,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  TopicHierarchy,
  TopicClassification,
  TopicTrend,
  TopicSuggestion,
  TopicFilter
} from '@/types/domain/SemanticSearch';
import { TopicNavigator as TopicService } from '@/services/semantic/TopicNavigator';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Progress } from '@/components/ui/Progress';

interface TopicNavigatorProps {
  documentIds?: string[];
  onTopicSelect?: (topicId: string, topic: TopicClassification) => void;
  onDocumentSelect?: (documentId: string) => void;
  userId?: string;
  showSuggestions?: boolean;
  showTrends?: boolean;
  className?: string;
}

export const TopicNavigatorComponent: React.FC<TopicNavigatorProps> = ({
  documentIds = [],
  onTopicSelect,
  onDocumentSelect,
  userId,
  showSuggestions = true,
  showTrends = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const [topicService] = useState(() => new TopicService());

  // State
  const [topicHierarchy, setTopicHierarchy] = useState<TopicHierarchy[]>([]);
  const [topics, setTopics] = useState<TopicClassification[]>([]);
  const [trends, setTrends] = useState<TopicTrend[]>([]);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [browseResults, setBrowseResults] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Filter state
  const [activeFilter, setActiveFilter] = useState<TopicFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [minDocumentCount, setMinDocumentCount] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ar' | undefined>(undefined);

  // View state
  const [activeView, setActiveView] = useState<'hierarchy' | 'browse' | 'trends' | 'analytics'>('hierarchy');
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'cloud'>('tree');

  // Topic management
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicKeywords, setNewTopicKeywords] = useState('');

  /**
   * Load topic hierarchy
   */
  const loadTopicHierarchy = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const hierarchy = await topicService.getTopicHierarchy(
        documentIds.length > 0 ? documentIds : undefined,
        {
          algorithm: 'auto',
          numTopics: 25,
          minTopicSize: 3,
          coherenceThreshold: 0.4,
          includeCrossLanguage: true,
          detectTrends: showTrends
        }
      );

      setTopicHierarchy(hierarchy);

      // Also get flat topic list
      const flatTopics = await topicService.detectTopics(
        documentIds.length > 0 ? documentIds : [],
        {
          algorithm: 'auto',
          numTopics: 20,
          minTopicSize: 2
        }
      );

      setTopics(flatTopics);

    } catch (error) {
      console.error('Failed to load topic hierarchy:', error);
      setError(error instanceof Error ? error.message : 'Failed to load topics');
    } finally {
      setIsLoading(false);
    }
  }, [documentIds, topicService, showTrends]);

  /**
   * Load topic suggestions
   */
  const loadSuggestions = useCallback(async () => {
    if (!userId || !showSuggestions) return;

    try {
      const suggestions = await topicService.getTopicSuggestions(userId, {
        currentDocument: undefined,
        recentTopics: [],
        searchHistory: []
      });

      setSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load topic suggestions:', error);
    }
  }, [userId, showSuggestions, topicService]);

  /**
   * Load topic trends
   */
  const loadTrends = useCallback(async () => {
    if (!showTrends) return;

    try {
      const trends = await topicService.getTopicTrends({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        interval: 'week'
      }, activeFilter);

      setTrends(trends);
    } catch (error) {
      console.error('Failed to load topic trends:', error);
    }
  }, [showTrends, topicService, activeFilter]);

  /**
   * Search topics
   */
  const searchTopics = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadTopicHierarchy();
      return;
    }

    try {
      setIsLoading(true);
      const searchResults = await topicService.searchTopics(query, {
        fuzzyMatch: true,
        language: 'auto',
        includeDescendants: true,
        maxResults: 15
      });

      setTopics(searchResults);
    } catch (error) {
      console.error('Failed to search topics:', error);
      setError('Failed to search topics');
    } finally {
      setIsLoading(false);
    }
  }, [topicService, loadTopicHierarchy]);

  /**
   * Browse documents by topic
   */
  const browseByTopic = useCallback(async (topicId: string) => {
    try {
      setIsLoading(true);
      const results = await topicService.browseByTopic(topicId, activeFilter, 1, 20);
      setBrowseResults(results);
      setSelectedTopic(topicId);
    } catch (error) {
      console.error('Failed to browse by topic:', error);
      setError('Failed to browse documents');
    } finally {
      setIsLoading(false);
    }
  }, [topicService, activeFilter]);

  /**
   * Handle topic selection
   */
  const handleTopicSelect = (topicId: string, topic: TopicClassification) => {
    setSelectedTopic(topicId);
    onTopicSelect?.(topicId, topic);

    if (activeView === 'browse') {
      browseByTopic(topicId);
    }
  };

  /**
   * Toggle topic expansion
   */
  const toggleTopicExpansion = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  /**
   * Create custom topic
   */
  const createCustomTopic = async () => {
    if (!newTopicName.trim() || !newTopicKeywords.trim()) return;

    try {
      setIsLoading(true);
      const keywords = newTopicKeywords.split(',').map(k => k.trim());
      await topicService.createCustomTopic(newTopicName, keywords);

      setNewTopicName('');
      setNewTopicKeywords('');
      setIsCreatingTopic(false);

      // Refresh topics
      loadTopicHierarchy();
    } catch (error) {
      console.error('Failed to create custom topic:', error);
      setError('Failed to create topic');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get topic color based on document count
   */
  const getTopicColor = (documentCount: number, maxCount: number): string => {
    const intensity = Math.min(documentCount / Math.max(maxCount, 1), 1);
    if (intensity >= 0.8) return 'bg-blue-600 text-white';
    if (intensity >= 0.6) return 'bg-blue-500 text-white';
    if (intensity >= 0.4) return 'bg-blue-400 text-white';
    if (intensity >= 0.2) return 'bg-blue-300 text-gray-800';
    return 'bg-blue-200 text-gray-700';
  };

  /**
   * Render topic hierarchy tree
   */
  const renderTopicTree = (topics: TopicHierarchy[], level: number = 0): React.ReactNode => {
    const maxDocumentCount = Math.max(...topics.map(t => t.documentCount));

    return topics.map((topic) => (
      <div key={topic.id} className={`ml-${level * 4}`}>
        <div
          className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer ${
            selectedTopic === topic.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
          }`}
          onClick={() => handleTopicSelect(topic.id, {
            topicId: topic.id,
            topicName: topic.name,
            confidence: topic.confidence,
            keywords: topic.keywords,
            documentCount: topic.documentCount,
            subTopics: []
          })}
        >
          {topic.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTopicExpansion(topic.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {expandedTopics.has(topic.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}

          <TreePine className="w-4 h-4 text-green-600" />

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{topic.name}</span>
              <div className="flex items-center gap-2">
                <Badge
                  className={getTopicColor(topic.documentCount, maxDocumentCount)}
                >
                  {topic.documentCount}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {Math.round(topic.confidence * 100)}%
                </Badge>
              </div>
            </div>

            {topic.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {topic.keywords.slice(0, 3).map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
                {topic.keywords.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{topic.keywords.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {expandedTopics.has(topic.id) && topic.children.length > 0 && (
          <div className="mt-1">
            {renderTopicTree(topic.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  /**
   * Render topic list view
   */
  const renderTopicList = () => (
    <div className="space-y-2">
      {topics.map((topic) => (
        <Card
          key={topic.topicId}
          className={`p-3 hover:shadow-md transition-shadow cursor-pointer ${
            selectedTopic === topic.topicId ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => handleTopicSelect(topic.topicId, topic)}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{topic.topicName}</h4>
            <div className="flex gap-2">
              <Badge variant="outline">
                {topic.documentCount} docs
              </Badge>
              <Badge variant="secondary">
                {Math.round(topic.confidence * 100)}%
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {topic.keywords.slice(0, 6).map((keyword, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );

  /**
   * Render topic cloud view
   */
  const renderTopicCloud = () => {
    const maxCount = Math.max(...topics.map(t => t.documentCount));

    return (
      <div className="flex flex-wrap gap-2 p-4">
        {topics.map((topic) => {
          const size = Math.max(0.8, (topic.documentCount / maxCount) * 2);
          return (
            <button
              key={topic.topicId}
              onClick={() => handleTopicSelect(topic.topicId, topic)}
              className={`px-3 py-2 rounded-lg transition-all hover:shadow-md ${
                selectedTopic === topic.topicId
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              style={{ fontSize: `${size}rem` }}
            >
              {topic.topicName}
            </button>
          );
        })}
      </div>
    );
  };

  // Load initial data
  useEffect(() => {
    loadTopicHierarchy();
    loadSuggestions();
    if (showTrends) {
      loadTrends();
    }
  }, [loadTopicHierarchy, loadSuggestions, loadTrends]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchTopics(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchTopics]);

  return (
    <div className={`topic-navigator ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <TreePine className="w-6 h-6" />
            {t('topics.navigation')}
          </h3>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreatingTopic(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('topics.create')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              {t('topics.filter')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTopicHierarchy}
              disabled={isLoading}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeView === 'hierarchy' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('hierarchy')}
          >
            <TreePine className="w-4 h-4 mr-1" />
            {t('topics.hierarchy')}
          </Button>
          <Button
            variant={activeView === 'browse' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('browse')}
          >
            <Search className="w-4 h-4 mr-1" />
            {t('topics.browse')}
          </Button>
          {showTrends && (
            <Button
              variant={activeView === 'trends' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('trends')}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              {t('topics.trends')}
            </Button>
          )}
          <Button
            variant={activeView === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('analytics')}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            {t('topics.analytics')}
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('topics.searchPlaceholder')}
              className="pl-10"
            />
          </div>
        </div>

        {/* View Mode Selection (for hierarchy view) */}
        {activeView === 'hierarchy' && (
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              {t('topics.treeView')}
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              {t('topics.listView')}
            </Button>
            <Button
              variant={viewMode === 'cloud' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cloud')}
            >
              {t('topics.cloudView')}
            </Button>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <Card className="p-4 mb-4">
            <h4 className="font-medium mb-4">{t('topics.filters')}</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('topics.minDocumentCount')}: {minDocumentCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={minDocumentCount}
                  onChange={(e) => setMinDocumentCount(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('topics.language')}
                </label>
                <Select
                  value={selectedLanguage || ''}
                  onValueChange={(value) => setSelectedLanguage(value as 'en' | 'ar' | undefined)}
                >
                  <option value="">{t('topics.allLanguages')}</option>
                  <option value="en">{t('topics.english')}</option>
                  <option value="ar">{t('topics.arabic')}</option>
                </Select>
              </div>
            </div>
          </Card>
        )}

        {/* Topic Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="p-4 mb-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              {t('topics.suggestions')}
            </h4>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleTopicSelect(suggestion.topicId, {
                    topicId: suggestion.topicId,
                    topicName: suggestion.topicName,
                    confidence: suggestion.relevanceScore,
                    keywords: suggestion.keywords,
                    documentCount: 0,
                    subTopics: []
                  })}
                  className="p-2 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors"
                >
                  <div className="text-sm font-medium">{suggestion.topicName}</div>
                  <div className="text-xs text-gray-600">{suggestion.reason}</div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-4 p-4 border-red-200 bg-red-50">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>{t('topics.loading')}</span>
          </div>
        </Card>
      )}

      {/* Content based on active view */}
      {!isLoading && (
        <>
          {/* Hierarchy View */}
          {activeView === 'hierarchy' && (
            <div>
              {viewMode === 'tree' && (
                <Card className="p-4">
                  {topicHierarchy.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      {t('topics.noTopicsFound')}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {renderTopicTree(topicHierarchy)}
                    </div>
                  )}
                </Card>
              )}

              {viewMode === 'list' && renderTopicList()}
              {viewMode === 'cloud' && (
                <Card className="p-4">
                  {renderTopicCloud()}
                </Card>
              )}
            </div>
          )}

          {/* Browse View */}
          {activeView === 'browse' && (
            <div>
              {!selectedTopic ? (
                <Card className="p-8">
                  <p className="text-gray-500 text-center">
                    {t('topics.selectTopicToBrowse')}
                  </p>
                </Card>
              ) : browseResults ? (
                <div>
                  <Card className="p-4 mb-4">
                    <h4 className="font-medium mb-2">
                      {browseResults.topicInfo.topicName}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {t('topics.documentsFound', { count: browseResults.totalDocuments })}
                    </p>

                    <div className="space-y-3">
                      {browseResults.documents.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => onDocumentSelect?.(doc.id)}
                        >
                          <h5 className="font-medium">{doc.title}</h5>
                          <p className="text-sm text-gray-600 mt-1">{doc.snippet}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex flex-wrap gap-1">
                              {doc.relatedTopics.slice(0, 3).map((topic: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                            <Badge variant="secondary">
                              {Math.round(doc.topicRelevance * 100)}% relevant
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="p-8">
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span>{t('topics.loadingDocuments')}</span>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Trends View */}
          {activeView === 'trends' && showTrends && (
            <Card className="p-4">
              <h4 className="font-medium mb-4">{t('topics.trendsOverTime')}</h4>

              {trends.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {t('topics.noTrendsData')}
                </p>
              ) : (
                <div className="space-y-4">
                  {trends.map((trend) => (
                    <div key={trend.topicId} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{trend.topicName}</h5>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              trend.trendDirection === 'increasing' ? 'default' :
                              trend.trendDirection === 'emerging' ? 'secondary' :
                              'outline'
                            }
                          >
                            {trend.trendDirection}
                          </Badge>
                          <Badge variant="outline">
                            {trend.growthRate > 0 ? '+' : ''}{Math.round(trend.growthRate * 100)}%
                          </Badge>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        {t('topics.documentCounts')}: {trend.documentCounts.map(dc => dc.count).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Analytics View */}
          {activeView === 'analytics' && (
            <Card className="p-4">
              <h4 className="font-medium mb-4">{t('topics.analyticsOverview')}</h4>
              <p className="text-gray-500 text-center py-8">
                {t('topics.analyticsComingSoon')}
              </p>
            </Card>
          )}
        </>
      )}

      {/* Create Topic Modal */}
      {isCreatingTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h4 className="font-medium mb-4">{t('topics.createCustomTopic')}</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('topics.topicName')}
                </label>
                <Input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder={t('topics.topicNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('topics.keywords')}
                </label>
                <Input
                  type="text"
                  value={newTopicKeywords}
                  onChange={(e) => setNewTopicKeywords(e.target.value)}
                  placeholder={t('topics.keywordsPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('topics.keywordsHelp')}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={createCustomTopic}
                  disabled={!newTopicName.trim() || !newTopicKeywords.trim() || isLoading}
                  className="flex-1"
                >
                  {t('topics.create')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingTopic(false);
                    setNewTopicName('');
                    setNewTopicKeywords('');
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};