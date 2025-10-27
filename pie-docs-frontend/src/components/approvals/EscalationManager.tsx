import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  escalateApproval
} from '@/store/slices/approvalsSlice';
import type {
  EscalationRule,
  EscalationChain,
} from '@/store/slices/approvalsSlice';

interface EscalationManagerProps {
  approvalId: string;
}

interface EscalationStatus {
  isOverdue: boolean;
  hoursOverdue: number;
  nextEscalationDate: Date | null;
  escalationLevel: number;
  escalationChain: string[];
  currentEscalator: string | null;
  autoEscalationEnabled: boolean;
}

const EscalationManager: React.FC<EscalationManagerProps> = ({ approvalId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { escalationConfig } = useSelector((state: RootState) => state.approvals);

  const [escalationStatus, setEscalationStatus] = useState<EscalationStatus>({
    isOverdue: false,
    hoursOverdue: 0,
    nextEscalationDate: null,
    escalationLevel: 0,
    escalationChain: ['manager1', 'director1', 'vp1', 'ceo'],
    currentEscalator: null,
    autoEscalationEnabled: true,
  });

  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [manualEscalationReason, setManualEscalationReason] = useState('');
  const [escalationHistory, setEscalationHistory] = useState([
    {
      id: '1',
      level: 1,
      escalatedBy: 'System',
      escalatedTo: 'Manager (Sarah Johnson)',
      reason: 'Automatic escalation - 48 hours overdue',
      timestamp: new Date('2025-01-14T16:00:00'),
      resolved: true,
    },
    {
      id: '2',
      level: 2,
      escalatedBy: 'Sarah Johnson',
      escalatedTo: 'Director (Mike Chen)',
      reason: 'Unable to approve - requires director level authorization',
      timestamp: new Date('2025-01-15T10:30:00'),
      resolved: false,
    },
  ]);

  const [reminders, setReminders] = useState([
    {
      id: '1',
      type: 'email',
      sentTo: 'john.doe@company.com',
      sentAt: new Date('2025-01-15T09:00:00'),
      status: 'delivered',
    },
    {
      id: '2',
      type: 'slack',
      sentTo: 'john.doe',
      sentAt: new Date('2025-01-15T12:00:00'),
      status: 'delivered',
    },
    {
      id: '3',
      type: 'email',
      sentTo: 'sarah.manager@company.com',
      sentAt: new Date('2025-01-15T15:00:00'),
      status: 'pending',
    },
  ]);

  const [escalationRules] = useState<EscalationRule[]>([
    {
      id: 'rule1',
      name: 'Standard Document Escalation',
      documentTypes: ['contract', 'policy'],
      timeoutDays: 2,
      escalationChain: ['manager', 'director', 'vp'],
      notificationFrequency: 'daily',
      isActive: true,
    },
    {
      id: 'rule2',
      name: 'High Value Contract Escalation',
      documentTypes: ['contract'],
      timeoutDays: 1,
      escalationChain: ['manager', 'director', 'vp', 'ceo'],
      notificationFrequency: 'immediate',
      isActive: true,
    },
  ]);

  const [escalationChains] = useState<EscalationChain[]>([
    {
      id: 'chain1',
      name: 'Standard Escalation Chain',
      escalators: ['manager1', 'director1', 'vp1'],
      finalApprover: 'ceo',
      autoApproveAfterDays: 7,
    },
    {
      id: 'chain2',
      name: 'Executive Escalation Chain',
      escalators: ['director1', 'vp1', 'ceo'],
      finalApprover: 'board',
      autoApproveAfterDays: null,
    },
  ]);

  useEffect(() => {
    // Simulate checking escalation status
    const checkEscalationStatus = () => {
      // Mock data - in real implementation, this would fetch from backend
      const deadline = new Date('2025-01-13T17:00:00'); // Example deadline
      const now = new Date();
      const hoursOverdue = Math.max(0, (now.getTime() - deadline.getTime()) / (1000 * 60 * 60));

      setEscalationStatus(prev => ({
        ...prev,
        isOverdue: hoursOverdue > 0,
        hoursOverdue: Math.floor(hoursOverdue),
        nextEscalationDate: hoursOverdue > 24 ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null,
      }));
    };

    checkEscalationStatus();
    const interval = setInterval(checkEscalationStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [approvalId]);

  const handleManualEscalation = async () => {
    if (!manualEscalationReason.trim()) {
      alert('Please provide a reason for manual escalation');
      return;
    }

    // Get current user from auth state
    const state = (window as any).__REDUX_STORE__?.getState();
    const userId = state?.auth?.user?.id;

    if (!userId) {
      alert('User not authenticated. Please log in again.');
      return;
    }

    try {
      await dispatch(escalateApproval({
        approvalId,
        userId,
        reason: manualEscalationReason,
      }));

      // Add to escalation history
      const newEscalation = {
        id: `escalation-${Date.now()}`,
        level: escalationStatus.escalationLevel + 1,
        escalatedBy: state?.auth?.user?.name || 'Current User',
        escalatedTo: 'Next in Chain',
        reason: manualEscalationReason,
        timestamp: new Date(),
        resolved: false,
      };

      setEscalationHistory(prev => [...prev, newEscalation]);
      setEscalationStatus(prev => ({
        ...prev,
        escalationLevel: prev.escalationLevel + 1,
      }));

      setShowEscalationModal(false);
      setManualEscalationReason('');
    } catch (error) {
      console.error('Failed to escalate approval:', error);
      alert('Failed to escalate approval. Please try again.');
    }
  };

  const sendReminder = async (type: 'email' | 'slack' | 'teams') => {
    // Mock implementation
    const newReminder = {
      id: `reminder-${Date.now()}`,
      type,
      sentTo: 'current.approver@company.com',
      sentAt: new Date(),
      status: 'pending' as const,
    };

    setReminders(prev => [...prev, newReminder]);

    // Simulate delivery after 2 seconds
    setTimeout(() => {
      setReminders(prev =>
        prev.map(r =>
          r.id === newReminder.id ? { ...r, status: 'delivered' as const } : r
        )
      );
    }, 2000);
  };

  const formatTimeOverdue = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours > 0 ? `${remainingHours} hour${remainingHours !== 1 ? 's' : ''}` : ''}`;
  };

  const getEscalationLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'text-green-600 bg-green-50';
      case 1: return 'text-yellow-600 bg-yellow-50';
      case 2: return 'text-orange-600 bg-orange-50';
      case 3: return 'text-red-600 bg-red-50';
      default: return 'text-purple-600 bg-purple-50';
    }
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>;
      case 'slack':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.5 2.5c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v4h-3.6v-4zm0 15c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8v-4h3.6v4z" />
        </svg>;
      case 'teams':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Escalation Status Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Escalation Status</h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEscalationLevelColor(escalationStatus.escalationLevel)}`}>
              Level {escalationStatus.escalationLevel}
            </span>
            {escalationStatus.isOverdue && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                Overdue
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="space-y-2 text-sm">
              {escalationStatus.isOverdue ? (
                <div className="flex items-center text-red-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Overdue by {formatTimeOverdue(escalationStatus.hoursOverdue)}</span>
                </div>
              ) : (
                <div className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>On track</span>
                </div>
              )}

              {escalationStatus.nextEscalationDate && (
                <p className="text-gray-600">
                  Next escalation: {escalationStatus.nextEscalationDate.toLocaleString()}
                </p>
              )}

              <p className="text-gray-600">
                Auto-escalation: {escalationStatus.autoEscalationEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowEscalationModal(true)}
              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              Manual Escalate
            </button>
            <div className="relative">
              <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
                Send Reminder
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10 hidden group-hover:block">
                <button
                  onClick={() => sendReminder('email')}
                  className="block w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Email
                </button>
                <button
                  onClick={() => sendReminder('slack')}
                  className="block w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Slack
                </button>
                <button
                  onClick={() => sendReminder('teams')}
                  className="block w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Teams
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escalation History */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">Escalation History</h4>

        {escalationHistory.length > 0 ? (
          <div className="space-y-3">
            {escalationHistory.map((escalation) => (
              <div key={escalation.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  escalation.resolved ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {escalation.level}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      Escalated to {escalation.escalatedTo}
                    </p>
                    <span className="text-xs text-gray-500">
                      {escalation.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    By: {escalation.escalatedBy}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {escalation.reason}
                  </p>
                  {escalation.resolved && (
                    <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full mt-2">
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No escalations yet</p>
        )}
      </div>

      {/* Reminder History */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">Recent Reminders</h4>

        {reminders.length > 0 ? (
          <div className="space-y-2">
            {reminders.slice(-5).map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <div className="text-gray-500">
                    {getReminderIcon(reminder.type)}
                  </div>
                  <span className="text-sm text-gray-700">
                    {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)} to {reminder.sentTo}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {reminder.sentAt.toLocaleString()}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    reminder.status === 'delivered'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {reminder.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No reminders sent</p>
        )}
      </div>

      {/* Manual Escalation Modal */}
      {showEscalationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Manual Escalation</h3>
                <button
                  onClick={() => setShowEscalationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escalation Reason (Required)
                  </label>
                  <textarea
                    value={manualEscalationReason}
                    onChange={(e) => setManualEscalationReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please explain why this approval needs to be escalated..."
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> This will escalate the approval to the next level in the chain and notify the escalated approver immediately.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowEscalationModal(false)}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManualEscalation}
                    disabled={!manualEscalationReason.trim()}
                    className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Escalate Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscalationManager;