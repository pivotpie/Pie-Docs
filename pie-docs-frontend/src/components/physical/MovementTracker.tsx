import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logMovement, updateMovementHistory } from '@/store/slices/locationSlice';

interface MovementRecord {
  id: string;
  documentId: string;
  documentName: string;
  fromLocation: {
    id: string;
    name: string;
    fullPath: string;
  };
  toLocation: {
    id: string;
    name: string;
    fullPath: string;
  };
  movementType: 'manual' | 'automatic' | 'bulk';
  timestamp: Date;
  userId: string;
  userName: string;
  reason?: string;
  barcodeScanned: boolean;
  notes?: string;
  status: 'completed' | 'pending' | 'failed' | 'rollback';
}

interface MovementAudit {
  id: string;
  movementId: string;
  action: 'created' | 'updated' | 'completed' | 'rollback' | 'failed';
  timestamp: Date;
  userId: string;
  userName: string;
  details: string;
  metadata: Record<string, unknown>;
}

interface BulkMovementOperation {
  id: string;
  name: string;
  documentIds: string[];
  fromLocationId: string;
  toLocationId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  createdAt: Date;
  completedAt?: Date;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  createdBy: string;
  error?: string;
}

export const MovementTracker: React.FC = () => {
  const dispatch = useDispatch();
  const {
    movements: { recentMovements, pendingMovements, auditTrail, bulkOperations }
  } = useSelector((state: RootState) => state.location);

  const [activeTab, setActiveTab] = useState<'recent' | 'audit' | 'bulk'>('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Mock data for development
  const mockMovements: MovementRecord[] = [
    {
      id: 'mov-001',
      documentId: 'doc-12345',
      documentName: 'Contract_ABC_2024.pdf',
      fromLocation: {
        id: 'shelf-001-a-1',
        name: 'Shelf A1',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A1'
      },
      toLocation: {
        id: 'shelf-002-b-3',
        name: 'Shelf B3',
        fullPath: 'Main Building > Floor 2 > Room B > Cabinet 2 > Shelf B3'
      },
      movementType: 'automatic',
      timestamp: new Date(),
      userId: 'user-001',
      userName: 'John Smith',
      reason: 'Optimization recommendation',
      barcodeScanned: true,
      status: 'completed'
    },
    {
      id: 'mov-002',
      documentId: 'doc-67890',
      documentName: 'Report_Q4_2024.pdf',
      fromLocation: {
        id: 'shelf-001-a-2',
        name: 'Shelf A2',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A2'
      },
      toLocation: {
        id: 'shelf-001-a-3',
        name: 'Shelf A3',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A3'
      },
      movementType: 'manual',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      userId: 'user-002',
      userName: 'Sarah Johnson',
      reason: 'Physical reorganization',
      barcodeScanned: true,
      notes: 'Moved to accommodate new filing system',
      status: 'completed'
    }
  ];

  const mockAuditTrail: MovementAudit[] = [
    {
      id: 'audit-001',
      movementId: 'mov-001',
      action: 'completed',
      timestamp: new Date(),
      userId: 'user-001',
      userName: 'John Smith',
      details: 'Document successfully moved from Shelf A1 to Shelf B3',
      metadata: {
        scanTime: '2024-09-23T10:30:00Z',
        deviceId: 'scanner-001',
        confidence: 0.99
      }
    },
    {
      id: 'audit-002',
      movementId: 'mov-001',
      action: 'created',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      userId: 'system',
      userName: 'System Automation',
      details: 'Movement initiated by optimization engine',
      metadata: {
        algorithm: 'access-pattern-v2',
        score: 0.85
      }
    }
  ];

  const mockBulkOperations: BulkMovementOperation[] = [
    {
      id: 'bulk-001',
      name: 'Archive Q3 Documents',
      documentIds: ['doc-001', 'doc-002', 'doc-003', 'doc-004', 'doc-005'],
      fromLocationId: 'shelf-001-a',
      toLocationId: 'shelf-archive-01',
      status: 'completed',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
      progress: {
        total: 5,
        completed: 5,
        failed: 0
      },
      createdBy: 'admin-001'
    }
  ];

  useEffect(() => {
    // Simulate API call to fetch movement data
    dispatch(updateMovementHistory(mockMovements));
  }, [dispatch, dateRange]);

  const filteredMovements = mockMovements.filter(movement => {
    const matchesSearch = searchTerm === '' ||
      movement.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.fromLocation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.toLocation.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || movement.status === filterStatus;
    const matchesType = filterType === 'all' || movement.movementType === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'rollback': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'automatic': return 'bg-blue-100 text-blue-800';
      case 'manual': return 'bg-purple-100 text-purple-800';
      case 'bulk': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRollbackMovement = (movementId: string) => {
    console.log('Rolling back movement:', movementId);
    // Implementation for rollback functionality
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="movement-tracker p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Movement Tracker</h1>
        <p className="text-gray-600">Track and audit all document movements with comprehensive logging</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { key: 'recent', label: 'Recent Movements', count: mockMovements.length },
            { key: 'audit', label: 'Audit Trail', count: mockAuditTrail.length },
            { key: 'bulk', label: 'Bulk Operations', count: mockBulkOperations.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'recent' | 'audit' | 'bulk')}
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

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Document name, location..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="rollback">Rollback</option>
            </select>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>

          <div>
            <label htmlFor="dateStart" className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                id="dateStart"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                id="dateEnd"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'recent' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Document Movements</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From → To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{movement.documentName}</span>
                        <span className="text-xs text-gray-500">ID: {movement.documentId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-xs text-gray-600">
                          <span className="font-medium">From:</span>
                          <span className="ml-1">{movement.fromLocation.name}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <span className="font-medium">To:</span>
                          <span className="ml-1">{movement.toLocation.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(movement.movementType)}`}>
                        {movement.movementType.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {movement.userName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-900">{movement.userName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(movement.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(movement.status)}`}>
                        {movement.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {movement.status === 'completed' && (
                        <button
                          onClick={() => handleRollbackMovement(movement.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Movement Audit Trail</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {mockAuditTrail.map((audit) => (
                <div key={audit.id} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-800">
                        {audit.action[0].toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{audit.action.toUpperCase()}</span>
                      <span className="text-xs text-gray-500">{formatDateTime(audit.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{audit.details}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className="text-xs text-gray-500">
                        By: {audit.userName}
                      </span>
                      <span className="text-xs text-gray-500">
                        Movement ID: {audit.movementId}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Bulk Movement Operations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operation Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockBulkOperations.map((operation) => (
                  <tr key={operation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{operation.name}</span>
                        <span className="text-xs text-gray-500">{operation.documentIds.length} documents</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="h-2 bg-blue-600 rounded-full"
                            style={{
                              width: `${(operation.progress.completed / operation.progress.total) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">
                          {operation.progress.completed}/{operation.progress.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(operation.status)}`}>
                        {operation.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(operation.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {operation.completedAt ? formatDateTime(operation.completedAt) : '-'}
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

export default MovementTracker;