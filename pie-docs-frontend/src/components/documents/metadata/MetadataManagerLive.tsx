import React, { useState, useEffect } from 'react';
import { metadataSchemaService } from '@/services/api/metadataSchemaService';
import type { MetadataSchema, MetadataField } from '@/services/api/metadataSchemaService';
import { documentTypesService } from '@/services/api/documentTypesService';
import { DynamicMetadataForm } from '../upload/DynamicMetadataForm';

/**
 * Live Metadata Manager - Uses Real API Data
 * Displays and manages metadata schemas and fields from the database
 */
const MetadataManagerLive: React.FC = () => {
  const [schemas, setSchemas] = useState<MetadataSchema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<MetadataSchema | null>(null);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [testMetadata, setTestMetadata] = useState<Record<string, any>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [schemasData, typesData] = await Promise.all([
        metadataSchemaService.listSchemas({ include_fields: true }),
        documentTypesService.listDocumentTypes({ include_system: true })
      ]);
      setSchemas(schemasData);
      setDocumentTypes(typesData.document_types || []);
      console.log('Loaded schemas:', schemasData);
      console.log('Loaded document types:', typesData.document_types);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSchemaClick = (schema: MetadataSchema) => {
    setSelectedSchema(schema);
    setView('detail');
    // Initialize test metadata with default values
    const initialMetadata: Record<string, any> = {};
    schema.fields?.forEach(field => {
      if (field.default_value) {
        initialMetadata[field.field_name] = field.default_value;
      }
    });
    setTestMetadata(initialMetadata);
  };

  const getDocumentTypeName = (documentTypeId?: string) => {
    if (!documentTypeId) return 'Unknown';
    const docType = documentTypes.find(dt => dt.id === documentTypeId);
    return docType ? `${docType.icon || ''} ${docType.display_name}` : documentTypeId;
  };

  const handleMetadataChange = (fieldName: string, value: any) => {
    setTestMetadata(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading metadata schemas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
          <h3 className="text-red-300 font-semibold text-lg mb-2">Error Loading Metadata</h3>
          <p className="text-red-200/80">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedSchema) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <button
            onClick={() => setView('list')}
            className="mb-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            ← Back to Schemas
          </button>
          <h2 className="text-2xl font-bold text-white mb-2">{selectedSchema.name}</h2>
          <p className="text-white/70">{selectedSchema.description}</p>
          <div className="mt-2 flex items-center gap-4 text-sm text-white/60">
            <span>Document Type: {getDocumentTypeName(selectedSchema.document_type_id)}</span>
            <span>•</span>
            <span>Version: {selectedSchema.version}</span>
            <span>•</span>
            <span>{selectedSchema.fields?.length || 0} fields</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Fields Table */}
            <div className="glass-panel rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Schema Fields</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Order</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Field Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Required</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Width</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSchema.fields
                      ?.sort((a, b) => a.display_order - b.display_order)
                      .map((field) => (
                        <tr key={field.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-white/60">{field.display_order}</td>
                          <td className="py-3 px-4">
                            <div className="text-white font-medium">{field.field_label}</div>
                            <div className="text-xs text-white/50">{field.field_name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                              {field.field_type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {field.is_required ? (
                              <span className="text-red-400">✓ Required</span>
                            ) : (
                              <span className="text-white/40">Optional</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-white/60">{field.display_width}</td>
                          <td className="py-3 px-4 text-white/60">{field.group_name || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Form Preview */}
            <div className="glass-panel rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Form Preview</h3>
              <p className="text-sm text-white/60 mb-4">
                This is how the form will appear when uploading a document of this type
              </p>
              <div className="bg-white/5 rounded-lg p-6">
                <DynamicMetadataForm
                  fields={selectedSchema.fields || []}
                  metadata={testMetadata}
                  onChange={handleMetadataChange}
                />
              </div>
            </div>

            {/* Metadata Preview */}
            {Object.keys(testMetadata).length > 0 && (
              <div className="glass-panel rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Current Metadata Values</h3>
                <pre className="bg-black/30 rounded p-4 text-sm text-white/80 overflow-auto">
                  {JSON.stringify(testMetadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Metadata Schemas</h2>
            <p className="text-white/70">
              Manage metadata schemas and fields for different document types
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {schemas.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Metadata Schemas Found</h3>
            <p className="text-white/60 mb-6">
              Create metadata schemas to define custom fields for your document types
            </p>
            <a
              href="/documents/metadata-upload"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              View Demo →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemas.map((schema) => (
              <div
                key={schema.id}
                onClick={() => handleSchemaClick(schema)}
                className="glass-panel rounded-lg p-6 cursor-pointer hover:bg-white/10 transition-all transform hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">📄</div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      schema.is_active
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {schema.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{schema.name}</h3>
                <p className="text-sm text-white/60 mb-4 line-clamp-2">
                  {schema.description || 'No description'}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-white/70">
                    <span>📦</span>
                    <span>{getDocumentTypeName(schema.document_type_id)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <span>📝</span>
                    <span>{schema.fields?.length || 0} fields</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <span>🔢</span>
                    <span>Version {schema.version}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <button className="text-sm text-blue-300 hover:text-blue-200 transition-colors">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetadataManagerLive;
