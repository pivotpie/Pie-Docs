/**
 * MetadataTool - Document Metadata viewer and editor
 */

import React, { useState, useEffect } from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import type { DocumentToolProps } from './types';
import { documentsService } from '@/services/api/documentsService';

interface SystemMetadata {
  title: string;
  document_type: string;
  file_size: number;
  mime_type: string;
  author: string;
  status: string;
  language: string;
  created_at: string;
  modified_at: string;
  version: number;
}

export const MetadataTool: React.FC<DocumentToolProps & { onBack: () => void }> = ({
  document,
  onBack,
  className = '',
}) => {
  const [systemMetadata, setSystemMetadata] = useState<Partial<SystemMetadata>>({});
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  useEffect(() => {
    loadMetadata();
  }, [document.id]);

  const loadMetadata = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load full document details for system metadata
      const details = await documentsService.getDocumentDetails(document.id);

      setSystemMetadata({
        title: details.title,
        document_type: details.document_type,
        file_size: details.file_size,
        mime_type: details.mime_type,
        author: details.author,
        status: details.status,
        language: details.language,
        created_at: details.created_at,
        modified_at: details.modified_at,
        version: details.version,
      });

      // Load custom metadata
      const metadataResponse = await documentsService.getDocumentMetadata(document.id);
      setCustomFields(metadataResponse.custom_fields || {});
    } catch (err) {
      console.error('Failed to load metadata:', err);
      setError('Failed to load metadata. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

  const handleDeleteField = (key: string) => {
    setCustomFields(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleAddField = () => {
    if (!newFieldKey.trim()) {
      setError('Field name cannot be empty');
      return;
    }

    if (customFields.hasOwnProperty(newFieldKey)) {
      setError('Field name already exists');
      return;
    }

    setCustomFields(prev => ({ ...prev, [newFieldKey]: newFieldValue }));
    setNewFieldKey('');
    setNewFieldValue('');
    setIsAddingField(false);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await documentsService.updateDocumentMetadata(document.id, customFields);
      setSuccessMessage('Metadata saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save metadata:', err);
      setError('Failed to save metadata. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <ToolPageLayout title="Document Metadata" icon="📋" onBack={onBack} className={className}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout title="Document Metadata" icon="📋" onBack={onBack} className={className}>
      <div className="space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500 text-green-600 dark:text-green-400 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* System Metadata (Read-Only) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Title</label>
              <p className="text-gray-900 dark:text-white font-medium">{systemMetadata.title}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Document Type</label>
              <p className="text-gray-900 dark:text-white font-medium">{systemMetadata.document_type}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">File Size</label>
              <p className="text-gray-900 dark:text-white font-medium">
                {systemMetadata.file_size ? formatFileSize(systemMetadata.file_size) : 'N/A'}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">MIME Type</label>
              <p className="text-gray-900 dark:text-white font-medium">{systemMetadata.mime_type}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Author</label>
              <p className="text-gray-900 dark:text-white font-medium">{systemMetadata.author}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
              <p className="text-gray-900 dark:text-white font-medium capitalize">{systemMetadata.status}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Language</label>
              <p className="text-gray-900 dark:text-white font-medium uppercase">{systemMetadata.language}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Version</label>
              <p className="text-gray-900 dark:text-white font-medium">{systemMetadata.version}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Created</label>
              <p className="text-gray-900 dark:text-white font-medium">
                {systemMetadata.created_at ? formatDate(systemMetadata.created_at) : 'N/A'}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Last Modified</label>
              <p className="text-gray-900 dark:text-white font-medium">
                {systemMetadata.modified_at ? formatDate(systemMetadata.modified_at) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Custom Metadata (Editable) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Fields</h3>
            <button
              onClick={() => setIsAddingField(true)}
              className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              + Add Field
            </button>
          </div>

          {/* Add New Field Form */}
          {isAddingField && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Field Name</label>
                  <input
                    type="text"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    placeholder="e.g., invoice_number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">Field Value</label>
                  <input
                    type="text"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    placeholder="Enter value"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddField}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingField(false);
                    setNewFieldKey('');
                    setNewFieldValue('');
                    setError(null);
                  }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Custom Fields List */}
          <div className="space-y-3">
            {Object.keys(customFields).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No custom fields added yet</p>
            ) : (
              Object.entries(customFields).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">{key}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteField(key)}
                    className="mt-6 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                    title="Delete field"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Save Button */}
          {Object.keys(customFields).length > 0 && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full mt-6 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded transition-colors font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Custom Fields'}
            </button>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default MetadataTool;
