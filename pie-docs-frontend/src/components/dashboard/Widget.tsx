import React from 'react';
import type { WidgetSize } from './WidgetContainer';

export interface WidgetProps {
  id: string;
  title: string;
  size?: WidgetSize;
  isLoading?: boolean;
  hasError?: boolean;
  error?: string;
  onResize?: (size: WidgetSize) => void;
  onRefresh?: () => void;
  onRemove?: () => void;
  className?: string;
}

export interface WidgetConfig {
  id: string;
  title: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize: WidgetSize;
  category: string;
  description: string;
  permissions?: string[];
}

// Base Widget component that all widgets should extend
const Widget: React.FC<WidgetProps & { children: React.ReactNode }> = ({
  id,
  title,
  size = 'medium',
  isLoading = false,
  hasError = false,
  error,
  onResize,
  onRefresh,
  onRemove,
  className = '',
  children
}) => {
  if (hasError) {
    return (
      <div className={`widget-error ${className}`} data-widget-id={id}>
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <svg
            className="w-12 h-12 text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Widget Error
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {error || 'An error occurred while loading this widget.'}
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`widget-loading ${className}`} data-widget-id={id}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`widget ${className}`} data-widget-id={id}>
      {children}
    </div>
  );
};

export default Widget;