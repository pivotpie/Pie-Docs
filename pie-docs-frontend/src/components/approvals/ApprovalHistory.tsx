import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import type {
  AuditFilters,
  AuditLogEntry,
  ApprovalAction,
} from '@/store/slices/approvalsSlice';
import { setApprovalFilters } from '@/store/slices/approvalsSlice';

const ApprovalHistory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { auditTrail } = useSelector((state: RootState) => state.approvals);

  const [view, setView] = useState<'timeline' | 'audit' | 'annotations'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');

  // Mock approval timeline data
  const [approvalTimeline] = useState<ApprovalAction[]>([
    {
      id: '1',
      approvalId: 'approval-1',
      userId: 'user1',
      userName: 'John Smith',
      action: 'approve',
      comments: 'Legal review completed. All clauses are compliant with current regulations.',
      annotations: [
        {
          id: 'ann1',
          pageNumber: 1,
          x: 100,
          y: 200,
          width: 150,
          height: 20,
          content: 'Approved section 3.1',
          type: 'highlight',
        },
      ],
      timestamp: new Date('2025-01-15T10:30:00'),
    },
    {
      id: '2',
      approvalId: 'approval-1',
      userId: 'user2',
      userName: 'Sarah Johnson',
      action: 'request_changes',
      comments: 'Please update budget figures in section 4.2 to reflect Q1 adjustments.',
      annotations: [
        {
          id: 'ann2',
          pageNumber: 2,
          x: 50,
          y: 300,
          width: 200,
          height: 40,
          content: 'Update required: Q1 budget adjustments',
          type: 'comment',
        },
      ],
      timestamp: new Date('2025-01-15T14:20:00'),
    },
    {
      id: '3',
      approvalId: 'approval-1',
      userId: 'user3',
      userName: 'Mike Chen',
      action: 'reject',
      comments: 'Risk assessment section is incomplete. Missing cybersecurity considerations.',
      annotations: [],
      timestamp: new Date('2025-01-15T16:45:00'),
    },
  ]);

  // Mock comprehensive audit log
  const [fullAuditLog] = useState<AuditLogEntry[]>([
    {
      id: 'audit1',
      timestamp: new Date('2025-01-15T09:00:00'),
      userId: 'system',
      userName: 'System',
      action: 'document_routed',
      documentId: 'doc-1',
      approvalId: 'approval-1',
      details: { chainId: 'chain-1', chainName: 'Standard Policy Review' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
      checksum: 'sha256:abc123',
      chainChecksum: 'sha256:chain000',
    },
    {
      id: 'audit2',
      timestamp: new Date('2025-01-15T09:15:00'),
      userId: 'user1',
      userName: 'John Smith',
      action: 'approval_viewed',
      documentId: 'doc-1',
      approvalId: 'approval-1',
      details: { viewDuration: 480, pagesViewed: [1, 2, 3] },
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0',
      checksum: 'sha256:def456',
      chainChecksum: 'sha256:chain001',
    },
    {
      id: 'audit3',
      timestamp: new Date('2025-01-15T10:30:00'),
      userId: 'user1',
      userName: 'John Smith',
      action: 'approval_decision',
      documentId: 'doc-1',
      approvalId: 'approval-1',
      details: { decision: 'approve', commentsLength: 87, annotationsCount: 1 },
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0',
      checksum: 'sha256:ghi789',
      chainChecksum: 'sha256:chain002',
    },
    {
      id: 'audit4',
      timestamp: new Date('2025-01-15T12:00:00'),
      userId: 'system',
      userName: 'System',
      action: 'reminder_sent',
      documentId: 'doc-1',
      approvalId: 'approval-1',
      details: { reminderType: 'email', recipient: 'sarah.johnson@company.com' },
      ipAddress: '10.0.0.1',
      userAgent: 'System/1.0',
      checksum: 'sha256:jkl012',
      chainChecksum: 'sha256:chain003',
    },
    {
      id: 'audit5',
      timestamp: new Date('2025-01-15T14:20:00'),
      userId: 'user2',
      userName: 'Sarah Johnson',
      action: 'approval_decision',
      documentId: 'doc-1',
      approvalId: 'approval-1',
      details: { decision: 'request_changes', commentsLength: 156, annotationsCount: 1 },
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0',
      checksum: 'sha256:mno345',
      chainChecksum: 'sha256:chain004',
    },
  ]);

  const handleFilterChange = (filters: Partial<AuditFilters>) => {
    dispatch(setApprovalFilters(filters));
  };

  const handleExport = () => {
    const dataToExport = view === 'timeline' ? approvalTimeline : fullAuditLog;
    const filteredData = filterData(dataToExport);

    switch (exportFormat) {
      case 'csv':
        exportToCSV(filteredData);
        break;
      case 'json':
        exportToJSON(filteredData);
        break;
      case 'pdf':
        exportToPDF(filteredData);
        break;
    }
  };

  const exportToCSV = (data: any[]) => {
    const headers = view === 'timeline'
      ? ['Timestamp', 'User', 'Action', 'Comments', 'Annotations']
      : ['Timestamp', 'User', 'Action', 'Details', 'IP Address', 'Checksum'];

    const csvContent = [
      headers.join(','),
      ...data.map(item => {
        if (view === 'timeline') {
          return [
            item.timestamp.toISOString(),
            item.userName,
            item.action,
            `"${item.comments.replace(/"/g, '""')}"`,
            item.annotations.length,
          ].join(',');
        } else {
          return [
            item.timestamp.toISOString(),
            item.userName,
            item.action,
            `"${JSON.stringify(item.details).replace(/"/g, '""')}"`,
            item.ipAddress,
            item.checksum,
          ].join(',');
        }
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approval_${view}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approval_${view}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (data: any[]) => {
    // In a real implementation, this would use a PDF library like jsPDF
    alert('PDF export functionality would be implemented here using a PDF library');
  };

  const filterData = (data: any[]) => {
    return data.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.comments && item.comments.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.action.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDateRange = !auditTrail.filters.dateRange.start ||
        (item.timestamp >= auditTrail.filters.dateRange.start &&
         (!auditTrail.filters.dateRange.end || item.timestamp <= auditTrail.filters.dateRange.end));

      const matchesUser = !auditTrail.filters.userId || item.userId === auditTrail.filters.userId;
      const matchesAction = !auditTrail.filters.action || item.action === auditTrail.filters.action;

      return matchesSearch && matchesDateRange && matchesUser && matchesAction;
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve':
        return <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>;
      case 'reject':
        return <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>;
      case 'request_changes':
        return <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>;
      case 'escalate':
        return <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>;
      default:
        return <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve': return 'bg-green-50 border-green-200';
      case 'reject': return 'bg-red-50 border-red-200';
      case 'request_changes': return 'bg-purple-50 border-purple-200';
      case 'escalate': return 'bg-orange-50 border-orange-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredTimeline = filterData(approvalTimeline);
  const filteredAuditLog = filterData(fullAuditLog);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Approval History</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-4">
          {(['timeline', 'audit', 'annotations'] as const).map((viewOption) => (
            <button
              key={viewOption}
              onClick={() => setView(viewOption)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === viewOption
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {viewOption.charAt(0).toUpperCase() + viewOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-md">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  onChange={(e) => handleFilterChange({
                    dateRange: {
                      ...auditTrail.filters.dateRange,
                      start: e.target.value ? new Date(e.target.value) : null,
                    }
                  })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  onChange={(e) => handleFilterChange({
                    dateRange: {
                      ...auditTrail.filters.dateRange,
                      end: e.target.value ? new Date(e.target.value) : null,
                    }
                  })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                onChange={(e) => handleFilterChange({ action: e.target.value || null })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
                <option value="request_changes">Request Changes</option>
                <option value="escalate">Escalate</option>
                <option value="document_routed">Document Routed</option>
                <option value="reminder_sent">Reminder Sent</option>
              </select>
            </div>
          </div>
        )}

        {/* Export */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Export
            </button>
          </div>
          <span className="text-xs text-gray-500">
            {view === 'timeline' ? filteredTimeline.length : filteredAuditLog.length} entries
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {view === 'timeline' && (
          <div className="space-y-4">
            {filteredTimeline.length > 0 ? (
              filteredTimeline.map((action, index) => (
                <div key={action.id} className="relative">
                  {/* Timeline line */}
                  {index < filteredTimeline.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                  )}

                  <div className={`flex items-start space-x-3 p-3 rounded-md border ${getActionColor(action.action)}`}>
                    <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center border-2 border-current">
                      {getActionIcon(action.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {action.userName}
                        </p>
                        <span className="text-xs text-gray-500">
                          {action.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {action.action.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p className="text-sm text-gray-700 mt-2">
                        {action.comments}
                      </p>
                      {action.annotations.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">
                            {action.annotations.length} annotation{action.annotations.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No timeline entries</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No approval actions match your current filters
                </p>
              </div>
            )}
          </div>
        )}

        {view === 'audit' && (
          <div className="space-y-2">
            {filteredAuditLog.length > 0 ? (
              filteredAuditLog.map((entry) => (
                <div key={entry.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(entry.action)}
                      <span className="text-sm font-medium text-gray-900">
                        {entry.action.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                      <span className="text-sm text-gray-600">by {entry.userName}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {entry.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <div>IP: {entry.ipAddress}</div>
                    <div>Details: {JSON.stringify(entry.details)}</div>
                    <div className="font-mono">Checksum: {entry.checksum}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No audit entries</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No audit log entries match your current filters
                </p>
              </div>
            )}
          </div>
        )}

        {view === 'annotations' && (
          <div className="space-y-4">
            {filteredTimeline
              .filter(action => action.annotations.length > 0)
              .map((action) => (
                <div key={action.id} className="p-4 bg-white rounded-md border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(action.action)}
                      <span className="text-sm font-medium text-gray-900">
                        {action.userName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {action.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {action.annotations.map((annotation: { id: string; pageNumber: number; type: string; content: string }) => (
                      <div key={annotation.id} className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Page {annotation.pageNumber}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          {annotation.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {filteredTimeline.filter(action => action.annotations.length > 0).length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No annotations</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No approval actions with annotations match your current filters
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalHistory;