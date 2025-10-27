import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { DocumentViewerProps, ViewerState, LoadingState } from '@/types/domain/DocumentViewer';
import { ZoomControls } from './ZoomControls';
import { PageNavigation } from './PageNavigation';
import { AnnotationToolbar } from '../annotations/AnnotationToolbar';
import { MetadataPanel } from '../MetadataPanel';
import { PDFViewer } from '../viewers/PDFViewer';
import { ImageViewer } from '../viewers/ImageViewer';
import { TextViewer } from '../viewers/TextViewer';
import { DownloadControls } from './DownloadControls';
import { ProgressiveLoader } from './ProgressiveLoader';
import { TouchGestureHandler } from './TouchGestureHandler';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface EnhancedDocumentViewerProps extends DocumentViewerProps {
  enableProgressiveLoading?: boolean;
  enableTouchGestures?: boolean;
  enableMobileOptimizations?: boolean;
  maxZoom?: number;
  minZoom?: number;
}

export const EnhancedDocumentViewer: React.FC<EnhancedDocumentViewerProps> = ({
  documentId,
  document,
  onClose,
  className = '',
  enableProgressiveLoading = true,
  enableTouchGestures = true,
  enableMobileOptimizations = true,
  maxZoom = 500,
  minZoom = 25
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Enhanced viewer state
  const [viewerState, setViewerState] = useState<ViewerState>({
    currentDocument: documentId,
    currentPage: 1,
    totalPages: 1,
    zoom: { level: 100, mode: 'fit-width' },
    isFullScreen: false,
    sidebarVisible: true,
    loading: true,
    error: null,
  });

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    message: 'Loading document...',
  });

  const [annotations, setAnnotations] = useState([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [touchZoom, setTouchZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Document format detection
  const documentFormat = useMemo(() => {
    if (!document) return null;

    const extension = document.name.split('.').pop()?.toLowerCase();
    const type = document.type.toLowerCase();

    if (type === 'pdf' || extension === 'pdf') {
      return 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'image';
    } else if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx'].includes(extension || '')) {
      return 'text';
    }

    return 'unsupported';
  }, [document]);

  // Progressive loading handlers
  const handleLoadProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress,
      message: `Loading document... ${Math.round(progress)}%`
    }));
  }, []);

  const handleLoadComplete = useCallback((data: any) => {
    setDocumentData(data);
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      progress: 100,
      message: 'Document loaded'
    }));
    setViewerState(prev => ({
      ...prev,
      loading: false
    }));
  }, []);

  const handleLoadError = useCallback((error: Error) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      message: `Failed to load document: ${error.message}`
    }));
    setViewerState(prev => ({
      ...prev,
      loading: false,
      error: error.message
    }));
  }, []);

  // Touch gesture handlers
  const handleTouchZoom = useCallback((scale: number, center?: { x: number; y: number }) => {
    const newZoom = Math.max(minZoom / 100, Math.min(maxZoom / 100, scale));
    setTouchZoom(newZoom);

    // Also update the main zoom state
    setViewerState(prev => ({
      ...prev,
      zoom: {
        level: newZoom * 100,
        mode: 'custom'
      }
    }));
  }, [minZoom, maxZoom]);

  const handleTouchPan = useCallback((deltaX: number, deltaY: number) => {
    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
  }, []);

  const handleTouchDoubleTap = useCallback((x: number, y: number) => {
    // Reset zoom and pan on double tap
    setTouchZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setViewerState(prev => ({
      ...prev,
      zoom: { level: 100, mode: 'fit-width' }
    }));
  }, []);

  const handleSwipeLeft = useCallback(() => {
    if (viewerState.currentPage < viewerState.totalPages) {
      setViewerState(prev => ({
        ...prev,
        currentPage: prev.currentPage + 1
      }));
    }
  }, [viewerState.currentPage, viewerState.totalPages]);

  const handleSwipeRight = useCallback(() => {
    if (viewerState.currentPage > 1) {
      setViewerState(prev => ({
        ...prev,
        currentPage: prev.currentPage - 1
      }));
    }
  }, [viewerState.currentPage]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      zoom: {
        ...prev.zoom,
        level: Math.min(prev.zoom.level + 25, maxZoom),
        mode: 'custom',
      },
    }));
  }, [maxZoom]);

  const handleZoomOut = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      zoom: {
        ...prev.zoom,
        level: Math.max(prev.zoom.level - 25, minZoom),
        mode: 'custom',
      },
    }));
  }, [minZoom]);

  const handleZoomToFitWidth = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      zoom: { level: 100, mode: 'fit-width' },
    }));
    setTouchZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleZoomToFitPage = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      zoom: { level: 100, mode: 'fit-page' },
    }));
    setTouchZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!document) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleSwipeRight();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSwipeLeft();
          break;
        case 'PageUp':
          e.preventDefault();
          handleSwipeRight();
          break;
        case 'PageDown':
          e.preventDefault();
          handleSwipeLeft();
          break;
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault();
            setViewerState(prev => ({ ...prev, currentPage: 1 }));
          }
          break;
        case 'End':
          if (e.ctrlKey) {
            e.preventDefault();
            setViewerState(prev => ({ ...prev, currentPage: prev.totalPages }));
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (viewerState.isFullScreen) {
            setViewerState(prev => ({ ...prev, isFullScreen: false }));
          } else {
            onClose?.();
          }
          break;
        case '+':
        case '=':
          if (e.ctrlKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey) {
            e.preventDefault();
            handleZoomToFitWidth();
          }
          break;
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [viewerState, handleSwipeLeft, handleSwipeRight, handleZoomIn, handleZoomOut, handleZoomToFitWidth, onClose]);

  // Full screen toggle
  const handleFullScreenToggle = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      isFullScreen: !prev.isFullScreen,
    }));
  }, []);

  // Sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      sidebarVisible: !prev.sidebarVisible,
    }));
  }, []);

  // Render document viewer based on format
  const renderDocumentViewer = () => {
    if (!documentData || !documentFormat) return null;

    const commonProps = {
      document: documentData,
      zoom: viewerState.zoom,
      currentPage: viewerState.currentPage,
      annotations,
      onPageChange: (page: number) => setViewerState(prev => ({ ...prev, currentPage: page })),
      onTotalPagesChange: (total: number) => setViewerState(prev => ({ ...prev, totalPages: total })),
    };

    const style = enableTouchGestures ? {
      transform: `scale(${touchZoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
      transformOrigin: 'center center',
      transition: touchZoom === 1 ? 'transform 0.3s ease' : 'none'
    } : {};

    switch (documentFormat) {
      case 'pdf':
        return (
          <div style={style}>
            <PDFViewer {...commonProps} />
          </div>
        );
      case 'image':
        return (
          <div style={style}>
            <ImageViewer {...commonProps} />
          </div>
        );
      case 'text':
        return (
          <div style={style}>
            <TextViewer {...commonProps} />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Unsupported Format
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                This document format is not yet supported for preview.
              </p>
            </div>
          </div>
        );
    }
  };

  // Mobile-optimized toolbar
  const renderMobileToolbar = () => (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-3 z-50">
      <button
        onClick={handleSwipeRight}
        disabled={viewerState.currentPage <= 1}
        className="p-2 text-white disabled:text-gray-500 hover:bg-white/20 rounded-full transition-colors"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>

      <span className="text-white text-sm min-w-[3rem] text-center">
        {viewerState.currentPage} / {viewerState.totalPages}
      </span>

      <button
        onClick={handleSwipeLeft}
        disabled={viewerState.currentPage >= viewerState.totalPages}
        className="p-2 text-white disabled:text-gray-500 hover:bg-white/20 rounded-full transition-colors"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>

      <div className="w-px h-6 bg-white/30" />

      <button
        onClick={handleZoomToFitWidth}
        className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
      >
        <HomeIcon className="w-5 h-5" />
      </button>

      <button
        onClick={handleSidebarToggle}
        className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      <button
        onClick={handleFullScreenToggle}
        className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
      >
        {viewerState.isFullScreen ? (
          <ArrowsPointingInIcon className="w-5 h-5" />
        ) : (
          <ArrowsPointingOutIcon className="w-5 h-5" />
        )}
      </button>
    </div>
  );

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No document selected
          </h3>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        ref={containerRef}
        className={`enhanced-document-viewer relative h-full flex flex-col bg-gray-50 dark:bg-gray-900 ${
          viewerState.isFullScreen ? 'fixed inset-0 z-50' : ''
        } ${className}`}
        dir="ltr"
      >
        {/* Progressive Loading */}
        {enableProgressiveLoading && loadingState.isLoading && (
          <ProgressiveLoader
            documentUrl={document.url || ''}
            documentType={documentFormat || 'pdf'}
            onLoadProgress={handleLoadProgress}
            onLoadComplete={handleLoadComplete}
            onLoadError={handleLoadError}
          />
        )}

        {/* Header - Hidden on mobile in fullscreen */}
        {(!isMobile || !viewerState.isFullScreen) && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {document.name}
                </h2>

                {!isMobile && (
                  <>
                    <ZoomControls
                      zoom={viewerState.zoom}
                      onZoomIn={handleZoomIn}
                      onZoomOut={handleZoomOut}
                      onZoomToFitWidth={handleZoomToFitWidth}
                      onZoomToFitPage={handleZoomToFitPage}
                      onZoomChange={(level) => setViewerState(prev => ({
                        ...prev,
                        zoom: { level, mode: 'custom' }
                      }))}
                    />

                    <PageNavigation
                      currentPage={viewerState.currentPage}
                      totalPages={viewerState.totalPages}
                      onPageChange={(page) => setViewerState(prev => ({ ...prev, currentPage: page }))}
                      onPreviousPage={handleSwipeRight}
                      onNextPage={handleSwipeLeft}
                    />
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {!isMobile && (
                  <>
                    <AnnotationToolbar
                      selectedTool={selectedTool}
                      onToolSelect={setSelectedTool}
                      onAddAnnotation={(annotation) => {
                        setAnnotations(prev => [...prev, annotation]);
                      }}
                    />

                    <DownloadControls
                      document={document}
                      annotations={annotations}
                    />

                    <button
                      onClick={handleSidebarToggle}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      <Bars3Icon className="w-5 h-5" />
                    </button>
                  </>
                )}

                <button
                  onClick={handleFullScreenToggle}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {viewerState.isFullScreen ? (
                    <ArrowsPointingInIcon className="w-5 h-5" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Document Viewer */}
          <div className="flex-1 relative overflow-hidden">
            {loadingState.isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto">
                    <LoadingSkeleton variant="circular" width={64} height={64} />
                  </div>
                  <div>
                    <LoadingSkeleton height={20} width={200} className="mb-2" />
                    <LoadingSkeleton height={16} width={150} />
                  </div>
                </div>
              </div>
            ) : (
              <div ref={viewerRef} className="h-full">
                {enableTouchGestures ? (
                  <TouchGestureHandler
                    onZoom={handleTouchZoom}
                    onPan={handleTouchPan}
                    onDoubleTap={handleTouchDoubleTap}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                    enableZoom={true}
                    enablePan={true}
                    enableSwipe={true}
                    minScale={minZoom / 100}
                    maxScale={maxZoom / 100}
                    className="h-full"
                  >
                    {renderDocumentViewer()}
                  </TouchGestureHandler>
                ) : (
                  renderDocumentViewer()
                )}
              </div>
            )}
          </div>

          {/* Metadata Sidebar */}
          {viewerState.sidebarVisible && !loadingState.isLoading && (
            <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
              <MetadataPanel
                document={document}
                annotations={annotations}
                onAnnotationUpdate={(id, updates) => {
                  setAnnotations(prev => prev.map(ann =>
                    ann.id === id ? { ...ann, ...updates } : ann
                  ));
                }}
                onAnnotationDelete={(id) => {
                  setAnnotations(prev => prev.filter(ann => ann.id !== id));
                }}
              />
            </div>
          )}
        </div>

        {/* Mobile Toolbar */}
        {isMobile && enableMobileOptimizations && !loadingState.isLoading && renderMobileToolbar()}
      </div>
    </ErrorBoundary>
  );
};

export default EnhancedDocumentViewer;