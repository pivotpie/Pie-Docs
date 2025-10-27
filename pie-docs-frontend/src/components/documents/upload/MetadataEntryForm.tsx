import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface MetadataField {
  id: string;
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'number' | 'textarea';
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

interface MetadataTemplate {
  id: string;
  name: string;
  description?: string;
  fields: MetadataField[];
  fileTypes?: string[];
}

interface MetadataEntryFormProps {
  files: File[];
  onMetadataChange: (fileId: string, metadata: Record<string, any>) => void;
  onBulkMetadataApply?: (metadata: Record<string, any>) => void;
  templates?: MetadataTemplate[];
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface AutoSuggestion {
  field: string;
  suggestions: string[];
}

// Common metadata templates
const defaultTemplates: MetadataTemplate[] = [
  {
    id: 'general',
    name: 'General Document',
    description: 'Basic metadata for general documents',
    fields: [
      {
        id: 'title',
        name: 'title',
        type: 'text',
        label: 'Document Title',
        required: true,
        placeholder: 'Enter document title'
      },
      {
        id: 'description',
        name: 'description',
        type: 'textarea',
        label: 'Description',
        placeholder: 'Brief description of the document'
      },
      {
        id: 'category',
        name: 'category',
        type: 'select',
        label: 'Category',
        options: ['Financial', 'Legal', 'HR', 'Technical', 'Marketing', 'Operations']
      },
      {
        id: 'tags',
        name: 'tags',
        type: 'multiselect',
        label: 'Tags',
        placeholder: 'Add tags...'
      },
      {
        id: 'author',
        name: 'author',
        type: 'text',
        label: 'Author',
        placeholder: 'Document author'
      },
      {
        id: 'department',
        name: 'department',
        type: 'select',
        label: 'Department',
        options: ['Finance', 'Legal', 'HR', 'IT', 'Marketing', 'Operations', 'Management']
      }
    ]
  },
  {
    id: 'financial',
    name: 'Financial Document',
    description: 'Metadata for financial documents',
    fileTypes: ['pdf', 'xlsx', 'csv'],
    fields: [
      {
        id: 'title',
        name: 'title',
        type: 'text',
        label: 'Document Title',
        required: true
      },
      {
        id: 'fiscal_year',
        name: 'fiscal_year',
        type: 'select',
        label: 'Fiscal Year',
        options: ['2024', '2023', '2022', '2021']
      },
      {
        id: 'amount',
        name: 'amount',
        type: 'number',
        label: 'Amount',
        validation: { min: 0 }
      },
      {
        id: 'currency',
        name: 'currency',
        type: 'select',
        label: 'Currency',
        options: ['USD', 'EUR', 'SAR', 'AED']
      },
      {
        id: 'expense_category',
        name: 'expense_category',
        type: 'select',
        label: 'Expense Category',
        options: ['Office Supplies', 'Travel', 'Software', 'Equipment', 'Services']
      }
    ]
  },
  {
    id: 'legal',
    name: 'Legal Document',
    description: 'Metadata for legal documents',
    fileTypes: ['pdf', 'docx'],
    fields: [
      {
        id: 'title',
        name: 'title',
        type: 'text',
        label: 'Document Title',
        required: true
      },
      {
        id: 'contract_type',
        name: 'contract_type',
        type: 'select',
        label: 'Contract Type',
        options: ['Employment', 'Service Agreement', 'NDA', 'Partnership', 'Vendor Agreement']
      },
      {
        id: 'parties',
        name: 'parties',
        type: 'textarea',
        label: 'Parties Involved',
        placeholder: 'List all parties involved'
      },
      {
        id: 'effective_date',
        name: 'effective_date',
        type: 'date',
        label: 'Effective Date'
      },
      {
        id: 'expiry_date',
        name: 'expiry_date',
        type: 'date',
        label: 'Expiry Date'
      },
      {
        id: 'jurisdiction',
        name: 'jurisdiction',
        type: 'select',
        label: 'Jurisdiction',
        options: ['Saudi Arabia', 'UAE', 'United States', 'European Union']
      }
    ]
  }
];

// Auto-suggestions based on file content analysis (simulated)
const generateAutoSuggestions = (file: File): AutoSuggestion[] => {
  const suggestions: AutoSuggestion[] = [];
  const fileName = file.name.toLowerCase();

  // Title suggestions based on filename
  const titleSuggestions = [
    file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    file.name.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''), // Replace dashes/underscores with spaces
  ];

  suggestions.push({
    field: 'title',
    suggestions: titleSuggestions
  });

  // Category suggestions based on file type and name
  const categorySuggestions = [];
  if (fileName.includes('invoice') || fileName.includes('receipt')) {
    categorySuggestions.push('Financial');
  }
  if (fileName.includes('contract') || fileName.includes('agreement')) {
    categorySuggestions.push('Legal');
  }
  if (fileName.includes('manual') || fileName.includes('guide')) {
    categorySuggestions.push('Technical');
  }

  if (categorySuggestions.length > 0) {
    suggestions.push({
      field: 'category',
      suggestions: categorySuggestions
    });
  }

  // Tag suggestions based on filename
  const tagSuggestions = [];
  if (fileName.includes('urgent')) tagSuggestions.push('urgent');
  if (fileName.includes('draft')) tagSuggestions.push('draft');
  if (fileName.includes('final')) tagSuggestions.push('final');
  if (fileName.includes('confidential')) tagSuggestions.push('confidential');

  if (tagSuggestions.length > 0) {
    suggestions.push({
      field: 'tags',
      suggestions: tagSuggestions
    });
  }

  return suggestions;
};

export const MetadataEntryForm: React.FC<MetadataEntryFormProps> = ({
  files,
  onMetadataChange,
  onBulkMetadataApply,
  templates = defaultTemplates,
  className = '',
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<MetadataTemplate | null>(templates[0] || null);
  const [metadata, setMetadata] = useState<Record<string, Record<string, any>>>({});
  const [bulkMetadata, setBulkMetadata] = useState<Record<string, any>>({});
  const [autoSuggestions, setAutoSuggestions] = useState<Record<string, AutoSuggestion[]>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  // Generate auto-suggestions for each file
  useEffect(() => {
    const suggestions: Record<string, AutoSuggestion[]> = {};
    files.forEach(file => {
      suggestions[file.name] = generateAutoSuggestions(file);
    });
    setAutoSuggestions(suggestions);
  }, [files]);

  // Validate field value
  const validateField = useCallback((field: MetadataField, value: any): string | null => {
    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} is required`;
    }

    if (field.validation && value) {
      const { pattern, min, max, minLength, maxLength } = field.validation;

      if (pattern && typeof value === 'string' && !new RegExp(pattern).test(value)) {
        return `${field.label} format is invalid`;
      }

      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          return `${field.label} must be at least ${min}`;
        }
        if (max !== undefined && value > max) {
          return `${field.label} must be no more than ${max}`;
        }
      }

      if (typeof value === 'string') {
        if (minLength !== undefined && value.length < minLength) {
          return `${field.label} must be at least ${minLength} characters`;
        }
        if (maxLength !== undefined && value.length > maxLength) {
          return `${field.label} must be no more than ${maxLength} characters`;
        }
      }
    }

    return null;
  }, []);

  // Handle field value change
  const handleFieldChange = (fileId: string, fieldId: string, value: any) => {
    const newMetadata = {
      ...metadata,
      [fileId]: {
        ...metadata[fileId],
        [fieldId]: value
      }
    };

    setMetadata(newMetadata);
    onMetadataChange(fileId, newMetadata[fileId]);

    // Validate field
    if (selectedTemplate) {
      const field = selectedTemplate.fields.find(f => f.id === fieldId);
      if (field) {
        const error = validateField(field, value);
        setErrors(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            [fieldId]: error || ''
          }
        }));
      }
    }
  };

  // Handle bulk metadata change
  const handleBulkFieldChange = (fieldId: string, value: any) => {
    const newBulkMetadata = {
      ...bulkMetadata,
      [fieldId]: value
    };

    setBulkMetadata(newBulkMetadata);
  };

  // Apply bulk metadata to all files
  const applyBulkMetadata = () => {
    if (onBulkMetadataApply) {
      onBulkMetadataApply(bulkMetadata);
    }

    // Also update individual file metadata
    files.forEach(file => {
      const newMetadata = {
        ...metadata,
        [file.name]: {
          ...metadata[file.name],
          ...bulkMetadata
        }
      };
      setMetadata(newMetadata);
      onMetadataChange(file.name, newMetadata[file.name]);
    });
  };

  // Apply suggestion
  const applySuggestion = (fileId: string, fieldId: string, suggestion: string) => {
    handleFieldChange(fileId, fieldId, suggestion);
    setShowSuggestions(prev => ({ ...prev, [`${fileId}-${fieldId}`]: false }));
  };

  // Render field input
  const renderFieldInput = (field: MetadataField, value: any, onChange: (value: any) => void, fileId?: string) => {
    const fieldKey = fileId ? `${fileId}-${field.id}` : field.id;
    const suggestions = fileId ? autoSuggestions[fileId]?.find(s => s.field === field.name)?.suggestions || [] : [];
    const hasError = fileId ? errors[fileId]?.[field.id] : false;

    switch (field.type) {
      case 'text':
        return (
          <div className="relative">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasError ? 'border-red-300' : 'border-gray-300'
              }`}
              dir="auto"
            />
            {suggestions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSuggestions(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }))}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {showSuggestions[fieldKey] && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                <div className="p-2">
                  <div className="text-xs text-gray-500 mb-2">Suggestions:</div>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => fileId && applySuggestion(fileId, field.id, suggestion)}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
            dir="auto"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 min-h-[2.5rem] p-2 border border-gray-300 rounded-md">
              {(value || []).map((item: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = (value || []).filter((_: any, i: number) => i !== index);
                      onChange(newValue);
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Add tag"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      const newValue = [...(value || []), input.value.trim()];
                      onChange(newValue);
                      input.value = '';
                    }
                  }
                }}
                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="auto"
              />
            </div>
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value) || '')}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        );

      default:
        return null;
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`} dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Document Metadata
          </h3>
          <span className="text-sm text-gray-500">
            ({files.length} file{files.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Template Selector */}
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => {
              const template = templates.find(t => t.id === e.target.value);
              setSelectedTemplate(template || null);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Template</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>

          {/* Bulk Mode Toggle */}
          <button
            onClick={() => setIsBulkMode(!isBulkMode)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              isBulkMode
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            }`}
          >
            Bulk Edit
          </button>

          {/* Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              {isCollapsed ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronUpIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && selectedTemplate && (
        <div className="p-4 space-y-6">
          {/* Template Description */}
          {selectedTemplate.description && (
            <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
          )}

          {/* Bulk Mode */}
          {isBulkMode && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-blue-900">
                  Bulk Metadata Entry
                </h4>
                <button
                  onClick={applyBulkMetadata}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Apply to All Files
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTemplate.fields.map(field => (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderFieldInput(
                      field,
                      bulkMetadata[field.id],
                      (value) => handleBulkFieldChange(field.id, value)
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual File Metadata */}
          {!isBulkMode && (
            <div className="space-y-6">
              {files.map(file => (
                <div key={file.name} className="space-y-4 p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">{file.name}</h5>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTemplate.fields.map(field => (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFieldInput(
                          field,
                          metadata[file.name]?.[field.id],
                          (value) => handleFieldChange(file.name, field.id, value),
                          file.name
                        )}
                        {errors[file.name]?.[field.id] && (
                          <p className="text-xs text-red-600">{errors[file.name][field.id]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MetadataEntryForm;