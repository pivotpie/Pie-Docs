import React, { useState, useCallback, useEffect } from 'react';
import type { MetadataPanelProps } from '@/types/domain/DocumentViewer';

export const MetadataPanel: React.FC<MetadataPanelProps> = ({
  document,
  visible,
  onToggle,
  onMetadataUpdate,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState(document.metadata || {});
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  // Update local state when document changes
  useEffect(() => {
    setEditedMetadata(document.metadata || {});
  }, [document.metadata]);

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setEditedMetadata(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleCustomFieldAdd = useCallback((key: string, value: string) => {
    if (key.trim() && value.trim()) {
      setCustomFields(prev => ({
        ...prev,
        [key]: value,
      }));
    }
  }, []);

  const handleCustomFieldRemove = useCallback((key: string) => {
    setCustomFields(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  const handleSave = useCallback(() => {
    const finalMetadata = {
      ...editedMetadata,
      ...customFields,
    };
    onMetadataUpdate(finalMetadata);
    setIsEditing(false);
  }, [editedMetadata, customFields, onMetadataUpdate]);

  const handleCancel = useCallback(() => {
    setEditedMetadata(document.metadata || {});
    setCustomFields({});
    setIsEditing(false);
  }, [document.metadata]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleString();
  }, []);

  if (!visible) return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Document Info</h2>
        <button
          onClick={onToggle}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label="Close metadata panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">File Name</label>
              <p className="text-sm text-gray-900 break-words">{document.name}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">File Size</label>
              <p className="text-sm text-gray-600">{formatFileSize(document.size || 0)}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <p className="text-sm text-gray-600 capitalize">{document.type || 'Unknown'}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Created</label>
              <p className="text-sm text-gray-600">{formatDate(document.dateCreated)}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Modified</label>
              <p className="text-sm text-gray-600">{formatDate(document.dateModified)}</p>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Metadata</h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                disabled={disabled}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={disabled}
                  className="px-2 py-1 text-xs text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  disabled={disabled}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
              {isEditing ? (
                <input
                  type="text"
                  value={Array.isArray(editedMetadata.tags) ? editedMetadata.tags.join(', ') : ''}
                  onChange={(e) => handleFieldChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                  placeholder="Enter tags separated by commas"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={disabled}
                />
              ) : (
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(editedMetadata.tags) && editedMetadata.tags.length > 0 ? (
                    editedMetadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No tags</span>
                  )}
                </div>
              )}
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Author</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedMetadata.author || ''}
                  onChange={(e) => handleFieldChange('author', e.target.value)}
                  placeholder="Enter author name"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={disabled}
                />
              ) : (
                <p className="text-sm text-gray-600">{editedMetadata.author || 'Not specified'}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              {isEditing ? (
                <textarea
                  value={editedMetadata.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  disabled={disabled}
                />
              ) : (
                <p className="text-sm text-gray-600">{editedMetadata.description || 'No description'}</p>
              )}
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
              {isEditing ? (
                <select
                  value={editedMetadata.language || ''}
                  onChange={(e) => handleFieldChange('language', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={disabled}
                >
                  <option value="">Select language</option>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <p className="text-sm text-gray-600">{editedMetadata.language || 'Not specified'}</p>
              )}
            </div>

            {/* Version */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Version</label>
              {isEditing ? (
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editedMetadata.version || 1}
                  onChange={(e) => handleFieldChange('version', parseInt(e.target.value) || 1)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={disabled}
                />
              ) : (
                <p className="text-sm text-gray-600">{editedMetadata.version || 1}</p>
              )}
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        {isEditing && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Custom Fields</h3>
            <div className="space-y-2">
              {Object.entries(customFields).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={key}
                    readOnly
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setCustomFields(prev => ({ ...prev, [key]: e.target.value }))}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={disabled}
                  />
                  <button
                    onClick={() => handleCustomFieldRemove(key)}
                    className="p-1 text-red-500 hover:text-red-700"
                    disabled={disabled}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Field name"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const key = e.currentTarget.value;
                      const valueInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                      const value = valueInput?.value;
                      if (key && value) {
                        handleCustomFieldAdd(key, value);
                        e.currentTarget.value = '';
                        if (valueInput) valueInput.value = '';
                      }
                    }
                  }}
                  disabled={disabled}
                />
                <input
                  type="text"
                  placeholder="Field value"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = e.currentTarget.value;
                      const keyInput = e.currentTarget.previousElementSibling as HTMLInputElement;
                      const key = keyInput?.value;
                      if (key && value) {
                        handleCustomFieldAdd(key, value);
                        e.currentTarget.value = '';
                        if (keyInput) keyInput.value = '';
                      }
                    }
                  }}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        )}

        {/* Download and Actions */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Actions</h3>
          <div className="space-y-2">
            <a
              href={document.downloadUrl}
              download
              className="block w-full px-3 py-2 text-sm text-center text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
            >
              Download Original
            </a>

            <button
              disabled={disabled}
              className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Print Document
            </button>

            <button
              disabled={disabled}
              className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Share Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataPanel;