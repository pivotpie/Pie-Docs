import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  submitApprovalDecision,
  fetchApprovalHistory,
  fetchPendingApprovals,
  clearSelectedDocument,
  createSecureAuditLogEntry,
} from '@/store/slices/approvalsSlice';
import type { DocumentAnnotation } from '@/store/slices/approvalsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { sanitizeApprovalComment, sanitizeAnnotation, sanitizeWithValidation } from '@/utils/sanitization';

interface ApprovalActionsProps {
  requestId: string;  // This is the approval request ID, not document ID
  onClose: () => void;
}

const ApprovalActions: React.FC<ApprovalActionsProps> = ({ requestId, onClose }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { currentDocument, loading } = useSelector((state: RootState) => state.approvals);
  const { user } = useSelector((state: RootState) => state.auth);

  const [decision, setDecision] = useState<'approve' | 'reject' | 'request_changes' | null>(null);
  const [comments, setComments] = useState('');
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [showAnnotationTools, setShowAnnotationTools] = useState(false);
  const [annotationType, setAnnotationType] = useState<'comment' | 'highlight' | 'redaction'>('comment');
  const [isDrawing, setIsDrawing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const documentViewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const SUBMIT_DEBOUNCE_MS = 1000; // Prevent submissions within 1 second of each other

  useEffect(() => {
    // Prevent duplicate fetches
    if (!requestId || historyLoaded) {
      return;
    }

    // Cancel any in-flight requests
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    fetchAbortControllerRef.current = new AbortController();

    const fetchHistory = async () => {
      try {
        await dispatch(fetchApprovalHistory(requestId));
        setHistoryLoaded(true);
      } catch (error) {
        console.error('Failed to fetch approval history:', error);
      }
    };

    fetchHistory();

    // Cleanup function
    return () => {
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
    };
  }, [dispatch, requestId, historyLoaded]);

  const handleDecisionSelect = (selectedDecision: 'approve' | 'reject' | 'request_changes') => {
    setDecision(selectedDecision);
    setComments('');
  };

  const handleSubmitDecision = useCallback(async () => {
    // Debounce check - prevent rapid-fire clicks
    const now = Date.now();
    if (now - lastSubmitTimeRef.current < SUBMIT_DEBOUNCE_MS) {
      console.log('Submission debounced - please wait');
      return;
    }
    lastSubmitTimeRef.current = now;

    if (!decision || !comments.trim()) {
      alert('Please select a decision and provide comments');
      return;
    }

    if (!user?.id) {
      alert('User information not available. Please refresh and try again.');
      return;
    }

    // Prevent duplicate submissions
    if (submitting) {
      return;
    }

    // Validate and sanitize comments
    const { sanitized: sanitizedComments, isValid, errors } = sanitizeWithValidation(
      comments.trim(),
      2000, // Max 2000 characters
      { allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'] }
    );

    if (!isValid) {
      alert(`Comment validation failed: ${errors.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      // Submit the approval decision with userId
      await dispatch(submitApprovalDecision({
        approvalId: requestId, // Use the approval request ID
        userId: user.id,
        decision,
        comments: sanitizedComments,
        annotations,
      })).unwrap();

      // Create secure audit log entry with cryptographic integrity
      await dispatch(createSecureAuditLogEntry({
        userId: user.id,
        userName: user.name,
        action: `approval_${decision}`,
        documentId: currentDocument.documentId || requestId, // Use actual document ID from state
        approvalId: requestId, // Use the approval request ID
        details: {
          decision,
          commentsLength: sanitizedComments.length,
          annotationsCount: annotations.length,
          requestId: requestId
        }
      }));

      // Refresh the approval list to reflect the changes
      await dispatch(fetchPendingApprovals(user.id));

      onClose();
    } catch (error: any) {
      console.error('Failed to submit approval decision:', error);

      // Extract detailed error information
      let errorMessage = 'Failed to submit decision. Please try again.';

      if (error?.response?.data) {
        const errorData = error.response.data;

        // Handle validation errors (422)
        if (errorData.message && Array.isArray(errorData.message)) {
          errorMessage = 'Validation errors:\n' + errorData.message.map((msg: any) =>
            typeof msg === 'string' ? msg : JSON.stringify(msg)
          ).join('\n');
        } else if (errorData.detail) {
          // Handle detail array or string
          if (Array.isArray(errorData.detail)) {
            errorMessage = 'Validation errors:\n' + errorData.detail.map((item: any) =>
              item.msg || item.message || JSON.stringify(item)
            ).join('\n');
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [decision, comments, user, requestId, dispatch, onClose, submitting, annotations, currentDocument.documentId]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showAnnotationTools) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    if (annotationType === 'comment') {
      const comment = prompt('Enter your comment:');
      if (comment) {
        // Validate and sanitize annotation content
        const { sanitized: sanitizedContent, isValid, errors } = sanitizeWithValidation(
          comment,
          500, // Max 500 characters for annotations
          { allowedTags: ['b', 'i', 'em', 'strong'] }
        );

        if (!isValid) {
          alert(`Annotation validation failed: ${errors.join(', ')}`);
          return;
        }

        const newAnnotation: DocumentAnnotation = {
          id: `annotation-${Date.now()}`,
          pageNumber: 1, // This would be dynamic based on current page
          x,
          y,
          width: 20,
          height: 20,
          content: sanitizedContent,
          type: 'comment',
        };
        setAnnotations(prev => [...prev, newAnnotation]);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const removeAnnotation = (annotationId: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== annotationId));
  };

  const getDecisionColor = (decisionType: string) => {
    switch (decisionType) {
      case 'approve': return 'bg-green-600 hover:bg-green-700 border-green-600';
      case 'reject': return 'bg-red-600 hover:bg-red-700 border-red-600';
      case 'request_changes': return 'bg-purple-600 hover:bg-purple-700 border-purple-600';
      default: return 'bg-gray-300 border-gray-300 cursor-not-allowed';
    }
  };

  const getRequiredCommentsText = () => {
    switch (decision) {
      case 'approve': return 'Please explain why you approve this document:';
      case 'reject': return 'Please explain why you reject this document (required):';
      case 'request_changes': return 'Please specify what changes are needed (required):';
      default: return 'Comments:';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-card rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Review Document</h2>
              <p className="text-sm text-gray-500 mt-1">
                Make your approval decision and provide feedback
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex h-[calc(90vh-80px)]">
            {/* Document Viewer */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="relative">
                {/* Document Viewer Controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setShowAnnotationTools(!showAnnotationTools)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        showAnnotationTools
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'glass-panel text-white/90 border-white/20 hover:scale-105 transition-all duration-300'
                      }`}
                    >
                      {showAnnotationTools ? 'Hide' : 'Show'} Annotation Tools
                    </button>

                    {showAnnotationTools && (
                      <div className="flex items-center space-x-2">
                        {(['comment', 'highlight', 'redaction'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setAnnotationType(type)}
                            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                              annotationType === type
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'glass-panel text-white/90 border-white/20 hover:scale-105 transition-all duration-300'
                            }`}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>Page 1 of 1</span>
                    <button className="px-2 py-1 border border-white/20 glass-panel rounded hover:scale-105 transition-all duration-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Document Content Area */}
                <div
                  ref={documentViewerRef}
                  className="relative glass-card border border-white/10 rounded-lg min-h-[600px] p-8"
                >
                  {/* Mock Document Content */}
                  <div className="space-y-4 text-gray-900">
                    <h1 className="text-2xl font-bold">Sample Document for Approval</h1>
                    <p className="text-gray-600">
                      This is a sample document that requires approval. In a real implementation,
                      this would be the actual document content loaded from the document service.
                    </p>
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold">Document Details</h2>
                      <p>Document Type: Policy</p>
                      <p>Version: 1.0</p>
                      <p>Created: {new Date().toLocaleDateString()}</p>
                      <p>Last Modified: {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold">Content</h2>
                      <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
                        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
                        veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
                        commodo consequat.
                      </p>
                      <p>
                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
                        dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
                        proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                      </p>
                    </div>
                  </div>

                  {/* Annotation Canvas */}
                  {showAnnotationTools && (
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full cursor-crosshair"
                      onMouseDown={handleCanvasMouseDown}
                      onMouseUp={handleCanvasMouseUp}
                      style={{ pointerEvents: showAnnotationTools ? 'auto' : 'none' }}
                    />
                  )}

                  {/* Render Annotations */}
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="absolute bg-yellow-200 border border-yellow-300 rounded p-2 text-xs shadow-lg"
                      style={{
                        left: annotation.x,
                        top: annotation.y,
                        minWidth: annotation.width,
                        minHeight: annotation.height,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-gray-900">{annotation.content}</span>
                        <button
                          onClick={() => removeAnnotation(annotation.id)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Approval Actions Panel */}
            <div className="w-96 border-l border-white/10 p-6 glass-panel">
              <div className="space-y-6">
                {/* Decision Buttons */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Make Your Decision</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'approve', label: 'Approve', icon: '✓' },
                      { key: 'request_changes', label: 'Request Changes', icon: '⚠' },
                      { key: 'reject', label: 'Reject', icon: '✗' },
                    ].map(({ key, label, icon }) => (
                      <button
                        key={key}
                        onClick={() => handleDecisionSelect(key as any)}
                        className={`w-full flex items-center justify-center px-4 py-3 text-sm font-medium rounded-md border-2 transition-colors ${
                          decision === key
                            ? getDecisionColor(key)
                            : 'glass-panel text-white/90 border-white/20 hover:scale-105 transition-all duration-300'
                        } ${decision === key ? 'text-white' : ''}`}
                      >
                        <span className="mr-2">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments Section */}
                {decision && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                  >
                    <label className="block">
                      <span className="text-sm font-medium text-gray-900">
                        {getRequiredCommentsText()}
                      </span>
                      <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder={`Provide detailed ${decision === 'approve' ? 'approval reasoning' :
                                    decision === 'reject' ? 'rejection reasons' : 'change requests'}...`}
                        rows={6}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </label>
                    <p className="text-xs text-gray-500">
                      {decision === 'reject' || decision === 'request_changes'
                        ? 'Comments are required for this decision'
                        : 'Comments help provide context for your decision'}
                    </p>
                  </motion.div>
                )}

                {/* Annotations Summary */}
                {annotations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      Annotations ({annotations.length})
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {annotations.map((annotation) => (
                        <div
                          key={annotation.id}
                          className="flex items-start justify-between p-2 glass-panel rounded border border-white/10 text-xs"
                        >
                          <span className="flex-1">{annotation.content}</span>
                          <button
                            onClick={() => removeAnnotation(annotation.id)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="border-t border-gray-200 pt-6 space-y-3">
                  <button
                    onClick={handleSubmitDecision}
                    disabled={!decision || !comments.trim() || submitting}
                    className={`w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                      decision && comments.trim() && !submitting
                        ? getDecisionColor(decision!) + ' text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </div>
                    ) : (
                      `Submit ${decision ? decision.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Decision'}`
                    )}
                  </button>

                  <button
                    onClick={onClose}
                    disabled={submitting}
                    className={`w-full px-4 py-2 text-sm glass-panel border border-white/20 rounded-md hover:scale-105 transition-all duration-300 disabled:opacity-50 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}
                  >
                    Cancel
                  </button>
                </div>

                {/* Help Text */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>💡 <strong>Tip:</strong> Use annotation tools to highlight specific sections</p>
                  <p>📝 <strong>Note:</strong> All decisions are logged for audit purposes</p>
                  {decision === 'reject' && (
                    <p className="text-red-600">⚠️ <strong>Required:</strong> Detailed rejection reasons must be provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ApprovalActions;