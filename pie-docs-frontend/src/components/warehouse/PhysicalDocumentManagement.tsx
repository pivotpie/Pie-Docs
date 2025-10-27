import React, { useState, useEffect } from 'react';
import { warehouseServices } from '@/services/warehouseService';
import type { PhysicalDocument, PhysicalDocumentCreate, PhysicalDocumentUpdate, Rack } from '@/types/warehouse';

interface PhysicalDocumentManagementProps {
  selectedRack?: Rack;
  onDocumentSelected?: (document: PhysicalDocument) => void;
}

export const PhysicalDocumentManagement: React.FC<PhysicalDocumentManagementProps> = ({
  selectedRack,
  onDocumentSelected
}) => {
  const [documents, setDocuments] = useState<PhysicalDocument[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PhysicalDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Form state
  const [formData, setFormData] = useState<PhysicalDocumentCreate>({
    digital_document_id: '',
    rack_id: selectedRack?.id || '',
    barcode: '',
    document_type: 'original',
    document_category: '',
    title: '',
    description: '',
    physical_condition: 'good',
    conservation_priority: 'low',
    storage_requirements: {
      temperature_controlled: false,
      humidity_controlled: false,
      light_sensitive: false,
      special_handling: false
    },
    customer_id: undefined
  });

  useEffect(() => {
    loadRacks();
    loadDocuments();
  }, [selectedRack, statusFilter, conditionFilter, currentPage]);

  const loadRacks = async () => {
    try {
      const data = await warehouseServices.racks.list({ status: 'active', available: true });
      setRacks(data);
    } catch (error) {
      console.error('Failed to load racks:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const filters: any = { page: currentPage, page_size: pageSize };
      if (selectedRack) {
        filters.rack_id = selectedRack.id;
      }
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const data = await warehouseServices.documents.list(filters);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.barcode || formData.barcode.trim() === '') {
      alert('Barcode is required for physical documents');
      return;
    }

    if (!formData.digital_document_id || formData.digital_document_id.trim() === '') {
      alert('Digital document ID is required');
      return;
    }

    try {
      // TODO: Get from auth context - using a valid UUID format for now
      const userId = '00000000-0000-0000-0000-000000000001';

      if (editingDocument) {
        const updated = await warehouseServices.documents.update(
          editingDocument.id,
          formData as PhysicalDocumentUpdate,
          userId
        );
        setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
      } else {
        const newDocument = await warehouseServices.documents.create(formData, userId);
        setDocuments(prev => [...prev, newDocument]);
      }

      resetForm();
      setShowForm(false);
    } catch (error: any) {
      console.error('Failed to save document:', error);
      alert(error.message || 'Failed to save document');
    }
  };

  const handleEdit = (document: PhysicalDocument) => {
    setEditingDocument(document);
    setFormData({
      digital_document_id: document.digital_document_id,
      rack_id: document.rack_id,
      barcode: document.barcode,
      document_type: document.document_type,
      document_category: document.document_category,
      title: document.title,
      description: document.description,
      physical_condition: document.physical_condition,
      conservation_priority: document.conservation_priority,
      storage_requirements: document.storage_requirements,
      customer_id: document.customer_id
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      digital_document_id: '',
      rack_id: selectedRack?.id || '',
      barcode: '',
      document_type: 'original',
      document_category: '',
      title: '',
      description: '',
      physical_condition: 'good',
      conservation_priority: 'low',
      storage_requirements: {
        temperature_controlled: false,
        humidity_controlled: false,
        light_sensitive: false,
        special_handling: false
      },
      customer_id: undefined
    });
    setEditingDocument(null);
  };

  const generateBarcode = async () => {
    try {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const barcode = `DOC-${timestamp}-${random}`;
      setFormData({ ...formData, barcode });
    } catch (error) {
      console.error('Failed to generate barcode:', error);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (doc.title?.toLowerCase() || '').includes(searchLower) ||
      (doc.barcode?.toLowerCase() || '').includes(searchLower) ||
      (doc.document_category?.toLowerCase() || '').includes(searchLower);

    const matchesCondition = conditionFilter === 'all' || doc.physical_condition === conditionFilter;

    return matchesSearch && matchesCondition;
  });

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-300';
      case 'good': return 'text-blue-300';
      case 'fair': return 'text-yellow-300';
      case 'poor': return 'text-orange-300';
      case 'damaged': return 'text-red-300';
      default: return 'text-gray-300';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-500/30 text-red-200 border border-red-400/50">Critical</span>;
      case 'high':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-500/30 text-orange-200 border border-orange-400/50">High</span>;
      case 'medium':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/30 text-yellow-200 border border-yellow-400/50">Medium</span>;
      case 'low':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-500/30 text-green-200 border border-green-400/50">Low</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-500/30 text-gray-200 border border-gray-400/50">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by title, barcode, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md"
          >
            <option className="bg-gray-800" value="all">All Status</option>
            <option className="bg-gray-800" value="stored">Stored</option>
            <option className="bg-gray-800" value="retrieved">Retrieved</option>
            <option className="bg-gray-800" value="in_transit">In Transit</option>
            <option className="bg-gray-800" value="missing">Missing</option>
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md"
          >
            <option className="bg-gray-800" value="all">All Conditions</option>
            <option className="bg-gray-800" value="excellent">Excellent</option>
            <option className="bg-gray-800" value="good">Good</option>
            <option className="bg-gray-800" value="fair">Fair</option>
            <option className="bg-gray-800" value="poor">Poor</option>
            <option className="bg-gray-800" value="damaged">Damaged</option>
          </select>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 rounded-md hover:bg-blue-500/50 transition-colors whitespace-nowrap"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Document
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center sticky top-0 bg-purple-900/95 backdrop-blur-md z-10">
              <h3 className="text-lg font-semibold text-white">
                {editingDocument ? 'Edit Physical Document' : 'Add New Physical Document'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-300 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Digital Document Link */}
              <div className="bg-blue-500/10 border border-blue-400/30 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-200 mb-2">Digital Document Link</h4>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Digital Document ID * <span className="text-red-400">(Required)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.digital_document_id}
                    onChange={(e) => setFormData({ ...formData, digital_document_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="UUID of digital document"
                  />
                  <p className="mt-1 text-xs text-gray-300">
                    Links this physical document to a digital document in the system
                  </p>
                </div>
              </div>

              {/* Rack Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Storage Rack *
                </label>
                <select
                  required
                  value={formData.rack_id}
                  onChange={(e) => setFormData({ ...formData, rack_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                >
                  <option className="bg-gray-800" value="">Select a rack...</option>
                  {racks.map(rack => (
                    <option key={rack.id} value={rack.id}>
                      {rack.name} ({rack.code}) - Available: {rack.max_documents - rack.current_documents}
                    </option>
                  ))}
                </select>
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Barcode * <span className="text-red-400">(Required)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="DOC-12345678-ABCD"
                  />
                  <button
                    type="button"
                    onClick={generateBarcode}
                    className="px-3 py-2 bg-green-500/20 text-green-200 border border-green-400/50 rounded-md hover:bg-green-500/30 transition-colors text-sm"
                    title="Generate Barcode"
                  >
                    🔄 Generate
                  </button>
                </div>
              </div>

              {/* Document Information */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  placeholder="Contract Agreement - ABC Corp"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Document Type *
                  </label>
                  <select
                    required
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  >
                    <option className="bg-gray-800" value="original">Original</option>
                    <option className="bg-gray-800" value="copy">Copy</option>
                    <option className="bg-gray-800" value="certified_copy">Certified Copy</option>
                    <option className="bg-gray-800" value="archive">Archive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Document Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.document_category}
                    onChange={(e) => setFormData({ ...formData, document_category: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="Contract, Invoice, Legal, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  placeholder="Additional details about the physical document..."
                />
              </div>

              {/* Condition and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Physical Condition *
                  </label>
                  <select
                    required
                    value={formData.physical_condition}
                    onChange={(e) => setFormData({ ...formData, physical_condition: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  >
                    <option className="bg-gray-800" value="excellent">Excellent</option>
                    <option className="bg-gray-800" value="good">Good</option>
                    <option className="bg-gray-800" value="fair">Fair</option>
                    <option className="bg-gray-800" value="poor">Poor</option>
                    <option className="bg-gray-800" value="damaged">Damaged</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Conservation Priority
                  </label>
                  <select
                    value={formData.conservation_priority}
                    onChange={(e) => setFormData({ ...formData, conservation_priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  >
                    <option className="bg-gray-800" value="low">Low</option>
                    <option className="bg-gray-800" value="medium">Medium</option>
                    <option className="bg-gray-800" value="high">High</option>
                    <option className="bg-gray-800" value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Storage Requirements */}
              <div className="border-t border-white/20 pt-4">
                <h4 className="text-sm font-medium text-white mb-3">Storage Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.storage_requirements?.temperature_controlled || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        storage_requirements: {
                          ...formData.storage_requirements!,
                          temperature_controlled: e.target.checked
                        }
                      })}
                      className="rounded border-white/20 text-blue-500 focus:ring-blue-500 bg-white/10"
                    />
                    <span className="text-sm text-gray-200">Temperature Controlled</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.storage_requirements?.humidity_controlled || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        storage_requirements: {
                          ...formData.storage_requirements!,
                          humidity_controlled: e.target.checked
                        }
                      })}
                      className="rounded border-white/20 text-blue-500 focus:ring-blue-500 bg-white/10"
                    />
                    <span className="text-sm text-gray-200">Humidity Controlled</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.storage_requirements?.light_sensitive || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        storage_requirements: {
                          ...formData.storage_requirements!,
                          light_sensitive: e.target.checked
                        }
                      })}
                      className="rounded border-white/20 text-blue-500 focus:ring-blue-500 bg-white/10"
                    />
                    <span className="text-sm text-gray-200">Light Sensitive</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.storage_requirements?.special_handling || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        storage_requirements: {
                          ...formData.storage_requirements!,
                          special_handling: e.target.checked
                        }
                      })}
                      className="rounded border-white/20 text-blue-500 focus:ring-blue-500 bg-white/10"
                    />
                    <span className="text-sm text-gray-200">Special Handling</span>
                  </label>
                </div>
              </div>

              {/* Customer Assignment */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Customer ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.customer_id || ''}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  placeholder="If document belongs to specific customer"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-gray-300 rounded-md hover:bg-white/20 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 rounded-md hover:bg-blue-500/50 transition-colors"
                >
                  {editingDocument ? 'Update Document' : 'Create Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-white">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-300">No physical documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/5 divide-y divide-white/20">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="font-mono text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded border border-blue-400/50">
                        {doc.barcode || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      <div className="max-w-xs truncate" title={doc.title || 'Untitled'}>
                        {doc.title || 'Untitled'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="capitalize">{(doc.document_type || '').replace('_', ' ') || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {doc.document_category || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium capitalize ${getConditionColor(doc.physical_condition || 'unknown')}`}>
                        {doc.physical_condition || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getPriorityBadge(doc.conservation_priority || 'unknown')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        doc.status === 'stored' ? 'bg-green-500/30 text-green-200 border border-green-400/50' :
                        doc.status === 'retrieved' ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50' :
                        doc.status === 'in_transit' ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50' :
                        'bg-red-500/30 text-red-200 border border-red-400/50'
                      }`}>
                        {doc.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        {onDocumentSelected && (
                          <button
                            onClick={() => onDocumentSelected(doc)}
                            className="text-green-400 hover:text-green-300"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur-md border-t border-white/20 rounded-lg sm:px-6">
        <div className="flex justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-200 bg-white/10 border border-white/20 rounded-md hover:bg-white/20 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={filteredDocuments.length < pageSize}
            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-200 bg-white/10 border border-white/20 rounded-md hover:bg-white/20 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-200">
              Showing page <span className="font-medium">{currentPage}</span>
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-white/20 bg-white/10 text-sm font-medium text-gray-200 hover:bg-white/20 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={filteredDocuments.length < pageSize}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-white/20 bg-white/10 text-sm font-medium text-gray-200 hover:bg-white/20 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicalDocumentManagement;
