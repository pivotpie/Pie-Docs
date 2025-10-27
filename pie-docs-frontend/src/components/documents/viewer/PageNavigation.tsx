import React, { useState, useCallback } from 'react';
import type { PageNavigationProps } from '@/types/domain/DocumentViewer';

export const PageNavigation: React.FC<PageNavigationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onPreviousPage,
  onNextPage,
  disabled = false,
}) => {
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState(currentPage.toString());

  const handlePageInputSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const value = parseInt(pageInputValue, 10);
    if (!isNaN(value) && value >= 1 && value <= totalPages) {
      onPageChange(value);
    }
    setShowPageInput(false);
  }, [pageInputValue, totalPages, onPageChange]);

  const handlePageInputKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setPageInputValue(currentPage.toString());
      setShowPageInput(false);
    }
  }, [currentPage]);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-2">
      {/* Previous Page */}
      <button
        onClick={onPreviousPage}
        disabled={disabled || !canGoPrevious}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous page"
        title="Previous page (Left arrow)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Page Number Display/Input */}
      {showPageInput ? (
        <form onSubmit={handlePageInputSubmit} className="relative">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={pageInputValue}
            onChange={(e) => setPageInputValue(e.target.value)}
            onBlur={() => setShowPageInput(false)}
            onKeyDown={handlePageInputKeyDown}
            className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </form>
      ) : (
        <button
          onClick={() => {
            setPageInputValue(currentPage.toString());
            setShowPageInput(true);
          }}
          disabled={disabled}
          className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors min-w-[4rem] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Click to go to specific page"
        >
          <span className="font-medium">{currentPage}</span>
          <span className="text-gray-500 mx-1">of</span>
          <span>{totalPages}</span>
        </button>
      )}

      {/* Next Page */}
      <button
        onClick={onNextPage}
        disabled={disabled || !canGoNext}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
        title="Next page (Right arrow)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Page Jump Controls */}
      <div className="flex items-center space-x-1 border-l border-gray-200 pl-2 ml-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={disabled || currentPage === 1}
          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Go to first page"
        >
          First
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || currentPage === totalPages}
          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Go to last page"
        >
          Last
        </button>
      </div>

      {/* Page thumbnails toggle (future enhancement) */}
      <button
        disabled={disabled}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Show page thumbnails"
        title="Show page thumbnails (future feature)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
    </div>
  );
};

export default PageNavigation;