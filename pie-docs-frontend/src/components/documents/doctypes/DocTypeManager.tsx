import React, { useState, useEffect } from 'react';
import { documentTypesService } from '@/services/api/documentTypesService';

// Type definitions
export interface MetadataField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'boolean';
  required: boolean;
  options?: string[];
}

export interface DocumentType {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
  description?: string;
  allowedFormats: string[];
  metadataFields: MetadataField[];
  workflowId?: string;
  retentionDays?: number;
  autoClassify: boolean;
  status: 'active' | 'inactive';
  createdDate: string;
  modifiedDate: string;
  storageUsed?: string;
  avgProcessingTime?: string;
}

export type DocTypeViewMode = 'grid' | 'list' | 'analytics';

export interface DocTypeManagerProps {}

const DocTypeManager: React.FC<DocTypeManagerProps> = () => {
  const [docTypeViewMode, setDocTypeViewMode] = useState<DocTypeViewMode>('grid');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [showNewTypeDialog, setShowNewTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load document types from API
  useEffect(() => {
    loadDocumentTypes();
  }, []);

  const loadDocumentTypes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await documentTypesService.listDocumentTypes({ page: 1, page_size: 100 });

      // Transform API types to local format
      const transformedTypes: DocumentType[] = response.document_types.map((type: any) => ({
        id: type.id,
        name: type.name,
        icon: type.icon || '📄',
        count: type.document_count || 0,
        color: type.color || 'bg-gray-500/20 text-gray-300',
        description: type.description,
        allowedFormats: type.allowed_formats || [],
        metadataFields: type.metadata_fields || [],
        workflowId: type.workflow_id,
        retentionDays: type.retention_days,
        autoClassify: type.auto_classify || false,
        status: type.is_active ? 'active' : 'inactive',
        createdDate: new Date(type.created_at || Date.now()).toLocaleDateString(),
        modifiedDate: new Date(type.updated_at || Date.now()).toLocaleDateString(),
        storageUsed: '0 MB', // TODO: Calculate from API
        avgProcessingTime: '0s' // TODO: Get from API
      }));

      setDocumentTypes(transformedTypes);

    } catch (err) {
      console.error('Error loading document types:', err);
      setError('Failed to load document types');
      // Fallback to mock data
      setDocumentTypes(mockDocumentTypes);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations
  const handleCreateDocType = async (typeData: { name: string; icon?: string; description?: string }) => {
    try {
      setLoading(true);
      await documentTypesService.createDocumentType(typeData);
      await loadDocumentTypes();
      setShowNewTypeDialog(false);
      setNewTypeName('');
    } catch (err) {
      console.error('Error creating document type:', err);
      setError('Failed to create document type');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDocType = async (typeId: string, typeData: any) => {
    try {
      setLoading(true);
      await documentTypesService.updateDocumentType(typeId, typeData);
      await loadDocumentTypes();
    } catch (err) {
      console.error('Error updating document type:', err);
      setError('Failed to update document type');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this document type?')) return;

    try {
      setLoading(true);
      await documentTypesService.deleteDocumentType(typeId);
      await loadDocumentTypes();
      if (selectedDocType?.id === typeId) {
        setSelectedDocType(null);
      }
    } catch (err) {
      console.error('Error deleting document type:', err);
      setError('Failed to delete document type');
    } finally {
      setLoading(false);
    }
  };

  // Fallback mock data
  const mockDocumentTypes: DocumentType[] = [
    {
      id: 'invoice',
      name: 'Invoice',
      icon: '🧾',
      count: 156,
      color: 'bg-blue-500/20 text-blue-300',
      description: 'Financial invoices and billing documents',
      allowedFormats: ['pdf', 'xlsx', 'csv'],
      metadataFields: [
        { id: 'inv_num', name: 'Invoice Number', type: 'text', required: true },
        { id: 'vendor', name: 'Vendor Name', type: 'text', required: true },
        { id: 'amount', name: 'Amount', type: 'number', required: true },
        { id: 'due_date', name: 'Due Date', type: 'date', required: true },
        { id: 'status', name: 'Status', type: 'dropdown', required: true, options: ['Pending', 'Paid', 'Overdue'] }
      ],
      workflowId: 'invoice-approval',
      retentionDays: 2555, // 7 years
      autoClassify: true,
      status: 'active',
      createdDate: '2024-01-15',
      modifiedDate: '2025-09-20',
      storageUsed: '2.4 GB',
      avgProcessingTime: '45s'
    },
    {
      id: 'contract',
      name: 'Contract',
      icon: '📜',
      count: 89,
      color: 'bg-purple-500/20 text-purple-300',
      description: 'Legal contracts and agreements',
      allowedFormats: ['pdf', 'docx'],
      metadataFields: [
        { id: 'party_a', name: 'Party A', type: 'text', required: true },
        { id: 'party_b', name: 'Party B', type: 'text', required: true },
        { id: 'value', name: 'Contract Value', type: 'number', required: false },
        { id: 'start_date', name: 'Start Date', type: 'date', required: true },
        { id: 'end_date', name: 'End Date', type: 'date', required: true },
        { id: 'renewal', name: 'Auto-Renewal', type: 'boolean', required: false }
      ],
      workflowId: 'legal-review',
      retentionDays: 3650, // 10 years
      autoClassify: true,
      status: 'active',
      createdDate: '2024-01-15',
      modifiedDate: '2025-08-15',
      storageUsed: '1.8 GB',
      avgProcessingTime: '2m 15s'
    },
    {
      id: 'purchase-order',
      name: 'Purchase Order',
      icon: '📋',
      count: 45,
      color: 'bg-green-500/20 text-green-300',
      description: 'Purchase orders and requisitions',
      allowedFormats: ['pdf', 'xlsx'],
      metadataFields: [
        { id: 'po_num', name: 'PO Number', type: 'text', required: true },
        { id: 'supplier', name: 'Supplier', type: 'text', required: true },
        { id: 'total', name: 'Total Amount', type: 'number', required: true },
        { id: 'dept', name: 'Department', type: 'dropdown', required: true, options: ['IT', 'Finance', 'Operations', 'HR'] }
      ],
      workflowId: 'procurement-approval',
      retentionDays: 1825, // 5 years
      autoClassify: true,
      status: 'active',
      createdDate: '2024-02-01',
      modifiedDate: '2025-09-10',
      storageUsed: '450 MB',
      avgProcessingTime: '38s'
    },
    {
      id: 'patent',
      name: 'Patent',
      icon: '🔬',
      count: 12,
      color: 'bg-amber-500/20 text-amber-300',
      description: 'Patents and intellectual property documents',
      allowedFormats: ['pdf'],
      metadataFields: [
        { id: 'patent_num', name: 'Patent Number', type: 'text', required: true },
        { id: 'inventor', name: 'Inventor(s)', type: 'text', required: true },
        { id: 'filing_date', name: 'Filing Date', type: 'date', required: true },
        { id: 'jurisdiction', name: 'Jurisdiction', type: 'text', required: true }
      ],
      workflowId: 'ip-review',
      retentionDays: 7300, // 20 years
      autoClassify: false,
      status: 'active',
      createdDate: '2024-03-10',
      modifiedDate: '2025-07-22',
      storageUsed: '850 MB',
      avgProcessingTime: '5m 30s'
    },
    {
      id: 'report',
      name: 'Report',
      icon: '📊',
      count: 78,
      color: 'bg-pink-500/20 text-pink-300',
      description: 'Business reports and analytics documents',
      allowedFormats: ['pdf', 'docx', 'pptx', 'xlsx'],
      metadataFields: [
        { id: 'report_type', name: 'Report Type', type: 'dropdown', required: true, options: ['Financial', 'Operational', 'Strategic', 'Compliance'] },
        { id: 'period', name: 'Reporting Period', type: 'text', required: true },
        { id: 'author', name: 'Author', type: 'text', required: true },
        { id: 'confidential', name: 'Confidential', type: 'boolean', required: true }
      ],
      retentionDays: 1095, // 3 years
      autoClassify: true,
      status: 'active',
      createdDate: '2024-01-20',
      modifiedDate: '2025-09-28',
      storageUsed: '1.2 GB',
      avgProcessingTime: '1m 10s'
    },
    {
      id: 'proposal',
      name: 'Proposal',
      icon: '📝',
      count: 34,
      color: 'bg-indigo-500/20 text-indigo-300',
      description: 'Business proposals and RFP responses',
      allowedFormats: ['pdf', 'docx', 'pptx'],
      metadataFields: [
        { id: 'client', name: 'Client Name', type: 'text', required: true },
        { id: 'value', name: 'Proposal Value', type: 'number', required: false },
        { id: 'deadline', name: 'Submission Deadline', type: 'date', required: true },
        { id: 'status', name: 'Status', type: 'dropdown', required: true, options: ['Draft', 'Review', 'Submitted', 'Won', 'Lost'] }
      ],
      workflowId: 'proposal-review',
      retentionDays: 1095, // 3 years
      autoClassify: false,
      status: 'active',
      createdDate: '2024-04-05',
      modifiedDate: '2025-09-15',
      storageUsed: '680 MB',
      avgProcessingTime: '1m 45s'
    }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* View Switcher and Controls - Above Main Area */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 glass-strong">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Document Type Manager</h2>
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setDocTypeViewMode('grid')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  docTypeViewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                ▦ Grid
              </button>
              <button
                onClick={() => setDocTypeViewMode('list')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  docTypeViewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                ☰ List
              </button>
              <button
                onClick={() => setDocTypeViewMode('analytics')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  docTypeViewMode === 'analytics' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                📊 Analytics
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewTypeDialog(true)}
              className="btn-glass px-4 py-2 text-sm flex items-center gap-2"
            >
              <span>➕</span>
              New Type
            </button>
            <input
              type="text"
              placeholder="Search types..."
              className="glass-input text-sm px-3 py-2 w-64"
            />
          </div>
        </div>

        {/* New Type Dialog */}
        {showNewTypeDialog && (
          <div className="mt-4 glass-panel p-4 rounded-lg border border-indigo-500/30">
            <h3 className="text-sm font-semibold text-white mb-3">Create New Document Type</h3>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Type name..."
                className="glass-input text-sm px-3 py-2"
                autoFocus
              />
              <input
                type="text"
                value={newTypeIcon}
                onChange={(e) => setNewTypeIcon(e.target.value)}
                placeholder="Icon (emoji)..."
                className="glass-input text-sm px-3 py-2"
              />
              <input
                type="text"
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                placeholder="Description..."
                className="glass-input text-sm px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setShowNewTypeDialog(false);
                  setNewTypeName('');
                  setNewTypeIcon('');
                  setNewTypeDescription('');
                }}
                className="btn-glass px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (newTypeName.trim()) {
                    await handleCreateDocType(newTypeName, newTypeIcon || '📄', newTypeDescription);
                    setShowNewTypeDialog(false);
                    setNewTypeName('');
                    setNewTypeIcon('');
                    setNewTypeDescription('');
                  }
                }}
                className="btn-glass px-4 py-2 text-sm bg-indigo-500/20 hover:bg-indigo-500/30"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Types View Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                <p className="text-white/60">Loading document types...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadDocumentTypes}
                  className="btn-glass px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && docTypeViewMode === 'grid' && (
            /* Grid View */
            <div className="grid grid-cols-3 gap-4">
              {documentTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedDocType(type)}
                  className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                    selectedDocType?.id === type.id
                      ? 'bg-indigo-500/20 border-indigo-500/40 shadow-lg'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{type.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{type.name}</h3>
                      <p className="text-xs text-white/60">{type.count} documents</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${type.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                      {type.status}
                    </div>
                  </div>
                  <p className="text-sm text-white/70 mb-3">{type.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {type.allowedFormats.map(format => (
                      <span key={format} className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/60">
                        {format}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/60 mt-2 pt-2 border-t border-white/10">
                    <span>📊 {type.storageUsed}</span>
                    <span>⏱️ {type.avgProcessingTime}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && !error && docTypeViewMode === 'list' && (
            /* List View */
            <div className="space-y-2">
              {documentTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedDocType(type)}
                  className={`p-4 rounded-lg cursor-pointer transition-all border-2 flex items-center gap-4 ${
                    selectedDocType?.id === type.id
                      ? 'bg-indigo-500/20 border-indigo-500/40'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{type.name}</h3>
                      <div className={`px-2 py-0.5 rounded text-xs ${type.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                        {type.status}
                      </div>
                      {type.autoClassify && <span className="text-xs text-white/60">🤖 Auto-classify</span>}
                    </div>
                    <p className="text-sm text-white/60">{type.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{type.count}</p>
                    <p className="text-xs text-white/60">documents</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{type.storageUsed}</p>
                    <p className="text-xs text-white/60">storage</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{type.avgProcessingTime}</p>
                    <p className="text-xs text-white/60">avg time</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && !error && docTypeViewMode === 'analytics' && (
            /* Analytics View */
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Document Type Analytics</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-3xl font-bold text-white">{documentTypes.length}</p>
                    <p className="text-sm text-white/60">Total Types</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-3xl font-bold text-white">{documentTypes.reduce((sum, t) => sum + t.count, 0)}</p>
                    <p className="text-sm text-white/60">Total Documents</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-3xl font-bold text-white">{documentTypes.filter(t => t.autoClassify).length}</p>
                    <p className="text-sm text-white/60">Auto-Classify Enabled</p>
                  </div>
                </div>

                <h4 className="text-md font-semibold text-white mb-3">Distribution by Type</h4>
                <div className="space-y-2">
                  {documentTypes.map((type) => {
                    const total = documentTypes.reduce((sum, t) => sum + t.count, 0);
                    const percentage = ((type.count / total) * 100).toFixed(1);
                    return (
                      <div key={type.id} className="flex items-center gap-3">
                        <span className="text-lg">{type.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-white">{type.name}</span>
                            <span className="text-xs text-white/60">{type.count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div
                              className="bg-indigo-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Type Details */}
        {selectedDocType && (
          <div className="w-96 border-l border-white/10 bg-white/5 overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedDocType.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedDocType.name}</h3>
                    <p className="text-sm text-white/60">{selectedDocType.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDocType(null)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-white/70 mb-4">{selectedDocType.description}</p>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <label className="text-xs text-white/60 block mb-1">Status</label>
                  <div className={`px-3 py-2 rounded ${selectedDocType.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                    {selectedDocType.status}
                  </div>
                </div>

                {/* Document Count */}
                <div>
                  <label className="text-xs text-white/60 block mb-1">Document Count</label>
                  <div className="bg-white/10 px-3 py-2 rounded text-white">{selectedDocType.count}</div>
                </div>

                {/* Allowed Formats */}
                <div>
                  <label className="text-xs text-white/60 block mb-2">Allowed Formats</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocType.allowedFormats.map(format => (
                      <span key={format} className="px-2 py-1 bg-white/10 rounded text-sm text-white">
                        {format.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Auto-classify */}
                <div>
                  <label className="text-xs text-white/60 block mb-1">Auto-classify</label>
                  <div className="bg-white/10 px-3 py-2 rounded text-white">
                    {selectedDocType.autoClassify ? '✓ Enabled' : '✗ Disabled'}
                  </div>
                </div>

                {/* Workflow */}
                {selectedDocType.workflowId && (
                  <div>
                    <label className="text-xs text-white/60 block mb-1">Workflow</label>
                    <div className="bg-white/10 px-3 py-2 rounded text-white">{selectedDocType.workflowId}</div>
                  </div>
                )}

                {/* Retention Period */}
                {selectedDocType.retentionDays && (
                  <div>
                    <label className="text-xs text-white/60 block mb-1">Retention Period</label>
                    <div className="bg-white/10 px-3 py-2 rounded text-white">
                      {selectedDocType.retentionDays} days ({(selectedDocType.retentionDays / 365).toFixed(1)} years)
                    </div>
                  </div>
                )}

                {/* Storage Used */}
                <div>
                  <label className="text-xs text-white/60 block mb-1">Storage Used</label>
                  <div className="bg-white/10 px-3 py-2 rounded text-white">{selectedDocType.storageUsed}</div>
                </div>

                {/* Avg Processing Time */}
                <div>
                  <label className="text-xs text-white/60 block mb-1">Avg Processing Time</label>
                  <div className="bg-white/10 px-3 py-2 rounded text-white">{selectedDocType.avgProcessingTime}</div>
                </div>

                {/* Metadata Fields */}
                <div>
                  <label className="text-xs text-white/60 block mb-2">Metadata Fields ({selectedDocType.metadataFields.length})</label>
                  <div className="space-y-2">
                    {selectedDocType.metadataFields.map(field => (
                      <div key={field.id} className="p-2 bg-white/5 rounded border border-white/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white font-medium">{field.name}</span>
                          {field.required && (
                            <span className="text-xs text-red-400">Required</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/60">{field.type}</span>
                          {field.options && (
                            <span className="text-xs text-white/50">({field.options.length} options)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timestamps */}
                <div>
                  <label className="text-xs text-white/60 block mb-1">Created</label>
                  <div className="bg-white/10 px-3 py-2 rounded text-white text-sm">{selectedDocType.createdDate}</div>
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Modified</label>
                  <div className="bg-white/10 px-3 py-2 rounded text-white text-sm">{selectedDocType.modifiedDate}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <button className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 py-2 rounded">
                    Edit
                  </button>
                  <button className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 py-2 rounded">
                    <span>🗑️</span>
                    Delete Type
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocTypeManager;
