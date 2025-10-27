import React, { useState, useEffect } from 'react';
import { checkinoutService } from '../../../services/api/checkinoutService';
import type { CheckoutRecord as APICheckoutRecord } from '../../../services/api/checkinoutService';

// Check In/Out Types
export interface CheckoutRecord {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  documentIcon: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userDepartment: string;
  status: 'checked-out' | 'checked-in';
  checkoutDate: string;
  checkinDate?: string;
  dueDate?: string;
  version: string;
  reason?: string;
  duration?: string;
  isOverdue?: boolean;
  lockExpiry?: string;
  lastModified?: string;
}

export type CheckoutViewMode = 'active' | 'history' | 'timeline' | 'analytics';

interface CheckInOutManagerProps {
  // No props needed initially since it manages its own state
}

const CheckInOutManager: React.FC<CheckInOutManagerProps> = () => {
  // State
  const [checkoutViewMode, setCheckoutViewMode] = useState<CheckoutViewMode>('active');
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutRecord | null>(null);
  const [checkoutFilter, setCheckoutFilter] = useState<string>('all');
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load checkout records from API
  useEffect(() => {
    loadCheckouts();
  }, [checkoutViewMode, checkoutFilter]);

  const loadCheckouts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine status filter based on view mode
      const statusFilter = checkoutViewMode === 'active' ? 'checked-out' :
                          checkoutViewMode === 'history' ? 'checked-in' : undefined;

      const response = await checkinoutService.listCheckoutRecords({
        status_filter: statusFilter,
        department: checkoutFilter !== 'all' ? checkoutFilter : undefined,
        page: 1,
        page_size: 100
      });

      // Transform API data to component format
      const transformedCheckouts: CheckoutRecord[] = response.records.map((record: APICheckoutRecord) => ({
        id: record.id,
        documentId: record.document_id,
        documentName: `Document ${record.document_id}`, // TODO: Fetch actual document name
        documentType: 'Document',
        documentIcon: '📄',
        userId: record.user_id || 'unknown',
        userName: record.user_name,
        userDepartment: record.user_department || 'N/A',
        status: record.status as 'checked-out' | 'checked-in',
        checkoutDate: new Date(record.checkout_date).toLocaleString(),
        checkinDate: record.checkin_date ? new Date(record.checkin_date).toLocaleString() : undefined,
        dueDate: record.due_date ? new Date(record.due_date).toLocaleString() : undefined,
        version: record.version_at_checkout || 'v1.0',
        reason: record.reason,
        duration: calculateDuration(record.checkout_date, record.checkin_date),
        isOverdue: record.is_overdue,
        lockExpiry: record.lock_expiry ? new Date(record.lock_expiry).toLocaleString() : undefined,
        lastModified: new Date(record.updated_at).toLocaleString()
      }));

      setCheckouts(transformedCheckouts);
    } catch (err) {
      console.error('Failed to load checkouts:', err);
      setError('Failed to load checkout records');
      // Fallback to mock data on error
      setCheckouts(mockCheckouts);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (checkoutDate: string, checkinDate?: string): string => {
    const start = new Date(checkoutDate);
    const end = checkinDate ? new Date(checkinDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return 'Less than 1 hour';
  };

  const handleCheckIn = async (checkoutId: string, notes?: string) => {
    try {
      await checkinoutService.checkinDocument({
        checkout_record_id: checkoutId,
        checkin_notes: notes
      });
      // Reload data after check-in
      await loadCheckouts();
    } catch (err) {
      console.error('Failed to check in document:', err);
      alert('Failed to check in document');
    }
  };

  const handleForceCheckIn = async (checkoutId: string, reason: string) => {
    try {
      await checkinoutService.forceCheckin({
        checkout_record_id: checkoutId,
        reason,
        admin_override: true
      });
      // Reload data after force check-in
      await loadCheckouts();
    } catch (err) {
      console.error('Failed to force check in:', err);
      alert('Failed to force check in document');
    }
  };

  // Mock data
  const mockCheckouts: CheckoutRecord[] = [
    { id: '1', documentId: 'd1', documentName: 'Q3-2025-Vendor-Contract-Acme-Corp.pdf', documentType: 'Contract', documentIcon: '📄', userId: 'u1', userName: 'John Doe', userDepartment: 'Legal', status: 'checked-out', checkoutDate: '2025-10-02 10:30', dueDate: '2025-10-04', version: 'v2.3', reason: 'Contract review and amendments', duration: '2 hours', isOverdue: false, lockExpiry: '2025-10-04 17:00', lastModified: '2025-10-02 11:45' },
    { id: '2', documentId: 'd2', documentName: 'Invoice-2023-001.pdf', documentType: 'Invoice', documentIcon: '📊', userId: 'u2', userName: 'Jane Smith', userDepartment: 'Finance', status: 'checked-in', checkoutDate: '2025-10-01 09:15', checkinDate: '2025-10-01 16:30', version: 'v1.0', duration: '1 day', lastModified: '2025-10-01 16:25' },
    { id: '3', documentId: 'd3', documentName: 'Patent-Application-Blueprint.pdf', documentType: 'Patent', documentIcon: '⚖️', userId: 'u3', userName: 'Legal Team', userDepartment: 'Legal', status: 'checked-out', checkoutDate: '2025-10-02 08:00', dueDate: '2025-10-03', version: 'v3.1', reason: 'Patent filing preparation', duration: '3 hours', isOverdue: false, lockExpiry: '2025-10-03 18:00' },
    { id: '4', documentId: 'd4', documentName: 'Annual-Report-2024.docx', documentType: 'Report', documentIcon: '📈', userId: 'u4', userName: 'Sarah Johnson', userDepartment: 'Finance', status: 'checked-out', checkoutDate: '2025-09-30 14:00', dueDate: '2025-10-01', version: 'v1.5', reason: 'Final review before board meeting', duration: '2 days', isOverdue: true, lockExpiry: '2025-10-01 17:00', lastModified: '2025-10-01 10:30' },
    { id: '5', documentId: 'd5', documentName: 'Employee-Handbook-v5.pdf', documentType: 'Policy', documentIcon: '📋', userId: 'u5', userName: 'HR Department', userDepartment: 'Human Resources', status: 'checked-in', checkoutDate: '2025-09-28 11:00', checkinDate: '2025-09-29 15:00', version: 'v5.0', duration: '1 day', lastModified: '2025-09-29 14:45' },
    { id: '6', documentId: 'd6', documentName: 'Marketing-Strategy-Q4.pptx', documentType: 'Presentation', documentIcon: '📊', userId: 'u6', userName: 'Mike Wilson', userDepartment: 'Marketing', status: 'checked-out', checkoutDate: '2025-10-02 13:15', dueDate: '2025-10-05', version: 'v2.0', reason: 'Adding Q4 campaign details', duration: '30 minutes', isOverdue: false, lockExpiry: '2025-10-05 17:00' },
    { id: '7', documentId: 'd7', documentName: 'Product-Roadmap-2025.xlsx', documentType: 'Spreadsheet', documentIcon: '📊', userId: 'u7', userName: 'Tom Anderson', userDepartment: 'Product', status: 'checked-out', checkoutDate: '2025-10-01 16:00', dueDate: '2025-10-02', version: 'v4.2', reason: 'Updating timeline and milestones', duration: '1 day', isOverdue: true, lockExpiry: '2025-10-02 17:00', lastModified: '2025-10-02 09:00' },
    { id: '8', documentId: 'd8', documentName: 'Security-Policy-Update.pdf', documentType: 'Policy', documentIcon: '🔒', userId: 'u8', userName: 'IT Security', userDepartment: 'IT', status: 'checked-in', checkoutDate: '2025-09-29 10:00', checkinDate: '2025-09-30 12:00', version: 'v3.0', duration: '1 day', lastModified: '2025-09-30 11:50' },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Check In/Out Manager</h2>
          <div className="flex gap-2">
            <select
              value={checkoutFilter}
              onChange={(e) => setCheckoutFilter(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            >
              <option value="all" className="bg-slate-800 text-white">All Users</option>
              <option value="Legal" className="bg-slate-800 text-white">Legal</option>
              <option value="Finance" className="bg-slate-800 text-white">Finance</option>
              <option value="HR" className="bg-slate-800 text-white">Human Resources</option>
              <option value="IT" className="bg-slate-800 text-white">IT</option>
              <option value="Marketing" className="bg-slate-800 text-white">Marketing</option>
              <option value="Product" className="bg-slate-800 text-white">Product</option>
            </select>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setCheckoutViewMode('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              checkoutViewMode === 'active'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            🔓 Active Checkouts
          </button>
          <button
            onClick={() => setCheckoutViewMode('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              checkoutViewMode === 'history'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            📜 History
          </button>
          <button
            onClick={() => setCheckoutViewMode('timeline')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              checkoutViewMode === 'timeline'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            ⏱️ Timeline
          </button>
          <button
            onClick={() => setCheckoutViewMode('analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              checkoutViewMode === 'analytics'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Main Area */}
        <div className="flex-1 p-6">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                <p className="text-white/60">Loading checkout records...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadCheckouts}
                  className="btn-glass px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Active Checkouts View */}
          {!loading && !error && checkoutViewMode === 'active' && (
            <div className="space-y-4">
              {checkouts
                .filter(c => c.status === 'checked-out')
                .filter(c => checkoutFilter === 'all' || c.userDepartment === checkoutFilter)
                .map(checkout => (
                  <div
                    key={checkout.id}
                    onClick={() => setSelectedCheckout(checkout)}
                    className={`glass-panel p-5 rounded-lg cursor-pointer transition-all ${
                      selectedCheckout?.id === checkout.id ? 'ring-2 ring-indigo-500/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{checkout.documentIcon}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-white mb-1">{checkout.documentName}</h3>
                            <div className="flex items-center gap-3 text-sm text-white/60">
                              <span>{checkout.documentType}</span>
                              <span>•</span>
                              <span>Version {checkout.version}</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            checkout.isOverdue
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {checkout.isOverdue ? '⚠️ Overdue' : '🔒 Checked Out'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-500/30 rounded-full flex items-center justify-center text-sm">
                              {checkout.userName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm text-white font-medium">{checkout.userName}</div>
                              <div className="text-xs text-white/60">{checkout.userDepartment}</div>
                            </div>
                          </div>
                          <div className="text-sm text-white/60">
                            <span>Checked out: {checkout.checkoutDate}</span>
                          </div>
                          {checkout.dueDate && (
                            <div className="text-sm text-white/60">
                              <span>Due: {checkout.dueDate}</span>
                            </div>
                          )}
                        </div>
                        {checkout.reason && (
                          <div className="text-sm text-white/70 bg-white/5 p-2 rounded">
                            💬 {checkout.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* History View */}
          {!loading && !error && checkoutViewMode === 'history' && (
            <div className="glass-panel rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Checked Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Checked In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {checkouts
                    .filter(c => checkoutFilter === 'all' || c.userDepartment === checkoutFilter)
                    .map(checkout => (
                      <tr
                        key={checkout.id}
                        onClick={() => setSelectedCheckout(checkout)}
                        className={`cursor-pointer transition-colors ${
                          selectedCheckout?.id === checkout.id ? 'bg-indigo-500/20' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{checkout.documentIcon}</span>
                            <div>
                              <div className="text-sm text-white font-medium">{checkout.documentName}</div>
                              <div className="text-xs text-white/60">{checkout.documentType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">{checkout.userName}</div>
                          <div className="text-xs text-white/60">{checkout.userDepartment}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/70">{checkout.checkoutDate}</td>
                        <td className="px-6 py-4 text-sm text-white/70">{checkout.checkinDate || '-'}</td>
                        <td className="px-6 py-4 text-sm text-white/70">{checkout.duration}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            checkout.status === 'checked-out'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}>
                            {checkout.status === 'checked-out' ? 'Checked Out' : 'Checked In'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Timeline View */}
          {!loading && !error && checkoutViewMode === 'timeline' && (
            <div className="space-y-6">
              <div className="text-sm text-white/60 mb-4">Recent Activity</div>
              {checkouts
                .filter(c => checkoutFilter === 'all' || c.userDepartment === checkoutFilter)
                .sort((a, b) => new Date(b.checkoutDate).getTime() - new Date(a.checkoutDate).getTime())
                .map((checkout, index) => (
                  <div key={checkout.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        checkout.status === 'checked-out' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      {index < checkouts.length - 1 && (
                        <div className="w-0.5 h-full bg-white/10 mt-2" />
                      )}
                    </div>
                    <div
                      className={`flex-1 glass-panel p-4 rounded-lg mb-4 cursor-pointer ${
                        selectedCheckout?.id === checkout.id ? 'ring-2 ring-indigo-500/50' : ''
                      }`}
                      onClick={() => setSelectedCheckout(checkout)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{checkout.documentIcon}</span>
                        <div className="flex-1">
                          <div className="text-white font-medium">{checkout.documentName}</div>
                          <div className="text-sm text-white/60">
                            {checkout.status === 'checked-out' ? (
                              <span>🔒 Checked out by <span className="text-indigo-300">{checkout.userName}</span> on {checkout.checkoutDate}</span>
                            ) : (
                              <span>✅ Checked in by <span className="text-green-300">{checkout.userName}</span> on {checkout.checkinDate}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Analytics View */}
          {!loading && !error && checkoutViewMode === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Active Checkouts</div>
                  <div className="text-3xl font-bold text-white">
                    {checkouts.filter(c => c.status === 'checked-out').length}
                  </div>
                </div>
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Overdue</div>
                  <div className="text-3xl font-bold text-red-300">
                    {checkouts.filter(c => c.isOverdue).length}
                  </div>
                </div>
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Checked In Today</div>
                  <div className="text-3xl font-bold text-green-300">
                    {checkouts.filter(c => c.status === 'checked-in').length}
                  </div>
                </div>
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Avg Duration</div>
                  <div className="text-3xl font-bold text-white">1.2 days</div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-4">Checkout Activity by Department</h3>
                <div className="space-y-3">
                  {['Legal', 'Finance', 'Human Resources', 'IT', 'Marketing', 'Product'].map(dept => {
                    const deptCheckouts = checkouts.filter(c => c.userDepartment === dept);
                    const activeCount = deptCheckouts.filter(c => c.status === 'checked-out').length;
                    return (
                      <div key={dept} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-white font-medium">{dept}</div>
                        <div className="flex-1">
                          <div className="h-8 bg-white/10 rounded-lg overflow-hidden flex">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${checkouts.length > 0 ? (deptCheckouts.length / checkouts.length) * 100 : 0}%` }}
                            >
                              {deptCheckouts.length > 0 ? deptCheckouts.length : ''}
                            </div>
                          </div>
                        </div>
                        <div className="w-24 text-right">
                          <div className="text-sm text-white font-medium">{deptCheckouts.length} total</div>
                          <div className="text-xs text-amber-300">{activeCount} active</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-4">Most Checked Out Documents</h3>
                <div className="space-y-2">
                  {checkouts.slice(0, 5).map((checkout, index) => (
                    <div key={checkout.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="text-xl font-bold text-white/40">#{index + 1}</div>
                      <span className="text-2xl">{checkout.documentIcon}</span>
                      <div className="flex-1">
                        <div className="text-sm text-white font-medium">{checkout.documentName}</div>
                        <div className="text-xs text-white/60">{checkout.documentType}</div>
                      </div>
                      <div className="text-sm text-white/70">Version {checkout.version}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Checkout Details */}
        {selectedCheckout && checkoutViewMode !== 'analytics' && (
          <div className="w-96 border-l border-white/10">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{selectedCheckout.documentIcon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedCheckout.documentName}</h3>
                      <div className="text-sm text-white/60">{selectedCheckout.documentType}</div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedCheckout(null)} className="btn-glass p-2 text-sm">✕</button>
              </div>

              <div className="space-y-4">
                <div className="glass-panel p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-500/30 rounded-full flex items-center justify-center">
                      {selectedCheckout.userName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-medium">{selectedCheckout.userName}</div>
                      <div className="text-sm text-white/60">{selectedCheckout.userDepartment}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedCheckout.status === 'checked-out'
                      ? selectedCheckout.isOverdue
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                      : 'bg-green-500/20 text-green-300'
                  }`}>
                    {selectedCheckout.status === 'checked-out'
                      ? selectedCheckout.isOverdue ? '⚠️ Overdue' : '🔒 Checked Out'
                      : '✅ Checked In'
                    }
                  </span>
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-2">Checkout Details</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Version</span>
                      <span className="text-white">{selectedCheckout.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Checked Out</span>
                      <span className="text-white">{selectedCheckout.checkoutDate}</span>
                    </div>
                    {selectedCheckout.checkinDate && (
                      <div className="flex justify-between">
                        <span className="text-white/70">Checked In</span>
                        <span className="text-white">{selectedCheckout.checkinDate}</span>
                      </div>
                    )}
                    {selectedCheckout.dueDate && (
                      <div className="flex justify-between">
                        <span className="text-white/70">Due Date</span>
                        <span className={selectedCheckout.isOverdue ? 'text-red-300' : 'text-white'}>
                          {selectedCheckout.dueDate}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-white/70">Duration</span>
                      <span className="text-white">{selectedCheckout.duration}</span>
                    </div>
                    {selectedCheckout.lockExpiry && (
                      <div className="flex justify-between">
                        <span className="text-white/70">Lock Expiry</span>
                        <span className="text-white">{selectedCheckout.lockExpiry}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedCheckout.reason && (
                  <div>
                    <div className="text-xs text-white/60 mb-2">Reason</div>
                    <div className="p-3 bg-white/5 rounded text-sm text-white/80">{selectedCheckout.reason}</div>
                  </div>
                )}

                {selectedCheckout.status === 'checked-out' && (
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                      <span>📥</span>
                      Force Check In
                    </button>
                    <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                      <span>🔔</span>
                      Send Reminder
                    </button>
                    <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                      <span>⏰</span>
                      Extend Checkout
                    </button>
                    <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                      <span>📄</span>
                      View Document
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckInOutManager;
