/**
 * SearchResultsView - Dedicated view for displaying search results
 */

import React from 'react';

interface Document {
  id: string;
  name: string;
  type: string;
  document_type: string;
  size: string;
  sizeBytes: number;
  modified: string;
  created: string;
  tags: string[];
  confidenceScore?: number;
  thumbnailUrl?: string;
  owner: string;
  status: string;
}

export interface SearchResultsViewProps {
  searchQuery: string;
  searchType: 'keyword' | 'semantic';
  searchResults: Document[] | null;
  isLoading: boolean;
  onBack: () => void;
  onDocumentClick: (doc: Document) => void;
  onDocumentDoubleClick: (doc: Document) => void;
  selectedDocument: Document | null;
  resultsCount: number;
  timeTaken: number;
}

// Helper function to get relevance badge color
const getRelevanceBadgeColor = (score?: number): string => {
  if (!score) return 'bg-gray-500/20 text-gray-300';
  const percentage = score * 100;
  if (percentage >= 90) return 'bg-green-500/20 text-green-300';
  if (percentage >= 75) return 'bg-yellow-500/20 text-yellow-300';
  if (percentage >= 60) return 'bg-orange-500/20 text-orange-300';
  return 'bg-gray-500/20 text-gray-300';
};

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  searchQuery,
  searchType,
  searchResults,
  isLoading,
  onBack,
  onDocumentClick,
  onDocumentDoubleClick,
  selectedDocument,
  resultsCount,
  timeTaken,
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="btn-glass px-4 py-2 text-sm flex items-center gap-2 hover:bg-white/20 transition-all"
          >
            ← Back to Library
          </button>
          <div className="flex items-center gap-3 text-xs text-white/60">
            <span>{resultsCount} results</span>
            <span>•</span>
            <span className="capitalize">{searchType} search</span>
            <span>•</span>
            <span>{timeTaken}ms</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span className="text-indigo-400">🔍</span>
          Search Results for <span className="text-indigo-300">"{searchQuery}"</span>
        </h2>
      </div>

      {/* Results Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-white/60">Searching documents...</p>
            </div>
          </div>
        ) : !searchResults || searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
              <p className="text-white/60 mb-4">
                No documents match your search query "{searchQuery}"
              </p>
              <button
                onClick={onBack}
                className="btn-glass px-6 py-3 text-sm hover:bg-white/20 transition-all"
              >
                ← Back to Library
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {searchResults.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onDocumentClick(doc)}
                onDoubleClick={() => onDocumentDoubleClick(doc)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedDocument?.id === doc.id
                    ? 'bg-indigo-500/20 border-indigo-500/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {doc.thumbnailUrl ? (
                  <div className="w-full h-40 mb-3 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                    <img
                      src={doc.thumbnailUrl}
                      alt={doc.name}
                      className="max-w-full max-h-full object-contain"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        // Fallback to emoji if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = '<div class="text-5xl">📄</div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-5xl mb-3 text-center">📄</div>
                )}
                <div className="text-sm font-medium text-white mb-2 truncate text-center">
                  {doc.name}
                </div>
                <div className="text-xs text-white/60 text-center mb-1">{doc.type}</div>
                <div className="text-xs text-white/60 text-center">{doc.size}</div>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  {doc.confidenceScore !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${getRelevanceBadgeColor(
                        doc.confidenceScore
                      )}`}
                    >
                      {Math.round(doc.confidenceScore * 100)}% Match
                    </span>
                  )}
                  {doc.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsView;
