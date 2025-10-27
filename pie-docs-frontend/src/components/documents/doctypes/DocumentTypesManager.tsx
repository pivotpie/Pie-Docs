import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { DocumentType, DocumentTypeCreate } from '@/services/api/documentTypesService';
import { documentTypesService } from '@/services/api/documentTypesService';

const DocumentTypesManager: React.FC = () => {
  const { theme } = useTheme();
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);

  const [formData, setFormData] = useState<DocumentTypeCreate>({
    name: '',
    display_name: '',
    description: '',
    icon: '📄',
    color: '#6366f1',
    allowed_file_types: ['pdf', 'doc', 'docx', 'txt'],
    max_file_size_mb: 50,
    is_active: true,
  });

  const iconOptions = ['📄', '📋', '📊', '✉️', '📽️', '🖼️', '📈', '📃', '📝', '📑', '🗂️', '📁'];
  const colorOptions = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Red', value: '#ef4444' },
  ];

  useEffect(() => {
    loadDocumentTypes();
  }, []);

  const loadDocumentTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentTypesService.listDocumentTypes({
        page: 1,
        page_size: 100,
        include_system: true,
      });
      setDocumentTypes(response.document_types);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document types');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await documentTypesService.createDocumentType(formData);
      setShowCreateForm(false);
      resetForm();
      loadDocumentTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document type');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingType) return;

    try {
      await documentTypesService.updateDocumentType(id, {
        display_name: formData.display_name,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        allowed_file_types: formData.allowed_file_types,
        max_file_size_mb: formData.max_file_size_mb,
        is_active: formData.is_active,
      });
      setEditingType(null);
      resetForm();
      loadDocumentTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document type');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document type?')) return;

    try {
      await documentTypesService.deleteDocumentType(id);
      loadDocumentTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document type');
    }
  };

  const startEdit = (docType: DocumentType) => {
    setEditingType(docType);
    setFormData({
      name: docType.name,
      display_name: docType.display_name,
      description: docType.description || '',
      icon: docType.icon || '📄',
      color: docType.color || '#6366f1',
      allowed_file_types: docType.allowed_file_types || ['pdf'],
      max_file_size_mb: docType.max_file_size_mb || 50,
      is_active: docType.is_active,
    });
    setShowCreateForm(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      icon: '📄',
      color: '#6366f1',
      allowed_file_types: ['pdf', 'doc', 'docx', 'txt'],
      max_file_size_mb: 50,
      is_active: true,
    });
    setEditingType(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/70">Loading document types...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Document Types</h2>
          <p className="text-white/70">Manage document type templates and configurations</p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingType(null);
            resetForm();
          }}
          className="btn-glass px-4 py-2 text-sm font-medium rounded-md text-white hover:scale-105 transition-all duration-300"
        >
          {showCreateForm ? 'Cancel' : '+ Create Document Type'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingType) && (
        <div className="glass-panel rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingType ? 'Edit Document Type' : 'Create New Document Type'}
          </h3>
          <form onSubmit={editingType ? (e) => { e.preventDefault(); handleUpdate(editingType.id); } : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Name (Identifier)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="e.g., invoice"
                  required
                  disabled={!!editingType}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Display Name</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="e.g., Invoice"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="glass-input w-full"
                rows={2}
                placeholder="Brief description of this document type"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-2 text-2xl rounded-md transition-all ${
                        formData.icon === icon
                          ? 'bg-white/30 scale-110'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-10 h-10 rounded-md transition-all ${
                        formData.color === color.value ? 'ring-2 ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Max File Size (MB)</label>
              <input
                type="number"
                value={formData.max_file_size_mb}
                onChange={(e) => setFormData({ ...formData, max_file_size_mb: parseInt(e.target.value) })}
                className="glass-input w-full"
                min="1"
                max="1000"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm text-white/90">Active</label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="btn-glass px-4 py-2 text-sm font-medium rounded-md text-white hover:scale-105 transition-all duration-300"
              >
                {editingType ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingType(null);
                  resetForm();
                }}
                className="btn-glass px-4 py-2 text-sm font-medium rounded-md text-white/70 hover:text-white hover:scale-105 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Document Types List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentTypes.map((docType) => (
          <div
            key={docType.id}
            className="glass-panel rounded-lg p-4 hover:bg-white/10 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl" style={{ color: docType.color }}>
                  {docType.icon || '📄'}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{docType.display_name}</h3>
                  <p className="text-xs text-white/50">{docType.name}</p>
                </div>
              </div>
              {docType.is_system_type && (
                <span className="px-2 py-1 text-xs bg-blue-500/30 text-blue-200 rounded">System</span>
              )}
            </div>

            {docType.description && (
              <p className="text-sm text-white/70 mb-3">{docType.description}</p>
            )}

            <div className="flex items-center justify-between text-xs text-white/50 mb-3">
              <span>{docType.document_count || 0} documents</span>
              <span className={`px-2 py-1 rounded ${docType.is_active ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'}`}>
                {docType.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => startEdit(docType)}
                className="flex-1 btn-glass px-3 py-1 text-xs font-medium rounded text-white hover:scale-105 transition-all duration-300"
              >
                Edit
              </button>
              {!docType.is_system_type && (
                <button
                  onClick={() => handleDelete(docType.id)}
                  className="flex-1 btn-glass px-3 py-1 text-xs font-medium rounded text-red-300 hover:text-red-200 hover:scale-105 transition-all duration-300"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {documentTypes.length === 0 && !loading && (
        <div className="glass-panel rounded-lg p-12 text-center">
          <div className="text-white/40 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H9a2 2 0 00-2 2v8a2 2 0 002 2h10m0-10V5a2 2 0 012-2h8a2 2 0 012 2v6m0 0v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No document types</h3>
          <p className="text-white/60 mb-4">Create your first document type to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-glass px-4 py-2 text-sm font-medium rounded-md text-white hover:scale-105 transition-all duration-300"
          >
            Create Document Type
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentTypesManager;
