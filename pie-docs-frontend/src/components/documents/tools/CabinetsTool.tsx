/**
 * CabinetsTool - Document Folders management
 */

import React, { useState, useEffect } from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import { foldersService } from '@/services/api/foldersService';
import type { DocumentToolProps } from './types';

interface Folder {
  id: string;
  name: string;
  path?: string;
  parent_id?: string;
}

export const CabinetsTool: React.FC<DocumentToolProps & { onBack: () => void }> = ({
  document,
  onBack,
  className = '',
}) => {
  const [selectedFolder, setSelectedFolder] = useState('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load folders from API
  useEffect(() => {
    loadFolders();
    // Set current folder from document if available
    if ((document as any).folderId) {
      setCurrentFolderId((document as any).folderId);
    }
  }, [document]);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const response = await foldersService.getFolders({ page: 1, page_size: 100 });
      setFolders(response.folders.map((f: any) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        parent_id: f.parent_id,
      })));
    } catch (err) {
      console.error('Failed to load folders:', err);
      setError('Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignFolder = async () => {
    if (!selectedFolder) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      await foldersService.moveDocumentToFolder(selectedFolder, document.id);

      setCurrentFolderId(selectedFolder);
      setSuccessMessage('Document successfully assigned to folder');
      setSelectedFolder('');

      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to assign folder:', err);
      setError('Failed to assign folder. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFolder = async () => {
    if (!currentFolderId) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Remove document from current folder
      await fetch(`http://localhost:8001/api/v1/folders/${currentFolderId}/documents/${document.id}`, {
        method: 'DELETE',
      });

      setCurrentFolderId(null);
      setSuccessMessage('Document removed from folder');

      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to remove folder:', err);
      setError('Failed to remove from folder. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentFolder = () => {
    return folders.find(f => f.id === currentFolderId);
  };

  return (
    <ToolPageLayout title="Document Folders" icon="📚" onBack={onBack} className={className}>
      <div className="glass-panel p-6 rounded-lg space-y-4">
        {/* Document Info */}
        <div className="mb-4">
          <p className="text-white/70 text-sm mb-1">Document:</p>
          <p className="text-white font-medium truncate">{document.name}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="p-3 bg-green-500/20 border border-green-500/40 rounded text-green-300 text-sm">
            {successMessage}
          </div>
        )}

        {/* Current Folder */}
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-white/80 mb-3">Current Folder</h4>
          {currentFolderId && getCurrentFolder() ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/30 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📁</span>
                  <div>
                    <span className="text-white text-sm font-medium">{getCurrentFolder()?.name}</span>
                    {getCurrentFolder()?.path && (
                      <span className="text-white/50 text-xs block">{getCurrentFolder()?.path}</span>
                    )}
                  </div>
                </div>
                <button
                  className="text-white/60 hover:text-red-400 transition-colors px-2 py-1"
                  onClick={handleRemoveFolder}
                  disabled={isLoading}
                  title="Remove from folder"
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <p className="text-white/50 text-sm italic">No folder assigned</p>
          )}
        </div>

        {/* Assign to New Folder */}
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-white/80 mb-3">
            {currentFolderId ? 'Change Folder' : 'Assign to Folder'}
          </h4>
          <p className="text-white/60 text-xs mb-3">Select a folder to assign this document</p>

          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-400 mb-3"
            disabled={isLoading}
          >
            <option value="" className="bg-slate-800 text-white">
              {isLoading ? 'Loading folders...' : 'Select Folder'}
            </option>
            {folders
              .filter(f => f.id !== currentFolderId) // Don't show current folder in options
              .map((folder) => (
                <option key={folder.id} value={folder.id} className="bg-slate-800 text-white">
                  {folder.name} {folder.path ? `(${folder.path})` : ''}
                </option>
              ))}
          </select>

          <button
            className="btn-glass px-4 py-2 w-full"
            disabled={!selectedFolder || isLoading}
            onClick={handleAssignFolder}
          >
            {isLoading ? 'Processing...' : currentFolderId ? 'Change Folder' : 'Assign to Folder'}
          </button>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default CabinetsTool;
