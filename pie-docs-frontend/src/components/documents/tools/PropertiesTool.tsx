import React from 'react';
import type { DocumentToolProps} from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const PropertiesTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const properties = [
    { label: 'Document ID', value: document.id },
    { label: 'File Name', value: document.name },
    { label: 'File Type', value: document.type },
    { label: 'File Size', value: document.size || `${document.sizeBytes} bytes` },
    { label: 'Status', value: document.status },
    { label: 'Owner', value: document.owner || document.metadata?.author || 'Unknown' },
    { label: 'Created Date', value: formatDate(document.created || document.dateCreated) },
    { label: 'Modified Date', value: formatDate(document.modified || document.dateModified) },
    { label: 'Tags', value: document.tags?.join(', ') || 'None' },
    { label: 'Path', value: document.path || '/' },
  ];

  return (
    <ToolPageLayout title="Document Properties" icon="ℹ️" onBack={onBack}>
      <div className="space-y-4">
        {/* System Properties */}
        <div>
          <h4 className="font-semibold mb-3">System Properties</h4>
          <div className="space-y-2">
            {properties.map((prop, index) => (
              <div key={index} className="flex border-b pb-2 dark:border-gray-700">
                <span className="w-40 text-gray-600 dark:text-gray-400 text-sm">{prop.label}:</span>
                <span className="flex-1 font-medium text-sm">{prop.value || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Metadata */}
        {document.metadata?.customFields && Object.keys(document.metadata.customFields).length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Custom Metadata</h4>
            <div className="space-y-2">
              {Object.entries(document.metadata.customFields).map(([key, value]) => (
                <div key={key} className="flex border-b pb-2 dark:border-gray-700">
                  <span className="w-40 text-gray-600 dark:text-gray-400 text-sm capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="flex-1 font-medium text-sm">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold mb-2">Technical Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Download URL</p>
              <p className="font-mono text-xs break-all">{document.downloadUrl || 'N/A'}</p>
            </div>
            {document.thumbnail && (
              <div>
                <p className="text-gray-500">Thumbnail</p>
                <p className="font-mono text-xs break-all">{document.thumbnail}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};
