import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  PlusIcon,
  TrashIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  TagIcon,
  CalendarIcon,
  HashtagIcon,
  LinkIcon,
  ListBulletIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';

interface MetadataField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'url' | 'email';
  required: boolean;
  description?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    options?: string[];
  };
  defaultValue?: any;
  order: number;
  isSystem?: boolean;
  dependencies?: {
    field: string;
    condition: 'equals' | 'not_equals' | 'contains' | 'not_contains';
    value: any;
  }[];
}

interface MetadataSchema {
  id: string;
  name: string;
  description?: string;
  version: string;
  fields: MetadataField[];
  documentTypes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
  usageStats: {
    documentsCount: number;
    lastUsed: Date;
  };
}

interface MetadataSchemaDesignerProps {
  schemas?: MetadataSchema[];
  onSchemaCreate: (schema: Omit<MetadataSchema, 'id' | 'createdAt' | 'updatedAt' | 'usageStats'>) => void;
  onSchemaUpdate: (schemaId: string, updates: Partial<MetadataSchema>) => void;
  onSchemaDelete: (schemaId: string) => void;
  onSchemaActivate: (schemaId: string) => void;
  className?: string;
}

const fieldTypes = [
  { id: 'text', label: 'Text', icon: DocumentTextIcon, description: 'Single line text input' },
  { id: 'textarea', label: 'Multi-line Text', icon: DocumentTextIcon, description: 'Multi-line text area' },
  { id: 'number', label: 'Number', icon: HashtagIcon, description: 'Numeric input with validation' },
  { id: 'date', label: 'Date', icon: CalendarIcon, description: 'Date picker input' },
  { id: 'boolean', label: 'Yes/No', icon: CheckCircleIcon, description: 'Checkbox for boolean values' },
  { id: 'select', label: 'Dropdown', icon: ListBulletIcon, description: 'Single selection dropdown' },
  { id: 'multiselect', label: 'Multi-select', icon: ListBulletIcon, description: 'Multiple selection dropdown' },
  { id: 'url', label: 'URL', icon: LinkIcon, description: 'URL input with validation' },
  { id: 'email', label: 'Email', icon: DocumentTextIcon, description: 'Email input with validation' }
];

// Mock schemas
const mockSchemas: MetadataSchema[] = [
  {
    id: 'general',
    name: 'General Document',
    description: 'Basic metadata schema for general documents',
    version: '1.0.0',
    documentTypes: ['pdf', 'docx', 'txt'],
    isActive: true,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-02-20T14:30:00Z'),
    createdBy: {
      id: 'admin',
      name: 'System Admin'
    },
    usageStats: {
      documentsCount: 1250,
      lastUsed: new Date('2024-03-15T09:45:00Z')
    },
    fields: [
      {
        id: 'title',
        name: 'title',
        label: 'Document Title',
        type: 'text',
        required: true,
        description: 'The main title of the document',
        validation: { minLength: 3, maxLength: 200 },
        order: 1
      },
      {
        id: 'description',
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        description: 'Brief description of the document content',
        validation: { maxLength: 1000 },
        order: 2
      },
      {
        id: 'category',
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        validation: {
          options: ['Financial', 'Legal', 'HR', 'Technical', 'Marketing', 'Operations']
        },
        order: 3
      },
      {
        id: 'tags',
        name: 'tags',
        label: 'Tags',
        type: 'multiselect',
        required: false,
        description: 'Keywords for document classification',
        order: 4
      },
      {
        id: 'confidential',
        name: 'confidential',
        label: 'Confidential',
        type: 'boolean',
        required: false,
        defaultValue: false,
        order: 5
      }
    ]
  },
  {
    id: 'financial',
    name: 'Financial Document',
    description: 'Schema for financial documents with compliance requirements',
    version: '2.1.0',
    documentTypes: ['pdf', 'xlsx', 'csv'],
    isActive: true,
    createdAt: new Date('2024-02-01T12:00:00Z'),
    updatedAt: new Date('2024-03-10T16:20:00Z'),
    createdBy: {
      id: 'finance-admin',
      name: 'Finance Admin'
    },
    usageStats: {
      documentsCount: 456,
      lastUsed: new Date('2024-03-14T11:30:00Z')
    },
    fields: [
      {
        id: 'title',
        name: 'title',
        label: 'Document Title',
        type: 'text',
        required: true,
        order: 1,
        isSystem: true
      },
      {
        id: 'fiscal_year',
        name: 'fiscal_year',
        label: 'Fiscal Year',
        type: 'select',
        required: true,
        validation: {
          options: ['2024', '2023', '2022', '2021', '2020']
        },
        order: 2
      },
      {
        id: 'amount',
        name: 'amount',
        label: 'Amount',
        type: 'number',
        required: false,
        validation: { min: 0, max: 999999999 },
        order: 3
      },
      {
        id: 'currency',
        name: 'currency',
        label: 'Currency',
        type: 'select',
        required: false,
        validation: {
          options: ['USD', 'EUR', 'SAR', 'AED', 'GBP']
        },
        order: 4,
        dependencies: [
          {
            field: 'amount',
            condition: 'not_equals',
            value: null
          }
        ]
      }
    ]
  }
];

export const MetadataSchemaDesigner: React.FC<MetadataSchemaDesignerProps> = ({
  schemas = mockSchemas,
  onSchemaCreate,
  onSchemaUpdate,
  onSchemaDelete,
  onSchemaActivate,
  className = ''
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'list' | 'designer' | 'preview'>('list');
  const [selectedSchema, setSelectedSchema] = useState<MetadataSchema | null>(null);
  const [editingSchema, setEditingSchema] = useState<MetadataSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedField, setDraggedField] = useState<string | null>(null);

  // Initialize with first schema
  useEffect(() => {
    if (schemas.length > 0 && !selectedSchema) {
      setSelectedSchema(schemas[0]);
    }
  }, [schemas, selectedSchema]);

  // Handle field reordering
  const handleFieldReorder = useCallback((fieldId: string, direction: 'up' | 'down') => {
    if (!editingSchema) return;

    const fields = [...editingSchema.fields];
    const fieldIndex = fields.findIndex(f => f.id === fieldId);

    if (fieldIndex === -1) return;

    const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;

    if (newIndex < 0 || newIndex >= fields.length) return;

    // Swap fields
    [fields[fieldIndex], fields[newIndex]] = [fields[newIndex], fields[fieldIndex]];

    // Update order values
    fields.forEach((field, index) => {
      field.order = index + 1;
    });

    setEditingSchema({
      ...editingSchema,
      fields
    });
  }, [editingSchema]);

  // Add new field
  const handleAddField = useCallback(() => {
    if (!editingSchema) return;

    const newField: MetadataField = {
      id: `field_${Date.now()}`,
      name: `field_${editingSchema.fields.length + 1}`,
      label: `New Field ${editingSchema.fields.length + 1}`,
      type: 'text',
      required: false,
      order: editingSchema.fields.length + 1
    };

    setEditingSchema({
      ...editingSchema,
      fields: [...editingSchema.fields, newField]
    });
  }, [editingSchema]);

  // Remove field
  const handleRemoveField = useCallback((fieldId: string) => {
    if (!editingSchema) return;

    const fields = editingSchema.fields.filter(f => f.id !== fieldId);

    // Reorder remaining fields
    fields.forEach((field, index) => {
      field.order = index + 1;
    });

    setEditingSchema({
      ...editingSchema,
      fields
    });
  }, [editingSchema]);

  // Update field
  const handleUpdateField = useCallback((fieldId: string, updates: Partial<MetadataField>) => {
    if (!editingSchema) return;

    const fields = editingSchema.fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );

    setEditingSchema({
      ...editingSchema,
      fields
    });
  }, [editingSchema]);

  // Create new schema
  const handleCreateSchema = useCallback(() => {
    const newSchema: MetadataSchema = {
      id: `schema_${Date.now()}`,
      name: 'New Schema',
      description: 'A new metadata schema',
      version: '1.0.0',
      documentTypes: ['pdf'],
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        id: 'current-user',
        name: 'Current User'
      },
      usageStats: {
        documentsCount: 0,
        lastUsed: new Date()
      },
      fields: []
    };

    setEditingSchema(newSchema);
    setActiveTab('designer');
  }, []);

  // Save schema
  const handleSaveSchema = useCallback(() => {
    if (!editingSchema) return;

    if (schemas.find(s => s.id === editingSchema.id)) {
      onSchemaUpdate(editingSchema.id, editingSchema);
    } else {
      onSchemaCreate(editingSchema);
    }

    setEditingSchema(null);
    setActiveTab('list');
  }, [editingSchema, schemas, onSchemaCreate, onSchemaUpdate]);

  // Render field editor
  const renderFieldEditor = (field: MetadataField) => {
    const fieldType = fieldTypes.find(t => t.id === field.type);

    return (
      <div key={field.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {fieldType && <fieldType.icon className="w-5 h-5 text-gray-500" />}
            <input
              type="text"
              value={field.label}
              onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
              className="font-medium text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0"
            />
            {field.required && <span className="text-red-500 text-sm">*</span>}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFieldReorder(field.id, 'up')}
              disabled={field.order <= 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleFieldReorder(field.id, 'down')}
              disabled={field.order >= editingSchema!.fields.length}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownIcon className="w-4 h-4" />
            </button>
            {!field.isSystem && (
              <button
                onClick={() => handleRemoveField(field.id)}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Field Name
            </label>
            <input
              type="text"
              value={field.name}
              onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
              placeholder="field_name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              disabled={field.isSystem}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Field Type
            </label>
            <select
              value={field.type}
              onChange={(e) => handleUpdateField(field.id, { type: e.target.value as MetadataField['type'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              disabled={field.isSystem}
            >
              {fieldTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={field.description || ''}
              onChange={(e) => handleUpdateField(field.id, { description: e.target.value })}
              placeholder="Field description..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={field.isSystem}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
            </label>
          </div>

          {/* Validation rules */}
          {(field.type === 'text' || field.type === 'textarea') && (
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min Length
                </label>
                <input
                  type="number"
                  value={field.validation?.minLength || ''}
                  onChange={(e) => handleUpdateField(field.id, {
                    validation: {
                      ...field.validation,
                      minLength: parseInt(e.target.value) || undefined
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Length
                </label>
                <input
                  type="number"
                  value={field.validation?.maxLength || ''}
                  onChange={(e) => handleUpdateField(field.id, {
                    validation: {
                      ...field.validation,
                      maxLength: parseInt(e.target.value) || undefined
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {field.type === 'number' && (
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Value
                </label>
                <input
                  type="number"
                  value={field.validation?.min || ''}
                  onChange={(e) => handleUpdateField(field.id, {
                    validation: {
                      ...field.validation,
                      min: parseInt(e.target.value) || undefined
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maximum Value
                </label>
                <input
                  type="number"
                  value={field.validation?.max || ''}
                  onChange={(e) => handleUpdateField(field.id, {
                    validation: {
                      ...field.validation,
                      max: parseInt(e.target.value) || undefined
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {(field.type === 'select' || field.type === 'multiselect') && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Options (one per line)
              </label>
              <textarea
                value={(field.validation?.options || []).join('\n')}
                onChange={(e) => handleUpdateField(field.id, {
                  validation: {
                    ...field.validation,
                    options: e.target.value.split('\n').filter(o => o.trim())
                  }
                })}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render schema list
  const renderSchemaList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
          Metadata Schemas
        </h3>
        <button
          onClick={handleCreateSchema}
          className="flex items-center px-4 py-2 btn-glass rounded-md hover:scale-105 transition-all duration-300"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Schema
        </button>
      </div>

      {schemas.map(schema => (
        <div
          key={schema.id}
          className="glass-card rounded-lg border border-white/20 p-4 hover:scale-105 transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {schema.name}
                </h4>
                <span className="text-sm text-gray-500">v{schema.version}</span>
                {schema.isActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                )}
              </div>

              {schema.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-2">{schema.description}</p>
              )}

              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{schema.fields.length} fields</span>
                <span>{schema.usageStats.documentsCount} documents</span>
                <span>Updated {schema.updatedAt.toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSelectedSchema(schema);
                  setActiveTab('preview');
                }}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                title="Preview schema"
              >
                <EyeIcon className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setEditingSchema({ ...schema });
                  setActiveTab('designer');
                }}
                className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                title="Edit schema"
              >
                <Cog6ToothIcon className="w-4 h-4" />
              </button>

              {!schema.isActive && (
                <button
                  onClick={() => onSchemaActivate(schema.id)}
                  className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                  title="Activate schema"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </button>
              )}

              {schema.usageStats.documentsCount === 0 && (
                <button
                  onClick={() => onSchemaDelete(schema.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Delete schema"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {schema.documentTypes.map(type => (
              <span
                key={type}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              >
                {type.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton height={40} width={300} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <LoadingSkeleton height={24} width="60%" className="mb-2" />
            <LoadingSkeleton height={16} width="80%" className="mb-3" />
            <div className="flex space-x-2">
              <LoadingSkeleton height={20} width={60} />
              <LoadingSkeleton height={20} width={80} />
              <LoadingSkeleton height={20} width={100} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`metadata-schema-designer ${className}`} dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
            Metadata Schema Designer
          </h2>
          <p className={`${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
            Design and manage metadata schemas for different document types
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/20 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'list', label: 'Schema List', icon: ListBulletIcon },
            { id: 'designer', label: 'Schema Designer', icon: Cog6ToothIcon },
            { id: 'preview', label: 'Preview', icon: EyeIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-blue-400 text-blue-400'
                  : `border-transparent ${theme === 'dark' ? 'text-white/60' : 'text-white/60'} hover:text-white/80 hover:border-white/30`
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'list' && renderSchemaList()}

        {activeTab === 'designer' && editingSchema && (
          <div className="space-y-6">
            {/* Schema Properties */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Schema Properties
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Schema Name
                  </label>
                  <input
                    type="text"
                    value={editingSchema.name}
                    onChange={(e) => setEditingSchema({ ...editingSchema, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={editingSchema.version}
                    onChange={(e) => setEditingSchema({ ...editingSchema, version: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingSchema.description || ''}
                    onChange={(e) => setEditingSchema({ ...editingSchema, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Fields ({editingSchema.fields.length})
                </h3>
                <button
                  onClick={handleAddField}
                  className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Field
                </button>
              </div>

              <div className="space-y-4">
                {editingSchema.fields
                  .sort((a, b) => a.order - b.order)
                  .map(field => renderFieldEditor(field))}

                {editingSchema.fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No fields defined. Click "Add Field" to get started.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditingSchema(null);
                  setActiveTab('list');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchema}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Schema
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preview' && selectedSchema && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Schema Preview: {selectedSchema.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Preview how this schema appears in forms
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingSchema({ ...selectedSchema });
                  setActiveTab('designer');
                }}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4 mr-1" />
                Edit Schema
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedSchema.fields
                .sort((a, b) => a.order - b.order)
                .map(field => {
                  const fieldType = fieldTypes.find(t => t.id === field.type);

                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {field.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{field.description}</p>
                      )}

                      {/* Render appropriate input based on field type */}
                      {field.type === 'text' && (
                        <input
                          type="text"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          disabled
                        />
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          disabled
                        />
                      )}

                      {field.type === 'number' && (
                        <input
                          type="number"
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          disabled
                        />
                      )}

                      {field.type === 'date' && (
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          disabled
                        />
                      )}

                      {field.type === 'boolean' && (
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {field.label}
                          </span>
                        </label>
                      )}

                      {(field.type === 'select' || field.type === 'multiselect') && (
                        <select
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          disabled
                        >
                          <option>Select {field.label.toLowerCase()}</option>
                          {field.validation?.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      )}

                      {field.type === 'url' && (
                        <input
                          type="url"
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          disabled
                        />
                      )}

                      {field.type === 'email' && (
                        <input
                          type="email"
                          placeholder="user@example.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          disabled
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            {selectedSchema.fields.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No fields defined in this schema.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetadataSchemaDesigner;