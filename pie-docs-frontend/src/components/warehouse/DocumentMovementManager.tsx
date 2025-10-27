import React, { useState, useEffect } from 'react';
import {
  ArrowRight, Clock, MapPin, User, FileText,
  Search, Filter, ChevronDown, AlertCircle, CheckCircle
} from 'lucide-react';
import warehouseService from '@/services/warehouseService';

interface DocumentMovement {
  id: string;
  document_id: string;
  from_rack_id: string;
  to_rack_id: string;
  from_location_path: string;
  to_location_path: string;
  movement_type: 'initial_storage' | 'relocation' | 'return' | 'retrieval';
  reason?: string;
  notes?: string;
  requested_by: string;
  requested_at: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

interface PhysicalDocument {
  id: string;
  title: string;
  barcode: string;
  rack_id?: string;
  status: string;
}

interface Rack {
  id: string;
  name: string;
  barcode: string;
  current_capacity: number;
  max_capacity: number;
}

const DocumentMovementManager: React.FC = () => {
  const [movements, setMovements] = useState<DocumentMovement[]>([]);
  const [documents, setDocuments] = useState<PhysicalDocument[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Move document modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PhysicalDocument | null>(null);
  const [moveForm, setMoveForm] = useState({
    to_rack_id: '',
    movement_type: 'relocation' as const,
    reason: '',
    notes: '',
    user_id: '00000000-0000-0000-0000-000000000001' // Default user ID
  });

  // View history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [documentHistory, setDocumentHistory] = useState<DocumentMovement[]>([]);
  const [historyDocument, setHistoryDocument] = useState<PhysicalDocument | null>(null);

  useEffect(() => {
    loadMovements();
    loadDocuments();
    loadRacks();
  }, []);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const data = await warehouseService.getDocumentMovements();
      setMovements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load movements');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await warehouseService.getPhysicalDocuments();
      setDocuments(data);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    }
  };

  const loadRacks = async () => {
    try {
      const data = await warehouseService.getRacks();
      setRacks(data);
    } catch (err: any) {
      console.error('Failed to load racks:', err);
    }
  };

  const loadDocumentHistory = async (documentId: string) => {
    try {
      const data = await warehouseService.getDocumentMovementHistory(documentId);
      setDocumentHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load document history');
    }
  };

  const handleMoveDocument = async () => {
    if (!selectedDocument) return;

    try {
      setLoading(true);
      await warehouseService.moveDocument(selectedDocument.id, moveForm);
      setShowMoveModal(false);
      setSelectedDocument(null);
      setMoveForm({
        to_rack_id: '',
        movement_type: 'relocation',
        reason: '',
        notes: '',
        user_id: '00000000-0000-0000-0000-000000000001'
      });
      await loadMovements();
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to move document');
    } finally {
      setLoading(false);
    }
  };

  const openMoveModal = (document: PhysicalDocument) => {
    setSelectedDocument(document);
    setShowMoveModal(true);
  };

