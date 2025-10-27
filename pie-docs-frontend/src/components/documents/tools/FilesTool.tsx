import React from 'react';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const FilesTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <ToolPageLayout title="Document Files" icon="🗄️" onBack={onBack}>
      <div className="space-y-4">
        {/* Main File */}
        <div className="p-4 bg-white dark:bg-gray-800 border rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Primary File</h4>
            <span className="text-sm px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
              Current
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Filename</p>
              <p className="font-medium">{document.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Size</p>
              <p className="font-medium">{formatFileSize(document.size || document.sizeBytes || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-medium uppercase">{document.type}</p>
            </div>
            <div>
              <p className="text-gray-500">Modified</p>
              <p className="font-medium">{new Date(document.modified || document.dateModified).toLocaleDateString()}</p>
            </div>
          </div>
          {document.downloadUrl && (
            <div className="mt-4">
              <a
                href={document.downloadUrl}
                download
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors inline-block"
              >
                ⬇️ Download
              </a>
            </div>
          )}
        </div>

        {/* Attached Files Section */}
        <div>
          <h4 className="font-semibold mb-3">Attached Files</h4>
          <p className="text-gray-500 text-sm text-center py-8">No additional files attached</p>
        </div>
      </div>
    </ToolPageLayout>
  );
};
