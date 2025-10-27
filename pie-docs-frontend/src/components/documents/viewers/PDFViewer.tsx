import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { ZoomState, LoadingState } from '@/types/domain/DocumentViewer';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  document: {
    id: string;
    name: string;
    downloadUrl: string;
    previewUrl?: string;
  };
  zoom: ZoomState;
  currentPage: number;
  annotations: any[];
  onPageChange: (updates: any) => void;
  onLoadingChange: (loading: LoadingState) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  document,
  zoom,
  currentPage,
  annotations,
  onPageChange,
  onLoadingChange,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate scale based on zoom settings
  useEffect(() => {
    if (!containerRef.current || !pageWidth) return;

    const containerWidth = containerRef.current.clientWidth - 40; // Account for padding

    let newScale = 1;
    switch (zoom.mode) {
      case 'fit-width':
        newScale = containerWidth / pageWidth;
        break;
      case 'fit-page':
        // This would need page height calculation, simplified for now
        newScale = Math.min(containerWidth / pageWidth, 1.2);
        break;
      case 'custom':
        newScale = zoom.level / 100;
        break;
    }

    setScale(newScale);
  }, [zoom, pageWidth]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    onPageChange(prev => ({ ...prev, totalPages: numPages }));
    onLoadingChange({
      isLoading: false,
      progress: 100,
      message: 'PDF loaded successfully',
    });
  }, [onPageChange, onLoadingChange]);

  const onDocumentLoadError = useCallback((error: any) => {
    console.error('PDF loading error:', error);
    onLoadingChange({
      isLoading: false,
      message: 'Failed to load PDF',
    });
    onPageChange(prev => ({ ...prev, error: 'Failed to load PDF document' }));
  }, [onPageChange, onLoadingChange]);

  const onPageLoadSuccess = useCallback((page: any) => {
    // Get the natural page width for scaling calculations
    const { width } = page.getViewport({ scale: 1 });
    setPageWidth(width);
  }, []);

  const onPageLoadError = useCallback((error: any) => {
    console.error('Page loading error:', error);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY;
      const zoomChange = delta > 0 ? -10 : 10;
      const newZoom = Math.max(25, Math.min(500, zoom.level + zoomChange));

      onPageChange(prev => ({
        ...prev,
        zoom: { level: newZoom, mode: 'custom' },
      }));
    }
  }, [zoom.level, onPageChange]);

  const renderAnnotations = () => {
    const pageAnnotations = annotations.filter(ann => ann.page === currentPage);

    return pageAnnotations.map(annotation => (
      <div
        key={annotation.id}
        className="absolute pointer-events-none"
        style={{
          left: `${annotation.position.x * scale}px`,
          top: `${annotation.position.y * scale}px`,
          width: annotation.position.width ? `${annotation.position.width * scale}px` : 'auto',
          height: annotation.position.height ? `${annotation.position.height * scale}px` : 'auto',
        }}
      >
        {annotation.type === 'highlight' && (
          <div
            className="bg-yellow-200 opacity-50"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: annotation.color || '#fef08a',
            }}
          />
        )}
        {annotation.type === 'comment' && (
          <div className="bg-blue-500 w-4 h-4 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">💬</span>
          </div>
        )}
        {(annotation.type === 'rectangle' || annotation.type === 'circle') && (
          <div
            className="border-2 pointer-events-none"
            style={{
              borderColor: annotation.strokeColor || '#3b82f6',
              backgroundColor: annotation.fillColor || 'transparent',
              borderRadius: annotation.type === 'circle' ? '50%' : '0',
              width: '100%',
              height: '100%',
            }}
          />
        )}
      </div>
    ));
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-gray-100 p-4"
      onWheel={handleWheel}
    >
      <div className="flex justify-center">
        <div className="relative bg-white shadow-lg">
          <Document
            file={document.downloadUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2">Loading PDF...</span>
              </div>
            }
            error={
              <div className="flex items-center justify-center p-8 text-red-600">
                <span>Failed to load PDF. Please try again.</span>
              </div>
            }
          >
            <div className="relative">
              <Page
                pageNumber={currentPage}
                scale={scale}
                onLoadSuccess={onPageLoadSuccess}
                onLoadError={onPageLoadError}
                loading={
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center p-4 text-red-600">
                    <span>Failed to load page</span>
                  </div>
                }
              />
              {/* Render annotations overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {renderAnnotations()}
              </div>
            </div>
          </Document>
        </div>
      </div>

      {/* Page information */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Page {currentPage} of {numPages} • Scale: {Math.round(scale * 100)}%
      </div>
    </div>
  );
};

export default PDFViewer;