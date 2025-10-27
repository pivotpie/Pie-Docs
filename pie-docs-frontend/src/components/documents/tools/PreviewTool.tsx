import React from 'react';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const PreviewTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  return (
    <ToolPageLayout title="Quick Preview" icon="👁️" onBack={onBack}>
      <div className="space-y-4">
        {/* Document Thumbnail/Preview */}
        {document.thumbnail && (
          <div className="flex justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <img
              src={document.thumbnail}
              alt={document.name}
              className="max-w-full h-auto rounded shadow-lg"
              style={{ maxHeight: '500px' }}
            />
          </div>
        )}

        {/* Document Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white dark:bg-gray-800 border rounded">
            <p className="text-sm text-gray-500">File Name</p>
            <p className="font-medium">{document.name}</p>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 border rounded">
            <p className="text-sm text-gray-500">Type</p>
            <p className="font-medium uppercase">{document.type}</p>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 border rounded">
            <p className="text-sm text-gray-500">Size</p>
            <p className="font-medium">{document.size || 'Unknown'}</p>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 border rounded">
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">{document.status}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {document.downloadUrl && (
            <a
              href={document.downloadUrl}
              download
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Download
            </a>
          )}
          <button className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
            Print
          </button>
        </div>
      </div>
    </ToolPageLayout>
  );
};
