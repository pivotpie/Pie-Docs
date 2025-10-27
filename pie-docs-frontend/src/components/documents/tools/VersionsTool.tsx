/**
 * VersionsTool - Document Version History
 */

import React, { useState, useEffect } from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import type { DocumentToolProps } from './types';
import { documentsService } from '@/services/api/documentsService';

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  is_major_version: boolean;
  file_name: string;
  file_size: number;
  file_url: string;
  file_hash: string;
  change_description: string | null;
  change_type: string | null;
  metadata_snapshot: any;
  created_by: string | null;
  created_at: string;
}

export const VersionsTool: React.FC<DocumentToolProps & { onBack: () => void }> = ({
  document,
  onBack,
  className = '',
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [document.id]);

  const loadVersions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await documentsService.getDocumentVersions(document.id);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load versions:', err);
      setError('Failed to load version history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = (version: DocumentVersion) => {
    console.log('Restoring version:', version.version_number);
    // TODO: Implement version restoration API call
    alert(`Restoring version ${version.version_number} is not yet implemented.`);
  };

  const handleDownload = (version: DocumentVersion) => {
    window.open(version.file_url, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <ToolPageLayout title="Version History" icon="📜" onBack={onBack} className={className}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </ToolPageLayout>
    );
  }

  if (error) {
    return (
      <ToolPageLayout title="Version History" icon="📜" onBack={onBack} className={className}>
        <div className="bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={loadVersions}
          className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
        >
          Retry
        </button>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout title="Version History" icon="📜" onBack={onBack} className={className}>
      <div className="space-y-3">
        {versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No version history available
          </div>
        ) : (
          versions.map((version, index) => (
            <div
              key={version.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-900 dark:text-white font-medium">
                      Version {version.version_number}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-600 dark:text-green-400">
                        Current
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        version.is_major_version
                          ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                          : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {version.is_major_version ? 'Major' : 'Minor'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {version.change_description || 'No description provided'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {version.file_name} • {formatFileSize(version.file_size)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(version)}
                    className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                    title="Download this version"
                  >
                    Download
                  </button>
                  {index !== 0 && (
                    <button
                      onClick={() => handleRestore(version)}
                      className="px-3 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                      title="Restore this version"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                <span>{version.created_by || 'Unknown User'}</span>
                <span>•</span>
                <span>{formatDate(version.created_at)}</span>
                {version.change_type && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{version.change_type}</span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          className="px-4 py-2 w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
          onClick={() => alert('Upload new version feature is not yet implemented.')}
        >
          Upload New Version
        </button>
      </div>
    </ToolPageLayout>
  );
};

export default VersionsTool;
