import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { DocumentFilter, DocumentType, DocumentStatus } from '@/types/domain/Document';

interface FilterPanelProps {
  filters: Partial<DocumentFilter>;
  onFiltersChange: (filters: Partial<DocumentFilter>) => void;
  availableTypes: DocumentType[];
  availableTags: string[];
  availableAuthors: string[];
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  availableTypes,
  availableTags,
  availableAuthors,
  collapsed = false,
  onToggleCollapsed
}) => {
  const { theme } = useTheme();
  if (collapsed) {
    return (
      <div className="w-8 glass-panel border-r border-white/10 flex flex-col">
        <button
          onClick={onToggleCollapsed}
          className={`p-2 ${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'} focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-300 hover:scale-110`}
          aria-label="Expand filters"
        >
          <svg className="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 glass-panel border-r border-white/10 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
            Filters
          </h3>
          <button
            onClick={onToggleCollapsed}
            className={`${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'} focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-300 hover:scale-110`}
            aria-label="Collapse filters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Content */}
      <div className="p-4 space-y-6">
        {/* Document Types */}
        <div>
          <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-3`}>
            Document Type
          </h4>
          <div className="space-y-2">
            {availableTypes.length > 0 ? (
              availableTypes.map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.types?.includes(type) || false}
                    onChange={(e) => {
                      const newTypes = e.target.checked
                        ? [...(filters.types || []), type]
                        : (filters.types || []).filter(t => t !== type);
                      onFiltersChange({ ...filters, types: newTypes });
                    }}
                    className="rounded border-white/20 text-blue-400 focus:ring-white/40 glass transition-all duration-300"
                  />
                  <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} capitalize`}>
                    {type}
                  </span>
                </label>
              ))
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
                No document types available
              </p>
            )}
          </div>
        </div>

        {/* Document Status */}
        <div>
          <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-3`}>
            Status
          </h4>
          <div className="space-y-2">
            {(['draft', 'published', 'archived', 'processing', 'failed'] as DocumentStatus[]).map((status) => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.status?.includes(status) || false}
                  onChange={(e) => {
                    const newStatus = e.target.checked
                      ? [...(filters.status || []), status]
                      : (filters.status || []).filter(s => s !== status);
                    onFiltersChange({ ...filters, status: newStatus });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} capitalize`}>
                  {status}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-3`}>
            Tags
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableTags.length > 0 ? (
              availableTags.map((tag) => (
                <label key={tag} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.tags?.includes(tag) || false}
                    onChange={(e) => {
                      const newTags = e.target.checked
                        ? [...(filters.tags || []), tag]
                        : (filters.tags || []).filter(t => t !== tag);
                      onFiltersChange({ ...filters, tags: newTags });
                    }}
                    className="rounded border-white/20 text-blue-400 focus:ring-white/40 glass transition-all duration-300"
                  />
                  <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                    {tag}
                  </span>
                </label>
              ))
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
                No tags available
              </p>
            )}
          </div>
        </div>

        {/* Authors */}
        <div>
          <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-3`}>
            Authors
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableAuthors.length > 0 ? (
              availableAuthors.map((author) => (
                <label key={author} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.authors?.includes(author) || false}
                    onChange={(e) => {
                      const newAuthors = e.target.checked
                        ? [...(filters.authors || []), author]
                        : (filters.authors || []).filter(a => a !== author);
                      onFiltersChange({ ...filters, authors: newAuthors });
                    }}
                    className="rounded border-white/20 text-blue-400 focus:ring-white/40 glass transition-all duration-300"
                  />
                  <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                    {author}
                  </span>
                </label>
              ))
            ) : (
              <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
                No authors available
              </p>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-3`}>
            Date Range
          </h4>
          <div className="space-y-3">
            <div>
              <label className={`block text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mb-1`}>
                From
              </label>
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => {
                  onFiltersChange({
                    ...filters,
                    dateRange: {
                      ...filters.dateRange,
                      start: e.target.value,
                      end: filters.dateRange?.end || '',
                    }
                  });
                }}
                className={`w-full px-3 py-2 border border-white/20 rounded-md text-sm glass
                         ${theme === 'dark' ? 'text-white' : 'text-white/90'} placeholder-white/60
                         focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-300`}
              />
            </div>
            <div>
              <label className={`block text-xs ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mb-1`}>
                To
              </label>
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => {
                  onFiltersChange({
                    ...filters,
                    dateRange: {
                      ...filters.dateRange,
                      start: filters.dateRange?.start || '',
                      end: e.target.value,
                    }
                  });
                }}
                className={`w-full px-3 py-2 border border-white/20 rounded-md text-sm glass
                         ${theme === 'dark' ? 'text-white' : 'text-white/90'} placeholder-white/60
                         focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-300`}
              />
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={() => onFiltersChange({
              types: [],
              status: [],
              tags: [],
              authors: [],
              dateRange: undefined,
            })}
            className={`w-full px-3 py-2 text-sm font-medium btn-glass
                     hover:scale-105 transition-all duration-300`}
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;