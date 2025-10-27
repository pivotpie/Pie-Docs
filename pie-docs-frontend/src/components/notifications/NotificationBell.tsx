/**
 * Notification Bell Component
 * Displays unread notification count and shows notification dropdown
 */

import React, { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/contexts/ThemeContext';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, clearNotifications } = useNotifications();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (index: number) => {
    markAsRead(index);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'critical':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return theme === 'dark' ? 'text-gray-300' : 'text-gray-600';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_required':
        return '✅';
      case 'approval_decision':
        return '📋';
      case 'approval_escalated':
        return '⚠️';
      case 'changes_requested':
        return '📝';
      case 'deadline_approaching':
        return '⏰';
      case 'workflow_advanced':
        return '➡️';
      case 'bulk_action_completed':
        return '✔️';
      case 'approval_assigned':
        return '🔔';
      default:
        return '📬';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-all duration-200
          ${theme === 'dark'
            ? 'hover:bg-white/10 text-white'
            : 'hover:bg-gray-100 text-gray-700'
          }
        `}
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div
            className={`
              absolute right-0 mt-2 w-96 max-h-[600px] overflow-y-auto rounded-lg shadow-xl z-20
              ${theme === 'dark'
                ? 'bg-gray-800 border border-gray-700'
                : 'bg-white border border-gray-200'
              }
            `}
          >
            {/* Header */}
            <div className={`
              px-4 py-3 border-b flex items-center justify-between
              ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
            `}>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className={`
                    text-sm px-2 py-1 rounded transition-colors
                    ${theme === 'dark'
                      ? 'text-blue-400 hover:bg-blue-900/30'
                      : 'text-blue-600 hover:bg-blue-50'
                    }
                  `}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Notification List */}
            <div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                    No new notifications
                  </p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <div
                    key={index}
                    onClick={() => handleNotificationClick(index)}
                    className={`
                      px-4 py-3 border-b cursor-pointer transition-colors
                      ${theme === 'dark'
                        ? 'border-gray-700 hover:bg-gray-700/50'
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                      ${notification.data?.action_required ? 'bg-blue-500/10' : ''}
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`
                          font-medium text-sm mb-1
                          ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
                        `}>
                          {notification.data?.document_title || 'Notification'}
                        </p>

                        <p className={`
                          text-sm mb-2
                          ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
                        `}>
                          {getNotificationMessage(notification)}
                        </p>

                        {notification.data?.comments && (
                          <p className={`
                            text-xs italic mb-2
                            ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                          `}>
                            "{notification.data.comments}"
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className={`
                            text-xs
                            ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}
                          `}>
                            {formatTimestamp(notification.timestamp)}
                          </span>

                          {notification.data?.priority && (
                            <span className={`
                              text-xs font-medium px-2 py-0.5 rounded
                              ${getPriorityColor(notification.data.priority)}
                            `}>
                              {notification.data.priority.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Helper to get notification message
function getNotificationMessage(notification: any): string {
  const { type, data } = notification;

  switch (type) {
    case 'approval_required':
      return 'Your approval is required';
    case 'approval_decision':
      return `Document ${data.decision}`;
    case 'approval_escalated':
      return 'Approval has been escalated';
    case 'changes_requested':
      return `Changes requested by ${data.requested_by}`;
    case 'deadline_approaching':
      return `Deadline in ${data.hours_remaining} hours`;
    case 'workflow_advanced':
      return `Advanced to step ${data.current_step} of ${data.total_steps}`;
    case 'bulk_action_completed':
      return `${data.succeeded_count}/${data.total_count} ${data.action}(s) successful`;
    case 'approval_assigned':
      return `Assigned by ${data.assigned_by}`;
    default:
      return 'New notification';
  }
}

export default NotificationBell;
