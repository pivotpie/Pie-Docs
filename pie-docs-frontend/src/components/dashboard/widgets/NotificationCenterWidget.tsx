import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';
import type { DashboardData } from '@/contexts/DashboardDataContext';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'document' | 'workflow' | 'system' | 'security' | 'user' | 'approval';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: {
    documentId?: string;
    workflowId?: string;
    userId?: string;
    count?: number;
  };
}

interface NotificationCenterWidgetProps extends WidgetProps {
  maxNotifications?: number;
  autoMarkAsRead?: boolean;
  showCategories?: boolean;
  realTimeUpdates?: boolean;
  data?: DashboardData | null;
}

const NotificationCenterWidget: React.FC<NotificationCenterWidgetProps> = ({
  maxNotifications = 10,
  autoMarkAsRead = false,
  showCategories = true,
  realTimeUpdates = true,
  data,
  ...widgetProps
}) => {
  const { t } = useTranslation('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastUpdateRef = useRef<Date>(new Date());

  // Mock notification generation
  useEffect(() => {
    const generateNotifications = (): Notification[] => {
      const notificationTypes: Array<{ type: Notification['type'], priority: Notification['priority'], category: Notification['category'] }> = [
        { type: 'info', priority: 'normal', category: 'document' },
        { type: 'success', priority: 'normal', category: 'workflow' },
        { type: 'warning', priority: 'high', category: 'system' },
        { type: 'error', priority: 'urgent', category: 'security' },
        { type: 'system', priority: 'low', category: 'system' }
      ];

      const messages = [
        {
          title: 'Document Processing Complete',
          message: 'Invoice #INV-2024-001 has been successfully processed and indexed.',
          category: 'document',
          actionLabel: 'View Document',
          actionUrl: '/documents/inv-2024-001'
        },
        {
          title: 'OCR Failed',
          message: 'Unable to extract text from scanned document. Manual review required.',
          category: 'document',
          actionLabel: 'Review Document',
          actionUrl: '/documents/failed'
        },
        {
          title: 'Workflow Approval Pending',
          message: 'Contract workflow is waiting for your approval.',
          category: 'approval',
          actionLabel: 'Review & Approve',
          actionUrl: '/approvals/pending'
        },
        {
          title: 'Storage Space Warning',
          message: 'System storage is 85% full. Consider archiving older documents.',
          category: 'system',
          actionLabel: 'Manage Storage',
          actionUrl: '/admin/storage'
        },
        {
          title: 'Security Alert',
          message: 'Unusual login activity detected from new location.',
          category: 'security',
          actionLabel: 'Review Activity',
          actionUrl: '/security/activity'
        },
        {
          title: 'Bulk Upload Complete',
          message: '145 documents have been successfully uploaded and are processing.',
          category: 'document',
          actionLabel: 'View Progress',
          actionUrl: '/uploads/batch-001'
        },
        {
          title: 'System Maintenance',
          message: 'Scheduled maintenance will begin at 2:00 AM EST tonight.',
          category: 'system',
          actionLabel: 'View Details',
          actionUrl: '/admin/maintenance'
        },
        {
          title: 'New User Registration',
          message: 'Sarah Johnson has joined your organization.',
          category: 'user',
          actionLabel: 'View Profile',
          actionUrl: '/users/sarah-johnson'
        }
      ];

      return messages.slice(0, Math.floor(Math.random() * 8) + 5).map((msg, index) => {
        const notifType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        const timestamp = new Date(Date.now() - Math.random() * 86400000 * 7); // Last 7 days

        return {
          id: `notif-${index}-${Date.now()}`,
          type: msg.category === 'security' ? 'error' : msg.category === 'system' ? 'warning' : notifType.type,
          title: msg.title,
          message: msg.message,
          timestamp,
          isRead: Math.random() > 0.6, // 40% unread
          priority: msg.category === 'security' ? 'urgent' : msg.category === 'approval' ? 'high' : notifType.priority,
          category: msg.category as Notification['category'],
          actionUrl: msg.actionUrl,
          actionLabel: msg.actionLabel,
          metadata: {
            documentId: msg.category === 'document' ? `doc-${Math.floor(Math.random() * 1000)}` : undefined,
            workflowId: msg.category === 'workflow' ? `wf-${Math.floor(Math.random() * 100)}` : undefined,
            count: msg.title.includes('Bulk') ? 145 : undefined
          }
        };
      }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    };

    const addNewNotification = () => {
      if (Math.random() > 0.7) { // 30% chance of new notification
        const newNotifications = generateNotifications().slice(0, 1);
        if (newNotifications.length > 0) {
          setNotifications(prev => [
            ...newNotifications.map(n => ({ ...n, timestamp: new Date() })),
            ...prev.slice(0, maxNotifications - 1)
          ]);
        }
      }
    };

    // Initial load
    setIsLoading(true);
    setTimeout(() => {
      // Use centralized data if available, otherwise generate local notifications
      const notificationsToUse = data?.notifications || generateNotifications();
      setNotifications(notificationsToUse);
      setIsLoading(false);
    }, 1000);

    // Real-time updates
    if (realTimeUpdates) {
      const interval = setInterval(addNewNotification, 15000); // Every 15 seconds
      return () => clearInterval(interval);
    }
  }, [maxNotifications, realTimeUpdates]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        );
      default: // info
        return (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getPriorityIndicator = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />;
      case 'high':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'normal':
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
      case 'low':
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const filteredNotifications = notifications
    .filter(notif => selectedCategory === 'all' || notif.category === selectedCategory)
    .filter(notif => !showUnreadOnly || !notif.isRead)
    .slice(0, maxNotifications);

  const categories = [
    { id: 'all', label: t('modern.widgets.notifications.categories.all'), icon: '📄' },
    { id: 'document', label: t('modern.widgets.notifications.categories.documents'), icon: '📄' },
    { id: 'workflow', label: t('modern.widgets.notifications.categories.workflows'), icon: '🔄' },
    { id: 'system', label: t('modern.widgets.notifications.categories.system'), icon: '⚙️' },
    { id: 'security', label: t('modern.widgets.notifications.categories.security'), icon: '🔒' },
    { id: 'approval', label: t('modern.widgets.notifications.categories.approvals'), icon: '✅' },
    { id: 'user', label: t('modern.widgets.notifications.categories.users'), icon: '👤' }
  ];

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <Widget {...widgetProps}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget {...widgetProps}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-white">{t('modern.widgets.notifications.title')}</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                showUnreadOnly ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {showUnreadOnly ? t('modern.widgets.notifications.showAll') : t('modern.widgets.notifications.unreadOnly')}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {t('modern.widgets.notifications.markAllRead')}
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        {showCategories && (
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-1 px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
                {category.id !== 'all' && (
                  <span className="text-white/50">
                    ({notifications.filter(n => n.category === category.id).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-panel p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/10 group ${
                  !notification.isRead ? 'ring-1 ring-blue-500/30' : ''
                }`}
                onClick={() => {
                  if (!notification.isRead && autoMarkAsRead) {
                    markAsRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className={`text-sm font-medium truncate ${
                          notification.isRead ? 'text-white/80' : 'text-white'
                        }`}>
                          {notification.title}
                        </h4>
                        {getPriorityIndicator(notification.priority)}
                      </div>

                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                            title="Mark as read"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                          title="Delete notification"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <p className={`text-xs mt-1 line-clamp-2 ${
                      notification.isRead ? 'text-white/60' : 'text-white/80'
                    }`}>
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-white/50">
                        {notification.timestamp.toLocaleString()}
                      </span>

                      {notification.actionLabel && notification.actionUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle navigation
                            console.log('Navigate to:', notification.actionUrl);
                          }}
                          className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          {notification.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredNotifications.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5-5-5h5V3h0v14z" />
              </svg>
            </div>
            <p className="text-sm text-white/60">
              {showUnreadOnly ? t('modern.widgets.notifications.noUnread') : t('modern.widgets.notifications.noNotifications')}
            </p>
          </div>
        )}

        {notifications.length > maxNotifications && (
          <div className="text-center">
            <button className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              {t('modern.widgets.notifications.viewAll')}
            </button>
          </div>
        )}
      </div>
    </Widget>
  );
};

export default NotificationCenterWidget;