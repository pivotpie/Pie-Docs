import React, { useState, useCallback } from 'react';
import type { ZoomControlsProps } from '@/types/domain/DocumentViewer';

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomToFitWidth,
  onZoomToFitPage,
  onZoomChange,
  disabled = false,
}) => {
  const [showZoomInput, setShowZoomInput] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState(zoom.level.toString());

  const handleZoomInputSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const value = parseInt(zoomInputValue, 10);
    if (!isNaN(value) && value >= 25 && value <= 500) {
      onZoomChange(value);
    }
    setShowZoomInput(false);
  }, [zoomInputValue, onZoomChange]);

  const handleZoomInputKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setZoomInputValue(zoom.level.toString());
      setShowZoomInput(false);
    }
  }, [zoom.level]);

  const zoomPercentage = Math.round(zoom.level);

  return (
    <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-2">
      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        disabled={disabled || zoom.level <= 25}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Zoom out"
        title="Zoom out (Ctrl + -)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>

      {/* Zoom Level Display/Input */}
      {showZoomInput ? (
        <form onSubmit={handleZoomInputSubmit} className="relative">
          <input
            type="number"
            min="25"
            max="500"
            value={zoomInputValue}
            onChange={(e) => setZoomInputValue(e.target.value)}
            onBlur={() => setShowZoomInput(false)}
            onKeyDown={handleZoomInputKeyDown}
            className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </form>
      ) : (
        <button
          onClick={() => {
            setZoomInputValue(zoom.level.toString());
            setShowZoomInput(true);
          }}
          disabled={disabled}
          className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors min-w-[3rem] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Click to enter custom zoom level"
        >
          {zoomPercentage}%
        </button>
      )}

      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        disabled={disabled || zoom.level >= 500}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Zoom in"
        title="Zoom in (Ctrl + +)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Fit Controls */}
      <div className="flex items-center space-x-1 border-l border-gray-200 pl-2 ml-1">
        <button
          onClick={onZoomToFitWidth}
          disabled={disabled}
          className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            zoom.mode === 'fit-width'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
          title="Fit to width (Ctrl + 0)"
        >
          Fit Width
        </button>

        <button
          onClick={onZoomToFitPage}
          disabled={disabled}
          className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            zoom.mode === 'fit-page'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
          title="Fit to page"
        >
          Fit Page
        </button>
      </div>

      {/* Zoom presets dropdown */}
      <div className="relative group">
        <button
          disabled={disabled}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Zoom presets"
          title="Zoom presets"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        <div className="absolute right-0 top-full mt-1 w-24 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
          <div className="py-1">
            {[25, 50, 75, 100, 125, 150, 200, 300, 400, 500].map((level) => (
              <button
                key={level}
                onClick={() => onZoomChange(level)}
                disabled={disabled}
                className={`w-full px-3 py-1 text-sm text-left hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  zoomPercentage === level ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                {level}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomControls;