import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { DocumentFolder, BulkFolderAction } from '@/types/domain/Document';
import {
  selectSelectedFolderIds,
  selectSelectedFolders,
  clearFolderSelection,
  deleteFolder,
  moveFolder,
  updateFolder
} from '@/store/slices/documentsSlice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';

interface BulkFolderActionsProps {
  isVisible: boolean;
  onClose: () => void;
}

interface BulkOperationProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
  errors: Array<{ folderId: string; folderName: string; error: string }>;
}

export const BulkFolderActions: React.FC<BulkFolderActionsProps> = ({
  isVisible,
  onClose
}) => {
  const dispatch = useDispatch();
  const selectedFolderIds = useSelector(selectSelectedFolderIds);
  const selectedFolders = useSelector(selectSelectedFolders);

  const [activeOperation, setActiveOperation] = useState<BulkFolderAction['type'] | null>(null);
  const [targetParentId, setTargetParentId] = useState<string>('');
  const [preserveStructure, setPreserveStructure] = useState(true);
  const [confirmationText, setConfirmationText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const canUndo = useState(false)[0]; // TODO: Implement undo functionality

  const handleStartOperation = useCallback((operation: BulkFolderAction['type']) => {
    if (selectedFolderIds.length === 0) return;

    setActiveOperation(operation);

    if (operation === 'delete') {
      setShowConfirmation(true);
    } else {
      setShowConfirmation(false);
    }
  }, [selectedFolderIds.length]);

  const validateOperation = useCallback((): string[] => {
    const errors: string[] = [];

    if (selectedFolderIds.length === 0) {
      errors.push('No folders selected');
      return errors;
    }

    if (activeOperation === 'move' || activeOperation === 'copy') {
      if (!targetParentId) {
        errors.push('Target folder is required for move/copy operations');
      } else if (selectedFolderIds.includes(targetParentId)) {
        errors.push('Cannot move/copy folder into itself');
      }
    }

    if (activeOperation === 'delete') {
      if (confirmationText.toLowerCase() !== 'delete') {
        errors.push('Type "delete" to confirm deletion');
      }
    }

    // Check for circular references in move operations
    if (activeOperation === 'move' && targetParentId) {
      for (const folder of selectedFolders) {
        if (isDescendantFolder(targetParentId, folder.id)) {
          errors.push(`Cannot move ${folder.name} - would create circular reference`);
        }
      }
    }

    return errors;
  }, [activeOperation, targetParentId, confirmationText, selectedFolderIds, selectedFolders]);

  const isDescendantFolder = useCallback((parentId: string, childId: string): boolean => {
    // Simple implementation - in real app, would traverse full hierarchy
    const childFolder = selectedFolders.find(f => f.id === childId);
    if (!childFolder) return false;

    return childFolder.childFolders.includes(parentId);
  }, [selectedFolders]);

  const executeOperation = useCallback(async () => {
    const validationErrors = validateOperation();
    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
      return;
    }

    if (!activeOperation) return;

    setIsProcessing(true);
    setProgress({
      total: selectedFolderIds.length,
      completed: 0,
      failed: 0,
      errors: []
    });

    try {
      for (let i = 0; i < selectedFolders.length; i++) {
        const folder = selectedFolders[i];

        setProgress(prev => prev ? {
          ...prev,
          current: folder.name,
          completed: i
        } : null);

        // Simulate async operation delay
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          switch (activeOperation) {
            case 'move':
              dispatch(moveFolder({
                folderId: folder.id,
                targetParentId: targetParentId || undefined
              }));
              break;

            case 'copy':
              // Create copy of folder
              const copiedFolder = {
                ...folder,
                id: `${folder.id}_copy_${Date.now()}`,
                name: `${folder.name} (Copy)`,
                parentId: targetParentId || undefined,
                path: targetParentId ? `/parent/${folder.name} (Copy)` : `/${folder.name} (Copy)`,
                dateCreated: new Date().toISOString(),
                dateModified: new Date().toISOString(),
                childFolders: preserveStructure ? [...folder.childFolders] : [],
                documentRefs: [...folder.documentRefs]
              };

              dispatch(updateFolder({ folderId: folder.id, updates: copiedFolder }));
              break;

            case 'delete':
              dispatch(deleteFolder(folder.id));
              break;

            case 'changePermissions':
              // TODO: Implement permissions change
              break;
          }

          setProgress(prev => prev ? {
            ...prev,
            completed: i + 1
          } : null);

        } catch (error) {
          setProgress(prev => prev ? {
            ...prev,
            failed: prev.failed + 1,
            errors: [...prev.errors, {
              folderId: folder.id,
              folderName: folder.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            }]
          } : null);
        }
      }

      // Clear selection after successful operation
      dispatch(clearFolderSelection());

      // Auto-close if no errors
      if (progress?.errors.length === 0) {
        setTimeout(() => {
          onClose();
        }, 1000);
      }

    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [activeOperation, selectedFolders, selectedFolderIds, targetParentId, preserveStructure, validateOperation, dispatch, progress?.errors.length, onClose]);

  const resetOperation = useCallback(() => {
    setActiveOperation(null);
    setTargetParentId('');
    setConfirmationText('');
    setShowConfirmation(false);
    setProgress(null);
    setIsProcessing(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      resetOperation();
      onClose();
    }
  }, [isProcessing, resetOperation, onClose]);

  if (!isVisible || selectedFolderIds.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-6xl mx-auto p-4">
        {!activeOperation ? (
          // Operation Selection
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-900">
                {selectedFolderIds.length} folder{selectedFolderIds.length > 1 ? 's' : ''} selected
              </span>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleStartOperation('move')}
                >
                  Move
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartOperation('copy')}
                >
                  Copy
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStartOperation('delete')}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {canUndo && (
                <Button size="sm" variant="ghost">
                  Undo Last Action
                </Button>
              )}

              <Button size="sm" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : !isProcessing && !progress ? (
          // Operation Configuration
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {activeOperation === 'move' && 'Move Folders'}
                {activeOperation === 'copy' && 'Copy Folders'}
                {activeOperation === 'delete' && 'Delete Folders'}
                {activeOperation === 'changePermissions' && 'Change Permissions'}
              </h3>

              <Button size="sm" variant="ghost" onClick={resetOperation}>
                Back
              </Button>
            </div>

            {(activeOperation === 'move' || activeOperation === 'copy') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetFolder">Target Folder</Label>
                  <Select
                    value={targetParentId}
                    onChange={(value) => setTargetParentId(value as string)}
                    options={[
                      { value: '', label: 'Root Folder' },
                      // TODO: Add available folders as options
                    ]}
                    placeholder="Select target folder..."
                  />
                </div>

                {activeOperation === 'copy' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserveStructure"
                      checked={preserveStructure}
                      onChange={(e) => setPreserveStructure(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="preserveStructure">Preserve folder structure</Label>
                  </div>
                )}
              </div>
            )}

            {activeOperation === 'delete' && showConfirmation && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-800 mb-2">
                  ⚠️ This action will permanently delete {selectedFolderIds.length} folder{selectedFolderIds.length > 1 ? 's' : ''} and all their contents.
                </div>
                <Label htmlFor="confirmDelete">Type "delete" to confirm:</Label>
                <Input
                  id="confirmDelete"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="delete"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetOperation}>
                Cancel
              </Button>
              <Button
                onClick={executeOperation}
                disabled={validateOperation().length > 0}
              >
                {activeOperation === 'move' && 'Move Folders'}
                {activeOperation === 'copy' && 'Copy Folders'}
                {activeOperation === 'delete' && 'Delete Folders'}
                {activeOperation === 'changePermissions' && 'Apply Changes'}
              </Button>
            </div>
          </div>
        ) : (
          // Progress Display
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {activeOperation === 'move' && 'Moving Folders...'}
                {activeOperation === 'copy' && 'Copying Folders...'}
                {activeOperation === 'delete' && 'Deleting Folders...'}
              </h3>

              {!isProcessing && (
                <Button size="sm" onClick={handleClose}>
                  Close
                </Button>
              )}
            </div>

            {progress && (
              <div>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>
                    {progress.completed} of {progress.total} completed
                    {progress.failed > 0 && ` (${progress.failed} failed)`}
                  </span>
                  <span>{Math.round((progress.completed / progress.total) * 100)}%</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  />
                </div>

                {progress.current && isProcessing && (
                  <div className="text-sm text-gray-600">
                    Processing: {progress.current}
                  </div>
                )}

                {progress.errors.length > 0 && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-red-800 mb-2">Errors:</div>
                    <div className="space-y-1">
                      {progress.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-700">
                          {error.folderName}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkFolderActions;