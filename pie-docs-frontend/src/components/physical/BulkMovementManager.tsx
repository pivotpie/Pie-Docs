import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { createBulkMovement, updateBulkOperation, rollbackBulkMovement } from '@/store/slices/locationSlice';

interface Document {
  id: string;
  name: string;
  type: string;
  currentLocation: {
    id: string;
    name: string;
    fullPath: string;
  };
  lastMoved?: Date;
  size?: number;
  tags?: string[];
  accessLevel: 'public' | 'restricted' | 'confidential';
}

interface BulkMovementOperation {
  id: string;
  name: string;
  description?: string;
  documents: Document[];
  fromLocationId?: string;
  fromLocationName?: string;
  toLocationId: string;
  toLocationName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial' | 'cancelled' | 'rollback';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  settings: {
    validateCapacity: boolean;
    createBackup: boolean;
    notifyUsers: boolean;
    allowPartial: boolean;
    batchSize: number;
    delayBetweenBatches: number; // milliseconds
  };
  errors: Array<{
    documentId: string;
    documentName: string;
    error: string;
    timestamp: Date;
  }>;
  createdBy: string;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
}

interface MovementFilter {
  searchTerm: string;
  documentType: string;
  accessLevel: string;
  locationFilter: string;
  sizeMin?: number;
  sizeMax?: number;
  lastMovedAfter?: Date;
  tags: string[];
}

interface LocationOption {
  id: string;
  name: string;
  fullPath: string;
  type: 'building' | 'floor' | 'room' | 'cabinet' | 'shelf';
  capacity?: {
    total: number;
    used: number;
    available: number;
  };
  isSelectable: boolean;
}

