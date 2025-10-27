import React from 'react';
import type { SearchResult, SearchFilters } from '@/types/domain/Search';
import { useTheme } from '@/contexts/ThemeContext';

interface SearchResultsExporterProps {
  results: SearchResult[];
  searchQuery: string;
  filters: SearchFilters;
  onClose: () => void;
}

export const SearchResultsExporter: React.FC<SearchResultsExporterProps> = ({
  results,
  searchQuery,
  filters,
  onClose,
}) => {
  const { theme } = useTheme();
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom modal-glass rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all hover:scale-105 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Export Search Results</h3>
            <button
              onClick={onClose}
              className={`hover:scale-110 transition-all duration-300 ${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              Export {results.length} search results for "{searchQuery}"
            </div>

            {/* Format Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                Export Format
              </label>
              <select className={`w-full glass-panel border border-white/20 rounded-md px-3 py-2 transition-all duration-300 ${theme === 'dark' ? 'text-white' : 'text-white'}`} disabled>
                <option>CSV</option>
                <option>PDF Report</option>
                <option>Excel</option>
              </select>
            </div>

            {/* Options */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                Include
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-white/20 accent-blue-400" defaultChecked disabled />
                  <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Document metadata</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-white/20 accent-blue-400" disabled />
                  <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Content snippets</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-white/20 accent-blue-400" disabled />
                  <span className={`ml-2 ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Search criteria</span>
                </label>
              </div>
            </div>

            <div className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>
              Export functionality will be implemented in Task 8.
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className={`btn-glass px-4 py-2 text-sm font-medium hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white/90 hover:text-white' : 'text-white/90 hover:text-white'}`}
            >
              Cancel
            </button>
            <button
              disabled
              className="btn-glass px-4 py-2 text-sm font-medium text-blue-300 opacity-50 cursor-not-allowed"
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsExporter;