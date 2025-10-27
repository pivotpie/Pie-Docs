import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { DocumentViewerProps, ViewerState, LoadingState } from '@/types/domain/DocumentViewer';
import { ZoomControls } from './viewer/ZoomControls';
import { PageNavigation } from './viewer/PageNavigation';
import { AnnotationToolbar } from './annotations/AnnotationToolbar';
import { MetadataPanel } from './MetadataPanel';
import { PDFViewer } from './viewers/PDFViewer';
import { ImageViewer } from './viewers/ImageViewer';
import { TextViewer } from './viewers/TextViewer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DownloadControls } from './viewer/DownloadControls';

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  document,
  onClose,
  className = '',
}) => {
  const { theme } = useTheme();

  // Local state for viewer
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

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      zoom: {
        ...prev.zoom,
        level: Math.min(prev.zoom.level + 25, 500),
        mode: 'custom',
      },
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      zoom: {
        ...prev.zoom,
        level: Math.max(prev.zoom.level - 25, 25),
        mode: 'custom',
      },
    }));
  }, []);

  const handleZoomToFitWidth = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      zoom: { level: 100, mode: 'fit-width' },
    }));
  }, []);

  const handleZoomToFitPage = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      zoom: { level: 100, mode: 'fit-page' },
    }));
  }, []);

  const handleZoomChange = useCallback((level: number) => {
    setViewerState(prev => ({
      ...prev,
      zoom: { level, mode: 'custom' },
    }));
  }, []);

  // Page navigation
  const handlePageChange = useCallback((page: number) => {
    setViewerState(prev => ({
      ...prev,
      currentPage: Math.max(1, Math.min(page, prev.totalPages)),
    }));
  }, []);

  const handlePreviousPage = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      currentPage: Math.max(1, prev.currentPage - 1),
    }));
  }, []);

  const handleNextPage = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      currentPage: Math.min(prev.totalPages, prev.currentPage + 1),
    }));
  }, []);

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

  // Annotation handlers
  const handleAnnotationAdd = useCallback((annotation: Record<string, unknown>) => {
    const newAnnotation = {
      ...annotation,
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  }, []);

  const handleAnnotationUpdate = useCallback((id: string, updates: Record<string, unknown>) => {
    setAnnotations(prev =>
      prev.map(annotation =>
        annotation.id === id ? { ...annotation, ...updates } : annotation
      )
    );
  }, []);

  const handleAnnotationDelete = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
  }, []);

  // Metadata update handler
  const handleMetadataUpdate = useCallback((metadata: Record<string, any>) => {
    // TODO: Implement metadata update API call
    console.log('Updating metadata:', metadata);
  }, []);

  // Document loading effect
  useEffect(() => {
    if (!document) {
      setLoadingState({
        isLoading: false,
        message: 'Document not found',
      });
      setViewerState(prev => ({
        ...prev,
        loading: false,
        error: 'Document not found',
      }));
      return;
    }

    setLoadingState({
      isLoading: true,
      progress: 0,
      message: 'Loading document...',
    });

    // Simulate document loading
    const loadTimeout = setTimeout(() => {
      setLoadingState({
        isLoading: false,
        progress: 100,
        message: 'Document loaded',
      });
      setViewerState(prev => ({
        ...prev,
        loading: false,
        error: null,
      }));
    }, 1000);

    return () => clearTimeout(loadTimeout);
  }, [document]);

  // Enhanced keyboard shortcuts with accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts when typing in inputs
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePreviousPage();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextPage();
          break;
        case 'ArrowUp':
          event.preventDefault();
          handleZoomIn();
          break;
        case 'ArrowDown':
          event.preventDefault();
          handleZoomOut();
          break;
        case 'Home':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlePageChange(1);
          }
          break;
        case 'End':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlePageChange(viewerState.totalPages);
          }
          break;
        case 'PageUp':
          event.preventDefault();
          handlePreviousPage();
          break;
        case 'PageDown':
          event.preventDefault();
          handleNextPage();
          break;
        case 'Escape':
          if (viewerState.isFullScreen) {
            event.preventDefault();
            handleFullScreenToggle();
          } else if (onClose) {
            event.preventDefault();
            onClose();
          }
          break;
        case 'f':
        case 'F':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleFullScreenToggle();
          }
          break;
        case '0':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleZoomToFitWidth();
          }
          break;
        case '=':
        case '+':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleZoomOut();
          }
          break;
        case 'm':
        case 'M':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleSidebarToggle();
          }
          break;
        case '?':
          if (event.shiftKey) {
            event.preventDefault();
            // TODO: Show keyboard shortcuts help modal
            console.log('Keyboard shortcuts help would open here');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerState.isFullScreen, viewerState.totalPages, handlePreviousPage, handleNextPage, handleZoomIn, handleZoomOut, handleFullScreenToggle, handleZoomToFitWidth, handlePageChange, handleSidebarToggle, onClose]);

  // Render viewer content based on format
  const renderViewerContent = () => {
    if (loadingState.isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
          <div className="ml-4">
            <p className="text-lg font-medium">{loadingState.message}</p>
            {loadingState.progress !== undefined && (
              <div className="w-64 h-2 bg-gray-200 rounded-full mt-2">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${loadingState.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    if (viewerState.error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Document</h3>
            <p className="text-gray-600 mb-4">{viewerState.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!document) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Document Selected</h3>
            <p className="text-gray-600">Select a document to view</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      document,
      zoom: viewerState.zoom,
      currentPage: viewerState.currentPage,
      annotations,
      onPageChange: setViewerState,
      onLoadingChange: setLoadingState,
    };

    switch (documentFormat) {
      case 'pdf':
        return <PDFViewer {...commonProps} />;
      case 'image':
        return <ImageViewer {...commonProps} />;
      case 'text':
        return <TextViewer {...commonProps} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">❓</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Unsupported Format</h3>
              <p className="text-gray-600 mb-4">This document format is not supported for viewing</p>
              <a
                href={document.downloadUrl}
                download
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Download Document
              </a>
            </div>
          </div>
        );
    }
  };

  const viewerClasses = `
    ${className}
    ${viewerState.isFullScreen
      ? 'fixed inset-0 z-50 bg-white'
      : 'relative h-full'
    }
    flex flex-col
  `;

  return (
    <ErrorBoundary>
      <div
        className={viewerClasses}
        role="main"
        aria-label="Document viewer"
        tabIndex={-1}
      >
        {/* Header with controls */}
        <div
          className="flex items-center justify-between p-4 border-b border-gray-200 bg-white"
          role="toolbar"
          aria-label="Document viewer controls"
        >
          <div className="flex items-center space-x-4">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Close viewer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {document?.name || 'Document Viewer'}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <ZoomControls
              zoom={viewerState.zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomToFitWidth={handleZoomToFitWidth}
              onZoomToFitPage={handleZoomToFitPage}
              onZoomChange={handleZoomChange}
              disabled={loadingState.isLoading}
            />

            {/* Page Navigation */}
            {viewerState.totalPages > 1 && (
              <PageNavigation
                currentPage={viewerState.currentPage}
                totalPages={viewerState.totalPages}
                onPageChange={handlePageChange}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
                disabled={loadingState.isLoading}
              />
            )}

            {/* Annotation Tools */}
            <AnnotationToolbar
              selectedTool={selectedTool}
              onToolSelect={setSelectedTool}
              annotations={annotations}
              onAnnotationAdd={handleAnnotationAdd}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationDelete={handleAnnotationDelete}
              disabled={loadingState.isLoading}
            />

            {/* Download Controls */}
            <DownloadControls
              document={document}
              annotations={annotations}
              disabled={loadingState.isLoading}
            />

            {/* View Controls */}
            <div className="flex items-center space-x-1 border-l border-gray-200 pl-2 ml-2">
              <button
                onClick={handleSidebarToggle}
                className={`p-2 rounded-md transition-colors ${
                  viewerState.sidebarVisible
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                aria-label="Toggle metadata panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={handleFullScreenToggle}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                aria-label={viewerState.isFullScreen ? 'Exit full screen' : 'Enter full screen'}
              >
                {viewerState.isFullScreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Document viewer */}
          <div
            className="flex-1 relative overflow-hidden"
            role="document"
            aria-label={`${document?.name || 'Document'} content`}
            tabIndex={0}
          >
            {renderViewerContent()}
          </div>

          {/* Metadata sidebar */}
          {viewerState.sidebarVisible && document && (
            <MetadataPanel
              document={document}
              visible={viewerState.sidebarVisible}
              onToggle={handleSidebarToggle}
              onMetadataUpdate={handleMetadataUpdate}
              disabled={loadingState.isLoading}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default DocumentViewer;