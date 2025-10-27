import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lightbulb,
  TrendingUp,
  User,
  FileText,
  Clock,
  Star,
  ChevronRight,
  Zap,
  Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  SearchSuggestion,
  UserBehaviorContext,
  DocumentContext,
  AutoCompletionResult,
  QueryExpansion
} from '@/types/domain/SemanticSearch';
import { SearchSuggestionEngine as SuggestionService } from '@/services/semantic/SearchSuggestionEngine';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

interface SearchSuggestionEngineProps {
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  onQueryChange?: (query: string) => void;
  userContext?: UserBehaviorContext;
  documentContext?: DocumentContext;
  showPersonalized?: boolean;
  showTrending?: boolean;
  showContextual?: boolean;
  className?: string;
}

export const SearchSuggestionEngineComponent: React.FC<SearchSuggestionEngineProps> = ({
  onSuggestionSelect,
  onQueryChange,
  userContext = {},
  documentContext = {},
  showPersonalized = true,
  showTrending = false,
  showContextual = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const [suggestionService] = useState(() => new SuggestionService());
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [autoCompletion, setAutoCompletion] = useState<AutoCompletionResult | null>(null);
  const [personalizedSuggestions, setPersonalizedSuggestions] = useState<SearchSuggestion[]>([]);
  const [trendingSuggestions, setTrendingSuggestions] = useState<SearchSuggestion[]>([]);
  const [contextualSuggestions, setContextualSuggestions] = useState<SearchSuggestion[]>([]);
  const [queryExpansion, setQueryExpansion] = useState<QueryExpansion | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration
  const [enablePersonalized, setEnablePersonalized] = useState(showPersonalized);
  const [enableContextual, setEnableContextual] = useState(showContextual);
  const [enableTrending, setEnableTrending] = useState(showTrending);
  const [enableCorrections, setEnableCorrections] = useState(true);
  const [maxSuggestions, setMaxSuggestions] = useState(8);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Active suggestion type
  const [activeTab, setActiveTab] = useState<'all' | 'personalized' | 'trending' | 'contextual'>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  /**
   * Get search suggestions
   */
  const getSearchSuggestions = useCallback(async (partialQuery: string) => {
    if (!partialQuery.trim()) {
      setSuggestions([]);
      setAutoCompletion(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get main suggestions
      const suggestions = await suggestionService.getSearchSuggestions(
        partialQuery,
        userContext,
        documentContext,
        {
          maxSuggestions,
          includeSemanticSuggestions: true,
          includePersonalized: enablePersonalized,
          includeContextual: enableContextual,
          includePopular: true,
          includeTrending: enableTrending,
          includeCorrections: enableCorrections,
          minConfidence: 0.3
        }
      );

      setSuggestions(suggestions);

      // Get auto-completion
      const completion = await suggestionService.getAutoCompletion(
        partialQuery,
        userContext,
        {
          maxCompletions: 6,
          includeQueries: true,
          includePhrases: true,
          semanticExpansion: true
        }
      );

      setAutoCompletion(completion);

      // Get query expansion for longer queries
      if (partialQuery.split(' ').length >= 2) {
        const expansion = await suggestionService.expandQuery(partialQuery, {
          includeSynonyms: true,
          includeRelatedTerms: true,
          maxExpansions: 8
        });

        setQueryExpansion(expansion);
      }

      setShowDropdown(true);

    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      setError(error instanceof Error ? error.message : 'Failed to get suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [
    suggestionService,
    userContext,
    documentContext,
    maxSuggestions,
    enablePersonalized,
    enableContextual,
    enableTrending,
    enableCorrections
  ]);

  /**
   * Load additional suggestion types
   */
  const loadAdditionalSuggestions = useCallback(async () => {
    try {
      // Load personalized suggestions
      if (enablePersonalized && userContext.userId) {
        const personalized = await suggestionService.getPersonalizedSuggestions(
          userContext,
          {
            maxSuggestions: 6,
            timeWindow: 'recent',
            includeBookmarks: true,
            includeHistory: true,
            includePreferences: true
          }
        );
        setPersonalizedSuggestions(personalized);
      }

      // Load trending suggestions
      if (enableTrending) {
        const trending = await suggestionService.getTrendingSuggestions('day', undefined, 6);
        setTrendingSuggestions(trending);
      }

      // Load contextual suggestions
      if (enableContextual && documentContext.currentDocument) {
        const contextual = await suggestionService.getContextualSuggestions(
          documentContext,
          userContext,
          6
        );
        setContextualSuggestions(contextual);
      }

    } catch (error) {
      console.error('Failed to load additional suggestions:', error);
    }
  }, [
    suggestionService,
    enablePersonalized,
    enableTrending,
    enableContextual,
    userContext,
    documentContext
  ]);

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = async (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowDropdown(false);
    setSelectedIndex(-1);

    // Learn from interaction
    if (query.trim()) {
      await suggestionService.learnFromInteraction(
        query,
        suggestion,
        'accepted',
        userContext
      );
    }

    onSuggestionSelect?.(suggestion);
    onQueryChange?.(suggestion.text);
  };

  /**
   * Handle query input change
   */
  const handleQueryChange = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);

    // Debounce suggestions
    const timeoutId = setTimeout(() => {
      getSearchSuggestions(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    const totalSuggestions = getAllSuggestions().length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalSuggestions - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const suggestions = getAllSuggestions();
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  /**
   * Get all suggestions based on active tab
   */
  const getAllSuggestions = (): SearchSuggestion[] => {
    switch (activeTab) {
      case 'personalized':
        return personalizedSuggestions;
      case 'trending':
        return trendingSuggestions;
      case 'contextual':
        return contextualSuggestions;
      default:
        return suggestions;
    }
  };

  /**
   * Get suggestion icon
   */
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'semantic':
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'personalized':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'contextual':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'popular':
        return <Star className="w-4 h-4 text-purple-500" />;
      case 'correction':
        return <Zap className="w-4 h-4 text-orange-500" />;
      default:
        return <ChevronRight className="w-4 h-4 text-gray-400" />;
    }
  };

  /**
   * Render suggestion item
   */
  const renderSuggestion = (suggestion: SearchSuggestion, index: number) => (
    <button
      key={`${suggestion.text}_${index}`}
      onClick={() => handleSuggestionSelect(suggestion)}
      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center justify-between ${
        selectedIndex === index ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        {getSuggestionIcon(suggestion.type)}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{suggestion.text}</span>
            <Badge variant="outline" className="text-xs">
              {Math.round(suggestion.confidence * 100)}%
            </Badge>
          </div>
          {suggestion.reason && (
            <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );

  // Load suggestions on mount
  useEffect(() => {
    loadAdditionalSuggestions();
  }, [loadAdditionalSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`search-suggestion-engine relative ${className}`} ref={inputRef}>
      {/* Main Search Input */}
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim()) {
              setShowDropdown(true);
            }
          }}
          placeholder={t('suggestions.searchPlaceholder')}
          className="w-full pr-12"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card className="mt-2 p-4">
          <h4 className="font-medium mb-3">{t('suggestions.settings')}</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('suggestions.enablePersonalized')}</span>
              <Switch
                checked={enablePersonalized}
                onCheckedChange={setEnablePersonalized}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">{t('suggestions.enableContextual')}</span>
              <Switch
                checked={enableContextual}
                onCheckedChange={setEnableContextual}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">{t('suggestions.enableTrending')}</span>
              <Switch
                checked={enableTrending}
                onCheckedChange={setEnableTrending}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">{t('suggestions.enableCorrections')}</span>
              <Switch
                checked={enableCorrections}
                onCheckedChange={setEnableCorrections}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
              {t('suggestions.maxSuggestions')}: {maxSuggestions}
            </label>
            <input
              type="range"
              min="3"
              max="15"
              value={maxSuggestions}
              onChange={(e) => setMaxSuggestions(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </Card>
      )}

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <Card className="absolute top-full left-0 right-0 mt-1 bg-white shadow-lg border z-50 max-h-96 overflow-y-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <span className="text-sm text-gray-500">{t('suggestions.loading')}</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Tabs */}
          {!isLoading && !error && (
            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('suggestions.all')} ({suggestions.length})
                </button>

                {enablePersonalized && personalizedSuggestions.length > 0 && (
                  <button
                    onClick={() => setActiveTab('personalized')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'personalized'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <User className="w-4 h-4 inline mr-1" />
                    {t('suggestions.personal')} ({personalizedSuggestions.length})
                  </button>
                )}

                {enableTrending && trendingSuggestions.length > 0 && (
                  <button
                    onClick={() => setActiveTab('trending')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'trending'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    {t('suggestions.trending')} ({trendingSuggestions.length})
                  </button>
                )}

                {enableContextual && contextualSuggestions.length > 0 && (
                  <button
                    onClick={() => setActiveTab('contextual')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'contextual'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-1" />
                    {t('suggestions.contextual')} ({contextualSuggestions.length})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Auto-completion Results */}
          {autoCompletion && autoCompletion.completions.length > 0 && activeTab === 'all' && (
            <div className="border-b">
              <div className="p-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  {t('suggestions.autoComplete')}
                </h5>
                <div className="flex flex-wrap gap-1">
                  {autoCompletion.completions.map((completion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect({
                        text: completion.text,
                        type: 'completion',
                        confidence: completion.confidence,
                        reason: t('suggestions.autoCompleteReason')
                      })}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {completion.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suggestions List */}
          {!isLoading && !error && (
            <div className="max-h-64 overflow-y-auto">
              {getAllSuggestions().length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>{t('suggestions.noSuggestions')}</p>
                </div>
              ) : (
                getAllSuggestions().map((suggestion, index) => renderSuggestion(suggestion, index))
              )}
            </div>
          )}

          {/* Query Expansion */}
          {queryExpansion && activeTab === 'all' && (
            <div className="border-t p-3">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                {t('suggestions.relatedTerms')}
              </h5>
              <div className="flex flex-wrap gap-1">
                {queryExpansion.expandedTerms.slice(0, 6).map((term, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSuggestionSelect({
                      text: `${query} ${term}`,
                      type: 'expansion',
                      confidence: queryExpansion.confidence,
                      reason: t('suggestions.expandedTerm')
                    })}
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Quick Suggestions (when not typing) */}
      {!query.trim() && !showDropdown && (
        <div className="mt-4 space-y-3">
          {enablePersonalized && personalizedSuggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('suggestions.forYou')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {personalizedSuggestions.slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {enableTrending && trendingSuggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('suggestions.trending')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {trendingSuggestions.slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="px-3 py-2 text-sm bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {enableContextual && contextualSuggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('suggestions.relatedToDocument')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {contextualSuggestions.slice(0, 4).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="px-3 py-2 text-sm bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};