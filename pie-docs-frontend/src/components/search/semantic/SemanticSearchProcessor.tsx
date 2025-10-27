import React, { useState, useCallback, useEffect } from 'react';
import { Search, Brain, Zap, Filter, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  SemanticSearchQuery,
  SemanticSearchResult,
  SearchSuggestion
} from '@/types/domain/SemanticSearch';
import { SemanticSearchProcessor as SemanticService } from '@/services/semantic/SemanticSearchProcessor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';

interface SemanticSearchProcessorProps {
  onResultsChange?: (results: SemanticSearchResult[]) => void;
  onConceptsDetected?: (concepts: string[]) => void;
  initialQuery?: string;
  className?: string;
}

export const SemanticSearchProcessorComponent: React.FC<SemanticSearchProcessorProps> = ({
  onResultsChange,
  onConceptsDetected,
  initialQuery = '',
  className = ''
}) => {
  const { t } = useTranslation();
  const [semanticService] = useState(() => new SemanticService());

  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [detectedConcepts, setDetectedConcepts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Search configuration
  const [semanticWeight, setSemanticWeight] = useState(0.7);
  const [includeCrossLanguage, setIncludeCrossLanguage] = useState(true);
  const [includeRelated, setIncludeRelated] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ar' | 'auto'>('auto');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalResults, setTotalResults] = useState(0);

  /**
   * Perform semantic search
   */
  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setDetectedConcepts([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchQuery: SemanticSearchQuery = {
        text: query,
        semanticWeight,
        language,
        includeRelated,
        maxResults: pageSize
      };

      const response = await semanticService.semanticSearch(
        searchQuery,
        currentPage,
        pageSize
      );

      setResults(response.results);
      setTotalResults(response.totalResults);
      setDetectedConcepts(response.conceptsDetected || []);

      // Update parent components
      onResultsChange?.(response.results);
      onConceptsDetected?.(response.conceptsDetected || []);

    } catch (error) {
      console.error('Semantic search failed:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [
    query,
    semanticWeight,
    language,
    includeRelated,
    currentPage,
    pageSize,
    semanticService,
    onResultsChange,
    onConceptsDetected
  ]);

  /**
   * Get search suggestions as user types
   */
  const getSuggestions = useCallback(async (partialQuery: string) => {
    if (partialQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const suggestions = await semanticService.getSearchSuggestions(partialQuery, {
        currentDocument: undefined,
        recentSearches: [],
        userPreferences: { language }
      });

      setSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  }, [semanticService, language]);

  /**
   * Handle search input changes
   */
  const handleQueryChange = (value: string) => {
    setQuery(value);
    getSuggestions(value);
  };

  /**
   * Apply a suggestion
   */
  const applySuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setSuggestions([]);
    // Trigger search after a short delay
    setTimeout(() => performSearch(), 100);
  };

  /**
   * Handle search submission
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    performSearch();
  };

  /**
   * Handle configuration changes
   */
  const handleConfigurationChange = useCallback(async () => {
    try {
      await semanticService.updateConfiguration({
        semanticWeight,
        enableCrossLanguage: includeCrossLanguage,
        enableFuzzyMatching: true
      });
    } catch (error) {
      console.error('Failed to update configuration:', error);
    }
  }, [semanticService, semanticWeight, includeCrossLanguage]);

  // Update configuration when settings change
  useEffect(() => {
    handleConfigurationChange();
  }, [handleConfigurationChange]);

  // Perform search when page changes
  useEffect(() => {
    if (query.trim() && currentPage > 1) {
      performSearch();
    }
  }, [currentPage, performSearch, query]);

  return (
    <div className={`semantic-search-processor ${className}`}>
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder={t('search.semantic.placeholder')}
                className="pl-10 pr-4"
                disabled={isSearching}
              />
              <Brain className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4" />
            </div>
            <Button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="px-6"
            >
              {isSearching ? (
                <Zap className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isSearching ? t('search.searching') : t('search.search')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="px-4"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-1 p-2 bg-white shadow-lg border z-50">
              <div className="max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => applySuggestion(suggestion)}
                    className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center justify-between"
                  >
                    <span>{suggestion.text}</span>
                    <Badge variant={suggestion.type === 'semantic' ? 'default' : 'secondary'}>
                      {suggestion.type}
                    </Badge>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </form>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <Card className="mb-6 p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t('search.semantic.advancedSettings')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Semantic Weight */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('search.semantic.semanticWeight')}: {Math.round(semanticWeight * 100)}%
              </label>
              <Slider
                value={[semanticWeight]}
                onValueChange={([value]) => setSemanticWeight(value)}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('search.semantic.semanticWeightHelp')}
              </p>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('search.semantic.language')}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar' | 'auto')}
                className="w-full p-2 border rounded-md"
              >
                <option value="auto">{t('search.semantic.autoDetect')}</option>
                <option value="en">{t('search.semantic.english')}</option>
                <option value="ar">{t('search.semantic.arabic')}</option>
              </select>
            </div>

            {/* Cross-Language Search */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">
                  {t('search.semantic.crossLanguage')}
                </label>
                <p className="text-xs text-gray-500">
                  {t('search.semantic.crossLanguageHelp')}
                </p>
              </div>
              <Switch
                checked={includeCrossLanguage}
                onCheckedChange={setIncludeCrossLanguage}
              />
            </div>

            {/* Include Related Documents */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">
                  {t('search.semantic.includeRelated')}
                </label>
                <p className="text-xs text-gray-500">
                  {t('search.semantic.includeRelatedHelp')}
                </p>
              </div>
              <Switch
                checked={includeRelated}
                onCheckedChange={setIncludeRelated}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Detected Concepts */}
      {detectedConcepts.length > 0 && (
        <Card className="mb-6 p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {t('search.semantic.detectedConcepts')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {detectedConcepts.map((concept, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => {
                  setQuery(concept);
                  performSearch();
                }}
              >
                {concept}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="mb-6 p-4 border-red-200 bg-red-50">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          <p>
            {t('search.semantic.foundResults', {
              count: totalResults,
              semantic: results.filter(r => r.semanticScore > 0.5).length,
              keyword: results.filter(r => r.semanticScore <= 0.5).length
            })}
          </p>
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        {results.map((result) => (
          <Card key={result.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800">
                {result.title}
              </h3>
              <div className="flex gap-2">
                <Badge variant={result.semanticScore > 0.7 ? 'default' : 'secondary'}>
                  {Math.round(result.semanticScore * 100)}% semantic
                </Badge>
                {result.crossLanguageMatch && (
                  <Badge variant="outline">{t('search.semantic.crossLanguage')}</Badge>
                )}
              </div>
            </div>

            <p className="text-gray-600 mb-3">{result.snippet}</p>

            {/* Concept Explanation */}
            {result.conceptExplanation && (
              <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                <p className="font-medium text-blue-800 mb-1">
                  {t('search.semantic.conceptualRelevance')}:
                </p>
                <p className="text-blue-700">{result.conceptExplanation}</p>
              </div>
            )}

            {/* Related Concepts */}
            {result.relatedConcepts.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {t('search.semantic.relatedConcepts')}:
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.relatedConcepts.map((concept, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {concept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{result.documentType} • {result.author}</span>
              <span>{new Date(result.modifiedAt).toLocaleDateString()}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalResults > pageSize && (
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              {t('common.previous')}
            </Button>
            <span className="px-4 py-2 text-sm">
              {t('common.pageOf', {
                current: currentPage,
                total: Math.ceil(totalResults / pageSize)
              })}
            </span>
            <Button
              variant="outline"
              disabled={currentPage >= Math.ceil(totalResults / pageSize)}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};