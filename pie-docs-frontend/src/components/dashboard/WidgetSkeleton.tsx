import React from 'react';
import { WidgetSize } from './WidgetContainer';

interface WidgetSkeletonProps {
  size?: WidgetSize;
  type?: 'statistics' | 'activity' | 'actions' | 'chart' | 'table' | 'generic';
  className?: string;
}

const WidgetSkeleton: React.FC<WidgetSkeletonProps> = ({
  size = 'medium',
  type = 'generic',
  className = ''
}) => {
  const getSizeClasses = (size: WidgetSize): string => {
    switch (size) {
      case 'small':
        return 'col-span-1 row-span-1';
      case 'medium':
        return 'col-span-1 row-span-2 md:col-span-2 md:row-span-1';
      case 'large':
        return 'col-span-1 row-span-2 md:col-span-2 md:row-span-2';
      case 'wide':
        return 'col-span-1 row-span-1 md:col-span-4 md:row-span-1';
      default:
        return 'col-span-1 row-span-2 md:col-span-2 md:row-span-1';
    }
  };

  const renderSkeletonContent = () => {
    switch (type) {
      case 'statistics':
        return (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="skeleton-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="skeleton-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            ))}
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="skeleton-pulse w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mt-2"></div>
                <div className="flex-1 space-y-2">
                  <div className="skeleton-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="skeleton-pulse h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'actions':
        return (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 space-y-2">
                <div className="skeleton-pulse w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
                <div className="skeleton-pulse h-3 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
        );

      case 'chart':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-end h-32">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="skeleton-pulse bg-gray-200 dark:bg-gray-700 rounded w-8"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                ></div>
              ))}
            </div>
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton-pulse h-3 bg-gray-200 dark:bg-gray-700 rounded w-6"></div>
              ))}
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="space-y-3">
            <div className="skeleton-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-4 gap-4">
                <div className="skeleton-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="skeleton-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="skeleton-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="skeleton-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        );

      case 'generic':
      default:
        return (
          <div className="space-y-3">
            <div className="skeleton-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="skeleton-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="skeleton-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="skeleton-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        );
    }
  };

  return (
    <div
      className={`
        ${getSizeClasses(size)}
        bg-white dark:bg-gray-800
        rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
        ${className}
      `}
      role="status"
      aria-label="Loading widget content"
    >
      {/* Skeleton Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="skeleton-pulse h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        <div className="skeleton-pulse w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      {/* Skeleton Content */}
      <div className="p-4">
        {renderSkeletonContent()}
      </div>
    </div>
  );
};

export default WidgetSkeleton;