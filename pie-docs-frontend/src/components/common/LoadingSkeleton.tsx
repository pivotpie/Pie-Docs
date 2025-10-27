import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave';
  lines?: number;
  children?: React.ReactNode;
}

interface DocumentSkeletonProps {
  view?: 'grid' | 'list' | 'tree';
  count?: number;
  className?: string;
}

// Base skeleton component
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width = '100%',
  height = '1rem',
  animation = 'pulse',
  lines = 1,
  children
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-lg';
      case 'text':
        return 'rounded';
      case 'rectangular':
      default:
        return 'rounded-sm';
    }
  };

  const getAnimationClasses = () => {
    switch (animation) {
      case 'wave':
        return 'animate-wave bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';
      case 'pulse':
      default:
        return 'animate-pulse bg-gray-200 dark:bg-gray-700';
    }
  };

  const skeletonStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (children) {
    return (
      <div className={`${getAnimationClasses()} ${className}`}>
        {children}
      </div>
    );
  }

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${getAnimationClasses()} ${getVariantClasses()}`}
            style={{
              ...skeletonStyle,
              width: index === lines - 1 ? '75%' : skeletonStyle.width
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${getAnimationClasses()} ${getVariantClasses()} ${className}`}
      style={skeletonStyle}
    />
  );
};

// Document Grid Skeleton
export const DocumentGridSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 12,
  className = ''
}) => (
  <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        {/* Thumbnail */}
        <LoadingSkeleton
          variant="rounded"
          height={80}
          className="mb-3"
        />

        {/* Title */}
        <LoadingSkeleton
          variant="text"
          height={16}
          className="mb-2"
        />

        {/* Metadata */}
        <div className="space-y-1">
          <LoadingSkeleton
            variant="text"
            height={12}
            width="60%"
          />
          <LoadingSkeleton
            variant="text"
            height={12}
            width="80%"
          />
        </div>
      </div>
    ))}
  </div>
);

// Document List Skeleton
export const DocumentListSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 10,
  className = ''
}) => (
  <div className={`space-y-1 ${className}`}>
    {/* Table Header */}
    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-t-lg border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-1">
          <LoadingSkeleton height={12} width="100%" />
        </div>
        <div className="col-span-4">
          <LoadingSkeleton height={12} width="80%" />
        </div>
        <div className="col-span-2">
          <LoadingSkeleton height={12} width="60%" />
        </div>
        <div className="col-span-2">
          <LoadingSkeleton height={12} width="70%" />
        </div>
        <div className="col-span-2">
          <LoadingSkeleton height={12} width="50%" />
        </div>
        <div className="col-span-1">
          <LoadingSkeleton height={12} width="100%" />
        </div>
      </div>
    </div>

    {/* Table Rows */}
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white dark:bg-gray-800 p-3 border-x border-b border-gray-200 dark:border-gray-700 last:rounded-b-lg">
        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-1">
            <LoadingSkeleton variant="circular" width={32} height={32} />
          </div>
          <div className="col-span-4">
            <LoadingSkeleton height={16} className="mb-1" />
            <LoadingSkeleton height={12} width="70%" />
          </div>
          <div className="col-span-2">
            <LoadingSkeleton height={14} width="80%" />
          </div>
          <div className="col-span-2">
            <LoadingSkeleton height={14} width="90%" />
          </div>
          <div className="col-span-2">
            <LoadingSkeleton height={14} width="60%" />
          </div>
          <div className="col-span-1">
            <LoadingSkeleton variant="circular" width={24} height={24} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Document Tree Skeleton
export const DocumentTreeSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 8,
  className = ''
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: count }).map((_, index) => {
      const depth = Math.floor(Math.random() * 3);
      const isFolder = Math.random() > 0.6;

      return (
        <div
          key={index}
          className="flex items-center space-x-2"
          style={{ paddingLeft: `${depth * 20}px` }}
        >
          {/* Expand/Collapse Icon */}
          {isFolder && (
            <LoadingSkeleton variant="circular" width={16} height={16} />
          )}

          {/* Folder/File Icon */}
          <LoadingSkeleton variant="circular" width={20} height={20} />

          {/* Name */}
          <LoadingSkeleton
            height={16}
            width={`${Math.random() * 40 + 60}%`}
          />

          {/* Metadata */}
          <LoadingSkeleton
            height={12}
            width={`${Math.random() * 20 + 15}%`}
          />
        </div>
      );
    })}
  </div>
);

// Complete Document Library Skeleton
export const DocumentLibrarySkeleton: React.FC<DocumentSkeletonProps> = ({
  view = 'grid',
  count,
  className = ''
}) => {
  const defaultCounts = {
    grid: 12,
    list: 10,
    tree: 8
  };

  const skeletonCount = count || defaultCounts[view];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <LoadingSkeleton height={24} width={200} />
          <LoadingSkeleton height={16} width={300} />
        </div>
        <div className="flex items-center space-x-3">
          <LoadingSkeleton height={36} width={120} />
          <LoadingSkeleton height={36} width={100} />
          <LoadingSkeleton height={36} width={80} />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <LoadingSkeleton height={32} width={200} />
        <LoadingSkeleton height={32} width={150} />
        <LoadingSkeleton height={32} width={120} />
        <div className="flex-1" />
        <LoadingSkeleton height={32} width={100} />
      </div>

      {/* Content Skeleton */}
      {view === 'grid' && <DocumentGridSkeleton count={skeletonCount} />}
      {view === 'list' && <DocumentListSkeleton count={skeletonCount} />}
      {view === 'tree' && <DocumentTreeSkeleton count={skeletonCount} />}

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between">
        <LoadingSkeleton height={16} width={150} />
        <div className="flex items-center space-x-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingSkeleton key={index} variant="circular" width={32} height={32} />
          ))}
        </div>
        <LoadingSkeleton height={16} width={100} />
      </div>
    </div>
  );
};

// Search Results Skeleton
export const SearchResultsSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 6,
  className = ''
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start space-x-4">
          <LoadingSkeleton variant="rounded" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton height={18} width="80%" />
            <LoadingSkeleton height={14} lines={2} />
            <div className="flex items-center space-x-4 mt-3">
              <LoadingSkeleton height={12} width={80} />
              <LoadingSkeleton height={12} width={60} />
              <LoadingSkeleton height={12} width={100} />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;