import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';

interface FolderNode {
  id: string;
  name: string;
  type: 'folder' | 'document';
  children?: FolderNode[];
  documentCount?: number;
  size?: number;
  isShared?: boolean;
  lastModified?: Date;
  path: string;
}

interface FolderTreeWidgetProps extends WidgetProps {
  rootFolder?: FolderNode;
  maxDepth?: number;
  showDocumentCount?: boolean;
  showSize?: boolean;
  onNodeClick?: (node: FolderNode) => void;
  onNodeExpand?: (nodeId: string, expanded: boolean) => void;
}

const FolderTreeWidget: React.FC<FolderTreeWidgetProps> = ({
  rootFolder = generateMockFolderTree(),
  maxDepth = 3,
  showDocumentCount = true,
  showSize = false,
  onNodeClick,
  onNodeExpand,
  ...widgetProps
}) => {
  const { t } = useTranslation('dashboard');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'personal', 'shared']));
  const [searchTerm, setSearchTerm] = useState('');

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (expandedNodes.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
    onNodeExpand?.(nodeId, !expandedNodes.has(nodeId));
  };

  const formatSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
  };

  const filterNodes = (node: FolderNode, searchTerm: string): FolderNode | null => {
    if (!searchTerm) return node;

    const nameMatches = node.name.toLowerCase().includes(searchTerm.toLowerCase());
    const filteredChildren = node.children
      ?.map(child => filterNodes(child, searchTerm))
      .filter(Boolean) as FolderNode[];

    if (nameMatches || (filteredChildren && filteredChildren.length > 0)) {
      return {
        ...node,
        children: filteredChildren || undefined,
      };
    }

    return null;
  };

  const renderNode = (node: FolderNode, depth: number = 0): React.ReactNode => {
    if (depth > maxDepth) return null;

    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const indent = depth * 16;

    return (
      <div key={node.id} className="select-none">
        <div
          className="flex items-center py-1.5 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
          style={{ paddingLeft: `${8 + indent}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            onNodeClick?.(node);
          }}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-4 h-4 flex items-center justify-center mr-1">
            {hasChildren ? (
              <svg
                className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <div className="w-3 h-3" />
            )}
          </div>

          {/* Folder/Document Icon */}
          <div className="mr-2 flex-shrink-0">
            {node.type === 'folder' ? (
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* Node Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {node.name}
              </span>
              {node.isShared && (
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              )}
            </div>

            {/* Additional Info */}
            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
              {showDocumentCount && node.documentCount !== undefined && (
                <span>{node.documentCount} items</span>
              )}
              {showSize && node.size !== undefined && (
                <span>{formatSize(node.size)}</span>
              )}
              {node.lastModified && (
                <span>{node.lastModified.toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Actions (show on hover) */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle quick add
              }}
              className="p-1 text-gray-400 hover:text-green-500 transition-colors"
              title="Add new item"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle more actions
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="More actions"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredRoot = filterNodes(rootFolder, searchTerm);

  return (
    <Widget {...widgetProps}>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <button className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>New Folder</span>
          </button>
          <button className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Upload</span>
          </button>
        </div>

        {/* Folder Tree */}
        <div className="max-h-80 overflow-y-auto">
          {filteredRoot ? renderNode(filteredRoot) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm">No folders match your search</p>
            </div>
          )}
        </div>

        {/* Quick Access */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Quick Access</div>
          <div className="space-y-1">
            {[
              { name: 'Recent Files', icon: '🕒', count: 23 },
              { name: 'Shared with Me', icon: '👥', count: 8 },
              { name: 'Favorites', icon: '⭐', count: 12 },
              { name: 'Trash', icon: '🗑️', count: 5 },
            ].map((item) => (
              <button
                key={item.name}
                className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Widget>
  );
};

// Mock data generator
function generateMockFolderTree(): FolderNode {
  return {
    id: 'root',
    name: 'My Documents',
    type: 'folder',
    path: '/',
    documentCount: 156,
    size: 2457600000,
    lastModified: new Date(),
    children: [
      {
        id: 'personal',
        name: 'Personal',
        type: 'folder',
        path: '/personal',
        documentCount: 45,
        size: 567890000,
        lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24),
        children: [
          {
            id: 'contracts',
            name: 'Contracts',
            type: 'folder',
            path: '/personal/contracts',
            documentCount: 12,
            size: 234567000,
            lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
            children: [
              {
                id: 'employment',
                name: 'Employment Agreement.pdf',
                type: 'document',
                path: '/personal/contracts/employment.pdf',
                size: 1024000,
                lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
              },
            ],
          },
          {
            id: 'receipts',
            name: 'Receipts',
            type: 'folder',
            path: '/personal/receipts',
            documentCount: 33,
            size: 333333000,
            lastModified: new Date(Date.now() - 1000 * 60 * 60 * 12),
          },
        ],
      },
      {
        id: 'shared',
        name: 'Shared',
        type: 'folder',
        path: '/shared',
        documentCount: 67,
        size: 1234567000,
        lastModified: new Date(Date.now() - 1000 * 60 * 60 * 6),
        isShared: true,
        children: [
          {
            id: 'team-projects',
            name: 'Team Projects',
            type: 'folder',
            path: '/shared/team-projects',
            documentCount: 45,
            size: 987654000,
            lastModified: new Date(Date.now() - 1000 * 60 * 60 * 4),
            isShared: true,
          },
          {
            id: 'meeting-notes',
            name: 'Meeting Notes',
            type: 'folder',
            path: '/shared/meeting-notes',
            documentCount: 22,
            size: 246913000,
            lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24),
            isShared: true,
          },
        ],
      },
      {
        id: 'archive',
        name: 'Archive',
        type: 'folder',
        path: '/archive',
        documentCount: 44,
        size: 655443000,
        lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      },
    ],
  };
}

export default FolderTreeWidget;