import React, { useState, useCallback } from 'react';
import { useDragContext } from '@dnd-kit/core';
import type { DocumentListProps, DocumentFolder, Document } from '@/types/domain/Document';
import { FolderDropZone, DraggableDocument, DraggableFolder } from './folders';

interface EnhancedDocumentTreeViewProps extends DocumentListProps {
  _onDocumentMove?: (documentId: string, targetFolderId?: string) => void;
  _onFolderMove?: (folderId: string, targetParentId?: string) => void;
  _onBulkDocumentMove?: (documentIds: string[], targetFolderId?: string) => void;
  _onBulkFolderMove?: (folderIds: string[], targetParentId?: string) => void;
  selectedDocumentIds?: string[];
  selectedFolderIds?: string[];
  onDocumentSelectionChange?: (ids: string[]) => void;
  _onFolderSelectionChange?: (ids: string[]) => void;
  dragDisabled?: boolean;
}

const EnhancedDocumentTreeView: React.FC<EnhancedDocumentTreeViewProps> = ({
  documents,
  folders,
  loading,
  error,
  selectedIds,
  selectedDocumentIds = [],
  selectedFolderIds = [],
  onDocumentSelect,
  onDocumentOpen,
  onDocumentAction,
  onFolderOpen,
  _onDocumentMove,
  _onFolderMove,
  _onBulkDocumentMove,
  _onBulkFolderMove,
  onDocumentSelectionChange,
  _onFolderSelectionChange,
  dragDisabled = false,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const { active, over } = useDragContext();

  const isDragging = !!active;
  const overId = over?.id as string;

  const toggleFolderExpansion = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  const handleDocumentSelect = useCallback((documentId: string, selected: boolean, event?: React.MouseEvent) => {
    if (event?.ctrlKey || event?.metaKey) {
      // Multi-select with Ctrl/Cmd
      const newSelection = selected
        ? [...selectedDocumentIds, documentId]
        : selectedDocumentIds.filter(id => id !== documentId);
      onDocumentSelectionChange?.(newSelection);
    } else if (event?.shiftKey && selectedDocumentIds.length > 0) {
      // Range select with Shift
      const lastSelectedIndex = documents.findIndex(doc => doc.id === selectedDocumentIds[selectedDocumentIds.length - 1]);
      const currentIndex = documents.findIndex(doc => doc.id === documentId);

      if (lastSelectedIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastSelectedIndex, currentIndex);
        const end = Math.max(lastSelectedIndex, currentIndex);
        const rangeIds = documents.slice(start, end + 1).map(doc => doc.id);

        const newSelection = Array.from(new Set([...selectedDocumentIds, ...rangeIds]));
        onDocumentSelectionChange?.(newSelection);
      }
    } else {
      // Single select
      onDocumentSelect(documentId, selected);
      if (selected) {
        onDocumentSelectionChange?.([documentId]);
      } else {
        onDocumentSelectionChange?.([]);
      }
    }
  }, [documents, selectedDocumentIds, onDocumentSelect, onDocumentSelectionChange]);

  const isValidDropTarget = useCallback((folder: DocumentFolder, activeType?: string) => {
    // Smart folders cannot accept drops
    if (folder.type === 'smart') return false;

    // Check permissions
    if (!folder.permissions.canEdit) return false;

    // If dragging folders, check for circular references
    if (activeType === 'folder' && active) {
      const activeFolder = folders.find(f => f.id === active.id);
      if (activeFolder) {
        // Prevent dropping folder into itself or its descendants
        let current: DocumentFolder | undefined = folder;
        while (current) {
          if (current.id === activeFolder.id) return false;
          current = folders.find(f => f.id === current?.parentId);
        }
      }
    }

    return true;
  }, [folders, active]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-2">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 animate-pulse"
            >
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">
            Error loading documents
          </div>
          <div className="text-gray-600 dark:text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  if (documents.length === 0 && folders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No documents found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by uploading your first document.
          </p>
        </div>
      </div>
    );
  }

  const renderFolder = (folder: DocumentFolder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderIds.includes(folder.id);
    const canDrop = !dragDisabled && isValidDropTarget(folder, active?.data.current?.type);
    const isOver = overId === folder.id;

    const childFolders = folders.filter(f => f.parentId === folder.id);
    const folderDocuments = documents.filter(doc => doc.parentFolderId === folder.id);

    return (
      <div key={folder.id} className="group">
        <FolderDropZone
          folder={folder}
          isOver={isOver}
          isDragging={isDragging}
          canDrop={canDrop}
          className="rounded-md"
        >
          <DraggableFolder
            folder={folder}
            disabled={dragDisabled}
            className="relative"
          >
            <div
              className={`
                flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors
                hover:bg-gray-100 dark:hover:bg-gray-800
                ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : ''}
              `}
              style={{ paddingLeft: `${depth * 24 + 8}px` }}
              onClick={() => onFolderOpen(folder)}
            >
              {/* Expand/Collapse Button */}
              {(childFolders.length > 0 || folderDocuments.length > 0) && (
                <button
                  className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolderExpansion(folder.id);
                  }}
                >
                  <svg
                    className={`w-4 h-4 text-gray-400 transform transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              {/* Folder Icon */}
              <svg
                className={`w-5 h-5 flex-shrink-0 ${
                  folder.type === 'smart' ? 'text-purple-500' : 'text-blue-500'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>

              {/* Folder Name */}
              <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 truncate">
                {folder.name}
              </span>

              {/* Smart folder indicator */}
              {folder.type === 'smart' && (
                <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 px-1 rounded">
                  Smart
                </span>
              )}

              {/* Document Count */}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({folder.documentCount})
              </span>

              {/* Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement folder actions menu
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
            </div>
          </DraggableFolder>
        </FolderDropZone>

        {/* Nested Content */}
        {isExpanded && (
          <div className="ml-4">
            {/* Child Folders */}
            {childFolders.map(childFolder => renderFolder(childFolder, depth + 1))}

            {/* Documents in Folder */}
            {folderDocuments.map(document => renderDocument(document, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderDocument = (document: Document, depth: number = 0) => {
    const isSelected = selectedIds.includes(document.id);
    const isMultiSelected = selectedDocumentIds.includes(document.id);

    return (
      <DraggableDocument
        key={document.id}
        document={document}
        disabled={dragDisabled}
        className="relative"
      >
        <div
          className={`
            group flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors
            hover:bg-gray-100 dark:hover:bg-gray-800
            ${isSelected || isMultiSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : ''}
          `}
          style={{ paddingLeft: `${depth * 24 + 32}px` }}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              handleDocumentSelect(document.id, !isMultiSelected, e);
            } else {
              onDocumentOpen(document);
            }
          }}
        >
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isSelected || isMultiSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleDocumentSelect(document.id, e.target.checked);
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label={`Select ${document.name}`}
          />

          {/* Document Icon */}
          <div className="flex-shrink-0">
            {document.type === 'pdf' && (
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            )}
            {(document.type === 'docx' || document.type === 'txt') && (
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
            {document.type === 'xlsx' && (
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
            {!['pdf', 'docx', 'txt', 'xlsx'].includes(document.type) && (
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* Document Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {document.name}
              </span>
              <span className={`
                px-2 py-0.5 text-xs rounded-full flex-shrink-0
                ${document.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
                ${document.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' : ''}
                ${document.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' : ''}
                ${document.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : ''}
                ${document.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}
              `}>
                {document.status}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span className="uppercase">{document.type}</span>
              <span>{new Date(document.dateModified).toLocaleDateString()}</span>
              <span>{document.metadata.author}</span>
            </div>
          </div>

          {/* Document Tags */}
          {document.metadata.tags.length > 0 && (
            <div className="flex-shrink-0 hidden sm:flex items-center space-x-1">
              {document.metadata.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                >
                  {tag}
                </span>
              ))}
              {document.metadata.tags.length > 2 && (
                <span className="text-xs text-gray-400">
                  +{document.metadata.tags.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDocumentAction('menu', document);
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Document actions"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        </div>
      </DraggableDocument>
    );
  };

  return (
    <div className="p-6 overflow-auto">
      {/* Root Drop Zone for moving items to root */}
      <FolderDropZone
        folder={{
          id: 'root-drop-zone',
          name: 'Root',
          path: '/',
          type: 'regular',
          childFolders: [],
          documentCount: 0,
          totalSize: 0,
          dateCreated: '',
          dateModified: '',
          documentRefs: [],
          permissions: {
            canView: true,
            canEdit: true,
            canDelete: true,
            canCreateChild: true,
            canManagePermissions: true,
            inheritPermissions: false,
          },
          statistics: {
            documentCount: 0,
            totalSize: 0,
            averageFileSize: 0,
            lastActivity: '',
            fileTypeDistribution: {},
          },
        }}
        isOver={overId === 'root-drop-zone'}
        isDragging={isDragging}
        canDrop={!dragDisabled}
        className="min-h-full"
      >
        <div className="space-y-1">
          {/* Render Root Level Folders */}
          {folders
            .filter(folder => !folder.parentId)
            .map(folder => renderFolder(folder, 0))}

          {/* Render Root Level Documents */}
          {documents
            .filter(doc => !doc.parentFolderId)
            .map(document => renderDocument(document, 0))}
        </div>
      </FolderDropZone>
    </div>
  );
};

export default EnhancedDocumentTreeView;