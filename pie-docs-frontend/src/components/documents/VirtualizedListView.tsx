import React, { useCallback, useMemo } from 'react';
import * as ReactWindow from 'react-window';
import * as InfiniteLoaderModule from 'react-window-infinite-loader';
import type { DocumentListProps } from '@/types/domain/Document';

const List = ReactWindow.FixedSizeList;
const InfiniteLoader = InfiniteLoaderModule.default || InfiniteLoaderModule;

const ROW_HEIGHT = 64; // Height of each row in pixels

interface VirtualizedListViewProps extends DocumentListProps {
  containerHeight?: number;
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  loadNextPage?: () => void;
}

const VirtualizedListView: React.FC<VirtualizedListViewProps> = ({
  documents,
  folders,
  loading,
  error,
  selectedIds,
  onDocumentSelect,
  onDocumentOpen,
  onDocumentAction,
  onFolderOpen,
  containerHeight = 600,
  hasNextPage = false,
  isNextPageLoading = false,
  loadNextPage = () => {},
}) => {
  // Combine folders and documents for unified list
  const allItems = useMemo(() => {
    return [...folders.map(f => ({ ...f, type: 'folder' as const })),
            ...documents.map(d => ({ ...d, type: 'document' as const }))];
  }, [folders, documents]);

  const itemCount = allItems.length;

  // Check if item is loaded for infinite loading
  const isItemLoaded = useCallback((index: number) => {
    return index < itemCount;
  }, [itemCount]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // List row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = allItems[index];

    if (!item) {
      return (
        <div style={style} className="border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 flex items-center space-x-4 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      );
    }

    const isFolder = item.type === 'folder';
    const isSelected = !isFolder && selectedIds.includes(item.id);

    return (
      <div
        style={style}
        className={`
          border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer
          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'}
        `}
        onClick={() => {
          if (isFolder) {
            onFolderOpen(item);
          } else {
            onDocumentOpen(item);
          }
        }}
      >
        <div className="px-6 py-4 flex items-center">
          {/* Selection Checkbox */}
          <div className="relative w-12 sm:w-16">
            {!isFolder && (
              <input
                type="checkbox"
                className="absolute left-0 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onDocumentSelect(item.id, e.target.checked);
                }}
              />
            )}
          </div>

          {/* Icon and Name */}
          <div className="flex-1 min-w-0 flex items-center">
            <div className="flex-shrink-0 h-8 w-8 mr-4">
              {isFolder ? (
                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              ) : item.thumbnail ? (
                <img className="h-8 w-8 rounded object-cover" src={item.thumbnail} alt="" />
              ) : (
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {item.name}
              </div>
              {!isFolder && (
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {item.metadata.author}
                </div>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="hidden sm:block w-20 text-sm text-gray-500 dark:text-gray-400 uppercase">
            {isFolder ? 'Folder' : item.type}
          </div>

          {/* Size */}
          <div className="hidden md:block w-24 text-sm text-gray-500 dark:text-gray-400">
            {isFolder
              ? `${item.documentCount} item${item.documentCount !== 1 ? 's' : ''}`
              : formatFileSize(item.size)
            }
          </div>

          {/* Modified Date */}
          <div className="hidden lg:block w-32 text-sm text-gray-500 dark:text-gray-400">
            {new Date(item.dateModified).toLocaleDateString()}
          </div>

          {/* Status */}
          <div className="hidden xl:block w-24">
            <span
              className={`
                inline-flex px-2 py-1 text-xs font-semibold rounded-full
                ${isFolder
                  ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  : item.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : item.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  : item.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  : item.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  : item.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                }
              `}
            >
              {isFolder ? 'folder' : item.status}
            </span>
          </div>

          {/* Actions */}
          <div className="w-12 flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isFolder) {
                  // TODO: Implement folder actions
                } else {
                  onDocumentAction('menu', item);
                }
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }, [allItems, selectedIds, onDocumentSelect, onDocumentOpen, onDocumentAction, onFolderOpen]);

  if (loading && itemCount === 0) {
    return (
      <div className="space-y-2 p-6">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
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

  if (itemCount === 0) {
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
    <div className="flex flex-col h-full">
      {/* Table Header */}
      <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-3 flex items-center">
          {/* Select All Checkbox */}
          <div className="relative w-12 sm:w-16">
            <input
              type="checkbox"
              className="absolute left-0 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={selectedIds.length === documents.length && documents.length > 0}
              onChange={(e) => {
                // TODO: Implement select all functionality
                console.log('Select all:', e.target.checked);
              }}
            />
          </div>

          {/* Column Headers */}
          <div className="flex-1 min-w-0 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Name
          </div>
          <div className="hidden sm:block w-20 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Type
          </div>
          <div className="hidden md:block w-24 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Size
          </div>
          <div className="hidden lg:block w-32 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Modified
          </div>
          <div className="hidden xl:block w-24 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Status
          </div>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Virtualized List */}
      <div className="flex-1">
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={hasNextPage ? itemCount + 1 : itemCount}
          loadMoreItems={loadNextPage}
        >
          {({ onItemsRendered, ref }) => (
            <List
              ref={ref}
              height={containerHeight - 60} // Subtract header height
              itemCount={itemCount}
              itemSize={ROW_HEIGHT}
              onItemsRendered={onItemsRendered}
              overscanCount={5}
            >
              {Row}
            </List>
          )}
        </InfiniteLoader>

        {/* Loading indicator for infinite scroll */}
        {isNextPageLoading && (
          <div className="flex items-center justify-center py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading more...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualizedListView;