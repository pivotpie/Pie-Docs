import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { addLabelTemplate, updateLabelTemplate } from '@/store/slices/physicalDocsSlice';
import type { LabelTemplate, TemplateElement } from '@/store/slices/physicalDocsSlice';

interface LabelDesignerProps {
  templateId?: string;
  onSave?: (template: LabelTemplate) => void;
  onCancel?: () => void;
  className?: string;
}

export const LabelDesigner: React.FC<LabelDesignerProps> = ({
  templateId,
  onSave,
  onCancel,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const { barcodes } = useAppSelector(state => state.physicalDocs);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<Partial<LabelTemplate>>({
    name: '',
    description: '',
    dimensions: { width: 50, height: 25, unit: 'mm' },
    elements: [],
    isDefault: false,
  });

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const elementTypes = [
    { id: 'barcode', name: 'Barcode', icon: '📊' },
    { id: 'qr', name: 'QR Code', icon: '⬛' },
    { id: 'text', name: 'Text', icon: '📝' },
    { id: 'logo', name: 'Logo', icon: '🖼️' },
  ];

  const labelSizes = [
    { name: 'Small (25x10mm)', width: 25, height: 10 },
    { name: 'Medium (50x25mm)', width: 50, height: 25 },
    { name: 'Large (100x50mm)', width: 100, height: 50 },
    { name: 'Custom', width: 0, height: 0 },
  ];

  // Load existing template if editing
  useEffect(() => {
    if (templateId) {
      const existingTemplate = barcodes.templates.find(t => t.id === templateId);
      if (existingTemplate) {
        setTemplate(existingTemplate);
      }
    }
  }, [templateId, barcodes.templates]);

  // Redraw canvas when template changes
  useEffect(() => {
    drawCanvas();
  }, [template]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !template.dimensions) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale factor for display (2px per mm)
    const scale = 2;
    canvas.width = template.dimensions.width * scale;
    canvas.height = template.dimensions.height * scale;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw elements
    template.elements?.forEach((element) => {
      const x = element.position.x * scale;
      const y = element.position.y * scale;
      const width = element.size.width * scale;
      const height = element.size.height * scale;

      // Highlight selected element
      if (element.id === selectedElement) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
      }

      // Draw element based on type
      switch (element.type) {
        case 'barcode':
          ctx.fillStyle = '#000000';
          // Draw barcode pattern
          for (let i = 0; i < width; i += 3) {
            if (i % 6 < 3) {
              ctx.fillRect(x + i, y, 2, height);
            }
          }
          // Draw text below
          ctx.fillStyle = '#374151';
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SAMPLE123', x + width / 2, y + height + 12);
          break;

        case 'qr':
          ctx.fillStyle = '#000000';
          // Draw QR pattern (simplified)
          const cellSize = Math.min(width, height) / 21;
          for (let i = 0; i < 21; i++) {
            for (let j = 0; j < 21; j++) {
              if ((i + j) % 3 === 0) {
                ctx.fillRect(x + i * cellSize, y + j * cellSize, cellSize - 1, cellSize - 1);
              }
            }
          }
          break;

        case 'text':
          ctx.fillStyle = '#374151';
          ctx.font = `${Math.min(width / 8, height / 2)}px Arial`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(element.properties?.text || 'Sample Text', x + 2, y + height / 2);
          break;

        case 'logo':
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, width, height);
          ctx.fillStyle = '#9ca3af';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('LOGO', x + width / 2, y + height / 2);
          break;
      }

      // Reset styles
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
    });
  };

  const addElement = (type: string) => {
    const newElement: TemplateElement = {
      id: `element_${Date.now()}`,
      type: type as any,
      position: { x: 10, y: 10 },
      size: { width: 30, height: 15 },
      properties: type === 'text' ? { text: 'Sample Text' } : {},
    };

    setTemplate(prev => ({
      ...prev,
      elements: [...(prev.elements || []), newElement],
    }));
    setSelectedElement(newElement.id);
  };

  const updateElement = (elementId: string, updates: Partial<TemplateElement>) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements?.map(el =>
        el.id === elementId ? { ...el, ...updates } : el
      ) || [],
    }));
  };

  const deleteElement = (elementId: string) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements?.filter(el => el.id !== elementId) || [],
    }));
    setSelectedElement(null);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !template.dimensions) return;

    const rect = canvas.getBoundingClientRect();
    const scale = 2;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    // Find clicked element
    const clickedElement = template.elements?.find(element => {
      const ex = element.position.x;
      const ey = element.position.y;
      const ew = element.size.width;
      const eh = element.size.height;
      return x >= ex && x <= ex + ew && y >= ey && y <= ey + eh;
    });

    if (clickedElement) {
      setSelectedElement(clickedElement.id);
      setIsDragging(true);
      setDragOffset({
        x: x - clickedElement.position.x,
        y: y - clickedElement.position.y,
      });
    } else {
      setSelectedElement(null);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedElement || !template.dimensions) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = 2;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    const newX = Math.max(0, Math.min(x - dragOffset.x, template.dimensions.width - 10));
    const newY = Math.max(0, Math.min(y - dragOffset.y, template.dimensions.height - 10));

    updateElement(selectedElement, {
      position: { x: newX, y: newY },
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!template.name?.trim()) {
      alert('Please enter a template name');
      return;
    }

    const newTemplate: LabelTemplate = {
      id: templateId || `template_${Date.now()}`,
      name: template.name,
      description: template.description || '',
      dimensions: template.dimensions!,
      elements: template.elements || [],
      isDefault: template.isDefault || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (templateId) {
      dispatch(updateLabelTemplate(newTemplate));
    } else {
      dispatch(addLabelTemplate(newTemplate));
    }

    onSave?.(newTemplate);
  };

  const selectedElementData = template.elements?.find(el => el.id === selectedElement);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Label Designer
        </h2>

        {/* Template Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              id="template-name"
              type="text"
              value={template.name || ''}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter template name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="template-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              id="template-description"
              type="text"
              value={template.description || ''}
              onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Label Size */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Label Size
          </label>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={labelSizes.find(s => s.width === template.dimensions?.width && s.height === template.dimensions?.height)?.name || 'Custom'}
              onChange={(e) => {
                const size = labelSizes.find(s => s.name === e.target.value);
                if (size && size.width > 0) {
                  setTemplate(prev => ({
                    ...prev,
                    dimensions: { width: size.width, height: size.height, unit: 'mm' },
                  }));
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {labelSizes.map(size => (
                <option key={size.name} value={size.name}>
                  {size.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                value={template.dimensions?.width || 50}
                onChange={(e) => setTemplate(prev => ({
                  ...prev,
                  dimensions: { ...prev.dimensions!, width: parseInt(e.target.value) || 50 },
                }))}
                placeholder="Width"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="self-center text-gray-500">×</span>
              <input
                type="number"
                value={template.dimensions?.height || 25}
                onChange={(e) => setTemplate(prev => ({
                  ...prev,
                  dimensions: { ...prev.dimensions!, height: parseInt(e.target.value) || 25 },
                }))}
                placeholder="Height"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="self-center text-gray-500">mm</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Element Palette */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Elements</h3>
          <div className="space-y-2">
            {elementTypes.map(type => (
              <button
                key={type.id}
                onClick={() => addElement(type.id)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{type.icon}</span>
                  <span className="font-medium">{type.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Element Properties */}
          {selectedElementData && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Properties</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position (X, Y)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={selectedElementData.position.x}
                      onChange={(e) => updateElement(selectedElement!, {
                        position: { ...selectedElementData.position, x: parseInt(e.target.value) || 0 }
                      })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="number"
                      value={selectedElementData.position.y}
                      onChange={(e) => updateElement(selectedElement!, {
                        position: { ...selectedElementData.position, y: parseInt(e.target.value) || 0 }
                      })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size (W, H)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={selectedElementData.size.width}
                      onChange={(e) => updateElement(selectedElement!, {
                        size: { ...selectedElementData.size, width: parseInt(e.target.value) || 1 }
                      })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="number"
                      value={selectedElementData.size.height}
                      onChange={(e) => updateElement(selectedElement!, {
                        size: { ...selectedElementData.size, height: parseInt(e.target.value) || 1 }
                      })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                {selectedElementData.type === 'text' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text
                    </label>
                    <input
                      type="text"
                      value={selectedElementData.properties?.text || ''}
                      onChange={(e) => updateElement(selectedElement!, {
                        properties: { ...selectedElementData.properties, text: e.target.value }
                      })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                )}
                <button
                  onClick={() => deleteElement(selectedElement!)}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  Delete Element
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
            <div className="text-sm text-gray-500">
              {template.dimensions?.width} × {template.dimensions?.height} mm
            </div>
          </div>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 overflow-auto">
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                }}
                className="shadow-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {templateId ? 'Update Template' : 'Save Template'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};