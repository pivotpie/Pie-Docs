import React, { useState, useEffect } from 'react';
import { documentsService } from '@/services/api/documentsService';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const EventsTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const result = await documentsService.getDocumentEvents(document.id, 1, 50);
        setEvents(result.events || result.audit_logs || []);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadEvents();
  }, [document.id]);

  if (isLoading) {
    return (
      <ToolPageLayout title="Document Events" icon="📋" onBack={onBack}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout title="Document Events" icon="📋" onBack={onBack}>
      <div className="space-y-3">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.event_id || event.id} className="p-4 bg-white dark:bg-gray-800 border rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{event.event_type || event.action}</h4>
                <span className="text-sm text-gray-500">
                  {new Date(event.event_time || event.created_at).toLocaleString()}
                </span>
              </div>
              {event.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{event.description}</p>
              )}
              {event.details && (
                <p className="text-sm text-gray-500 italic mb-2">Details: {event.details}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                {(event.performed_by || event.user_id) && (
                  <div>User: {event.performed_by || event.user_id}</div>
                )}
                {event.ip_address && <div>IP: {event.ip_address}</div>}
                {event.resource_type && <div>Resource: {event.resource_type}</div>}
                {event.success !== undefined && (
                  <div className={event.success ? 'text-green-600' : 'text-red-600'}>
                    {event.success ? '✓ Success' : '✗ Failed'}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">No events recorded for this document</p>
        )}
      </div>
    </ToolPageLayout>
  );
};
