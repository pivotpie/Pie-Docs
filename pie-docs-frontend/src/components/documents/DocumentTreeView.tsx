import React from 'react';
import type { DocumentListProps } from '@/types/domain/Document';

const DocumentTreeView: React.FC<DocumentListProps> = ({
  documents,
  folders,
  loading,
  error,
  selectedIds,
  onDocumentSelect,
  onDocumentOpen,
  onDocumentAction,
  onFolderOpen,
}) => {
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

  return (
    <div className="p-6 overflow-auto">
      <div className="space-y-1">
        {/* Render Folders First */}
        {folders.map((folder) => (
          <div key={`folder-${folder.id}`} className="group">
            <div
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => onFolderOpen(folder)}
            >
              {/* Folder Icon with Expand/Collapse */}
              <button
                className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement expand/collapse functionality
                  console.log('Toggle folder:', folder.id);
                }}
              >
                <svg
                  className="w-4 h-4 text-gray-400 transform transition-transform"
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

              {/* Folder Icon */}
              <svg
                className="w-5 h-5 text-blue-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>

              {/* Folder Name */}
              <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                {folder.name}
              </span>

              {/* Document Count */}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({folder.documentCount})
              </span>

              {/* Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement folder actions
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Nested Documents (if folder is expanded) */}
            {/* TODO: Add state management for expanded folders and nested content */}
          </div>
        ))}

        {/* Render Documents */}
        {documents.map((document) => (
          <div
            key={`document-${document.id}`}
            className={`
              group flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors
              hover:bg-gray-100 dark:hover:bg-gray-800
              ${selectedIds.includes(document.id) ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : ''}
            `}
            onClick={() => onDocumentOpen(document)}
          >
            {/* Indent for tree structure */}
            <div className="w-6 flex justify-center">
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            </div>

            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={selectedIds.includes(document.id)}
              onChange={(e) => {
                e.stopPropagation();
                onDocumentSelect(document.id, e.target.checked);
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
        ))}
      </div>
    </div>
  );
};

export default DocumentTreeView;