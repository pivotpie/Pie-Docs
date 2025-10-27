import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ZoomState, LoadingState } from '@/types/domain/DocumentViewer';

interface ImageViewerProps {
  document: {
    id: string;
    name: string;
    downloadUrl: string;
    previewUrl?: string;
  };
  zoom: ZoomState;
  annotations: Record<string, unknown>[];
  onPageChange: (updates: Record<string, unknown>) => void;
  onLoadingChange: (loading: LoadingState) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  document,
  zoom,
  annotations,
  onPageChange,
  onLoadingChange,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Calculate scale based on zoom settings
  useEffect(() => {
    if (!containerRef.current || !imageDimensions.width || !imageDimensions.height) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;

    let newScale = 1;
    switch (zoom.mode) {
      case 'fit-width':
        newScale = containerWidth / imageDimensions.width;
        break;
      case 'fit-page': {
        const widthScale = containerWidth / imageDimensions.width;
        const heightScale = containerHeight / imageDimensions.height;
        newScale = Math.min(widthScale, heightScale);
        break;
      }
      case 'custom':
        newScale = zoom.level / 100;
        break;
    }

    setScale(newScale);
    // Reset pan position when zoom mode changes
    if (zoom.mode !== 'custom') {
      setPanPosition({ x: 0, y: 0 });
    }
  }, [zoom, imageDimensions]);

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    setImageLoaded(true);
    setImageError(null);

    // Set total pages to 1 for images
    onPageChange(prev => ({ ...prev, totalPages: 1 }));
    onLoadingChange({
      isLoading: false,
      progress: 100,
      message: 'Image loaded successfully',
    });
  }, [onPageChange, onLoadingChange]);

  const handleImageError = useCallback(() => {
    setImageError('Failed to load image');
    setImageLoaded(false);
    onLoadingChange({
      isLoading: false,
      message: 'Failed to load image',
    });
    onPageChange(prev => ({ ...prev, error: 'Failed to load image' }));
  }, [onPageChange, onLoadingChange]);

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

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: event.clientX - panPosition.x,
        y: event.clientY - panPosition.y,
      });
      event.preventDefault();
    }
  }, [scale, panPosition]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPanPosition({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (scale === 1) {
      // Zoom to 200% at click point
      onPageChange(prev => ({
        ...prev,
        zoom: { level: 200, mode: 'custom' },
      }));
    } else {
      // Reset to fit
      onPageChange(prev => ({
        ...prev,
        zoom: { level: 100, mode: 'fit-page' },
      }));
    }
  }, [scale, onPageChange]);

  const renderAnnotations = () => {
    if (!imageLoaded) return null;

    return annotations.map(annotation => (
      <div
        key={annotation.id}
        className="absolute pointer-events-none"
        style={{
          left: `${(annotation.position.x * scale) + panPosition.x}px`,
          top: `${(annotation.position.y * scale) + panPosition.y}px`,
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
      className="flex-1 overflow-hidden bg-gray-100 relative cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {!imageLoaded && !imageError && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading image...</span>
          </div>
        )}

        {imageError && (
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Image Load Error</h3>
            <p className="text-gray-600 mb-4">{imageError}</p>
            <button
              onClick={() => {
                setImageError(null);
                setImageLoaded(false);
                if (imageRef.current) {
                  imageRef.current.src = document.downloadUrl;
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!imageError && (
          <div className="relative">
            <img
              ref={imageRef}
              src={document.previewUrl || document.downloadUrl}
              alt={document.name}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="max-w-none shadow-lg transition-transform duration-200"
              style={{
                transform: `scale(${scale}) translate(${panPosition.x / scale}px, ${panPosition.y / scale}px)`,
                transformOrigin: 'center center',
              }}
              draggable={false}
            />

            {/* Annotations overlay */}
            {imageLoaded && (
              <div className="absolute inset-0 pointer-events-none">
                {renderAnnotations()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image information */}
      {imageLoaded && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
          {imageDimensions.width} × {imageDimensions.height} • Scale: {Math.round(scale * 100)}%
        </div>
      )}

      {/* Instructions */}
      {imageLoaded && scale > 1 && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
          Drag to pan • Double-click to zoom out
        </div>
      )}
    </div>
  );
};

export default ImageViewer;