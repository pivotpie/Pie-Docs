/**
 * KeyTermsViewerWorkspace - Full-page key terms viewer
 * Displays AI-extracted key terms with filtering and search
 */

import React, { useState, useEffect } from 'react';
import type { DocumentKeyTerm } from '@/services/api/aiService';
import { aiService } from '@/services/api/aiService';

export interface KeyTermsViewerWorkspaceProps {
  document: any;
  onBack: () => void;
  className?: string;
}

export const KeyTermsViewerWorkspace: React.FC<KeyTermsViewerWorkspaceProps> = ({
  document,
  onBack,
  className = '',
}) => {
  const [terms, setTerms] = useState<DocumentKeyTerm[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<DocumentKeyTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<DocumentKeyTerm | null>(null);

  useEffect(() => {
    loadKeyTerms();
  }, [document.id]);

  useEffect(() => {
    filterTerms();
  }, [terms, searchQuery, selectedCategory, selectedImportance]);

  const loadKeyTerms = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await aiService.getDocumentKeyTerms(document.id);
      setTerms(result.terms || []);
    } catch (err) {
      console.error('Failed to load key terms:', err);
      setError('No key terms available for this document');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTerms = () => {
    let filtered = [...terms];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(term =>
        term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(term => term.category === selectedCategory);
    }

    // Filter by importance
    if (selectedImportance !== 'all') {
      filtered = filtered.filter(term => term.importance === selectedImportance);
    }

    setFilteredTerms(filtered);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      legal: '⚖️',
      financial: '💰',
      technical: '🔧',
      date: '📅',
      party: '👤',
      other: '📌'
    };
    return icons[category] || '📌';
  };

  const getImportanceColor = (importance: string) => {
    const colors: Record<string, string> = {
      critical: 'red',
      important: 'amber',
      reference: 'blue'
    };
    return colors[importance] || 'gray';
  };

  const categoryCounts = terms.reduce((acc, term) => {
    acc[term.category] = (acc[term.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const importanceCounts = terms.reduce((acc, term) => {
    acc[term.importance] = (acc[term.importance] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-white/60">Loading key terms...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with Breadcrumb */}
      <div className="flex-shrink-0 border-b border-white/10 glass-panel p-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Back to Preview"
          >
            <span className="text-white/70">←</span>
          </button>
          <div className="flex-1">
            <div className="text-xs text-white/40 mb-1">
              Document Preview / AI Tools
            </div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📋</span>
              Key Terms & Definitions
            </h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{terms.length}</div>
            <div className="text-xs text-white/50">Terms Found</div>
          </div>
        </div>
        <p className="text-xs text-white/60 ml-11">
          AI-extracted key terms from <span className="font-medium text-white">{document.name}</span>
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar: Filters */}
        <div className="w-64 border-r border-white/10 overflow-y-auto p-4">
          {/* Search */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-white mb-2">Search Terms</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms..."
              className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-white mb-2">Category</label>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-500/20 text-white border border-indigo-500/40'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="font-medium">All Categories</span>
                <span className="float-right text-white/50">{terms.length}</span>
              </button>
              {Object.entries(categoryCounts).map(([category, count]) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    selectedCategory === category
                      ? 'bg-indigo-500/20 text-white border border-indigo-500/40'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="mr-2">{getCategoryIcon(category)}</span>
                  <span className="font-medium capitalize">{category}</span>
                  <span className="float-right text-white/50">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Importance Filter */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-white mb-2">Importance</label>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedImportance('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  selectedImportance === 'all'
                    ? 'bg-purple-500/20 text-white border border-purple-500/40'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="font-medium">All</span>
                <span className="float-right text-white/50">{terms.length}</span>
              </button>
              {Object.entries(importanceCounts).map(([importance, count]) => (
                <button
                  key={importance}
                  onClick={() => setSelectedImportance(importance)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    selectedImportance === importance
                      ? 'bg-purple-500/20 text-white border border-purple-500/40'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="font-medium capitalize">{importance}</span>
                  <span className="float-right text-white/50">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export */}
          <div>
            <button className="w-full btn-glass text-xs py-2.5 hover:bg-white/10">
              💾 Export as CSV
            </button>
          </div>
        </div>

        {/* Main Content: Terms List */}
        <div className="flex-1 overflow-hidden flex">
          {/* Terms List */}
          <div className={`${selectedTerm ? 'w-1/2' : 'w-full'} overflow-y-auto p-6 border-r border-white/10`}>
            {error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="text-5xl mb-4">📭</div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Key Terms Available</h3>
                  <p className="text-sm text-white/60">{error}</p>
                </div>
              </div>
            ) : filteredTerms.length > 0 ? (
              <div className="space-y-3">
                {filteredTerms.map((term) => {
                  const importanceColor = getImportanceColor(term.importance);
                  return (
                    <div
                      key={term.id}
                      onClick={() => setSelectedTerm(term)}
                      className={`glass-panel p-4 rounded-lg cursor-pointer transition-all hover:bg-white/10 ${
                        selectedTerm?.id === term.id ? 'ring-2 ring-indigo-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(term.category)}</span>
                          <h4 className="text-sm font-semibold text-white">{term.term}</h4>
                        </div>
                        <span className={`px-2 py-0.5 bg-${importanceColor}-500/20 text-${importanceColor}-300 rounded-full text-[10px] font-medium`}>
                          {term.importance}
                        </span>
                      </div>
                      {term.definition && (
                        <p className="text-xs text-white/70 line-clamp-2 mb-2">
                          {term.definition}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-white/50">
                        <span className="capitalize">{term.category}</span>
                        {term.page_references && term.page_references.length > 0 && (
                          <>
                            <span>•</span>
                            <span>Pages: {term.page_references.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Terms Found</h3>
                  <p className="text-sm text-white/60">
                    Try adjusting your filters or search query.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Term Detail Panel */}
          {selectedTerm && (
            <div className="w-1/2 overflow-y-auto p-6 bg-white/5">
              <div className="mb-4">
                <button
                  onClick={() => setSelectedTerm(null)}
                  className="text-xs text-white/60 hover:text-white mb-2"
                >
                  ← Back to list
                </button>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryIcon(selectedTerm.category)}</span>
                    <h3 className="text-xl font-bold text-white">{selectedTerm.term}</h3>
                  </div>
                  <span className={`px-3 py-1 bg-${getImportanceColor(selectedTerm.importance)}-500/20 text-${getImportanceColor(selectedTerm.importance)}-300 rounded-full text-xs font-medium`}>
                    {selectedTerm.importance}
                  </span>
                </div>
              </div>

              {/* Definition */}
              {selectedTerm.definition && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-white mb-2">Definition</h4>
                  <div className="glass-panel p-4 rounded-lg">
                    <p className="text-sm text-white/80 leading-relaxed">
                      {selectedTerm.definition}
                    </p>
                  </div>
                </div>
              )}

              {/* Context */}
              {selectedTerm.context && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-white mb-2">Context</h4>
                  <div className="glass-panel p-4 rounded-lg">
                    <p className="text-xs text-white/70 leading-relaxed italic">
                      "{selectedTerm.context}"
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-white mb-2">Details</h4>
                <div className="glass-panel p-4 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">Category:</span>
                    <span className="text-white font-medium capitalize">{selectedTerm.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Importance:</span>
                    <span className="text-white font-medium capitalize">{selectedTerm.importance}</span>
                  </div>
                  {selectedTerm.page_references && selectedTerm.page_references.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Page References:</span>
                      <span className="text-white font-medium">
                        {selectedTerm.page_references.join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/60">Created:</span>
                    <span className="text-white font-medium">
                      {new Date(selectedTerm.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button className="w-full btn-glass text-xs py-2.5 hover:bg-white/10">
                  📋 Copy Definition
                </button>
                <button className="w-full btn-glass text-xs py-2.5 hover:bg-white/10">
                  🔍 Find in Document
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyTermsViewerWorkspace;
