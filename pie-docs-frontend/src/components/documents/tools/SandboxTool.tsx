import React from 'react';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const SandboxTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  return (
    <ToolPageLayout title="Document Sandbox" icon="🧪" onBack={onBack}>
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span>⚠️</span>
            Sandbox Environment
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Test document operations in a safe, isolated environment without affecting the original document.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="p-4 bg-white dark:bg-gray-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
            <h4 className="font-semibold mb-1">🔄 Test Conversion</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Test document format conversions
            </p>
          </button>

          <button className="p-4 bg-white dark:bg-gray-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
            <h4 className="font-semibold mb-1">✏️ Test Annotations</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Preview annotations before applying
            </p>
          </button>

          <button className="p-4 bg-white dark:bg-gray-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
            <h4 className="font-semibold mb-1">🔍 Test OCR</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Retry OCR with different settings
            </p>
          </button>

          <button className="p-4 bg-white dark:bg-gray-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
            <h4 className="font-semibold mb-1">🤖 Test AI Processing</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Test classification and extraction
            </p>
          </button>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold mb-2">Sandbox Features</h4>
          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
            <li>✓ Non-destructive testing environment</li>
            <li>✓ Preview changes before applying</li>
            <li>✓ Rollback capability</li>
            <li>✓ Isolated from production data</li>
          </ul>
        </div>
      </div>
    </ToolPageLayout>
  );
};
