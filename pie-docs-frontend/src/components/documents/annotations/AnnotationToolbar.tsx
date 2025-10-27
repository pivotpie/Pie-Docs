import React, { useState, useCallback } from 'react';
import type { AnnotationToolbarProps } from '@/types/domain/DocumentViewer';

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  selectedTool,
  onToolSelect,
  annotations,
  onAnnotationDelete,
  disabled = false,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3b82f6'); // Default blue

  const annotationTools = [
    {
      id: 'comment',
      name: 'Comment',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1.586l-4.707 4.707z" />
        </svg>
      ),
      description: 'Add comment annotations',
    },
    {
      id: 'highlight',
      name: 'Highlight',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      ),
      description: 'Highlight text and areas',
    },
    {
      id: 'rectangle',
      name: 'Rectangle',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v12H4z" />
        </svg>
      ),
      description: 'Draw rectangles',
    },
    {
      id: 'circle',
      name: 'Circle',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
        </svg>
      ),
      description: 'Draw circles',
    },
    {
      id: 'arrow',
      name: 'Arrow',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      ),
      description: 'Draw arrows',
    },
  ];

  const colors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#22c55e', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#6b7280', // Gray
    '#000000', // Black
  ];

  const handleToolSelect = useCallback((toolId: string) => {
    if (selectedTool === toolId) {
      onToolSelect(null); // Deselect if clicking the same tool
    } else {
      onToolSelect(toolId);
    }
  }, [selectedTool, onToolSelect]);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    setShowColorPicker(false);
  }, []);

  const clearAllAnnotations = useCallback(() => {
    if (annotations && annotations.length > 0 && window.confirm('Are you sure you want to clear all annotations?')) {
      annotations.forEach(annotation => onAnnotationDelete(annotation.id));
    }
  }, [annotations, onAnnotationDelete]);

  const annotationCount = annotations?.length || 0;

  return (
    <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-2">
      {/* Annotation Tools */}
      <div className="flex items-center space-x-1">
        {annotationTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolSelect(tool.id)}
            disabled={disabled}
            className={`p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedTool === tool.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            aria-label={tool.name}
            title={tool.description}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Color Picker */}
      <div className="relative border-l border-gray-200 pl-2 ml-1">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          disabled={disabled}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Choose annotation color"
          title="Choose annotation color"
        >
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: selectedColor }}>
            <svg className="w-4 h-4 opacity-0 hover:opacity-100 transition-opacity" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3V1M7 23v-2" />
            </svg>
          </div>
        </button>

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-md shadow-lg p-2 z-10">
            <div className="grid grid-cols-5 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform ${
                    selectedColor === color ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Annotation Management */}
      <div className="flex items-center space-x-1 border-l border-gray-200 pl-2 ml-1">
        {/* Annotation count */}
        {annotationCount > 0 && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
            {annotationCount} annotation{annotationCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Clear all annotations */}
        {annotationCount > 0 && (
          <button
            onClick={clearAllAnnotations}
            disabled={disabled}
            className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear all annotations"
          >
            Clear All
          </button>
        )}

        {/* Annotation visibility toggle */}
        <button
          disabled={disabled}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Toggle annotation visibility"
          title="Toggle annotation visibility (future feature)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>

      {/* Instructions */}
      {selectedTool && (
        <div className="hidden md:block text-xs text-gray-500 ml-2">
          {selectedTool === 'comment' && 'Click to add comment'}
          {selectedTool === 'highlight' && 'Click and drag to highlight'}
          {(selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'arrow') && 'Click and drag to draw'}
        </div>
      )}
    </div>
  );
};

export default AnnotationToolbar;