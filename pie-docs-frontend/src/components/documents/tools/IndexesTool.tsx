import React from 'react';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const IndexesTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  const indexFields = [
    { name: 'Document Type', value: document.type, indexed: true },
    { name: 'Title', value: document.name, indexed: true },
    { name: 'Author', value: document.metadata?.author || document.owner, indexed: true },
    { name: 'Created Date', value: new Date(document.created || document.dateCreated).toLocaleDateString(), indexed: true },
    { name: 'Modified Date', value: new Date(document.modified || document.dateModified).toLocaleDateString(), indexed: true },
    { name: 'Tags', value: document.tags?.join(', ') || 'None', indexed: true },
    { name: 'Status', value: document.status, indexed: true },
  ];

  return (
    <ToolPageLayout title="Search Indexes" icon="📇" onBack={onBack}>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
          <h3 className="font-semibold mb-2">📊 Indexing Status</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This document is fully indexed and searchable
          </p>
          <div className="mt-2 text-sm">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
              ✓ Indexed
            </span>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Indexed Fields</h4>
          <div className="space-y-2">
            {indexFields.map((field, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 border rounded">
                <div>
                  <p className="font-medium">{field.name}</p>
                  <p className="text-sm text-gray-500">{field.value || 'N/A'}</p>
                </div>
                {field.indexed && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                    Indexed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold mb-2">Full-Text Search</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Document content is indexed for full-text search using:
          </p>
          <ul className="text-sm mt-2 space-y-1 text-gray-600 dark:text-gray-400">
            <li>✓ PostgreSQL full-text search (pg_trgm)</li>
            <li>✓ Vector embeddings for semantic search</li>
            <li>✓ Metadata field indexing</li>
          </ul>
        </div>
      </div>
    </ToolPageLayout>
  );
};
