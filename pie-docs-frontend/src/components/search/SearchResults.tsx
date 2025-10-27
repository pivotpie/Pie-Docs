import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { SearchResult } from '@/types/domain/Search';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  totalResults: number;
  isLoading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onDocumentPreview: (documentId: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  totalResults,
  isLoading,
  error,
  page,
  pageSize,
  onPageChange,
  onDocumentPreview,
}) => {
  const { theme } = useTheme();
  if (error) {
    return (
      <div className="glass-card border border-white/10 rounded-lg p-8 text-center">
        <div className="text-red-600 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Search Error</h3>
        <p className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card border border-white/10 rounded-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 glass-panel rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-b border-white/10 pb-4">
                <div className="h-4 glass-panel rounded w-3/4 mb-2"></div>
                <div className="h-3 glass-panel rounded w-full mb-1"></div>
                <div className="h-3 glass-panel rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!query && results.length === 0) {
    return (
      <div className="glass-card border border-white/10 rounded-lg p-8 text-center">
        <svg className={`mx-auto h-12 w-12 mb-4 ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Start Your Search</h3>
        <p className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
          Enter keywords, document names, or use filters to find documents.
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="glass-card border border-white/10 rounded-lg p-8 text-center">
        <svg className={`mx-auto h-12 w-12 mb-4 ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>No Results Found</h3>
        <p className={`mb-4 ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
          No documents match your search for "{query}". Try adjusting your search terms or filters.
        </p>
        <div className={`text-sm ${theme === 'dark' ? 'text-white/50' : 'text-white/50'}`}>
          <p>Suggestions:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Check spelling and try different keywords</li>
            <li>Remove some filters to broaden your search</li>
            <li>Use more general search terms</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card border border-white/10 rounded-lg">
      {/* Results Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
              Search Results
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              {totalResults.toLocaleString()} results for "{query}"
            </p>
          </div>

          {/* Sort Options - Placeholder for Task 6 */}
          <div>
            <select className={`border border-white/20 glass-panel rounded-md text-sm px-3 py-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`} disabled>
              <option>Sort by Relevance</option>
              <option>Sort by Date</option>
              <option>Sort by Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="divide-y divide-white/10">
        {results.map((result) => (
          <div
            key={result.id}
            className="p-6 hover:scale-105 transition-all duration-300 hover:glass-panel cursor-pointer"
            onClick={() => onDocumentPreview(result.id)}
          >
            <div className="flex items-start space-x-3">
              {/* Document Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 glass-panel rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>

              {/* Document Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-medium text-blue-600 hover:text-blue-700 truncate">
                    {result.title}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium glass-panel ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                    {result.documentType}
                  </span>
                </div>

                <p className={`text-sm mb-2 line-clamp-2 ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                  {result.snippet}
                </p>

                <div className={`flex items-center space-x-4 text-xs ${theme === 'dark' ? 'text-white/50' : 'text-white/50'}`}>
                  <span>by {result.author}</span>
                  <span>•</span>
                  <span>{new Date(result.modifiedAt).toLocaleDateString()}</span>
                  {result.score && (
                    <>
                      <span>•</span>
                      <span>Score: {(result.score * 100).toFixed(0)}%</span>
                    </>
                  )}
                </div>

                {/* Tags */}
                {result.tags && result.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium glass-panel text-blue-400"
                      >
                        {tag}
                      </span>
                    ))}
                    {result.tags.length > 3 && (
                      <span className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-white/50'}`}>
                        +{result.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Button */}
              <div className="flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentPreview(result.id);
                  }}
                  className={`p-2 hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-white/60 hover:text-white/90'}`}
                  title="Quick preview"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination - Placeholder for Task 6 */}
      {totalResults > pageSize && (
        <div className="border-t border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalResults)} of {totalResults} results
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className={`px-3 py-1 border border-white/20 glass-panel rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page * pageSize >= totalResults}
                className={`px-3 py-1 border border-white/20 glass-panel rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;