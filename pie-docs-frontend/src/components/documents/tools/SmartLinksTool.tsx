import React from 'react';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const SmartLinksTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  const relatedDocs = document.relationships || [];

  return (
    <ToolPageLayout title="Smart Links" icon="🔗" onBack={onBack}>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
          <h3 className="font-semibold mb-2">AI-Detected Relationships</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Automatically discovered connections between this document and others in the system
          </p>
        </div>

        {relatedDocs.length > 0 ? (
          <div className="space-y-2">
            {relatedDocs.map((rel: string, index: number) => (
              <div key={index} className="p-3 bg-white dark:bg-gray-800 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{rel}</p>
                    <p className="text-sm text-gray-500">Referenced in content</p>
                  </div>
                  <button className="text-blue-500 hover:text-blue-600">→</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-gray-500">No smart links detected yet</p>
        )}

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold mb-2">Link Detection Methods</h4>
          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
            <li>✓ Document references in content</li>
            <li>✓ Shared entities (people, companies, dates)</li>
            <li>✓ Workflow connections</li>
            <li>✓ Semantic similarity</li>
          </ul>
        </div>
      </div>
    </ToolPageLayout>
  );
};
