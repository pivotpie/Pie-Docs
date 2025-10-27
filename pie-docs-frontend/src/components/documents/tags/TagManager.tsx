import React, { useState, useEffect } from 'react';
import { tagsService } from '@/services/api/tagsService';
import type { Tag as APITag } from '@/services/api/tagsService';

// Tag Types
export interface TagRule {
  id: string;
  condition: string;
  value: string;
}

export interface Tag {
  id: string;
  name: string;
  category: string;
  color: string;
  description?: string;
  usageCount: number;
  createdDate: string;
  lastUsed: string;
  parentTagId?: string;
  synonyms?: string[];
  autoRules?: TagRule[];
  restricted: boolean;
  requiredFor?: string[];
}

export type TagViewMode = 'cloud' | 'list' | 'category' | 'analytics';

interface TagManagerProps {
  // No props needed initially since it manages its own state
}

const TagManager: React.FC<TagManagerProps> = () => {
  // State
  const [tagViewMode, setTagViewMode] = useState<TagViewMode>('cloud');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showNewTagDialog, setShowNewTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('bg-blue-500/20 text-blue-300');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback mock data
  const mockTags: Tag[] = [
    { id: '1', name: 'urgent', category: 'Priority', color: 'bg-red-500/20 text-red-300', usageCount: 145, createdDate: '2024-01-10', lastUsed: '2025-10-02', restricted: false, description: 'High priority documents requiring immediate attention' },
    { id: '2', name: 'legal-review', category: 'Status', color: 'bg-purple-500/20 text-purple-300', usageCount: 89, createdDate: '2024-01-15', lastUsed: '2025-10-01', restricted: true, requiredFor: ['contract'], description: 'Documents pending legal department review' },
    { id: '3', name: 'approved', category: 'Status', color: 'bg-green-500/20 text-green-300', usageCount: 234, createdDate: '2024-01-10', lastUsed: '2025-10-02', restricted: false, description: 'Approved documents ready for use' },
    { id: '4', name: 'Q3-2025', category: 'Time Period', color: 'bg-blue-500/20 text-blue-300', usageCount: 178, createdDate: '2024-07-01', lastUsed: '2025-09-30', restricted: false, description: 'Third quarter 2025 documents' },
    { id: '5', name: 'Q4-2025', category: 'Time Period', color: 'bg-blue-500/20 text-blue-300', usageCount: 56, createdDate: '2024-10-01', lastUsed: '2025-10-02', restricted: false, description: 'Fourth quarter 2025 documents' },
    { id: '6', name: 'London', category: 'Location', color: 'bg-cyan-500/20 text-cyan-300', usageCount: 102, createdDate: '2024-02-01', lastUsed: '2025-09-28', restricted: false, parentTagId: 'uk', description: 'Documents related to London office' },
    { id: '7', name: 'New York', category: 'Location', color: 'bg-cyan-500/20 text-cyan-300', usageCount: 87, createdDate: '2024-02-01', lastUsed: '2025-09-29', restricted: false, parentTagId: 'usa', description: 'Documents related to New York office' },
    { id: '8', name: 'vendor', category: 'Type', color: 'bg-amber-500/20 text-amber-300', usageCount: 156, createdDate: '2024-01-10', lastUsed: '2025-10-02', restricted: false, synonyms: ['supplier', 'provider'], description: 'Vendor and supplier related documents' },
    { id: '9', name: 'confidential', category: 'Classification', color: 'bg-red-500/20 text-red-300', usageCount: 67, createdDate: '2024-01-10', lastUsed: '2025-10-01', restricted: true, description: 'Confidential documents with restricted access' },
    { id: '10', name: 'public', category: 'Classification', color: 'bg-green-500/20 text-green-300', usageCount: 245, createdDate: '2024-01-10', lastUsed: '2025-10-02', restricted: false, description: 'Public documents available to all' },
    { id: '11', name: 'finance', category: 'Department', color: 'bg-indigo-500/20 text-indigo-300', usageCount: 198, createdDate: '2024-01-15', lastUsed: '2025-10-02', restricted: false, description: 'Finance department documents' },
    { id: '12', name: 'legal', category: 'Department', color: 'bg-purple-500/20 text-purple-300', usageCount: 123, createdDate: '2024-01-15', lastUsed: '2025-10-01', restricted: false, description: 'Legal department documents' },
    { id: '13', name: 'hr', category: 'Department', color: 'bg-pink-500/20 text-pink-300', usageCount: 91, createdDate: '2024-01-15', lastUsed: '2025-09-30', restricted: true, description: 'Human resources documents' },
    { id: '14', name: 'draft', category: 'Status', color: 'bg-gray-500/20 text-gray-300', usageCount: 45, createdDate: '2024-01-20', lastUsed: '2025-10-02', restricted: false, description: 'Documents in draft status' },
    { id: '15', name: 'archived', category: 'Status', color: 'bg-slate-500/20 text-slate-300', usageCount: 312, createdDate: '2024-01-20', lastUsed: '2025-09-15', restricted: false, description: 'Archived historical documents' },
    { id: '16', name: 'patent', category: 'Type', color: 'bg-amber-500/20 text-amber-300', usageCount: 23, createdDate: '2024-03-10', lastUsed: '2025-09-20', restricted: true, description: 'Patent and IP related documents' },
    { id: '17', name: 'contract', category: 'Type', color: 'bg-amber-500/20 text-amber-300', usageCount: 134, createdDate: '2024-01-10', lastUsed: '2025-10-01', restricted: false, description: 'Contract documents' },
    { id: '18', name: 'invoice', category: 'Type', color: 'bg-amber-500/20 text-amber-300', usageCount: 267, createdDate: '2024-01-10', lastUsed: '2025-10-02', restricted: false, synonyms: ['bill', 'receipt'], description: 'Invoice and billing documents' },
  ];

  // Load tags from API
  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiTags = await tagsService.getTags(1, 100);

      // Transform API tags to local format
      const transformedTags: Tag[] = apiTags.map((tag: APITag) => ({
        id: tag.id,
        name: tag.name,
        category: 'General', // API doesn't have category yet
        color: tag.color || 'bg-gray-500/20 text-gray-300',
        description: '',
        usageCount: tag.usage_count || 0,
        createdDate: new Date(tag.created_at || Date.now()).toLocaleDateString(),
        lastUsed: new Date(tag.created_at || Date.now()).toLocaleDateString(),
        restricted: false,
        synonyms: [],
        autoRules: []
      }));

      setTags(transformedTags);

    } catch (err) {
      console.error('Error loading tags:', err);
      setError('Failed to load tags');
      // Fallback to mock data
      setTags(mockTags);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations
  const handleCreateTag = async (tagData: { name: string; color?: string }) => {
    try {
      setLoading(true);
      await tagsService.createTag(tagData);
      await loadTags(); // Reload tags
      setShowNewTagDialog(false);
      setNewTagName('');
    } catch (err) {
      console.error('Error creating tag:', err);
      setError('Failed to create tag');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTag = async (tagId: string, tagData: { name?: string; color?: string }) => {
    try {
      setLoading(true);
      await tagsService.updateTag(tagId, tagData);
      await loadTags(); // Reload tags
    } catch (err) {
      console.error('Error updating tag:', err);
      setError('Failed to update tag');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      setLoading(true);
      await tagsService.deleteTag(tagId);
      await loadTags(); // Reload tags
      if (selectedTag?.id === tagId) {
        setSelectedTag(null);
      }
    } catch (err) {
      console.error('Error deleting tag:', err);
      setError('Failed to delete tag');
    } finally {
      setLoading(false);
    }
  };

  const tagCategories = ['all', 'Priority', 'Status', 'Time Period', 'Location', 'Type', 'Classification', 'Department'];

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Loading/Error States */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel p-6 rounded-lg">
            <div className="text-white text-center">
              <div className="text-2xl mb-2">⏳</div>
              <div>Loading tags...</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
          <div className="text-red-200 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => {
                setError(null);
                loadTags();
              }}
              className="ml-auto btn-glass px-3 py-1 text-xs"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Tag Manager</h2>
            {tags.length > 0 && (
              <p className="text-sm text-white/60 mt-1">{tags.length} tags • {tags.reduce((sum, tag) => sum + tag.usageCount, 0)} total uses</p>
            )}
          </div>
          <button
            onClick={() => setShowNewTagDialog(true)}
            className="btn-glass px-4 py-2 flex items-center gap-2"
            disabled={loading}
          >
            <span>➕</span>
            New Tag
          </button>
        </div>

        {/* View Switcher & Category Filter */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTagViewMode('cloud')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tagViewMode === 'cloud'
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              ☁️ Cloud
            </button>
            <button
              onClick={() => setTagViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tagViewMode === 'list'
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setTagViewMode('category')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tagViewMode === 'category'
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              📁 Category
            </button>
            <button
              onClick={() => setTagViewMode('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tagViewMode === 'analytics'
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              📊 Analytics
            </button>
          </div>

          {/* Category Filter */}
          {tagViewMode !== 'analytics' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            >
              {tagCategories.map(cat => (
                <option key={cat} value={cat} className="bg-slate-800 text-white">{cat === 'all' ? 'All Categories' : cat}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Main Area */}
        <div className="flex-1 p-6">
          {/* Cloud View */}
          {tagViewMode === 'cloud' && (
            <div className="glass-panel p-8 rounded-lg">
              <div className="flex flex-wrap items-center justify-center gap-4">
                {tags
                  .filter(tag => selectedCategory === 'all' || tag.category === selectedCategory)
                  .map(tag => {
                    const size = tag.usageCount > 100 ? 'text-3xl' : tag.usageCount > 50 ? 'text-2xl' : 'text-xl';
                    return (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTag(tag)}
                        className={`${tag.color} px-4 py-2 rounded-lg ${size} font-medium transition-all cursor-pointer ${
                          selectedTag?.id === tag.id ? 'ring-2 ring-white/50' : ''
                        }`}
                      >
                        {tag.name}
                        {tag.restricted && <span className="ml-2 text-sm">🔒</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* List View */}
          {tagViewMode === 'list' && (
            <div className="glass-panel rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Tag</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Last Used</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tags
                    .filter(tag => selectedCategory === 'all' || tag.category === selectedCategory)
                    .map(tag => (
                      <tr
                        key={tag.id}
                        onClick={() => setSelectedTag(tag)}
                        className={`cursor-pointer transition-colors ${
                          selectedTag?.id === tag.id ? 'bg-indigo-500/20' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`${tag.color} px-3 py-1 rounded-full text-sm font-medium`}>
                              {tag.name}
                            </span>
                            {tag.restricted && <span>🔒</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/70">{tag.category}</td>
                        <td className="px-6 py-4 text-sm text-white">{tag.usageCount}</td>
                        <td className="px-6 py-4 text-sm text-white/70">{tag.lastUsed}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">Active</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Category View */}
          {tagViewMode === 'category' && (
            <div className="space-y-6">
              {tagCategories
                .filter(cat => cat !== 'all')
                .filter(cat => selectedCategory === 'all' || cat === selectedCategory)
                .map(category => {
                  const categoryTags = tags.filter(tag => tag.category === category);
                  return (
                    <div key={category} className="glass-panel p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">{category}</h3>
                        <span className="text-sm text-white/60">{categoryTags.length} tags</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {categoryTags.map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => setSelectedTag(tag)}
                            className={`${tag.color} px-4 py-2 rounded-lg text-base font-medium transition-all cursor-pointer flex items-center gap-2 ${
                              selectedTag?.id === tag.id ? 'ring-2 ring-white/50' : ''
                            }`}
                          >
                            {tag.name}
                            <span className="text-xs opacity-70">({tag.usageCount})</span>
                            {tag.restricted && <span className="text-sm">🔒</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Analytics View */}
          {tagViewMode === 'analytics' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Total Tags</div>
                  <div className="text-3xl font-bold text-white">{tags.length}</div>
                </div>
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Total Usage</div>
                  <div className="text-3xl font-bold text-white">
                    {tags.reduce((sum, tag) => sum + tag.usageCount, 0)}
                  </div>
                </div>
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Categories</div>
                  <div className="text-3xl font-bold text-white">{tagCategories.length - 1}</div>
                </div>
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Restricted Tags</div>
                  <div className="text-3xl font-bold text-white">
                    {tags.filter(t => t.restricted).length}
                  </div>
                </div>
              </div>

              {/* Top Tags */}
              <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-4">Top Tags by Usage</h3>
                <div className="space-y-3">
                  {tags
                    .sort((a, b) => b.usageCount - a.usageCount)
                    .slice(0, 10)
                    .map((tag, index) => (
                      <div key={tag.id} className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-white/40 w-8">#{index + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`${tag.color} px-3 py-1 rounded-full text-sm font-medium`}>
                              {tag.name}
                            </span>
                            <span className="text-xs text-white/60">{tag.category}</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500"
                              style={{ width: `${(tag.usageCount / tags[0].usageCount) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-lg font-bold text-white w-16 text-right">{tag.usageCount}</div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Category Distribution */}
              <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-4">Category Distribution</h3>
                <div className="space-y-3">
                  {tagCategories
                    .filter(cat => cat !== 'all')
                    .map(category => {
                      const categoryTags = tags.filter(tag => tag.category === category);
                      const totalUsage = categoryTags.reduce((sum, tag) => sum + tag.usageCount, 0);
                      return (
                        <div key={category} className="flex items-center gap-4">
                          <div className="w-32 text-sm text-white font-medium">{category}</div>
                          <div className="flex-1">
                            <div className="h-8 bg-white/10 rounded-lg overflow-hidden flex">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium"
                                style={{ width: `${(totalUsage / tags.reduce((s, t) => s + t.usageCount, 0)) * 100}%` }}
                              >
                                {totalUsage > 50 ? `${totalUsage}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="w-20 text-right">
                            <div className="text-sm text-white font-medium">{categoryTags.length} tags</div>
                            <div className="text-xs text-white/60">{totalUsage} uses</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Tag Details */}
        {selectedTag && tagViewMode !== 'analytics' && (
          <div className="w-96 border-l border-white/10">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <span className={`${selectedTag.color} px-4 py-2 rounded-lg text-xl font-bold inline-block mb-2`}>
                    {selectedTag.name}
                  </span>
                  <div className="text-sm text-white/60">{selectedTag.category}</div>
                </div>
                <button onClick={() => setSelectedTag(null)} className="btn-glass p-2 text-sm">✕</button>
              </div>

              <div className="space-y-4">
                {/* Description */}
                {selectedTag.description && (
                  <div>
                    <div className="text-xs text-white/60 mb-1">Description</div>
                    <p className="text-sm text-white/80">{selectedTag.description}</p>
                  </div>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-panel p-3 rounded-lg">
                    <div className="text-xs text-white/60">Usage Count</div>
                    <div className="text-2xl font-bold text-white">{selectedTag.usageCount}</div>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <div className="text-xs text-white/60">Last Used</div>
                    <div className="text-sm font-medium text-white mt-1">{selectedTag.lastUsed}</div>
                  </div>
                </div>

                {/* Synonyms */}
                {selectedTag.synonyms && selectedTag.synonyms.length > 0 && (
                  <div>
                    <div className="text-xs text-white/60 mb-2">Synonyms</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTag.synonyms.map((syn, i) => (
                        <span key={i} className="px-2 py-1 bg-white/10 text-white text-xs rounded">
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-tagging Rules */}
                {selectedTag.autoRules && selectedTag.autoRules.length > 0 && (
                  <div>
                    <div className="text-xs text-white/60 mb-2">Auto-tagging Rules</div>
                    <div className="space-y-2">
                      {selectedTag.autoRules.map(rule => (
                        <div key={rule.id} className="p-2 bg-white/5 rounded text-xs">
                          <div className="text-white/80">
                            {rule.condition} = <span className="text-indigo-300">{rule.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Restricted</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedTag.restricted
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {selectedTag.restricted ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {selectedTag.requiredFor && selectedTag.requiredFor.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Required For</span>
                      <span className="text-sm text-indigo-300">{selectedTag.requiredFor.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Created</span>
                    <span className="text-sm text-white">{selectedTag.createdDate}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>✏️</span>
                    Edit Tag
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>🔗</span>
                    Manage Synonyms
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>⚙️</span>
                    Auto-tag Rules
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>📊</span>
                    View Usage
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2 text-red-400">
                    <span>🗑️</span>
                    Delete Tag
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Tag Dialog */}
      {showNewTagDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-strong p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold text-white mb-4">Create New Tag</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Tag Name</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name..."
                  className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-white/40"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Category</label>
                <select className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white">
                  {tagCategories.filter(cat => cat !== 'all').map(cat => (
                    <option key={cat} value={cat} className="bg-slate-800 text-white">{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    'bg-red-500/20 text-red-300',
                    'bg-blue-500/20 text-blue-300',
                    'bg-green-500/20 text-green-300',
                    'bg-yellow-500/20 text-yellow-300',
                    'bg-purple-500/20 text-purple-300',
                    'bg-pink-500/20 text-pink-300',
                    'bg-indigo-500/20 text-indigo-300',
                    'bg-orange-500/20 text-orange-300',
                  ].map((color, i) => (
                    <button
                      key={i}
                      onClick={() => setNewTagColor(color)}
                      className={`${color} h-10 rounded-lg border-2 ${newTagColor === color ? 'border-white' : 'border-transparent'} hover:border-white/50`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowNewTagDialog(false);
                    setNewTagName('');
                    setNewTagColor('bg-blue-500/20 text-blue-300');
                  }}
                  className="flex-1 btn-glass py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newTagName.trim()) {
                      handleCreateTag({ name: newTagName.trim(), color: newTagColor });
                      setNewTagName('');
                      setNewTagColor('bg-blue-500/20 text-blue-300');
                    }
                  }}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
                  disabled={!newTagName.trim() || loading}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManager;
