import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { DocumentListProps, ViewMode } from '@/types/domain/Document';
import DocumentGridView from './DocumentGridView';
import DocumentListView from './DocumentListView';
import DocumentTreeView from './DocumentTreeView';
import VirtualizedGridView from './VirtualizedGridView';
import VirtualizedListView from './VirtualizedListView';

// Threshold for switching to virtualized views
const VIRTUALIZATION_THRESHOLD = 100;

interface VirtualizedDocumentViewProps extends DocumentListProps {
  viewMode: ViewMode;
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  loadNextPage?: () => void;
}

const VirtualizedDocumentView: React.FC<VirtualizedDocumentViewProps> = ({
  viewMode,
  documents,
  folders,
  hasNextPage = false,
  isNextPageLoading = false,
  loadNextPage = () => {},
  ...commonProps
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 1200,
    height: 600,
  });

  // Calculate total item count
  const totalItems = documents.length + folders.length;
  const shouldUseVirtualization = totalItems >= VIRTUALIZATION_THRESHOLD;

  // Measure container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width, height });
      }
    };

    updateDimensions();

    // Update on window resize
    const handleResize = () => {
      updateDimensions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Performance monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Document view rendering ${totalItems} items`, {
        viewMode,
        virtualized: shouldUseVirtualization,
        dimensions: containerDimensions,
      });
    }
  }, [totalItems, viewMode, shouldUseVirtualization, containerDimensions]);

  const virtualizedProps = {
    ...commonProps,
    documents,
    folders,
    containerWidth: containerDimensions.width,
    containerHeight: containerDimensions.height,
    hasNextPage,
    isNextPageLoading,
    loadNextPage,
  };

  const renderView = () => {
    // Tree view always uses regular rendering due to complexity of virtualized tree
    if (viewMode === 'tree') {
      return <DocumentTreeView {...commonProps} documents={documents} folders={folders} />;
    }

    // Use virtualized views for large datasets
    if (shouldUseVirtualization) {
      switch (viewMode) {
        case 'grid':
          return <VirtualizedGridView {...virtualizedProps} />;
        case 'list':
          return <VirtualizedListView {...virtualizedProps} />;
        default:
          return <VirtualizedGridView {...virtualizedProps} />;
      }
    }

    // Use regular views for smaller datasets
    switch (viewMode) {
      case 'grid':
        return <DocumentGridView {...commonProps} documents={documents} folders={folders} />;
      case 'list':
        return <DocumentListView {...commonProps} documents={documents} folders={folders} />;
      default:
        return <DocumentGridView {...commonProps} documents={documents} folders={folders} />;
    }
  };

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`absolute top-2 right-2 z-50 glass-card px-2 py-1 rounded text-xs ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>
          {shouldUseVirtualization ? 'Virtualized' : 'Standard'} ({totalItems} items)
        </div>
      )}

      {renderView()}
    </div>
  );
};

export default VirtualizedDocumentView;