export const BulkMovementManager: React.FC = () => {
  const dispatch = useDispatch();
  const {
    movements: { bulkOperations }
  } = useSelector((state: RootState) => state.location);

  const [activeTab, setActiveTab] = useState<'create' | 'operations' | 'history'>('create');
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [destinationLocation, setDestinationLocation] = useState<LocationOption | null>(null);
  const [operationName, setOperationName] = useState('');
  const [operationDescription, setOperationDescription] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [movementSettings, setMovementSettings] = useState({
    validateCapacity: true,
    createBackup: false,
    notifyUsers: true,
    allowPartial: true,
    batchSize: 10,
    delayBetweenBatches: 1000
  });

  const [filters, setFilters] = useState<MovementFilter>({
    searchTerm: '',
    documentType: 'all',
    accessLevel: 'all',
    locationFilter: 'all',
    tags: []
  });

  const [currentOperation, setCurrentOperation] = useState<BulkMovementOperation | null>(null);
  const [showOperationModal, setShowOperationModal] = useState(false);

  // Mock data for development
  const mockDocuments: Document[] = [
    {
      id: 'doc-001',
      name: 'Contract_ABC_2024.pdf',
      type: 'contract',
      currentLocation: {
        id: 'shelf-001-a-1',
        name: 'Shelf A1',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A1'
      },
      lastMoved: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      size: 2457600,
      tags: ['legal', 'contract', '2024'],
      accessLevel: 'confidential'
    },
    {
      id: 'doc-002',
      name: 'Report_Q4_2024.pdf',
      type: 'report',
      currentLocation: {
        id: 'shelf-001-a-2',
        name: 'Shelf A2',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A2'
      },
      lastMoved: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      size: 1024000,
      tags: ['quarterly', 'report', 'finance'],
      accessLevel: 'restricted'
    },
    {
      id: 'doc-003',
      name: 'Invoice_2024_001.pdf',
      type: 'invoice',
      currentLocation: {
        id: 'shelf-001-a-1',
        name: 'Shelf A1',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A1'
      },
      lastMoved: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      size: 512000,
      tags: ['invoice', 'accounting', '2024'],
      accessLevel: 'public'
    },
    {
      id: 'doc-004',
      name: 'Manual_Equipment_V2.pdf',
      type: 'manual',
      currentLocation: {
        id: 'shelf-002-b-1',
        name: 'Shelf B1',
        fullPath: 'Main Building > Floor 2 > Room B > Cabinet 2 > Shelf B1'
      },
      lastMoved: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      size: 5120000,
      tags: ['manual', 'equipment', 'reference'],
      accessLevel: 'public'
    },
    {
      id: 'doc-005',
      name: 'Compliance_Report_2024.pdf',
      type: 'report',
      currentLocation: {
        id: 'shelf-001-a-3',
        name: 'Shelf A3',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A3'
      },
      lastMoved: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      size: 3072000,
      tags: ['compliance', 'regulatory', 'audit'],
      accessLevel: 'restricted'
    }
  ];

  const mockLocationOptions: LocationOption[] = [
    {
      id: 'shelf-001-a-1',
      name: 'Shelf A1',
      fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A1',
      type: 'shelf',
      capacity: { total: 100, used: 75, available: 25 },
      isSelectable: true
    },
    {
      id: 'shelf-001-a-2',
      name: 'Shelf A2',
      fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A2',
      type: 'shelf',
      capacity: { total: 100, used: 60, available: 40 },
      isSelectable: true
    },
    {
      id: 'shelf-002-b-1',
      name: 'Shelf B1',
      fullPath: 'Main Building > Floor 2 > Room B > Cabinet 2 > Shelf B1',
      type: 'shelf',
      capacity: { total: 150, used: 20, available: 130 },
      isSelectable: true
    },
    {
      id: 'shelf-archive-01',
      name: 'Archive Shelf 01',
      fullPath: 'Archive Building > Floor 1 > Archive Room > Archive Cabinet > Shelf 01',
      type: 'shelf',
      capacity: { total: 200, used: 45, available: 155 },
      isSelectable: true
    }
  ];

  const mockBulkOperations: BulkMovementOperation[] = [
    {
      id: 'bulk-001',
      name: 'Q4 Archive Migration',
      description: 'Moving Q4 documents to archive storage',
      documents: mockDocuments.slice(0, 3),
      toLocationId: 'shelf-archive-01',
      toLocationName: 'Archive Shelf 01',
      status: 'completed',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      progress: {
        total: 3,
        processed: 3,
        successful: 3,
        failed: 0,
        skipped: 0
      },
      settings: {
        validateCapacity: true,
        createBackup: true,
        notifyUsers: true,
        allowPartial: false,
        batchSize: 5,
        delayBetweenBatches: 500
      },
      errors: [],
      createdBy: 'John Smith',
      estimatedDuration: 10,
      actualDuration: 10
    },
    {
      id: 'bulk-002',
      name: 'Manual Relocation',
      description: 'Moving equipment manuals to accessible location',
      documents: [mockDocuments[3]],
      fromLocationId: 'shelf-002-b-1',
      fromLocationName: 'Shelf B1',
      toLocationId: 'shelf-001-a-3',
      toLocationName: 'Shelf A3',
      status: 'in_progress',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      startedAt: new Date(Date.now() - 25 * 60 * 1000),
      progress: {
        total: 1,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0
      },
      settings: {
        validateCapacity: true,
        createBackup: false,
        notifyUsers: false,
        allowPartial: true,
        batchSize: 1,
        delayBetweenBatches: 0
      },
      errors: [],
      createdBy: 'Sarah Johnson',
      estimatedDuration: 5
    },
    {
      id: 'bulk-003',
      name: 'Failed Compliance Move',
      description: 'Attempted to move compliance documents',
      documents: [mockDocuments[4]],
      toLocationId: 'shelf-002-b-1',
      toLocationName: 'Shelf B1',
      status: 'failed',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 2 * 60 * 1000),
      progress: {
        total: 1,
        processed: 1,
        successful: 0,
        failed: 1,
        skipped: 0
      },
      settings: {
        validateCapacity: true,
        createBackup: true,
        notifyUsers: true,
        allowPartial: false,
        batchSize: 1,
        delayBetweenBatches: 0
      },
      errors: [
        {
          documentId: 'doc-005',
          documentName: 'Compliance_Report_2024.pdf',
          error: 'Insufficient capacity at destination location',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 + 3 * 60 * 1000)
        }
      ],
      createdBy: 'Admin User',
      estimatedDuration: 2,
      actualDuration: 1
    }
  ];

  useEffect(() => {
    // Auto-refresh operations every 10 seconds when there are active operations
    const hasActiveOperations = mockBulkOperations.some(op => op.status === 'in_progress' || op.status === 'pending');
    if (hasActiveOperations) {
      const interval = setInterval(() => {
        // Simulate progress updates
        console.log('Refreshing bulk operations...');
      }, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = filters.searchTerm === '' ||
      doc.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(filters.searchTerm.toLowerCase()));

    const matchesType = filters.documentType === 'all' || doc.type === filters.documentType;
    const matchesAccess = filters.accessLevel === 'all' || doc.accessLevel === filters.accessLevel;
    const matchesLocation = filters.locationFilter === 'all' || doc.currentLocation.id === filters.locationFilter;

    return matchesSearch && matchesType && matchesAccess && matchesLocation;
  });

  const handleDocumentSelection = (document: Document, selected: boolean) => {
    if (selected) {
      setSelectedDocuments(prev => [...prev, document]);
    } else {
      setSelectedDocuments(prev => prev.filter(d => d.id !== document.id));
    }
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments([...filteredDocuments]);
    }
  };

  const handleCreateBulkMovement = () => {
    if (!operationName.trim()) {
      alert('Please enter an operation name');
      return;
    }

    if (selectedDocuments.length === 0) {
      alert('Please select documents to move');
      return;
    }

    if (!destinationLocation) {
      alert('Please select a destination location');
      return;
    }

    // Check capacity if validation is enabled
    if (movementSettings.validateCapacity && destinationLocation.capacity) {
      const requiredSpace = selectedDocuments.length;
      if (destinationLocation.capacity.available < requiredSpace) {
        if (!movementSettings.allowPartial) {
          alert(`Insufficient capacity. Required: ${requiredSpace}, Available: ${destinationLocation.capacity.available}`);
          return;
        }
      }
    }

    const newOperation: BulkMovementOperation = {
      id: `bulk-${Date.now()}`,
      name: operationName,
      description: operationDescription,
      documents: selectedDocuments,
      toLocationId: destinationLocation.id,
      toLocationName: destinationLocation.name,
      status: 'pending',
      createdAt: new Date(),
      progress: {
        total: selectedDocuments.length,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0
      },
      settings: movementSettings,
      errors: [],
      createdBy: 'Current User',
      estimatedDuration: Math.ceil(selectedDocuments.length / movementSettings.batchSize * 2)
    };

    dispatch(createBulkMovement(newOperation));

    // Reset form
    setOperationName('');
    setOperationDescription('');
    setSelectedDocuments([]);
    setDestinationLocation(null);

    // Switch to operations tab to monitor progress
    setActiveTab('operations');
  };

  const handleCancelOperation = (operationId: string) => {
    console.log('Cancelling operation:', operationId);
    // Implementation for cancelling operation
  };

  const handleRollbackOperation = (operationId: string) => {
    console.log('Rolling back operation:', operationId);
    dispatch(rollbackBulkMovement(operationId));
  };

  const handleRetryOperation = (operationId: string) => {
    console.log('Retrying operation:', operationId);
    // Implementation for retrying failed operation
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'rollback': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelColor = (level: string): string => {
    switch (level) {
      case 'public': return 'bg-green-100 text-green-800';
      case 'restricted': return 'bg-yellow-100 text-yellow-800';
      case 'confidential': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const calculateProgress = (operation: BulkMovementOperation): number => {
    return Math.round((operation.progress.processed / operation.progress.total) * 100);
  };

  return (
    <div className="bulk-movement-manager p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Movement Manager</h1>
        <p className="text-gray-600">Efficiently move multiple documents between locations with progress tracking</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { key: 'create', label: 'Create Movement', count: 0 },
            { key: 'operations', label: 'Active Operations', count: mockBulkOperations.filter(op => op.status === 'in_progress' || op.status === 'pending').length },
            { key: 'history', label: 'History', count: mockBulkOperations.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'create' | 'operations' | 'history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Create Movement Tab */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Select Documents</h3>
                <p className="text-sm text-gray-600">Choose documents to move in bulk operation</p>
              </div>

              {/* Filters */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={filters.searchTerm}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <select
                      value={filters.documentType}
                      onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Types</option>
                      <option value="contract">Contracts</option>
                      <option value="report">Reports</option>
                      <option value="invoice">Invoices</option>
                      <option value="manual">Manuals</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={filters.accessLevel}
                      onChange={(e) => setFilters(prev => ({ ...prev, accessLevel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Access Levels</option>
                      <option value="public">Public</option>
                      <option value="restricted">Restricted</option>
                      <option value="confidential">Confidential</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {selectedDocuments.length === filteredDocuments.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Document List */}
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Access
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDocuments.map((document) => (
                      <tr
                        key={document.id}
                        className={`hover:bg-gray-50 ${
                          selectedDocuments.find(d => d.id === document.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={!!selectedDocuments.find(d => d.id === document.id)}
                            onChange={(e) => handleDocumentSelection(document, e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{document.name}</span>
                            <span className="text-xs text-gray-500">
                              {document.size && formatFileSize(document.size)}
                              {document.lastMoved && ` • Last moved: ${formatDateTime(document.lastMoved)}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 capitalize">{document.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{document.currentLocation.name}</div>
                          <div className="text-xs text-gray-500">{document.currentLocation.fullPath}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAccessLevelColor(document.accessLevel)}`}>
                            {document.accessLevel.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {selectedDocuments.length} of {filteredDocuments.length} documents selected
                </span>
              </div>
            </div>
          </div>

          {/* Movement Configuration */}
          <div className="space-y-6">
            {/* Operation Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Operation Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operation Name *</label>
                  <input
                    type="text"
                    value={operationName}
                    onChange={(e) => setOperationName(e.target.value)}
                    placeholder="e.g., Q4 Archive Migration"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={operationDescription}
                    onChange={(e) => setOperationDescription(e.target.value)}
                    placeholder="Optional description of the operation"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Location *</label>
                  <select
                    value={destinationLocation?.id || ''}
                    onChange={(e) => {
                      const location = mockLocationOptions.find(loc => loc.id === e.target.value);
                      setDestinationLocation(location || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select destination...</option>
                    {mockLocationOptions.map((location) => (
                      <option key={location.id} value={location.id} disabled={!location.isSelectable}>
                        {location.name} - {location.fullPath}
                        {location.capacity && ` (${location.capacity.available}/${location.capacity.total} available)`}
                      </option>
                    ))}
                  </select>
                </div>

                {destinationLocation?.capacity && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 mb-1">Capacity Information</div>
                    <div className="text-xs text-blue-700">
                      Available: {destinationLocation.capacity.available} / {destinationLocation.capacity.total}
                      {selectedDocuments.length > 0 && (
                        <span className={selectedDocuments.length > destinationLocation.capacity.available ? 'text-red-600 font-medium' : ''}>
                          {' '}(Requires: {selectedDocuments.length})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Movement Settings</h3>
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showAdvancedSettings ? 'Hide' : 'Show'} Advanced
                </button>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={movementSettings.validateCapacity}
                    onChange={(e) => setMovementSettings(prev => ({ ...prev, validateCapacity: e.target.checked }))}
                    className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Validate destination capacity</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={movementSettings.allowPartial}
                    onChange={(e) => setMovementSettings(prev => ({ ...prev, allowPartial: e.target.checked }))}
                    className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Allow partial completion</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={movementSettings.notifyUsers}
                    onChange={(e) => setMovementSettings(prev => ({ ...prev, notifyUsers: e.target.checked }))}
                    className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Notify relevant users</span>
                </label>

                {showAdvancedSettings && (
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={movementSettings.createBackup}
                        onChange={(e) => setMovementSettings(prev => ({ ...prev, createBackup: e.target.checked }))}
                        className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Create backup before moving</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={movementSettings.batchSize}
                        onChange={(e) => setMovementSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 10 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delay Between Batches (ms)</label>
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        step="100"
                        value={movementSettings.delayBetweenBatches}
                        onChange={(e) => setMovementSettings(prev => ({ ...prev, delayBetweenBatches: parseInt(e.target.value) || 1000 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCreateBulkMovement}
                  disabled={selectedDocuments.length === 0 || !operationName.trim() || !destinationLocation}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Create Bulk Movement ({selectedDocuments.length} documents)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operations Tab */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          {mockBulkOperations
            .filter(op => op.status === 'in_progress' || op.status === 'pending')
            .map((operation) => (
              <div key={operation.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{operation.name}</h3>
                    {operation.description && (
                      <p className="text-sm text-gray-600">{operation.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(operation.status)}`}>
                      {operation.status.toUpperCase()}
                    </span>
                    {operation.status === 'in_progress' && (
                      <button
                        onClick={() => handleCancelOperation(operation.id)}
                        className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600">Documents:</span>
                    <span className="ml-1 font-medium">{operation.documents.length}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="ml-1 font-medium">{formatDateTime(operation.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Progress:</span>
                    <span className="ml-1 font-medium">{calculateProgress(operation)}%</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{operation.progress.processed} / {operation.progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${calculateProgress(operation)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-green-600 font-medium">{operation.progress.successful}</div>
                    <div className="text-gray-600">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-600 font-medium">{operation.progress.failed}</div>
                    <div className="text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-600 font-medium">{operation.progress.skipped}</div>
                    <div className="text-gray-600">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-600 font-medium">{operation.progress.total - operation.progress.processed}</div>
                    <div className="text-gray-600">Remaining</div>
                  </div>
                </div>

                {operation.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Recent Errors</h4>
                    <div className="space-y-1">
                      {operation.errors.slice(0, 3).map((error, index) => (
                        <div key={index} className="text-xs text-red-700">
                          {error.documentName}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

          {mockBulkOperations.filter(op => op.status === 'in_progress' || op.status === 'pending').length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-400 mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Operations</h3>
              <p className="text-gray-600">Create a new bulk movement to get started</p>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockBulkOperations.map((operation) => (
                  <tr key={operation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{operation.name}</span>
                        {operation.description && (
                          <span className="text-xs text-gray-500">{operation.description}</span>
                        )}
                        <span className="text-xs text-gray-500">by {operation.createdBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(operation.status)}`}>
                        {operation.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {operation.documents.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="h-2 bg-blue-600 rounded-full"
                            style={{
                              width: `${calculateProgress(operation)}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">{calculateProgress(operation)}%</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {operation.progress.successful}S / {operation.progress.failed}F / {operation.progress.skipped}Sk
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(operation.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {operation.actualDuration ? `${operation.actualDuration}m` : operation.estimatedDuration ? `~${operation.estimatedDuration}m` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentOperation(operation)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                        {operation.status === 'completed' && operation.progress.successful > 0 && (
                          <button
                            onClick={() => handleRollbackOperation(operation.id)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Rollback
                          </button>
                        )}
                        {operation.status === 'failed' && (
                          <button
                            onClick={() => handleRetryOperation(operation.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkMovementManager;