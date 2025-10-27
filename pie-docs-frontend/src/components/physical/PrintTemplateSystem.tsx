import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { addLabelTemplate, updateLabelTemplate, deleteLabelTemplate } from '@/store/slices/physicalDocsSlice';
import { LabelDesigner } from './LabelDesigner';
import type { LabelTemplate, TemplateElement } from '@/store/slices/physicalDocsSlice';

interface PrintTemplateSystemProps {
  onTemplateSelected?: (templateId: string) => void;
  className?: string;
}

export const PrintTemplateSystem: React.FC<PrintTemplateSystemProps> = ({
  onTemplateSelected,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const { barcodes } = useAppSelector(state => state.physicalDocs);

  const [activeView, setActiveView] = useState<'library' | 'designer' | 'preview'>('library');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showQuickStart, setShowQuickStart] = useState<boolean>(false);

  // Template library with predefined templates
  const [templateLibrary] = useState([
    {
      id: 'standard-product',
      name: 'Standard Product Label',
      description: 'Standard product label with barcode and text',
      category: 'product',
      dimensions: { width: 50, height: 25, unit: 'mm' as const },
      elements: [
        {
          id: 'barcode-1',
          type: 'barcode' as const,
          position: { x: 5, y: 5 },
          size: { width: 40, height: 10 },
          properties: { format: 'CODE128', displayValue: true },
        },
        {
          id: 'text-1',
          type: 'text' as const,
          position: { x: 5, y: 18 },
          size: { width: 40, height: 5 },
          properties: { text: 'Product Name', fontSize: '8px', fontWeight: 'bold' },
        },
      ],
      tags: ['product', 'retail', 'standard'],
      isBuiltIn: true,
    },
    {
      id: 'asset-tag',
      name: 'Asset Tag',
      description: 'Asset identification label with QR code',
      category: 'asset',
      dimensions: { width: 30, height: 30, unit: 'mm' as const },
      elements: [
        {
          id: 'qr-1',
          type: 'qr' as const,
          position: { x: 2, y: 2 },
          size: { width: 20, height: 20 },
          properties: { errorCorrection: 'M' },
        },
        {
          id: 'text-1',
          type: 'text' as const,
          position: { x: 23, y: 8 },
          size: { width: 5, height: 12 },
          properties: { text: 'ASSET', fontSize: '6px', rotation: 90 },
        },
      ],
      tags: ['asset', 'tracking', 'qr'],
      isBuiltIn: true,
    },
    {
      id: 'shipping-label',
      name: 'Shipping Label',
      description: 'Large shipping label with multiple data fields',
      category: 'shipping',
      dimensions: { width: 100, height: 50, unit: 'mm' as const },
      elements: [
        {
          id: 'logo-1',
          type: 'logo' as const,
          position: { x: 5, y: 5 },
          size: { width: 20, height: 10 },
          properties: { logoUrl: '' },
        },
        {
          id: 'barcode-1',
          type: 'barcode' as const,
          position: { x: 30, y: 5 },
          size: { width: 60, height: 15 },
          properties: { format: 'CODE128', displayValue: true },
        },
        {
          id: 'text-from',
          type: 'text' as const,
          position: { x: 5, y: 25 },
          size: { width: 40, height: 10 },
          properties: { text: 'FROM:\n{sender_address}', fontSize: '8px' },
        },
        {
          id: 'text-to',
          type: 'text' as const,
          position: { x: 50, y: 25 },
          size: { width: 40, height: 10 },
          properties: { text: 'TO:\n{recipient_address}', fontSize: '8px' },
        },
      ],
      tags: ['shipping', 'logistics', 'large'],
      isBuiltIn: true,
    },
    {
      id: 'pharmacy-label',
      name: 'Pharmacy Label',
      description: 'Pharmaceutical product label with regulatory compliance',
      category: 'pharmacy',
      dimensions: { width: 80, height: 40, unit: 'mm' as const },
      elements: [
        {
          id: 'barcode-gtin',
          type: 'barcode' as const,
          position: { x: 5, y: 5 },
          size: { width: 40, height: 10 },
          properties: { format: 'EAN13', displayValue: true },
        },
        {
          id: 'barcode-lot',
          type: 'barcode' as const,
          position: { x: 50, y: 5 },
          size: { width: 25, height: 8 },
          properties: { format: 'CODE128', displayValue: true },
        },
        {
          id: 'text-name',
          type: 'text' as const,
          position: { x: 5, y: 18 },
          size: { width: 70, height: 8 },
          properties: { text: '{drug_name} {strength}', fontSize: '10px', fontWeight: 'bold' },
        },
        {
          id: 'text-details',
          type: 'text' as const,
          position: { x: 5, y: 28 },
          size: { width: 70, height: 10 },
          properties: { text: 'LOT: {lot_number}\nEXP: {expiry_date}', fontSize: '8px' },
        },
      ],
      tags: ['pharmacy', 'medical', 'compliance'],
      isBuiltIn: true,
    },
  ]);

  const categories = [
    { id: 'all', name: 'All Templates', icon: '📋' },
    { id: 'product', name: 'Product Labels', icon: '🏷️' },
    { id: 'asset', name: 'Asset Tags', icon: '🔗' },
    { id: 'shipping', name: 'Shipping Labels', icon: '📦' },
    { id: 'pharmacy', name: 'Pharmacy Labels', icon: '💊' },
    { id: 'custom', name: 'Custom Templates', icon: '🎨' },
  ];

  // Filter templates based on search and category
  const filteredTemplates = React.useMemo(() => {
    let templates = [...templateLibrary, ...barcodes.templates];

    if (filterCategory !== 'all') {
      if (filterCategory === 'custom') {
        templates = templates.filter(t => !t.isBuiltIn);
      } else {
        templates = templates.filter(t => t.category === filterCategory || t.tags?.includes(filterCategory));
      }
    }

    if (searchTerm) {
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return templates;
  }, [templateLibrary, barcodes.templates, filterCategory, searchTerm]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (onTemplateSelected) {
      onTemplateSelected(templateId);
    }
  };

  const handleEditTemplate = (templateId: string) => {
    setEditingTemplate(templateId);
    setActiveView('designer');
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      dispatch(deleteLabelTemplate(templateId));
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
      }
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setActiveView('designer');
  };

  const handleTemplateCreated = (template: LabelTemplate) => {
    setActiveView('library');
    setSelectedTemplate(template.id);
    setEditingTemplate(null);
  };

  const handleUseTemplate = (libraryTemplate: any) => {
    const newTemplate: LabelTemplate = {
      id: `template_${Date.now()}`,
      name: `${libraryTemplate.name} (Copy)`,
      description: libraryTemplate.description,
      dimensions: libraryTemplate.dimensions,
      elements: libraryTemplate.elements.map((el: any) => ({
        ...el,
        id: `element_${Date.now()}_${Math.random()}`,
      })),
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch(addLabelTemplate(newTemplate));
    setSelectedTemplate(newTemplate.id);
  };

  const getTemplatePreview = (template: any) => {
    const scale = 1;
    const width = template.dimensions.width * scale;
    const height = template.dimensions.height * scale;

    return (
      <div
        className="bg-white border rounded relative overflow-hidden"
        style={{ width: `${width}px`, height: `${height}px`, minWidth: '60px', minHeight: '40px' }}
      >
        {template.elements?.map((element: any, index: number) => (
          <div
            key={index}
            className="absolute"
            style={{
              left: `${(element.position.x / template.dimensions.width) * 100}%`,
              top: `${(element.position.y / template.dimensions.height) * 100}%`,
              width: `${(element.size.width / template.dimensions.width) * 100}%`,
              height: `${(element.size.height / template.dimensions.height) * 100}%`,
            }}
          >
            {element.type === 'barcode' && (
              <div className="bg-gray-800 text-white text-xs flex items-center justify-center h-full">
                📊
              </div>
            )}
            {element.type === 'qr' && (
              <div className="bg-gray-800 text-white text-xs flex items-center justify-center h-full">
                ⬛
              </div>
            )}
            {element.type === 'text' && (
              <div className="text-xs text-gray-700 overflow-hidden">
                {element.properties?.text || 'Text'}
              </div>
            )}
            {element.type === 'logo' && (
              <div className="border border-gray-300 text-xs text-gray-500 flex items-center justify-center h-full">
                🖼️
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Print Template System</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowQuickStart(!showQuickStart)}
              className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200"
            >
              Quick Start Guide
            </button>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create New Template
            </button>
          </div>
        </div>

        {/* Quick Start Guide */}
        {showQuickStart && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-md font-medium text-blue-900 mb-3">Getting Started with Templates</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• <strong>Browse Library:</strong> Start with our pre-built templates for common use cases</p>
              <p>• <strong>Customize:</strong> Click "Use Template" to create your own copy and modify it</p>
              <p>• <strong>Design New:</strong> Use the designer to create templates from scratch</p>
              <p>• <strong>Elements:</strong> Add barcodes, QR codes, text, and logos to your labels</p>
              <p>• <strong>Save & Reuse:</strong> Save your templates to use for future print jobs</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveView('library')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'library'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Template Library
            </button>
            <button
              onClick={() => setActiveView('designer')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'designer'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Designer
            </button>
          </div>
        </div>

        {/* Template Library View */}
        {activeView === 'library' && (
          <div>
            {/* Search and Filter */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{template.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </div>
                    {template.isBuiltIn && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Built-in
                      </span>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="mb-4 flex justify-center p-2 bg-gray-100 rounded">
                    {getTemplatePreview(template)}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="text-xs text-gray-600">
                      <strong>Size:</strong> {template.dimensions.width}×{template.dimensions.height}mm
                    </div>
                    <div className="text-xs text-gray-600">
                      <strong>Elements:</strong> {template.elements?.length || 0}
                    </div>
                    {template.tags && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {template.isBuiltIn ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseTemplate(template);
                        }}
                        className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Use Template
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template.id);
                          }}
                          className="flex-1 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || filterCategory !== 'all'
                    ? 'Try adjusting your search criteria or filters.'
                    : 'Get started by creating your first template.'}
                </p>
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create New Template
                </button>
              </div>
            )}
          </div>
        )}

        {/* Designer View */}
        {activeView === 'designer' && (
          <LabelDesigner
            templateId={editingTemplate || undefined}
            onSave={handleTemplateCreated}
            onCancel={() => setActiveView('library')}
          />
        )}
      </div>
    </div>
  );
};