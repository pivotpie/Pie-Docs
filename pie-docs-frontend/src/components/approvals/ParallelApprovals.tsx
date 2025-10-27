import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  updateParallelApprovalStatus
} from '@/store/slices/approvalsSlice';
import type {
  ParallelApprovalStatus
} from '@/store/slices/approvalsSlice';

interface ParallelApprovalsProps {
  approvalId: string;
}

interface Approver {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  weight?: number;
  decidedAt?: Date;
  comments?: string;
}

const ParallelApprovals: React.FC<ParallelApprovalsProps> = ({ approvalId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentDocument } = useSelector((state: RootState) => state.approvals);

  const [approvers, setApprovers] = useState<Approver[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@company.com',
      department: 'Legal',
      role: 'Legal Counsel',
      status: 'approved',
      weight: 1,
      decidedAt: new Date('2025-01-15T10:30:00'),
      comments: 'Legal review completed. No issues found.',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      department: 'Finance',
      role: 'CFO',
      status: 'pending',
      weight: 2,
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike.chen@company.com',
      department: 'Operations',
      role: 'VP Operations',
      status: 'rejected',
      weight: 1,
      decidedAt: new Date('2025-01-15T14:20:00'),
      comments: 'Budget allocation concerns. Need revision on Q3 projections.',
    },
    {
      id: '4',
      name: 'Lisa Williams',
      email: 'lisa.williams@company.com',
      department: 'HR',
      role: 'HR Director',
      status: 'changes_requested',
      weight: 1,
      decidedAt: new Date('2025-01-15T16:45:00'),
      comments: 'Please clarify employee impact section and add training requirements.',
    },
  ]);

  const [consensusType, setConsensusType] = useState<'unanimous' | 'majority' | 'weighted' | 'any'>('majority');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<Approver | null>(null);

  const parallelStatus = currentDocument.parallelApprovals;

  useEffect(() => {
    // Update parallel approval status based on current approver states
    updateStatus();
  }, [approvers, consensusType]);

  const updateStatus = () => {
    const approved = approvers.filter(a => a.status === 'approved').length;
    const rejected = approvers.filter(a => a.status === 'rejected').length;
    const changesRequested = approvers.filter(a => a.status === 'changes_requested').length;
    const pending = approvers.filter(a => a.status === 'pending');

    const consensus = checkConsensus();

    // Update Redux state
    dispatch(updateParallelApprovalStatus({
      approvalId,
      userId: 'system', // This would be the current user making the decision
      decision: consensus?.decision || 'approve',
    }));
  };

  const checkConsensus = (): { reached: boolean; decision: 'approve' | 'reject' | 'request_changes' } | null => {
    const total = approvers.length;
    const approved = approvers.filter(a => a.status === 'approved');
    const rejected = approvers.filter(a => a.status === 'rejected');
    const changesRequested = approvers.filter(a => a.status === 'changes_requested');
    const pending = approvers.filter(a => a.status === 'pending');

    switch (consensusType) {
      case 'unanimous':
        if (rejected.length > 0 || changesRequested.length > 0) {
          return { reached: true, decision: rejected.length > 0 ? 'reject' : 'request_changes' };
        }
        if (approved.length === total) {
          return { reached: true, decision: 'approve' };
        }
        break;

      case 'majority':
        const majority = Math.ceil(total / 2);
        if (approved.length >= majority) {
          return { reached: true, decision: 'approve' };
        }
        if (rejected.length >= majority) {
          return { reached: true, decision: 'reject' };
        }
        if (changesRequested.length >= majority) {
          return { reached: true, decision: 'request_changes' };
        }
        break;

      case 'weighted':
        const totalWeight = approvers.reduce((sum, a) => sum + (a.weight || 1), 0);
        const approvedWeight = approved.reduce((sum, a) => sum + (a.weight || 1), 0);
        const rejectedWeight = rejected.reduce((sum, a) => sum + (a.weight || 1), 0);
        const changesWeight = changesRequested.reduce((sum, a) => sum + (a.weight || 1), 0);

        const weightMajority = totalWeight / 2;
        if (approvedWeight > weightMajority) {
          return { reached: true, decision: 'approve' };
        }
        if (rejectedWeight > weightMajority) {
          return { reached: true, decision: 'reject' };
        }
        if (changesWeight > weightMajority) {
          return { reached: true, decision: 'request_changes' };
        }
        break;

      case 'any':
        if (approved.length > 0) {
          return { reached: true, decision: 'approve' };
        }
        if (rejected.length > 0) {
          return { reached: true, decision: 'reject' };
        }
        if (changesRequested.length > 0) {
          return { reached: true, decision: 'request_changes' };
        }
        break;
    }

    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'changes_requested': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>;
      case 'rejected':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>;
      case 'changes_requested':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>;
      case 'pending':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>;
      default:
        return null;
    }
  };

  const calculateProgress = () => {
    const decided = approvers.filter(a => a.status !== 'pending').length;
    return (decided / approvers.length) * 100;
  };

  const consensus = checkConsensus();
  const progress = calculateProgress();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Parallel Approval Status</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Consensus:</span>
          <select
            value={consensusType}
            onChange={(e) => setConsensusType(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="unanimous">Unanimous</option>
            <option value="majority">Majority</option>
            <option value="weighted">Weighted</option>
            <option value="any">Any One</option>
          </select>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progress: {Math.round(progress)}%</span>
          <span>{approvers.filter(a => a.status !== 'pending').length} of {approvers.length} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Consensus Status */}
      {consensus && (
        <div className={`p-3 rounded-md border mb-4 ${
          consensus.decision === 'approve'
            ? 'bg-green-50 border-green-200 text-green-800'
            : consensus.decision === 'reject'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-purple-50 border-purple-200 text-purple-800'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {getStatusIcon(consensus.decision === 'approve' ? 'approved' :
                           consensus.decision === 'reject' ? 'rejected' : 'changes_requested')}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                Consensus Reached: {consensus.decision.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p className="text-xs opacity-75">
                Based on {consensusType} consensus requirement
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approvers List */}
      <div className="space-y-3">
        {approvers.map((approver) => (
          <div
            key={approver.id}
            className={`flex items-center justify-between p-3 rounded-md border ${getStatusColor(approver.status)}`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {getStatusIcon(approver.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{approver.name}</p>
                  {consensusType === 'weighted' && approver.weight && (
                    <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                      Weight: {approver.weight}
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-75">{approver.role} • {approver.department}</p>
                {approver.decidedAt && (
                  <p className="text-xs opacity-75">
                    Decided: {approver.decidedAt.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(approver.status)}`}>
                {approver.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              {approver.comments && (
                <button
                  onClick={() => {
                    setSelectedApprover(approver);
                    setShowDetailsModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="View comments"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Consensus Requirements Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Consensus Requirements</h4>
        <div className="text-xs text-gray-600 space-y-1">
          {consensusType === 'unanimous' && (
            <p>• All approvers must approve for the document to be approved</p>
          )}
          {consensusType === 'majority' && (
            <p>• More than half of the approvers must agree for a decision</p>
          )}
          {consensusType === 'weighted' && (
            <p>• Decisions are weighted by approver importance/role weight</p>
          )}
          {consensusType === 'any' && (
            <p>• Any single approver decision determines the outcome</p>
          )}
        </div>
      </div>

      {/* Comments Modal */}
      {showDetailsModal && selectedApprover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedApprover.name}'s Feedback
                </h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedApprover(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">Decision:</span>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedApprover.status)}`}>
                    {selectedApprover.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>

                {selectedApprover.decidedAt && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Date:</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {selectedApprover.decidedAt.toLocaleString()}
                    </span>
                  </div>
                )}

                {selectedApprover.comments && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Comments:</span>
                    <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {selectedApprover.comments}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParallelApprovals;