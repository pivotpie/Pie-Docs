import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  fetchPendingApprovals,
  submitApprovalDecision,
} from '@/store/slices/approvalsSlice';
import type {
  ApprovalRequest
} from '@/store/slices/approvalsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';

const MobileApprovalInterface: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeApprovals, loading } = useSelector((state: RootState) => state.approvals);
  const { user } = useSelector((state: RootState) => state.auth);

  const [currentApprovalIndex, setCurrentApprovalIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'request_changes' | null>(null);
  const [comment, setComment] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineActions, setOfflineActions] = useState<any[]>([]);

  const pendingApprovals = activeApprovals.pending;
  const currentApproval = pendingApprovals[currentApprovalIndex];

  useEffect(() => {
    if (user) {
      dispatch(fetchPendingApprovals(user.id));
    }

    // Handle online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch, user]);

  // Sync offline actions when back online
  useEffect(() => {
    if (!isOffline && offlineActions.length > 0) {
      syncOfflineActions();
    }
  }, [isOffline, offlineActions]);

  const syncOfflineActions = async () => {
    try {
      for (const action of offlineActions) {
        await dispatch(submitApprovalDecision(action));
      }
      setOfflineActions([]);
    } catch (error) {
      console.error('Failed to sync offline actions:', error);
    }
  };

  const handleSwipe = (offset: number, velocity: number) => {
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    if (Math.abs(offset) > swipeThreshold || Math.abs(velocity) > velocityThreshold) {
      if (offset > 0 || velocity > 0) {
        // Swipe right - Approve
        handleQuickAction('approve');
        setSwipeDirection('right');
      } else {
        // Swipe left - Reject
        handleQuickAction('reject');
        setSwipeDirection('left');
      }
    }
  };

  const handleQuickAction = (action: 'approve' | 'reject' | 'request_changes') => {
    if (!currentApproval) return;

    if (action === 'request_changes' || (action === 'reject' && !comment)) {
      setSelectedAction(action);
      setShowCommentModal(true);
      return;
    }

    submitDecision(action, comment || `Quick ${action} from mobile`);
  };

  const submitDecision = async (action: 'approve' | 'reject' | 'request_changes', comments: string) => {
    if (!currentApproval) return;

    const decisionData = {
      approvalId: currentApproval.id,
      decision: action,
      comments,
      annotations: [],
    };

    try {
      if (isOffline) {
        // Store for later sync
        setOfflineActions(prev => [...prev, decisionData]);
      } else {
        await dispatch(submitApprovalDecision(decisionData));
      }

      // Move to next approval
      nextApproval();
      setComment('');
      setSelectedAction(null);
      setShowCommentModal(false);
    } catch (error) {
      console.error('Failed to submit decision:', error);
    }
  };

  const nextApproval = () => {
    if (currentApprovalIndex < pendingApprovals.length - 1) {
      setCurrentApprovalIndex(prev => prev + 1);
    }
    setSwipeDirection(null);
  };

  const previousApproval = () => {
    if (currentApprovalIndex > 0) {
      setCurrentApprovalIndex(prev => prev - 1);
    }
    setSwipeDirection(null);
  };

  const formatDeadline = (deadline: Date | null) => {
    if (!deadline) return 'No deadline';
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffHours = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 0) return 'Overdue';
    if (diffHours < 24) return `${diffHours}h left`;
    if (diffHours < 168) return `${Math.ceil(diffHours / 24)}d left`;
    return deadlineDate.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading.approvals) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approvals...</p>
        </div>
      </div>
    );
  }

  if (pendingApprovals.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">All caught up!</h3>
          <p className="mt-2 text-gray-500">No pending approvals at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Status Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-900">Approvals</h1>
            {isOffline && (
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                Offline
              </span>
            )}
            {offlineActions.length > 0 && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {offlineActions.length} pending sync
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {currentApprovalIndex + 1} of {pendingApprovals.length}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="h-1 bg-gray-200">
          <div
            className="h-1 bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentApprovalIndex + 1) / pendingApprovals.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {currentApproval && (
            <motion.div
              key={currentApproval.id}
              initial={{ x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: swipeDirection === 'left' ? -300 : 300, opacity: 0 }}
              transition={{ duration: 0.3 }}
              drag="x"
              dragConstraints={{ left: -100, right: 100 }}
              onDragEnd={(_, info: PanInfo) => handleSwipe(info.offset.x, info.velocity.x)}
              className="absolute inset-0 bg-white m-4 rounded-lg shadow-lg overflow-hidden"
            >
              {/* Document Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-medium text-gray-900 mb-1">
                      {currentApproval.documentTitle}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {currentApproval.documentType} • {currentApproval.requester.name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`w-3 h-3 rounded-full ${getPriorityColor(currentApproval.priority)}`}></span>
                    <span className="text-xs text-gray-500">
                      {formatDeadline(currentApproval.deadline)}
                    </span>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                  <span>Step {currentApproval.currentStep} of {currentApproval.totalSteps}</span>
                  {currentApproval.parallelApprovalRequired && (
                    <span className="text-blue-600">Parallel Approval</span>
                  )}
                </div>
              </div>

              {/* Document Preview */}
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Document Summary</h3>
                    <p className="text-sm text-gray-600">
                      This is a sample document preview optimized for mobile viewing.
                      In a real implementation, this would show the actual document
                      content with touch-friendly navigation and zoom capabilities.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Key Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="text-gray-900">{currentApproval.documentType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Priority:</span>
                        <span className="text-gray-900 capitalize">{currentApproval.priority}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Requester:</span>
                        <span className="text-gray-900">{currentApproval.requester.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swipe Instructions */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                    <span>Swipe left to reject</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span>Swipe right to approve</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={previousApproval}
            disabled={currentApprovalIndex === 0}
            className="p-3 rounded-full bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Action Menu
          </button>

          <button
            onClick={nextApproval}
            disabled={currentApprovalIndex === pendingApprovals.length - 1}
            className="p-3 rounded-full bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Quick Actions */}
        <AnimatePresence>
          {showQuickActions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-3 gap-3 overflow-hidden"
            >
              <button
                onClick={() => handleQuickAction('approve')}
                className="flex flex-col items-center justify-center h-20 bg-green-50 border-2 border-green-200 rounded-lg text-green-600 font-medium"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Approve</span>
              </button>

              <button
                onClick={() => handleQuickAction('request_changes')}
                className="flex flex-col items-center justify-center h-20 bg-purple-50 border-2 border-purple-200 rounded-lg text-purple-600 font-medium"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Changes</span>
              </button>

              <button
                onClick={() => handleQuickAction('reject')}
                className="flex flex-col items-center justify-center h-20 bg-red-50 border-2 border-red-200 rounded-lg text-red-600 font-medium"
              >
                <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Reject</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Comment Modal */}
      <AnimatePresence>
        {showCommentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full rounded-t-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedAction === 'reject' ? 'Rejection Reason' : 'Change Requests'}
                </h3>
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setSelectedAction(null);
                    setComment('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Provide detailed ${selectedAction === 'reject' ? 'rejection reasons' : 'change requests'}...`}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setSelectedAction(null);
                    setComment('');
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedAction && submitDecision(selectedAction, comment)}
                  disabled={!comment.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileApprovalInterface;