/**
 * DocumentSearchPanel - AI-powered search and filters
 */

import React, { useState } from 'react';
import { SearchStatsPanel } from './SearchStatsPanel';

export interface DocumentSearchPanelProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchType: 'keyword' | 'semantic';
  onSearchTypeChange: (type: 'keyword' | 'semantic') => void;
  onSearch: (e: React.FormEvent) => void;
  showPreview?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  className?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  searchHistory?: Array<{ query: string; timestamp: string }>;
}

export const DocumentSearchPanel: React.FC<DocumentSearchPanelProps> = ({
  searchQuery,
  onSearchQueryChange,
  searchType,
  onSearchTypeChange,
  onSearch,
  showPreview = false,
  isCollapsed = false,
  onClose,
  className = '',
  suggestions,
  onSuggestionClick,
  searchHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history');

  return (
    <div className={`w-80 border-r border-white/10 glass-panel flex flex-col ${
      showPreview && !isCollapsed ? 'absolute left-0 top-0 bottom-0 z-30 shadow-2xl' : ''
    } ${className}`}>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🧠</span>
            Cognitive Search
          </h2>
          {showPreview && !isCollapsed && onClose && (
            <button
              onClick={onClose}
              className="btn-glass text-xs px-2 py-1 hover:bg-white/20"
              title="Collapse Search Panel"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Type Toggle */}
        <div className="flex items-center gap-2 mb-3 p-1 bg-white/5 rounded-lg">
          <button
            onClick={() => onSearchTypeChange('semantic')}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              searchType === 'semantic' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'
            }`}
          >
            Semantic
          </button>
          <button
            onClick={() => onSearchTypeChange('keyword')}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              searchType === 'keyword' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'
            }`}
          >
            Keyword
          </button>
        </div>

        {/* Natural Language Query Engine */}
        <div className="relative">
          <form onSubmit={onSearch} className="space-y-3">
            <textarea
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder={
                searchType === 'semantic'
                  ? 'Ask anything... e.g., "Show me all Q3 vendor contracts over $50k that are still pending legal review in the London office"'
                  : 'Search by keywords, tags, or properties...'
              }
              className="w-full h-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="w-full btn-glass text-xs px-3 py-2 transition-all hover:bg-indigo-500/20"
            >
              🔍 Search
            </button>
          </form>

          {/* Search Suggestions Dropdown */}
          {suggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/20 transition-colors border-b border-white/10 last:border-b-0 flex items-center gap-2"
                >
                  <span className="text-indigo-400">🔍</span>
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Search Insights - Show what AI understands */}
        {searchType === 'semantic' && searchQuery && (
          <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <div className="text-xs font-medium text-indigo-300 mb-2">🤖 AI Understands:</div>
            <div className="space-y-1 text-xs text-white/70">
              <div>• Document Type: <span className="text-white">Contracts</span></div>
              <div>• Time Period: <span className="text-white">Q3 2025</span></div>
              <div>• Value Filter: <span className="text-white">&gt; $50,000</span></div>
              <div>• Status: <span className="text-white">Pending Legal Review</span></div>
              <div>• Location: <span className="text-white">London Office</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Filters */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white/80 mb-3">Smart Filters</h3>
        <div className="space-y-2">
          {[
            { label: 'High Value Assets', count: 24 },
            { label: 'Pending Review', count: 12 },
            { label: 'Expiring Soon', count: 8 },
            { label: 'Physical Tracked', count: 15 },
            { label: 'Recently Modified', count: 45 }
          ].map((filter) => (
            <button
              key={filter.label}
              className="w-full text-left px-3 py-2 bg-white/5 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-all flex items-center justify-between"
            >
              <span>{filter.label}</span>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded">{filter.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white/80 mb-3">Filters</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/60 mb-1 block">Document Type</label>
            <select className="w-full text-sm bg-white/5 border border-white/20 rounded px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option className="bg-slate-800 text-white">All Types</option>
              <option className="bg-slate-800 text-white">Contracts</option>
              <option className="bg-slate-800 text-white">Invoices</option>
              <option className="bg-slate-800 text-white">Patents</option>
              <option className="bg-slate-800 text-white">Reports</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Date Range</label>
            <select className="w-full text-sm bg-white/5 border border-white/20 rounded px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option className="bg-slate-800 text-white">All Time</option>
              <option className="bg-slate-800 text-white">Last 7 days</option>
              <option className="bg-slate-800 text-white">Last 30 days</option>
              <option className="bg-slate-800 text-white">Last Quarter</option>
              <option className="bg-slate-800 text-white">Last Year</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Status</label>
            <select className="w-full text-sm bg-white/5 border border-white/20 rounded px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option className="bg-slate-800 text-white">All Status</option>
              <option className="bg-slate-800 text-white">Pending Review</option>
              <option className="bg-slate-800 text-white">Approved</option>
              <option className="bg-slate-800 text-white">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabbed Section - Recent Searches & Statistics */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-4 pt-4 pb-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-3 py-2 rounded-t text-xs font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-white/10 text-white border-b-2 border-indigo-500'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            🕒 History
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-3 py-2 rounded-t text-xs font-medium transition-all ${
              activeTab === 'stats'
                ? 'bg-white/10 text-white border-b-2 border-indigo-500'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            📊 Stats
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'history' ? (
            <div className="p-4">
              {searchHistory && searchHistory.length > 0 ? (
                <div className="space-y-2">
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        onSearchQueryChange(item.query);
                        setTimeout(() => onSearch({ preventDefault: () => {} } as React.FormEvent), 100);
                      }}
                      className="w-full text-left p-2 bg-white/5 rounded text-xs text-white/70 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span>🕒</span>
                        <span className="flex-1 truncate">{item.query}</span>
                      </div>
                      <div className="text-[10px] text-white/40 mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🕒</div>
                  <p className="text-xs text-white/60">No recent searches</p>
                  <p className="text-[10px] text-white/40 mt-1">Your search history will appear here</p>
                </div>
              )}
            </div>
          ) : (
            <SearchStatsPanel />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentSearchPanel;
