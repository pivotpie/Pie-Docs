import React, { useState } from 'react';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const SubscriptionsTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationTypes, setNotificationTypes] = useState({
    modifications: true,
    comments: true,
    approvals: true,
    checkouts: false,
  });

  const handleToggleSubscription = () => {
    setIsSubscribed(!isSubscribed);
  };

  const handleToggleNotification = (type: keyof typeof notificationTypes) => {
    setNotificationTypes(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  return (
    <ToolPageLayout title="Subscriptions" icon="📡" onBack={onBack}>
      <div className="space-y-4">
        {/* Subscription Status */}
        <div className={`p-4 border rounded ${isSubscribed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Subscription Status</h3>
            <button
              onClick={handleToggleSubscription}
              className={`px-4 py-2 rounded transition-colors ${
                isSubscribed
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isSubscribed
              ? '✓ You will receive notifications about changes to this document'
              : 'Subscribe to receive notifications about changes to this document'}
          </p>
        </div>

        {/* Notification Preferences */}
        {isSubscribed && (
          <div className="p-4 bg-white dark:bg-gray-800 border rounded">
            <h4 className="font-semibold mb-3">Notification Preferences</h4>
            <div className="space-y-3">
              {Object.entries(notificationTypes).map(([type, enabled]) => (
                <label key={type} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleToggleNotification(type as keyof typeof notificationTypes)}
                    className="w-4 h-4 text-blue-500 rounded"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Subscribers List */}
        <div>
          <h4 className="font-semibold mb-3">Current Subscribers</h4>
          <p className="text-sm text-gray-500 text-center py-4">
            {isSubscribed ? '1 subscriber (You)' : 'No subscribers'}
          </p>
        </div>
      </div>
    </ToolPageLayout>
  );
};
