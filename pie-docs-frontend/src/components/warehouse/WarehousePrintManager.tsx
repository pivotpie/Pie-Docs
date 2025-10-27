import React, { useState, useEffect } from 'react';
import {
  Printer, Tag, Search, CheckSquare, Square,
  Download, Eye, RefreshCw, AlertCircle, CheckCircle,
  Clock, XCircle, Layers
} from 'lucide-react';
import warehouseService from '@/services/warehouseService';

interface LabelData {
  entity_id: string;
  entity_type: string;
  entity_name: string;
  barcode: string;
  location_path: string;
  capacity_info?: {
    current: number;
    max: number;
    utilization: number;
  };
  additional_info?: Record<string, any>;
}

interface PrintJob {
  id: string;
  entity_type: string;
  entity_ids: string[];
  printer_id?: string;
  printer_name?: string;
  copies: number;
  status: 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Entity {
  id: string;
  name: string;
  barcode: string;
  status?: string;
}

const WarehousePrintManager: React.FC = () => {
  const [zones, setZones] = useState<Entity[]>([]);
  const [shelves, setShelves] = useState<Entity[]>([]);
  const [racks, setRacks] = useState<Entity[]>([]);
  const [documents, setDocuments] = useState<Entity[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);

  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [selectedShelves, setSelectedShelves] = useState<Set<string>>(new Set());
  const [selectedRacks, setSelectedRacks] = useState<Set<string>>(new Set());
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<'zones' | 'shelves' | 'racks' | 'documents'>('zones');
  const [searchQuery, setSearchQuery] = useState('');
  const [copies, setCopies] = useState(1);
  const [includeQR, setIncludeQR] = useState(false);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<LabelData | null>(null);

  useEffect(() => {
    loadEntities();
    loadPrintJobs();
  }, []);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const [zonesData, shelvesData, racksData, documentsData] = await Promise.all([
        warehouseService.zones.list(),
        warehouseService.shelves.list(),
        warehouseService.racks.list(),
        warehouseService.documents.list()
      ]);
      setZones(zonesData);
      setShelves(shelvesData);
      setRacks(racksData);
      setDocuments(documentsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load entities');
    } finally {
      setLoading(false);
    }
  };

  const loadPrintJobs = async () => {
    try {
      const jobs = await warehouseService.print.listJobs({ page_size: 50 });
      setPrintJobs(jobs);
    } catch (err: any) {
      console.error('Failed to load print jobs:', err);
    }
  };

  const toggleSelection = (entityId: string, type: 'zones' | 'shelves' | 'racks' | 'documents') => {
    const setters = {
      zones: setSelectedZones,
      shelves: setSelectedShelves,
      racks: setSelectedRacks,
      documents: setSelectedDocuments
    };

    const sets = {
      zones: selectedZones,
      shelves: selectedShelves,
      racks: selectedRacks,
      documents: selectedDocuments
    };

    const newSet = new Set(sets[type]);
    if (newSet.has(entityId)) {
      newSet.delete(entityId);
    } else {
      newSet.add(entityId);
    }
    setters[type](newSet);
  };

  const selectAll = (type: 'zones' | 'shelves' | 'racks' | 'documents') => {
    const entities = { zones, shelves, racks, documents }[type];
    const filtered = entities.filter(e =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.barcode.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const setters = {
      zones: setSelectedZones,
      shelves: setSelectedShelves,
      racks: setSelectedRacks,
      documents: setSelectedDocuments
    };
    setters[type](new Set(filtered.map(e => e.id)));
  };

  const clearSelection = (type: 'zones' | 'shelves' | 'racks' | 'documents') => {
    const setters = {
      zones: setSelectedZones,
      shelves: setSelectedShelves,
      racks: setSelectedRacks,
      documents: setSelectedDocuments
    };
    setters[type](new Set());
  };

  const handlePrintSingle = async () => {
    const entityIds = Array.from(
      activeTab === 'zones' ? selectedZones :
      activeTab === 'shelves' ? selectedShelves :
      activeTab === 'racks' ? selectedRacks :
      selectedDocuments
    );

    if (entityIds.length === 0) {
      setError('No entities selected');
      return;
    }

    try {
      setLoading(true);
      const result = await warehouseService.print.printLabels({
        entity_ids: entityIds,
        entity_type: activeTab.slice(0, -1) as any, // Remove trailing 's'
        copies,
        include_qr_code: includeQR,
        notes
      });

      setSuccess(`Print job created successfully! Job ID: ${result.job_id}`);
      clearSelection(activeTab);
      await loadPrintJobs();
    } catch (err: any) {
      setError(err.message || 'Failed to create print job');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchPrint = async () => {
    const totalSelected = selectedZones.size + selectedShelves.size + selectedRacks.size + selectedDocuments.size;

    if (totalSelected === 0) {
      setError('No entities selected');
      return;
    }

    try {
      setLoading(true);
      const result = await warehouseService.print.batchPrint({
        zones: Array.from(selectedZones),
        shelves: Array.from(selectedShelves),
        racks: Array.from(selectedRacks),
        documents: Array.from(selectedDocuments),
        copies,
        notes
      });

      setSuccess(`Batch print job created successfully! ${result.entity_count} labels queued.`);
      setSelectedZones(new Set());
      setSelectedShelves(new Set());
      setSelectedRacks(new Set());
      setSelectedDocuments(new Set());
      await loadPrintJobs();
    } catch (err: any) {
      setError(err.message || 'Failed to create batch print job');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (entityId: string, entityType: string) => {
    try {
      setLoading(true);
      const data = await warehouseService.print.previewLabel(entityType, entityId);
      setPreviewData(data);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'printing': return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled': return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default: return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/30 text-green-200 border border-green-400/50';
      case 'printing': return 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50';
      case 'failed': return 'bg-red-500/30 text-red-200 border border-red-400/50';
      case 'cancelled': return 'bg-gray-500/30 text-gray-200 border border-gray-400/50';
      default: return 'bg-blue-500/30 text-blue-200 border border-blue-400/50';
    }
  };

  const getCurrentEntities = () => {
    const entities = { zones, shelves, racks, documents }[activeTab];
    return entities.filter(e =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.barcode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getCurrentSelection = () => {
    return { zones: selectedZones, shelves: selectedShelves, racks: selectedRacks, documents: selectedDocuments }[activeTab];
  };

  const totalSelected = selectedZones.size + selectedShelves.size + selectedRacks.size + selectedDocuments.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Warehouse Print Management</h2>
          <p className="text-gray-600">Print labels for zones, shelves, racks, and documents</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadPrintJobs}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-800 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-800 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">×</button>
        </div>
      )}

      {/* Print Options */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Print Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Copies</label>
            <input
              type="number"
              min="1"
              max="10"
              value={copies}
              onChange={(e) => setCopies(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeQR}
                onChange={(e) => setIncludeQR(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">Include QR Code</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional print job notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {totalSelected > 0 && (
          <div className="mt-4 flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
            <div className="flex items-center gap-4">
              <Layers className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-medium text-indigo-900">
                  {totalSelected} entit{totalSelected === 1 ? 'y' : 'ies'} selected
                </p>
                <p className="text-sm text-indigo-700">
                  Zones: {selectedZones.size} | Shelves: {selectedShelves.size} | Racks: {selectedRacks.size} | Documents: {selectedDocuments.size}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrintSingle}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print {activeTab.slice(0, 1).toUpperCase() + activeTab.slice(1, -1)}
              </button>
              {totalSelected > selectedZones.size + selectedShelves.size + selectedRacks.size + selectedDocuments.size - selectedZones.size && (
                <button
                  onClick={handleBatchPrint}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Layers className="h-4 w-4" />
                  Batch Print All
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Entity Selection */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['zones', 'shelves', 'racks', 'documents'] as const).map(tab => {
            const selection = { zones: selectedZones, shelves: selectedShelves, racks: selectedRacks, documents: selectedDocuments }[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                  {selection.size > 0 && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                      {selection.size}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Search and Actions */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => selectAll(activeTab)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Select All
          </button>
          <button
            onClick={() => clearSelection(activeTab)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Clear
          </button>
        </div>

        {/* Entity List */}
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : getCurrentEntities().length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No {activeTab} found
            </div>
          ) : (
            getCurrentEntities().map(entity => {
              const isSelected = getCurrentSelection().has(entity.id);
              return (
                <div
                  key={entity.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                  onClick={() => toggleSelection(entity.id, activeTab)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-gray-900">{entity.name}</p>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                          {entity.barcode}
                        </span>
                        {entity.status && (
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            entity.status === 'active' ? 'bg-green-500/30 text-green-200 border border-green-400/50' : 'bg-gray-500/30 text-gray-200 border border-gray-400/50'
                          }`}>
                            {entity.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(entity.id, activeTab.slice(0, -1));
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Print Jobs */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Print Jobs</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
          {printJobs.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No print jobs yet
            </div>
          ) : (
            printJobs.map(job => (
              <div key={job.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-gray-900">
                          {job.entity_type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        <span className="text-sm text-gray-600">
                          {job.entity_ids.length} item{job.entity_ids.length !== 1 ? 's' : ''} × {job.copies} cop{job.copies !== 1 ? 'ies' : 'y'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Created {new Date(job.created_at).toLocaleString()}
                        {job.printer_name && ` • Printer: ${job.printer_name}`}
                      </p>
                      {job.notes && (
                        <p className="text-sm text-gray-500 mt-1">{job.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Label Preview</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-white">
                <div className="text-center space-y-3">
                  <h4 className="text-2xl font-bold text-gray-900">{previewData.entity_name}</h4>
                  <div className="text-4xl font-mono font-bold text-gray-800">{previewData.barcode}</div>
                  <p className="text-sm text-gray-600">{previewData.location_path}</p>

                  {previewData.capacity_info && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-600">Current</p>
                          <p className="text-lg font-bold text-gray-900">{previewData.capacity_info.current}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Max</p>
                          <p className="text-lg font-bold text-gray-900">{previewData.capacity_info.max}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Utilization</p>
                          <p className="text-lg font-bold text-gray-900">{previewData.capacity_info.utilization}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {previewData.additional_info && Object.keys(previewData.additional_info).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 text-left">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Additional Information:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(previewData.additional_info).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-600">{key}:</span>
                            <span className="ml-2 font-medium text-gray-900">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (previewData) {
                    toggleSelection(previewData.entity_id, activeTab);
                    setShowPreview(false);
                    setPreviewData(null);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Add to Print Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousePrintManager;
