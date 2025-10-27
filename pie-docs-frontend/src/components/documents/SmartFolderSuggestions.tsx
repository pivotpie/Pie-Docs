import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderIcon,
  ClockIcon,
  StarIcon,
  TagIcon,
  DocumentTextIcon,
  SparklesIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface FolderSuggestion {
  id: string;
  name: string;
  path: string;
  type: 'recent' | 'frequent' | 'smart' | 'favorite' | 'similar';
  description?: string;
  confidence?: number;
  icon?: React.ReactNode;
  metadata?: {
    lastUsed?: Date;
    useCount?: number;
    fileTypes?: string[];
    tags?: string[];
  };
}

interface SmartFolderSuggestionsProps {
  context?: {
    fileTypes?: string[];
    fileName?: string;
    fileContent?: string;
    metadata?: Record<string, any>;
    currentPath?: string;
  };
  onFolderSelect: (folder: FolderSuggestion) => void;
  onCreateFolder?: (name: string, parentPath?: string) => void;
  maxSuggestions?: number;
  showCreateNew?: boolean;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

// Mock data - In real implementation, this would come from backend/analytics
const mockFolderData = [
  {
    id: 'recent-1',
    name: 'Financial Reports',
    path: '/Documents/Financial/Reports',
    type: 'recent' as const,
    metadata: {
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      useCount: 45,
      fileTypes: ['pdf', 'xlsx', 'csv'],
      tags: ['financial', 'reports', 'quarterly']
    }
  },
  {
    id: 'frequent-1',
    name: 'Contracts',
    path: '/Documents/Legal/Contracts',
    type: 'frequent' as const,
    metadata: {
      lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      useCount: 120,
      fileTypes: ['pdf', 'docx'],
      tags: ['legal', 'contracts', 'agreements']
    }
  },
  {
    id: 'favorite-1',
    name: 'Project Alpha',
    path: '/Documents/Projects/Alpha',
    type: 'favorite' as const,
    metadata: {
      lastUsed: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      useCount: 89,
      fileTypes: ['pdf', 'docx', 'pptx', 'xlsx'],
      tags: ['project', 'alpha', 'priority']
    }
  },
  {
    id: 'smart-1',
    name: 'HR Policies',
    path: '/Documents/HR/Policies',
    type: 'smart' as const,
    confidence: 0.85,
    description: 'Suggested based on document type and content',
    metadata: {
      lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      useCount: 34,
      fileTypes: ['pdf', 'docx'],
      tags: ['hr', 'policies', 'employee']
    }
  },
  {
    id: 'similar-1',
    name: 'Marketing Materials',
    path: '/Documents/Marketing/Materials',
    type: 'similar' as const,
    confidence: 0.72,
    description: 'Similar to recently uploaded files',
    metadata: {
      lastUsed: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      useCount: 67,
      fileTypes: ['pdf', 'pptx', 'jpg', 'png'],
      tags: ['marketing', 'materials', 'campaigns']
    }
  }
];

// Generate smart suggestions based on context
const generateSmartSuggestions = (
  context: SmartFolderSuggestionsProps['context'],
  folders: typeof mockFolderData
): FolderSuggestion[] => {
  if (!context) return folders;

  return folders.map(folder => {
    let confidence = 0.5;
    const reasons: string[] = [];

    // File type matching
    if (context.fileTypes && folder.metadata?.fileTypes) {
      const matchingTypes = context.fileTypes.filter(type =>
        folder.metadata?.fileTypes?.includes(type)
      );
      if (matchingTypes.length > 0) {
        confidence += 0.3 * (matchingTypes.length / context.fileTypes.length);
        reasons.push(`Supports ${matchingTypes.join(', ')} files`);
      }
    }

    // File name analysis
    if (context.fileName) {
      const fileName = context.fileName.toLowerCase();
      const folderName = folder.name.toLowerCase();

      // Check for keyword matches
      const keywords = ['financial', 'legal', 'hr', 'marketing', 'project', 'report', 'contract'];
      const fileKeywords = keywords.filter(keyword => fileName.includes(keyword));
      const folderKeywords = keywords.filter(keyword => folderName.includes(keyword));

      const commonKeywords = fileKeywords.filter(keyword => folderKeywords.includes(keyword));
      if (commonKeywords.length > 0) {
        confidence += 0.25 * commonKeywords.length;
        reasons.push(`Matches keywords: ${commonKeywords.join(', ')}`);
      }
    }

    // Recent usage boost
    if (folder.metadata?.lastUsed) {
      const hoursSinceUsed = (Date.now() - folder.metadata.lastUsed.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUsed < 24) {
        confidence += 0.2 * (1 - hoursSinceUsed / 24);
        reasons.push('Recently used');
      }
    }

    // Frequency boost
    if (folder.metadata?.useCount && folder.metadata.useCount > 50) {
      confidence += 0.15;
      reasons.push('Frequently used');
    }

    // Current path context
    if (context.currentPath && folder.path.startsWith(context.currentPath)) {
      confidence += 0.1;
      reasons.push('In current location');
    }

    return {
      ...folder,
      confidence: Math.min(confidence, 1),
      description: reasons.length > 0 ? reasons.join(' • ') : folder.description
    };
  }).sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
};

const getSuggestionIcon = (type: FolderSuggestion['type']) => {
  switch (type) {
    case 'recent':
      return <ClockIcon className="w-4 h-4 text-blue-500" />;
    case 'frequent':
      return <DocumentTextIcon className="w-4 h-4 text-green-500" />;
    case 'favorite':
      return <StarIconSolid className="w-4 h-4 text-yellow-500" />;
    case 'smart':
      return <SparklesIcon className="w-4 h-4 text-purple-500" />;
    case 'similar':
      return <MagnifyingGlassIcon className="w-4 h-4 text-orange-500" />;
    default:
      return <FolderIcon className="w-4 h-4 text-gray-500" />;
  }
};

const getTypeLabel = (type: FolderSuggestion['type']) => {
  switch (type) {
    case 'recent':
      return 'Recently Used';
    case 'frequent':
      return 'Frequently Used';
    case 'favorite':
      return 'Favorite';
    case 'smart':
      return 'Smart Suggestion';
    case 'similar':
      return 'Similar Content';
    default:
      return 'Suggested';
  }
};

export const SmartFolderSuggestions: React.FC<SmartFolderSuggestionsProps> = ({
  context,
  onFolderSelect,
  onCreateFolder,
  maxSuggestions = 5,
  showCreateNew = true,
  className = '',
  isOpen = true,
  onToggle
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const suggestions = useMemo(() => {
    const smart = generateSmartSuggestions(context, mockFolderData);

    // Filter by search query if provided
    const filtered = searchQuery
      ? smart.filter(folder =>
          folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          folder.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          folder.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : smart;

    return filtered.slice(0, maxSuggestions);
  }, [context, searchQuery, maxSuggestions]);

  const handleCreateFolder = () => {
    if (newFolderName.trim() && onCreateFolder) {
      onCreateFolder(newFolderName.trim(), context?.currentPath);
      setNewFolderName('');
      setShowCreateForm(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md border border-blue-200"
      >
        <SparklesIcon className="w-4 h-4" />
        <span>Show Smart Suggestions</span>
      </button>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`} dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Smart Folder Suggestions
          </h3>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search folders..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            dir="auto"
          />
        </div>
      </div>

      {/* Suggestions List */}
      <div className="max-h-96 overflow-y-auto">
        {suggestions.length > 0 ? (
          <div className="p-2 space-y-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => onFolderSelect(suggestion)}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1">
                    {getSuggestionIcon(suggestion.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {suggestion.name}
                      </h4>
                      {suggestion.confidence && suggestion.confidence > 0.7 && (
                        <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>High Match</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                      {suggestion.path}
                    </p>

                    {suggestion.description && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                        {suggestion.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center space-x-1">
                          <span>{getTypeLabel(suggestion.type)}</span>
                        </span>

                        {suggestion.metadata?.lastUsed && (
                          <span className="inline-flex items-center space-x-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>{formatTimeAgo(suggestion.metadata.lastUsed)}</span>
                          </span>
                        )}

                        {suggestion.metadata?.useCount && (
                          <span className="inline-flex items-center space-x-1">
                            <DocumentTextIcon className="w-3 h-3" />
                            <span>{suggestion.metadata.useCount} files</span>
                          </span>
                        )}
                      </div>

                      {suggestion.confidence && (
                        <div className="text-xs text-gray-400">
                          {Math.round(suggestion.confidence * 100)}% match
                        </div>
                      )}
                    </div>

                    {/* File types */}
                    {suggestion.metadata?.fileTypes && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestion.metadata.fileTypes.slice(0, 3).map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          >
                            {type.toUpperCase()}
                          </span>
                        ))}
                        {suggestion.metadata.fileTypes.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{suggestion.metadata.fileTypes.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No folders found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Try adjusting your search terms.' : 'No folder suggestions available.'}
            </p>
          </div>
        )}
      </div>

      {/* Create New Folder */}
      {showCreateNew && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              <span>Create New Folder</span>
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  }
                }}
                autoFocus
                dir="auto"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewFolderName('');
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartFolderSuggestions;