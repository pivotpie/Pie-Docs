/**
 * React hook for real-time notifications via WebSocket
 */

import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { notificationWebSocket } from '@/services/websocket/notificationWebSocket';

export interface Notification {
  type: string;
  timestamp: string;
  data: any;
}

export const useNotifications = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Handle incoming notifications
  const handleNotification = useCallback((notification: Notification) => {
    console.log('New notification received:', notification);

    // Add to notifications list
    setNotifications(prev => [notification, ...prev]);

    // Increment unread count for actionable notifications
    if (notification.data?.action_required) {
      setUnreadCount(prev => prev + 1);
    }

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = getNotificationTitle(notification.type);
      const body = getNotificationBody(notification);

      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: notification.data?.approval_request_id || notification.type
      });
    }
  }, []);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user && user.id) {
      console.log('Connecting to notification WebSocket...');
      notificationWebSocket.connect(user.id);
      setIsConnected(true);

      // Subscribe to notifications
      const unsubscribe = notificationWebSocket.subscribe(handleNotification);

      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Cleanup on unmount
      return () => {
        unsubscribe();
        notificationWebSocket.disconnect();
        setIsConnected(false);
      };
    }
  }, [user, handleNotification]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    clearNotifications,
    markAsRead
  };
};

// Helper function to get notification title
function getNotificationTitle(type: string): string {
  switch (type) {
    case 'approval_required':
      return 'Approval Required';
    case 'approval_decision':
      return 'Approval Decision';
    case 'approval_escalated':
      return 'Approval Escalated';
    case 'changes_requested':
      return 'Changes Requested';
    case 'deadline_approaching':
      return 'Deadline Approaching';
    case 'workflow_advanced':
      return 'Workflow Advanced';
    case 'bulk_action_completed':
      return 'Bulk Action Completed';
    case 'approval_assigned':
      return 'New Approval Assigned';
    default:
      return 'Notification';
  }
}

// Helper function to get notification body
function getNotificationBody(notification: Notification): string {
  const { data } = notification;

  switch (notification.type) {
    case 'approval_required':
      return `Your approval is required for "${data.document_title}"`;
    case 'approval_decision':
      return `"${data.document_title}" has been ${data.decision}`;
    case 'approval_escalated':
      return `"${data.document_title}" has been escalated`;
    case 'changes_requested':
      return `Changes requested for "${data.document_title}"`;
    case 'deadline_approaching':
      return `Deadline for "${data.document_title}" is in ${data.hours_remaining} hours`;
    case 'workflow_advanced':
      return `"${data.document_title}" advanced to step ${data.current_step}`;
    case 'bulk_action_completed':
      return `Bulk ${data.action} completed: ${data.succeeded_count}/${data.total_count} successful`;
    case 'approval_assigned':
      return `You've been assigned to approve "${data.document_title}"`;
    default:
      return 'New notification received';
  }
}

export default useNotifications;
