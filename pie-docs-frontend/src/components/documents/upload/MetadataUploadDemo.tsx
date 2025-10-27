import React, { useState, useEffect } from 'react';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { documentTypesService } from '@/services/api/documentTypesService';
import { metadataSchemaService, MetadataField } from '@/services/api/metadataSchemaService';
import { DynamicMetadataForm } from './DynamicMetadataForm';

/**
 * Demo component showing how to integrate dynamic metadata with document upload
 * This demonstrates the flow: Document Type → Metadata Schema → Dynamic Form → Upload
 */
export const MetadataUploadDemo: React.FC = () => {
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<string>('');
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load document types on mount
  useEffect(() => {
    loadDocumentTypes();
  }, []);

  // Load metadata fields when document type changes
  useEffect(() => {
    if (selectedDocumentTypeId) {
      loadMetadataFields(selectedDocumentTypeId);
    } else {
      setMetadataFields([]);
      setMetadata({});
    }
  }, [selectedDocumentTypeId]);

  const loadDocumentTypes = async () => {
    try {
      setLoading(true);
      const response = await documentTypesService.list({ include_system: true });
      setDocumentTypes(response.document_types);
    } catch (err: any) {
      console.error('Error loading document types:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadataFields = async (documentTypeId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Try to get the metadata schema for this document type
      const schema = await metadataSchemaService.getSchemaByDocumentType(documentTypeId);

      console.log('Loaded metadata schema:', schema);
      setMetadataFields(schema.fields || []);

      // Initialize metadata with default values
      const initialMetadata: Record<string, any> = {};
      schema.fields?.forEach(field => {
        if (field.default_value) {
          initialMetadata[field.field_name] = field.default_value;
        }
      });
      setMetadata(initialMetadata);
    } catch (err: any) {
      console.error('Error loading metadata schema:', err);
      if (err.message.includes('No active metadata schema')) {
        setError('No metadata schema defined for this document type yet.');
        setMetadataFields([]);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMetadataChange = (fieldName: string, value: any) => {
    setMetadata(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocumentTypeId) {
      alert('Please select a file and document type');
      return;
    }

    // Validate required fields
    const missingFields = metadataFields
      .filter(field => field.is_required && !metadata[field.field_name])
      .map(field => field.field_label);

    if (missingFields.length > 0) {
      alert(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    console.log('Upload configuration:', {
      file: selectedFile.name,
      documentTypeId: selectedDocumentTypeId,
      metadata: metadata
    });

    alert(`Upload would proceed with:\nFile: ${selectedFile.name}\nDocument Type: ${documentTypes.find(dt => dt.id === selectedDocumentTypeId)?.display_name}\nMetadata: ${JSON.stringify(metadata, null, 2)}`);
  };

  const selectedDocType = documentTypes.find(dt => dt.id === selectedDocumentTypeId);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <DocumentArrowUpIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Dynamic Metadata Upload Demo
            </h2>
            <p className="text-sm text-gray-600">
              Upload a document with dynamic metadata fields
            </p>
          </div>
        </div>

        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File
          </label>
          <input
            type="file"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {selectedFile && (
            <p className="text-sm text-gray-600 mt-2">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Document Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type *
          </label>
          <select
            value={selectedDocumentTypeId}
            onChange={(e) => setSelectedDocumentTypeId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={loading}
          >
            <option value="">Select a document type</option>
            {documentTypes.map(dt => (
              <option key={dt.id} value={dt.id}>
                {dt.icon} {dt.display_name}
              </option>
            ))}
          </select>
          {selectedDocType && (
            <p className="text-sm text-gray-600 mt-2">
              {selectedDocType.description}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4 text-gray-600">
            Loading metadata fields...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">{error}</p>
          </div>
        )}

        {/* Dynamic Metadata Form */}
        {selectedDocumentTypeId && !loading && metadataFields.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Document Metadata
            </h3>
            <DynamicMetadataForm
              fields={metadataFields}
              metadata={metadata}
              onChange={handleMetadataChange}
            />
          </div>
        )}

        {/* Upload Button */}
        <div className="border-t pt-6">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedDocumentTypeId || loading}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Upload Document
          </button>
        </div>

        {/* Debug Info */}
        {metadataFields.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              Debug Info
            </summary>
            <pre className="mt-2 p-4 bg-gray-50 rounded overflow-auto">
              {JSON.stringify({
                documentTypeId: selectedDocumentTypeId,
                fieldsCount: metadataFields.length,
                metadata
              }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default MetadataUploadDemo;
