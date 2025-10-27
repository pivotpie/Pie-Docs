import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { RootState, AppDispatch } from '@/store';
import {
  fetchPendingApprovals,
  setSelectedDocument,
  bulkApprovalAction,
} from '@/store/slices/approvalsSlice';
import type {
  ApprovalRequest
} from '@/store/slices/approvalsSlice';
import ApprovalActions from '@/components/approvals/ApprovalActions';
import ApprovalHistory from '@/components/approvals/ApprovalHistory';
import ParallelApprovals from '@/components/approvals/ParallelApprovals';
import EscalationManager from '@/components/approvals/EscalationManager';
import MobileApprovalInterface from '@/components/approvals/MobileApprovalInterface';
import RoutingEngine from '@/components/approvals/RoutingEngine';

const ApprovalInterface: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeApprovals, loading, currentDocument } = useSelector((state: RootState) => state.approvals);
  const { user } = useSelector((state: RootState) => state.auth);

  const [view, setView] = useState<'pending' | 'in_progress' | 'completed' | 'escalated'>('pending');
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDocumentType, setFilterDocumentType] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [showApprovalHistory, setShowApprovalHistory] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL params
  const activeTab = searchParams.get('tab') || 'pending';

  // Tab navigation handler
  const handleTabChange = useCallback((tab: string) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  const tabs = [
    { id: 'pending', label: 'Pending Approvals', icon: '⏳' },
    { id: 'routing', label: 'Approval Routing', icon: '🔀' },
    { id: 'escalation', label: 'Escalation Management', icon: '⚠️' },
    { id: 'parallel', label: 'Parallel Approvals', icon: '↔' },
    { id: 'mobile', label: 'Mobile Interface', icon: '📱' },
    { id: 'history', label: 'Approval History', icon: '📋' },
  ];

  useEffect(() => {
    if (user) {
      dispatch(fetchPendingApprovals(user.id));
    }
  }, [dispatch, user]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const allApprovals = activeApprovals[view] || [];

  const filteredApprovals = allApprovals.filter(approval => {
    const matchesSearch = approval.documentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.requester.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || approval.priority === filterPriority;
    const matchesDocType = filterDocumentType === 'all' || approval.documentType === filterDocumentType;

    return matchesSearch && matchesPriority && matchesDocType;
  });

  const handleApprovalSelection = (approvalId: string, selected: boolean) => {
    if (selected) {
      setSelectedApprovals(prev => [...prev, approvalId]);
    } else {
      setSelectedApprovals(prev => prev.filter(id => id !== approvalId));
    }
  };

  const handleSelectAll = () => {
    if (selectedApprovals.length === filteredApprovals.length) {
      setSelectedApprovals([]);
    } else {
      setSelectedApprovals(filteredApprovals.map(approval => approval.id));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'request_changes') => {
    if (selectedApprovals.length === 0) return;

    setBulkOperationInProgress(true);
    try {
      await dispatch(bulkApprovalAction({
        approvalIds: selectedApprovals,
        action,
        comments: `Bulk ${action} action performed`,
      }));

      // Refresh the approval list after successful bulk action
      if (user) {
        await dispatch(fetchPendingApprovals(user.id));
      }

      setSelectedApprovals([]);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleDocumentSelect = (approval: ApprovalRequest) => {
    // Store the approval request ID, not the document ID
    dispatch(setSelectedDocument(approval.id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'changes_requested': return 'text-purple-600 bg-purple-50';
      case 'escalated': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDeadline = (deadline: Date | null) => {
    if (!deadline) return 'No deadline';
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffHours = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 0) return 'Overdue';
    if (diffHours < 24) return `${diffHours}h remaining`;
    if (diffHours < 168) return `${Math.ceil(diffHours / 24)}d remaining`;
    return deadlineDate.toLocaleDateString();
  };

  if (isMobile) {
    return <MobileApprovalInterface />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Document Approvals</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and track document approval workflows
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['pending', 'in_progress', 'completed', 'escalated'] as const).map((viewOption) => (
                <button
                  key={viewOption}
                  onClick={() => setView(viewOption)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    view === viewOption
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {viewOption.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {allApprovals.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Bulk Actions */}
            {selectedApprovals.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {selectedApprovals.length} selected
                </span>
                <button
                  onClick={() => handleBulkAction('approve')}
                  disabled={bulkOperationInProgress}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Bulk Approve
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  disabled={bulkOperationInProgress}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Bulk Reject
                </button>
                <button
                  onClick={() => setSelectedApprovals([])}
                  className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search documents, requesters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterDocumentType}
            onChange={(e) => setFilterDocumentType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Document Types</option>
            <option value="contract">Contract</option>
            <option value="policy">Policy</option>
            <option value="procedure">Procedure</option>
            <option value="report">Report</option>
            <option value="proposal">Proposal</option>
          </select>

          <button
            onClick={() => setShowApprovalHistory(!showApprovalHistory)}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showApprovalHistory ? 'Hide' : 'Show'} History
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className={`flex-1 ${showApprovalHistory ? 'w-2/3' : 'w-full'}`}>
          {/* Approval List */}
          <div className="p-6">
            {loading.approvals ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredApprovals.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No approvals found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || filterPriority !== 'all' || filterDocumentType !== 'all'
                    ? 'Try adjusting your filters'
                    : `No ${view} approvals at this time`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select All */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedApprovals.length === filteredApprovals.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Select all ({filteredApprovals.length})
                    </span>
                  </label>
                </div>

                {/* Approval Cards */}
                {filteredApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className={`bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors ${
                      selectedApprovals.includes(approval.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedApprovals.includes(approval.id)}
                          onChange={(e) => handleApprovalSelection(approval.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                        />

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 mb-1">
                                {approval.documentTitle}
                              </h3>
                              <p className="text-sm text-gray-500">
                                Requested by {approval.requester.name} • {approval.documentType}
                              </p>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(approval.priority)}`}>
                                {approval.priority}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(approval.status)}`}>
                                {approval.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Step {approval.currentStep} of {approval.totalSteps}</span>
                              <span>•</span>
                              <span>{formatDeadline(approval.deadline)}</span>
                              {approval.parallelApprovalRequired && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-600">Parallel Approval</span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleDocumentSelect(approval)}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                              >
                                Review Document
                              </button>

                              {approval.parallelApprovalRequired && (
                                <ParallelApprovals approvalId={approval.id} />
                              )}

                              {view === 'pending' && (
                                <EscalationManager approvalId={approval.id} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Approval History Sidebar */}
        {showApprovalHistory && (
          <div className="w-1/3 border-l border-gray-200 bg-white">
            <ApprovalHistory />
          </div>
        )}
      </div>

      {/* Document Approval Modal */}
      {currentDocument.selectedRequestId && (
        <ApprovalActions
          requestId={currentDocument.selectedRequestId}
          onClose={() => dispatch(setSelectedDocument(''))}
        />
      )}
    </div>
  );
};

export default ApprovalInterface;