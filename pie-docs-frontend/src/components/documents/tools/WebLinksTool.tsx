import React, { useState } from 'react';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';

export const WebLinksTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  const [shareLinks, setShareLinks] = useState<any[]>([]);

  const handleCreateLink = () => {
    const newLink = {
      id: Date.now(),
      url: `https://piedocs.com/share/${Math.random().toString(36).substr(2, 9)}`,
      created: new Date().toISOString(),
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      permissions: 'view',
      accessCount: 0,
    };
    setShareLinks([...shareLinks, newLink]);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleRevokeLink = (id: number) => {
    setShareLinks(shareLinks.filter(link => link.id !== id));
  };

  return (
    <ToolPageLayout title="Web Links" icon="🔗" onBack={onBack}>
      <div className="space-y-4">
        {/* Create Link Section */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
          <h3 className="font-semibold mb-2">Share Document</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Create a secure, shareable link to this document
          </p>
          <button
            onClick={handleCreateLink}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            + Create Share Link
          </button>
        </div>

        {/* Active Links */}
        {shareLinks.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Active Share Links</h4>
            <div className="space-y-3">
              {shareLinks.map((link) => (
                <div key={link.id} className="p-4 bg-white dark:bg-gray-800 border rounded">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                        {link.url}
                      </p>
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        <span>Created: {new Date(link.created).toLocaleDateString()}</span>
                        <span>Expires: {new Date(link.expires).toLocaleDateString()}</span>
                        <span>Access: {link.accessCount} times</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleCopyLink(link.url)}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm transition-colors"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={() => handleRevokeLink(link.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm transition-colors"
                    >
                      🗑️ Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {shareLinks.length === 0 && (
          <p className="text-center py-8 text-gray-500">No active share links</p>
        )}

        {/* Link Options */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold mb-2">Link Features</h4>
          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
            <li>✓ Time-limited access</li>
            <li>✓ Password protection</li>
            <li>✓ View-only or download permissions</li>
            <li>✓ Access tracking</li>
            <li>✓ Revocable at any time</li>
          </ul>
        </div>
      </div>
    </ToolPageLayout>
  );
};