  const openHistoryModal = async (document: PhysicalDocument) => {
    setHistoryDocument(document);
    await loadDocumentHistory(document.id);
    setShowHistoryModal(true);
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'initial_storage': return 'bg-blue-500/30 text-blue-200 border border-blue-400/50';
      case 'relocation': return 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50';
      case 'return': return 'bg-green-500/30 text-green-200 border border-green-400/50';
      case 'retrieval': return 'bg-purple-500/30 text-purple-200 border border-purple-400/50';
      default: return 'bg-gray-500/30 text-gray-200 border border-gray-400/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'cancelled': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredMovements = movements.filter(movement => {
    if (movementTypeFilter !== 'all' && movement.movement_type !== movementTypeFilter) return false;
    if (statusFilter !== 'all' && movement.status !== statusFilter) return false;
    if (searchQuery && !movement.from_location_path.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !movement.to_location_path.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Movement Tracking</h2>
          <p className="text-gray-600">Track and manage document movements between racks</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadMovements}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search location paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Movement Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
            >
              <option className="bg-gray-800" value="all">All Movement Types</option>
              <option className="bg-gray-800" value="initial_storage">Initial Storage</option>
              <option className="bg-gray-800" value="relocation">Relocation</option>
              <option className="bg-gray-800" value="return">Return</option>
              <option className="bg-gray-800" value="retrieval">Retrieval</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
            >
              <option className="bg-gray-800" value="all">All Statuses</option>
              <option className="bg-gray-800" value="pending">Pending</option>
              <option className="bg-gray-800" value="in_progress">In Progress</option>
              <option className="bg-gray-800" value="completed">Completed</option>
              <option className="bg-gray-800" value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Quick Document Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.slice(0, 6).map(doc => (
            <div key={doc.id} className="border border-gray-200 rounded-lg p-3 hover:border-indigo-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                  <p className="text-sm text-gray-500">{doc.barcode}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  doc.status === 'stored' ? 'bg-green-500/30 text-green-200 border border-green-400/50' : 'bg-gray-500/30 text-gray-200 border border-gray-400/50'
                }`}>
                  {doc.status}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openMoveModal(doc)}
                  className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Move
                </button>
                <button
                  onClick={() => openHistoryModal(doc)}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  History
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Movements List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Movements ({filteredMovements.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading movements...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No movements found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMovements.map(movement => (
              <div key={movement.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(movement.status)}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getMovementTypeColor(movement.movement_type)}`}>
                      {movement.movement_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {new Date(movement.requested_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">From:</span>
                      <span className="font-medium text-gray-900">{movement.from_location_path}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">To:</span>
                      <span className="font-medium text-gray-900">{movement.to_location_path}</span>
                    </div>
                  </div>
                </div>

                {movement.reason && (
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Reason:</span> {movement.reason}
                  </div>
                )}

                {movement.notes && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Notes:</span> {movement.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Move Document Modal */}
      {showMoveModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Move Document</h3>
              <p className="text-gray-600 mt-1">{selectedDocument.title}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destination Rack *</label>
                <select
                  value={moveForm.to_rack_id}
                  onChange={(e) => setMoveForm({ ...moveForm, to_rack_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option className="bg-gray-800" value="">Select destination rack...</option>
                  {racks.map(rack => (
                    <option key={rack.id} value={rack.id}>
                      {rack.name} - {rack.barcode} (Capacity: {rack.current_capacity}/{rack.max_capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type *</label>
                <select
                  value={moveForm.movement_type}
                  onChange={(e) => setMoveForm({ ...moveForm, movement_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option className="bg-gray-800" value="initial_storage">Initial Storage</option>
                  <option className="bg-gray-800" value="relocation">Relocation</option>
                  <option className="bg-gray-800" value="return">Return</option>
                  <option className="bg-gray-800" value="retrieval">Retrieval</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <input
                  type="text"
                  value={moveForm.reason}
                  onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })}
                  placeholder="Enter reason for movement..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={moveForm.notes}
                  onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedDocument(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveDocument}
                disabled={!moveForm.to_rack_id || loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Moving...' : 'Move Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document History Modal */}
      {showHistoryModal && historyDocument && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Movement History</h3>
              <p className="text-gray-600 mt-1">{historyDocument.title}</p>
            </div>

            <div className="p-6">
              {documentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No movement history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documentHistory.map((movement, index) => (
                    <div key={movement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(movement.status)}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getMovementTypeColor(movement.movement_type)}`}>
                            {movement.movement_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {new Date(movement.requested_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">From:</span>
                          <span className="font-medium text-gray-900">{movement.from_location_path}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">To:</span>
                          <span className="font-medium text-gray-900">{movement.to_location_path}</span>
                        </div>

                        {movement.reason && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Reason:</span> {movement.reason}
                          </div>
                        )}

                        {movement.notes && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {movement.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryDocument(null);
                  setDocumentHistory([]);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentMovementManager;
