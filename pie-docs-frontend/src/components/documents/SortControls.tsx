import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { SortCriteria, SortField, SortOrder } from '@/types/domain/Document';

interface SortControlsProps {
  sortCriteria: SortCriteria[];
  onSortChange: (criteria: SortCriteria[]) => void;
  disabled?: boolean;
}

const SortControls: React.FC<SortControlsProps> = ({
  sortCriteria,
  onSortChange,
  disabled = false
}) => {
  const { theme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const sortFieldOptions: { value: SortField; label: string }[] = [
    { value: 'name', label: 'Name' },
    { value: 'dateModified', label: 'Date Modified' },
    { value: 'dateCreated', label: 'Date Created' },
    { value: 'size', label: 'Size' },
    { value: 'type', label: 'Type' },
    { value: 'relevance', label: 'Relevance' },
  ];

  const addSortCriteria = (field: SortField) => {
    const existing = sortCriteria.find(s => s.field === field);
    if (!existing) {
      const newCriteria = [...sortCriteria, { field, order: 'asc' as SortOrder }];
      onSortChange(newCriteria);
    }
    setIsDropdownOpen(false);
  };

  const updateSortOrder = (field: SortField, order: SortOrder) => {
    const newCriteria = sortCriteria.map(s =>
      s.field === field ? { ...s, order } : s
    );
    onSortChange(newCriteria);
  };

  const removeSortCriteria = (field: SortField) => {
    const newCriteria = sortCriteria.filter(s => s.field !== field);
    onSortChange(newCriteria);
  };

  const moveSortCriteria = (fromIndex: number, toIndex: number) => {
    const newCriteria = [...sortCriteria];
    const [removed] = newCriteria.splice(fromIndex, 1);
    newCriteria.splice(toIndex, 0, removed);
    onSortChange(newCriteria);
  };

  const clearAllSorts = () => {
    onSortChange([]);
  };

  const availableFields = sortFieldOptions.filter(
    option => !sortCriteria.some(s => s.field === option.value)
  );

  return (
    <div className="flex items-center space-x-4">
      {/* Sort Criteria List */}
      {sortCriteria.length > 0 && (
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
            Sort by:
          </span>
          <div className="flex items-center space-x-2">
            {sortCriteria.map((criteria, index) => (
              <div
                key={criteria.field}
                className={`flex items-center space-x-1 glass-card px-3 py-1 rounded-md text-sm ${theme === 'dark' ? 'text-white/90' : 'text-white/90'} hover:scale-105 transition-all duration-300`}
              >
                {/* Priority indicator for multi-level sorting */}
                {sortCriteria.length > 1 && (
                  <span className={`text-xs font-semibold glass rounded-full w-5 h-5 flex items-center justify-center ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>
                    {index + 1}
                  </span>
                )}

                {/* Field name */}
                <span className="font-medium">
                  {sortFieldOptions.find(f => f.value === criteria.field)?.label}
                </span>

                {/* Sort direction toggle */}
                <button
                  onClick={() => updateSortOrder(
                    criteria.field,
                    criteria.order === 'asc' ? 'desc' : 'asc'
                  )}
                  disabled={disabled}
                  className="p-0.5 hover:bg-white/20 rounded transition-all duration-300 disabled:opacity-50 hover:scale-110"
                  title={`Sort ${criteria.order === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {criteria.order === 'asc' ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8V20m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  )}
                </button>

                {/* Move up button (for multi-level sorting) */}
                {index > 0 && (
                  <button
                    onClick={() => moveSortCriteria(index, index - 1)}
                    disabled={disabled}
                    className="p-0.5 hover:bg-white/20 rounded transition-all duration-300 disabled:opacity-50 hover:scale-110"
                    title="Move up in priority"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                )}

                {/* Move down button (for multi-level sorting) */}
                {index < sortCriteria.length - 1 && (
                  <button
                    onClick={() => moveSortCriteria(index, index + 1)}
                    disabled={disabled}
                    className="p-0.5 hover:bg-white/20 rounded transition-all duration-300 disabled:opacity-50 hover:scale-110"
                    title="Move down in priority"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeSortCriteria(criteria.field)}
                  disabled={disabled}
                  className="p-0.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-all duration-300 disabled:opacity-50 hover:scale-110"
                  title="Remove sort criteria"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Sort Dropdown */}
      {availableFields.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className={`inline-flex items-center px-3 py-2 border border-white/20 rounded-md btn-glass text-sm font-medium
                     ${theme === 'dark' ? 'text-white/90' : 'text-white/90'} hover:scale-105 transition-all duration-300
                     focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            Add Sort
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 glass-card rounded-md shadow-lg z-20 border border-white/20">
                <div className="py-1">
                  {availableFields.map((field) => (
                    <button
                      key={field.value}
                      onClick={() => addSortCriteria(field.value)}
                      className={`block w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} hover:bg-white/10 hover:text-white transition-all duration-300`}
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Clear All Button */}
      {sortCriteria.length > 0 && (
        <button
          onClick={clearAllSorts}
          disabled={disabled}
          className={`text-sm ${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'} disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105`}
        >
          Clear all
        </button>
      )}

      {/* Sort Summary */}
      {sortCriteria.length === 0 && (
        <span className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
          No sorting applied
        </span>
      )}
    </div>
  );
};

export default SortControls;