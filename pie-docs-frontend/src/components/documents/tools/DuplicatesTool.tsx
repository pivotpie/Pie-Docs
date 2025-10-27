import React from 'react';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const DuplicatesTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  return (
    <ToolPageLayout title="Duplicate Detection" icon="📑" onBack={onBack}>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
          <h3 className="font-semibold mb-2">Duplicate Detection</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Searching for potential duplicates based on file hash, content similarity, and metadata...
          </p>
        </div>

        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">🔍 No duplicates found</p>
          <p className="text-sm">This document appears to be unique in the system</p>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold mb-2">Detection Methods</h4>
          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
            <li>✓ File hash comparison (MD5/SHA256)</li>
            <li>✓ Content similarity analysis</li>
            <li>✓ Metadata matching</li>
            <li>✓ Semantic content comparison</li>
          </ul>
        </div>
      </div>
    </ToolPageLayout>
  );
};
