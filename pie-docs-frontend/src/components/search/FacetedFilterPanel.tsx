import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { SearchFilters, Facet, FacetValue } from '@/types/domain/Search';
import MetadataFilterBuilder from './MetadataFilterBuilder';

interface FacetedFilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  facets?: Record<string, any>;
  isLoading?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  count?: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
  count
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {title}
          </h4>
          {count !== undefined && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transform transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="pb-3">
          {children}
        </div>
      )}
    </div>
  );
};

export const FacetedFilterPanel: React.FC<FacetedFilterPanelProps> = ({
  filters,
  onFiltersChange,
  facets = {},
  isLoading = false,
  collapsed = false,
  onToggleCollapsed
}) => {
  const { theme } = useTheme();
  const [authorSearch, setAuthorSearch] = useState('');
  const [showAllAuthors, setShowAllAuthors] = useState(false);
  const [isMetadataBuilderOpen, setIsMetadataBuilderOpen] = useState(false);

  // Process facets data for display
  const documentTypeFacets = useMemo(() => {
    return facets.document_types || [];
  }, [facets.document_types]);

  const authorFacets = useMemo(() => {
    const authors = facets.authors || [];
    if (!authorSearch) {
      return showAllAuthors ? authors : authors.slice(0, 5);
    }
    return authors.filter((author: any) =>
      author.value.toLowerCase().includes(authorSearch.toLowerCase())
    );
  }, [facets.authors, authorSearch, showAllAuthors]);

  const tagFacets = useMemo(() => {
    return facets.tags || [];
  }, [facets.tags]);

  const statusFacets = useMemo(() => {
    return facets.status || [];
  }, [facets.status]);

  // Handler functions
  const handleDocumentTypeChange = useCallback((type: string, checked: boolean) => {
    const currentTypes = filters.documentTypes || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);

    onFiltersChange({
      ...filters,
      documentTypes: newTypes.length > 0 ? newTypes : undefined
    });
  }, [filters, onFiltersChange]);

  const handleAuthorChange = useCallback((author: string, checked: boolean) => {
    const currentAuthors = filters.authors || [];
    const newAuthors = checked
      ? [...currentAuthors, author]
      : currentAuthors.filter(a => a !== author);

    onFiltersChange({
      ...filters,
      authors: newAuthors.length > 0 ? newAuthors : undefined
    });
  }, [filters, onFiltersChange]);

  const handleTagChange = useCallback((tag: string, checked: boolean) => {
    const currentTags = filters.tags || [];
    const newTags = checked
      ? [...currentTags, tag]
      : currentTags.filter(t => t !== tag);

    onFiltersChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined
    });
  }, [filters, onFiltersChange]);

  const handleStatusChange = useCallback((status: string, checked: boolean) => {
    const currentStatus = filters.status || [];
    const newStatus = checked
      ? [...currentStatus, status]
      : currentStatus.filter(s => s !== status);

    onFiltersChange({
      ...filters,
      status: newStatus.length > 0 ? newStatus : undefined
    });
  }, [filters, onFiltersChange]);

  const handleDateRangeChange = useCallback((field: 'start' | 'end', value: string) => {
    const currentRange = filters.dateRange || { start: '', end: '' };
    const newRange = {
      ...currentRange,
      [field]: value
    };

    // Clear dateRange if both values are empty strings or falsy
    if (!newRange.start && !newRange.end) {
      onFiltersChange({
        ...filters,
        dateRange: undefined
      });
    } else {
      onFiltersChange({
        ...filters,
        dateRange: newRange
      });
    }
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({});
    setAuthorSearch('');
  }, [onFiltersChange]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.documentTypes?.length) count += filters.documentTypes.length;
    if (filters.authors?.length) count += filters.authors.length;
    if (filters.tags?.length) count += filters.tags.length;
    if (filters.status?.length) count += filters.status.length;
    if (filters.dateRange?.start || filters.dateRange?.end) count += 1;
    if (filters.customMetadata && Object.keys(filters.customMetadata).length) {
      count += Object.keys(filters.customMetadata).length;
    }
    return count;
  }, [filters]);

  if (collapsed) {
    return (
      <div className="w-8 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <button
          onClick={onToggleCollapsed}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Expand filters"
        >
          <svg className="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {activeFilterCount > 0 && (
          <div className="px-1 py-1">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {activeFilterCount > 9 ? '9+' : activeFilterCount}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Filters
            </h3>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <button
            onClick={onToggleCollapsed}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 p-1 rounded"
            aria-label="Collapse filters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Content */}
      <div className="p-4 space-y-0">
        {/* Document Types Filter */}
        <CollapsibleSection
          title="Document Type"
          count={filters.documentTypes?.length}
          defaultExpanded={true}
        >
          <div className="space-y-2">
            {documentTypeFacets.length > 0 ? (
              documentTypeFacets.map((facet: any) => (
                <label key={facet.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.documentTypes?.includes(facet.value) || false}
                    onChange={(e) => handleDocumentTypeChange(facet.value, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {facet.value}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {facet.count}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No document types available
              </p>
            )}
          </div>
        </CollapsibleSection>

        {/* Date Range Filter */}
        <CollapsibleSection
          title="Date Range"
          count={filters.dateRange?.start || filters.dateRange?.end ? 1 : undefined}
          defaultExpanded={false}
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="date-start" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Created After
              </label>
              <input
                id="date-start"
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="date-end" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Created Before
              </label>
              <input
                id="date-end"
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Quick date range buttons */}
            <div className="flex flex-wrap gap-1 pt-2">
              {[
                { label: 'Today', days: 0 },
                { label: 'Last 7 days', days: 7 },
                { label: 'Last 30 days', days: 30 },
                { label: 'Last 90 days', days: 90 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  onClick={() => {
                    const today = new Date();
                    const startDate = new Date(today);
                    startDate.setDate(today.getDate() - days);

                    onFiltersChange({
                      ...filters,
                      dateRange: {
                        start: startDate.toISOString().split('T')[0],
                        end: today.toISOString().split('T')[0],
                      }
                    });
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                           rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* Authors Filter */}
        <CollapsibleSection
          title="Authors"
          count={filters.authors?.length}
          defaultExpanded={false}
        >
          <div className="space-y-3">
            {/* Author search input */}
            <div className="relative">
              <label htmlFor="author-search" className="sr-only">
                Search authors
              </label>
              <input
                id="author-search"
                type="text"
                placeholder="Search authors..."
                value={authorSearch}
                onChange={(e) => setAuthorSearch(e.target.value)}
                className="w-full px-3 py-2 pl-8 border border-gray-300 dark:border-gray-600 rounded-md text-sm
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-2.5 top-2.5 h-3 w-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Author list */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {authorFacets.length > 0 ? (
                authorFacets.map((facet: any) => (
                  <label key={facet.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.authors?.includes(facet.value) || false}
                      onChange={(e) => handleAuthorChange(facet.value, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                      {facet.value}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {facet.count}
                    </span>
                  </label>
                ))
              ) : authorSearch ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No authors found matching "{authorSearch}"
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No authors available
                </p>
              )}

              {/* Show more/less authors button */}
              {!authorSearch && facets.authors && facets.authors.length > 5 && (
                <button
                  onClick={() => setShowAllAuthors(!showAllAuthors)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300
                           focus:outline-none focus:underline"
                >
                  {showAllAuthors ? 'Show less' : `Show all ${facets.authors.length} authors`}
                </button>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Status Filter */}
        <CollapsibleSection
          title="Status"
          count={filters.status?.length}
          defaultExpanded={false}
        >
          <div className="space-y-2">
            {statusFacets.length > 0 ? (
              statusFacets.map((facet: any) => (
                <label key={facet.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(facet.value) || false}
                    onChange={(e) => handleStatusChange(facet.value, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {facet.value.charAt(0).toUpperCase() + facet.value.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {facet.count}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No status values available
              </p>
            )}
          </div>
        </CollapsibleSection>

        {/* Tags Filter */}
        <CollapsibleSection
          title="Tags"
          count={filters.tags?.length}
          defaultExpanded={false}
        >
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {tagFacets.length > 0 ? (
              tagFacets.map((facet: any) => (
                <label key={facet.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.tags?.includes(facet.value) || false}
                    onChange={(e) => handleTagChange(facet.value, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {facet.value}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {facet.count}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No tags available
              </p>
            )}
          </div>
        </CollapsibleSection>

        {/* Custom Metadata Filters */}
        {filters.customMetadata && Object.keys(filters.customMetadata).length > 0 && (
          <CollapsibleSection
            title="Custom Metadata"
            count={Object.keys(filters.customMetadata).length}
            defaultExpanded={false}
          >
            <div className="space-y-2">
              {Object.entries(filters.customMetadata).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      {key}
                    </span>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {String(value)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newMetadata = { ...filters.customMetadata };
                      delete newMetadata[key];
                      onFiltersChange({
                        ...filters,
                        customMetadata: Object.keys(newMetadata).length > 0 ? newMetadata : undefined
                      });
                    }}
                    className="ml-2 text-gray-400 hover:text-red-500 focus:outline-none focus:text-red-500"
                    aria-label={`Remove ${key} filter`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Add Custom Metadata Filter */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsMetadataBuilderOpen(true)}
            className="w-full px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300
                     bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700
                     rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50
                     focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Custom Filter</span>
            </div>
          </button>
        </div>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <div className="pt-2">
            <button
              onClick={handleClearFilters}
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                       bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                       rounded-md hover:bg-gray-50 dark:hover:bg-gray-600
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Clear All Filters ({activeFilterCount})
            </button>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">Updating filters...</span>
          </div>
        </div>
      )}

      {/* Metadata Filter Builder Modal */}
      <MetadataFilterBuilder
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableFields={facets}
        isOpen={isMetadataBuilderOpen}
        onClose={() => setIsMetadataBuilderOpen(false)}
      />
    </div>
  );
};

export default FacetedFilterPanel;