import React from 'react';
import type { DocumentListProps } from '@/types/domain/Document';

const DocumentGridView: React.FC<DocumentListProps> = ({
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
            >
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        {/* Render Folders First */}
        {folders.map((folder) => (
          <div
            key={`folder-${folder.id}`}
            className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onFolderOpen(folder)}
          >
            <div className="flex items-center justify-center h-32 mb-3">
              <svg
                className="w-16 h-16 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white truncate mb-1">
              {folder.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {folder.documentCount} document{folder.documentCount !== 1 ? 's' : ''}
            </p>
          </div>
        ))}

        {/* Render Documents */}
        {documents.map((document) => (
          <div
            key={`document-${document.id}`}
            className={`
              group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4
              hover:shadow-md transition-all cursor-pointer relative
              ${selectedIds.includes(document.id) ? 'ring-2 ring-blue-500 border-blue-500' : ''}
            `}
            onClick={() => onDocumentOpen(document)}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={selectedIds.includes(document.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  onDocumentSelect(document.id, e.target.checked);
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Select ${document.name}`}
              />
            </div>

            {/* Document Thumbnail */}
            <div className="flex items-center justify-center h-32 mb-3 bg-gray-50 dark:bg-gray-700 rounded">
              {document.thumbnail ? (
                <img
                  src={document.thumbnail}
                  alt={document.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-gray-400 dark:text-gray-500">
                  {/* Generic file icon based on type */}
                  {document.type === 'pdf' && (
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  )}
                  {(document.type === 'docx' || document.type === 'txt') && (
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {!['pdf', 'docx', 'txt'].includes(document.type) && (
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
            </div>

            {/* Document Info */}
            <h3 className="font-medium text-gray-900 dark:text-white truncate mb-1" title={document.name}>
              {document.name}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="capitalize">{document.type}</span>
                <span className={`
                  px-2 py-0.5 text-xs rounded-full
                  ${document.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
                  ${document.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' : ''}
                  ${document.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' : ''}
                  ${document.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : ''}
                  ${document.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}
                `}>
                  {document.status}
                </span>
              </div>
              <div className="text-xs">
                {new Date(document.dateModified).toLocaleDateString()}
              </div>
            </div>

            {/* Actions Menu */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDocumentAction('menu', document);
                }}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

export default DocumentGridView;