import React from 'react';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';

interface ActivityItem {
  id: string;
  type: 'upload' | 'process' | 'approval' | 'update' | 'error';
  message: string;
  timestamp: Date;
  user?: string;
}

interface RecentActivityWidgetProps extends WidgetProps {
  activities?: ActivityItem[];
  maxItems?: number;
}

const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
  activities = [
    {
      id: '1',
      type: 'upload',
      message: 'Document uploaded: contract.pdf',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      user: 'John Doe'
    },
    {
      id: '2',
      type: 'process',
      message: 'OCR processing completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      user: 'System'
    },
    {
      id: '3',
      type: 'approval',
      message: 'Workflow approval pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      user: 'Jane Smith'
    },
    {
      id: '4',
      type: 'update',
      message: 'Search index updated',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      user: 'System'
    }
  ],
  maxItems = 5,
  ...widgetProps
}) => {
  const getActivityColor = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'upload':
        return 'bg-green-500';
      case 'process':
        return 'bg-blue-500';
      case 'approval':
        return 'bg-yellow-500';
      case 'update':
        return 'bg-purple-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatRelativeTime = (timestamp: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    if (diff < 60) {
      return 'just now';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes}m ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / 86400);
      return `${days}d ago`;
    }
  };

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Widget {...widgetProps}>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {displayedActivities.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          displayedActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 rtl:space-x-reverse">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getActivityColor(activity.type)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {activity.message}
                </p>
                <div className="flex items-center justify-between mt-1">
                  {activity.user && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      by {activity.user}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}

        {activities.length > maxItems && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
              View all activity ({activities.length - maxItems} more)
            </button>
          </div>
        )}
      </div>
    </Widget>
  );
};

export default RecentActivityWidget;