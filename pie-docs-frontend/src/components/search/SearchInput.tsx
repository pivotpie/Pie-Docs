import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useDebounce } from '@/hooks/useDebounce';
import type { SearchSuggestion, SearchHistory, SearchFilters } from '@/types/domain/Search';

interface SearchInputProps {
  value: string;
  onSearch: (query: string, filters?: SearchFilters) => void;
  isLoading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  suggestions?: SearchSuggestion[];
  history?: SearchHistory[];
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onSearch,
  isLoading = false,
  placeholder = 'Search documents...',
  autoFocus = false,
  suggestions = [],
  history = [],
  className = '',
}) => {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [localHistory, setLocalHistory] = useState<SearchHistory[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce search input to avoid excessive API calls
  const debouncedQuery = useDebounce(inputValue, 300);

  // Load search history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('search-history');
    if (savedHistory) {
      try {
        setLocalHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  // Auto-complete suggestions based on debounced input
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length > 2) {
      // TODO: Fetch suggestions from API
      // This will be implemented when search service is ready
    }
  }, [debouncedQuery]);

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(newValue.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  const handleInputFocus = () => {
    setShowSuggestions(inputValue.length > 0 || localHistory.length > 0);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const combinedSuggestions = [
      ...localHistory.map(h => ({
        text: h.query,
        type: 'query' as const,
        category: 'Recent',
        count: h.resultCount,
      })),
      ...suggestions,
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < combinedSuggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : combinedSuggestions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && combinedSuggestions[selectedSuggestionIndex]) {
          handleSuggestionSelect(combinedSuggestions[selectedSuggestionIndex].text);
        } else {
          handleSearch(inputValue);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    handleSearch(suggestion);
  };

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    // Add to search history
    const historyEntry: SearchHistory = {
      id: Date.now().toString(),
      query: query.trim(),
      filters: {},
      timestamp: new Date().toISOString(),
      resultCount: 0, // Will be updated after search results
    };

    const updatedHistory = [
      historyEntry,
      ...localHistory.filter(h => h.query !== query.trim()).slice(0, 9)
    ];

    setLocalHistory(updatedHistory);
    localStorage.setItem('search-history', JSON.stringify(updatedHistory));

    // Execute search
    onSearch(query.trim());
    setShowSuggestions(false);
  }, [localHistory, onSearch]);

  const clearHistory = () => {
    setLocalHistory([]);
    localStorage.removeItem('search-history');
  };

  const combinedSuggestions = [
    ...localHistory.map(h => ({
      text: h.query,
      type: 'query' as const,
      category: 'Recent',
      count: h.resultCount,
    })),
    ...suggestions,
  ];

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className={`h-5 w-5 ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={isLoading}
          className={`block w-full pl-10 pr-12 py-3 border border-white/20 glass-panel rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg disabled:opacity-50 ${theme === 'dark' ? 'text-white placeholder-white/50' : 'text-white/90 placeholder-white/50'}`}
        />

        <div className="absolute inset-y-0 right-0 flex items-center">
          {isLoading && (
            <div className="mr-3">
              <svg className={`animate-spin h-5 w-5 ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleSearch(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className={`mr-2 p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-white/60 hover:text-white/90'}`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (combinedSuggestions.length > 0 || localHistory.length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 glass-card border border-white/10 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {combinedSuggestions.length > 0 ? (
            <>
              {/* Recent Searches */}
              {localHistory.length > 0 && (
                <div>
                  <div className={`flex items-center justify-between px-4 py-2 glass-panel border-b border-white/10 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                    <span>Recent Searches</span>
                    <button
                      onClick={clearHistory}
                      className="text-blue-400 hover:text-blue-300 text-xs hover:scale-105 transition-all duration-300"
                    >
                      Clear
                    </button>
                  </div>
                  {localHistory.slice(0, 5).map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => handleSuggestionSelect(item.query)}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:scale-105 transition-all duration-300 hover:glass-panel ${
                        index === selectedSuggestionIndex ? 'glass-panel' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className={`h-4 w-4 mr-3 ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={`${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{item.query}</span>
                      </div>
                      {item.resultCount > 0 && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-white/50'}`}>
                          {item.resultCount} results
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div>
                  <div className={`px-4 py-2 glass-panel border-b border-white/10 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                    Suggestions
                  </div>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`suggestion-${index}`}
                      onClick={() => handleSuggestionSelect(suggestion.text)}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:scale-105 transition-all duration-300 hover:glass-panel ${
                        index + localHistory.length === selectedSuggestionIndex ? 'glass-panel' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className={`h-4 w-4 mr-3 ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className={`${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{suggestion.text}</span>
                        {suggestion.category && (
                          <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-white/50' : 'text-white/50'}`}>
                            in {suggestion.category}
                          </span>
                        )}
                      </div>
                      {suggestion.count && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-white/50'}`}>
                          {suggestion.count} results
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-white/50' : 'text-white/50'}`}>
              No suggestions available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInput;