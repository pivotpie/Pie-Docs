import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { checkinoutService } from '@/services/api/checkinoutService';
import type { CheckoutStatusResponse } from '@/services/api/checkinoutService';
import { approvalsApi } from '@/services/api/approvalsService';
import type { ApprovalChain } from '@/services/api/approvalsService';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

interface CheckoutRecord {
  id: string;
  user_name?: string;
  status?: string;
  checkout_date?: string;
  checkin_date?: string;
  reason?: string;
}

interface ApprovalRequest {
  id: string;
  status: string;
  created_at?: string;
  metadata?: {
    type?: string;
    [key: string]: any;
  };
}

export const CheckInOutTool: React.FC<DocumentToolProps> = ({ document, onBack }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [checkoutHistory, setCheckoutHistory] = useState<CheckoutRecord[]>([]);
  const [currentStatus, setCurrentStatus] = useState<CheckoutStatusResponse | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadCheckOutData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Load checkout status
      const status = await checkinoutService.getCheckoutStatus(document.id);
      setCurrentStatus(status);

      // Check for pending approval requests for this document
      try {
        const approvalRequests = await approvalsApi.listRequests({
          document_id: document.id,
          status: 'pending',
        });

        // Find checkout approval request
        const checkoutApproval = approvalRequests.requests?.find(
          (req) => req.metadata?.type === 'document_checkout' && req.status === 'pending'
        ) as ApprovalRequest | undefined;
        setPendingApproval(checkoutApproval || null);
      } catch (approvalErr) {
        console.warn('Failed to load approval requests:', approvalErr);
        setPendingApproval(null);
      }

      // Load checkout history using audit trail
      try {
        const auditTrail = await checkinoutService.getAuditTrail(document.id);
        setCheckoutHistory((auditTrail as CheckoutRecord[]) || []);
      } catch (historyErr) {
        console.warn('Failed to load checkout history:', historyErr);
        setCheckoutHistory([]);
      }
    } catch (err) {
      console.error('Failed to load check-in/out data:', err);
      setError('Failed to load checkout information');
    } finally {
      setIsLoading(false);
    }
  }, [document.id]);

  useEffect(() => {
    loadCheckOutData();
  }, [loadCheckOutData]);

  const handleCheckOut = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      console.log('=== CHECKOUT REQUEST START ===');
      console.log('Document ID:', document.id);
      console.log('Document name:', document.name);
      console.log('Document type:', document.document_type || document.type);

      // Try to auto-route to find appropriate approval chain
      console.log('Step 1: Auto-routing...');
      const routingPayload = {
        document_id: document.id,
        document_type: document.document_type || document.type,
        action_type: 'document_checkout',
        mime_type: document.mime_type,
      };
      console.log('Auto-route payload:', JSON.stringify(routingPayload, null, 2));

      const routingResult = await approvalsApi.autoRoute(routingPayload);
      console.log('Auto-route result:', JSON.stringify(routingResult, null, 2));

      let chainId = routingResult.chain_id;

      // If no chain found via auto-route, try to find a default checkout approval chain
      if (!chainId) {
        console.log('Step 2: No auto-route match, fetching available chains...');
        const chains = await approvalsApi.listChains(true); // Get active chains
        console.log('Available chains:', chains.length);

        const checkoutChain = chains.find(
          (chain: ApprovalChain) => chain.name.toLowerCase().includes('checkout') ||
          chain.name.toLowerCase().includes('check-out')
        );

        if (checkoutChain) {
          chainId = checkoutChain.id;
          console.log('Found checkout chain:', checkoutChain.name, 'ID:', chainId);
        } else if (chains.length > 0) {
          // Use first available chain as fallback
          chainId = chains[0].id;
          console.warn('No checkout-specific chain found, using default chain:', chains[0].name);
        } else {
          console.error('No approval chains available');
          throw new Error('No approval chains configured. Please contact your administrator.');
        }
      } else {
        console.log('Step 2: Auto-route found chain ID:', chainId);
      }

      // Create approval request
      console.log('Step 3: Creating approval request...');
      const requestPayload = {
        document_id: document.id,
        chain_id: chainId,
        requester_id: user?.id || null, // Add requester ID for checkout tracking
        priority: 'medium',
        metadata: {
          type: 'document_checkout',
          document_name: document.name,
          document_type: document.document_type || document.type,
          requested_at: new Date().toISOString(),
          requester_note: 'User checkout request via document tools',
        },
      };
      console.log('Create request payload:', JSON.stringify(requestPayload, null, 2));

      const approvalRequest = await approvalsApi.createRequest(requestPayload);

      console.log('Step 4: Approval request created successfully!');
      console.log('Request ID:', approvalRequest.id);
      console.log('=== CHECKOUT REQUEST SUCCESS ===');

      setSuccessMessage(
        '✅ Checkout approval request submitted successfully! ' +
        'A manager will review your request. You can track it in the Approvals section.'
      );

      // Reload data to show pending approval
      await loadCheckOutData();
    } catch (err) {
      console.error('=== CHECKOUT REQUEST FAILED ===');
      console.error('Error type:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Full error object:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to submit checkout request. Please try again.'
      );
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      console.log('Checking in document:', document.id);
      // First, get the active checkout record ID from the audit trail or status
      const records = await checkinoutService.listCheckoutRecords({
        status_filter: 'checked-out',
        page: 1,
        page_size: 100,
      });

      // Find the checkout record for this document
      interface CheckoutRecordWithDocId {
        id: string;
        document_id: string;
        is_active: boolean;
      }

      const activeCheckout = records.records.find(
        (record) => {
          const typedRecord = record as unknown as CheckoutRecordWithDocId;
          return typedRecord.document_id === document.id && typedRecord.is_active;
        }
      ) as CheckoutRecordWithDocId | undefined;

      if (!activeCheckout) {
        throw new Error('No active checkout found for this document');
      }

      console.log('Found active checkout:', activeCheckout.id);
      await checkinoutService.checkinDocument({
        checkout_record_id: activeCheckout.id,
        checkin_notes: 'User checkin via document tools',
      });
      console.log('Checkin successful, reloading data...');
      setSuccessMessage('✅ Document checked in successfully!');
      // Reload data instead of refreshing the entire page
      await loadCheckOutData();
    } catch (err) {
      console.error('Failed to check in document:', err);
      setError(err instanceof Error ? err.message : 'Failed to check in document. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingApproval) return;

    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to cancel this checkout request?')) {
      return;
    }

    try {
      setIsLoading(true);
      await approvalsApi.cancelRequest(pendingApproval.id);
      setSuccessMessage('Checkout request cancelled successfully.');
      await loadCheckOutData();
    } catch (err) {
      console.error('Failed to cancel request:', err);
      setError('Failed to cancel request. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ToolPageLayout title="Check-In / Check-Out" icon="🛒" onBack={onBack}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout title="Check-In / Check-Out" icon="🛒" onBack={onBack}>
      <div className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
            <p className="text-green-600 dark:text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Pending Approval Status */}
        {pendingApproval && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-400">⏳ Pending Approval</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your checkout request is awaiting manager approval.
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Request ID: {pendingApproval.id}
                </p>
                {pendingApproval.created_at && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Submitted: {new Date(pendingApproval.created_at).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleCancelRequest}
                className="ml-4 px-3 py-1 text-sm bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors"
              >
                Cancel Request
              </button>
            </div>
          </div>
        )}

        {/* Current Status */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
          <h3 className="font-semibold mb-2  text-white">Current Status</h3>
          {currentStatus?.is_checked_out ? (
            <div>
              <p className="text-red-600 dark:text-red-400 font-medium">🔒 Checked Out</p>
              <p className="text-sm mt-1">By: {currentStatus.checked_out_by || 'Unknown User'}</p>
              {currentStatus.checkout_date && (
                <p className="text-sm">Since: {new Date(currentStatus.checkout_date).toLocaleString()}</p>
              )}
              {currentStatus.due_date && (
                <p className="text-sm">Due: {new Date(currentStatus.due_date).toLocaleString()}</p>
              )}
              {currentStatus.is_overdue && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ OVERDUE</p>
              )}
              <button
                onClick={handleCheckIn}
                className="mt-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Check In
              </button>
            </div>
          ) : pendingApproval ? (
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 font-medium">⏳ Approval Pending</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cannot request checkout while approval is pending
              </p>
            </div>
          ) : (
            <div>
              <p className="text-green-600 dark:text-green-400 font-medium">✅ Available</p>
              <button
                onClick={handleCheckOut}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Request Checkout
              </button>
            </div>
          )}
        </div>

        {/* Checkout History */}
        <div>
          <h3 className="font-semibold mb-3 text-white">Checkout History</h3>
          {checkoutHistory.length > 0 ? (
            <div className="space-y-2">
              {checkoutHistory.map((record, index) => (
                <div key={record.id || index} className="p-3 bg-gray-50 dark:bg-gray-800 border rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="font-medium">{record.user_name || 'Unknown User'}</span>
                      {record.status && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                          record.status === 'checked-out' ? 'bg-red-500/20 text-red-400' :
                          record.status === 'checked-in' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {record.status}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {record.checkout_date ? new Date(record.checkout_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  {record.checkin_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Returned: {new Date(record.checkin_date).toLocaleString()}
                    </p>
                  )}
                  {record.reason && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                      {record.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No checkout history available</p>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
};
