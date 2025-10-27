import React, { useState, useCallback } from 'react';
import {
  BookmarkIcon,
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  ShareIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  FolderIcon,
  UserGroupIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

interface SavedSearch {
  id: string;
  name: string;
  description: string;
  query: string;
  filters: SearchFilter[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
  isShared: boolean;
  category: 'personal' | 'team' | 'public';
  tags: string[];
  executionCount: number;
  lastExecuted?: Date;
  isFavorite: boolean;
}

interface SearchFilter {
  id: string;
  field: string;
  operator: string;
  value: any;
  label: string;
}

interface SavedSearchManagerProps {
  savedSearches: SavedSearch[];
  onExecuteSearch: (search: SavedSearch) => void;
  onSaveSearch: (search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecuted'>) => void;
  onUpdateSearch: (id: string, updates: Partial<SavedSearch>) => void;
  onDeleteSearch: (id: string) => void;
  onShareSearch: (id: string, shareSettings: ShareSettings) => void;
  currentQuery?: string;
  currentFilters?: SearchFilter[];
  className?: string;
}

interface ShareSettings {
  category: 'team' | 'public';
  permissions: 'view' | 'edit';
  expiresAt?: Date;
}

interface SaveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecuted'>) => void;
  query?: string;
  filters?: SearchFilter[];
  editingSearch?: SavedSearch;
}

const SaveSearchModal: React.FC<SaveSearchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  query = '',
  filters = [],
  editingSearch
}) => {
  const [formData, setFormData] = useState({
    name: editingSearch?.name || '',
    description: editingSearch?.description || '',
    category: editingSearch?.category || 'personal' as const,
    tags: editingSearch?.tags?.join(', ') || '',
    isShared: editingSearch?.isShared || false,
    isFavorite: editingSearch?.isFavorite || false
  });

  const handleSave = () => {
    const searchData = {
      name: formData.name,
      description: formData.description,
      query: editingSearch?.query || query,
      filters: editingSearch?.filters || filters,
      author: 'current-user', // This would come from auth context
      isShared: formData.isShared,
      category: formData.category,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      isFavorite: formData.isFavorite
    };

    onSave(searchData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingSearch ? 'Edit' : 'Save'} Search
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter a name for this search..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this search is for..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="personal">Personal</option>
                <option value="team">Team</option>
                <option value="public">Public</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="document, urgent, monthly-report..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFavorite: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Mark as favorite</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isShared}
                  onChange={(e) => setFormData(prev => ({ ...prev, isShared: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Share with team</span>
              </label>
            </div>

            {/* Query Preview */}
            <div className="bg-gray-50 rounded-md p-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Search Query Preview:</div>
              <div className="text-xs font-mono text-gray-600 break-all">
                {editingSearch?.query || query || 'No query specified'}
              </div>
              {(editingSearch?.filters || filters).length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Filters:</div>
                  <div className="flex flex-wrap gap-1">
                    {(editingSearch?.filters || filters).map((filter, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        {filter.label || `${filter.field}: ${filter.value}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md"
            >
              {editingSearch ? 'Update' : 'Save'} Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SavedSearchManager: React.FC<SavedSearchManagerProps> = ({
  savedSearches,
  onExecuteSearch,
  onSaveSearch,
  onUpdateSearch,
  onDeleteSearch,
  onShareSearch,
  currentQuery,
  currentFilters = [],
  className = ''
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'personal' | 'team' | 'public' | 'favorites'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSearches = savedSearches.filter(search => {
    const matchesCategory = selectedCategory === 'all' ||
                           (selectedCategory === 'favorites' ? search.isFavorite : search.category === selectedCategory);
    const matchesSearch = search.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         search.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         search.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const handleExecuteSearch = useCallback((search: SavedSearch) => {
    onUpdateSearch(search.id, {
      executionCount: search.executionCount + 1,
      lastExecuted: new Date()
    });
    onExecuteSearch(search);
  }, [onExecuteSearch, onUpdateSearch]);

  const handleToggleFavorite = useCallback((search: SavedSearch) => {
    onUpdateSearch(search.id, { isFavorite: !search.isFavorite });
  }, [onUpdateSearch]);

  const handleEditSearch = useCallback((search: SavedSearch) => {
    setEditingSearch(search);
    setShowSaveModal(true);
  }, []);

  const handleSaveFromModal = useCallback((searchData: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecuted'>) => {
    if (editingSearch) {
      onUpdateSearch(editingSearch.id, {
        ...searchData,
        updatedAt: new Date()
      });
    } else {
      onSaveSearch(searchData);
    }
    setEditingSearch(undefined);
  }, [editingSearch, onSaveSearch, onUpdateSearch]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal':
        return <BookmarkIcon className="h-4 w-4" />;
      case 'team':
        return <UserGroupIcon className="h-4 w-4" />;
      case 'public':
        return <FolderIcon className="h-4 w-4" />;
      default:
        return <BookmarkIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <BookmarkIcon className="h-5 w-5 mr-2 text-blue-600" />
            Saved Searches
          </h3>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!currentQuery}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Save Current Search
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex space-x-4 mb-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search saved searches..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="favorites">Favorites</option>
            <option value="personal">Personal</option>
            <option value="team">Team</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {filteredSearches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BookmarkIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-sm">
              {searchTerm || selectedCategory !== 'all'
                ? 'No saved searches match your criteria'
                : 'No saved searches yet'
              }
            </p>
            {!currentQuery && (
              <p className="text-xs mt-2">
                Perform a search to save it for future use
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredSearches.map((search) => (
              <div
                key={search.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {search.name}
                      </h4>
                      <div className="flex items-center space-x-1">
                        {getCategoryIcon(search.category)}
                        {search.isFavorite && (
                          <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                        {search.isShared && (
                          <ShareIcon className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>

                    {search.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {search.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                      <span className="flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {search.executionCount} uses
                      </span>
                      {search.lastExecuted && (
                        <span>
                          Last used: {search.lastExecuted.toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {search.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {search.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs font-mono text-gray-500 bg-gray-50 rounded p-2 truncate">
                      {search.query}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleFavorite(search)}
                      className="text-gray-400 hover:text-yellow-500"
                      title={search.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {search.isFavorite ? (
                        <BookmarkSolidIcon className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <BookmarkIcon className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleEditSearch(search)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Edit search"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => onDeleteSearch(search.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete search"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleExecuteSearch(search)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-600 hover:border-blue-700 rounded"
                    >
                      Execute
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SaveSearchModal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setEditingSearch(undefined);
        }}
        onSave={handleSaveFromModal}
        query={currentQuery}
        filters={currentFilters}
        editingSearch={editingSearch}
      />
    </div>
  );
};

export default SavedSearchManager;