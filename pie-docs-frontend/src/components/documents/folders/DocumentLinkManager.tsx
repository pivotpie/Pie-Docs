import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Document, DocumentFolder } from '@/types/domain/Document';
import {
  selectDocuments,
  selectFolders,
  selectCurrentFolder,
  updateFolder,
  updateDocument
} from '@/store/slices/documentsSlice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';

interface DocumentLinkManagerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

interface FolderReference {
  folderId: string;
  folderName: string;
  folderPath: string;
  isLinked: boolean;
  isOriginalLocation: boolean;
}

export const DocumentLinkManager: React.FC<DocumentLinkManagerProps> = ({
  isOpen,
  onClose,
  documentId
}) => {
  const dispatch = useDispatch();
  const documents = useSelector(selectDocuments);
  const folders = useSelector(selectFolders);
  const currentFolder = useSelector(selectCurrentFolder);

  const [searchQuery, setSearchQuery] = useState('');
  const [folderReferences, setFolderReferences] = useState<FolderReference[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const document = documents.find(doc => doc.id === documentId);

  // Initialize folder references when component opens
  useEffect(() => {
    if (isOpen && document) {
      const references: FolderReference[] = folders.map(folder => {
        const isLinked = folder.documentRefs.includes(documentId);
        const isOriginalLocation = document.parentFolderId === folder.id;

        return {
          folderId: folder.id,
          folderName: folder.name,
          folderPath: folder.path,
          isLinked: isLinked || isOriginalLocation,
          isOriginalLocation
        };
      });

      setFolderReferences(references);
    }
  }, [isOpen, document, folders, documentId]);

  const filteredReferences = folderReferences.filter(ref =>
    ref.folderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ref.folderPath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleReference = useCallback((folderId: string, shouldLink: boolean) => {
    setFolderReferences(prev =>
      prev.map(ref =>
        ref.folderId === folderId
          ? { ...ref, isLinked: shouldLink }
          : ref
      )
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!document) return;

    setIsUpdating(true);
    try {
      // Update folder references
      for (const ref of folderReferences) {
        const folder = folders.find(f => f.id === ref.folderId);
        if (!folder) continue;

        const currentlyLinked = folder.documentRefs.includes(documentId);

        if (ref.isLinked && !currentlyLinked && !ref.isOriginalLocation) {
          // Add reference
          const updatedFolder = {
            ...folder,
            documentRefs: [...folder.documentRefs, documentId],
            statistics: {
              ...folder.statistics,
              documentCount: folder.statistics.documentCount + 1
            }
          };
          dispatch(updateFolder({ folderId: folder.id, updates: updatedFolder }));
        } else if (!ref.isLinked && currentlyLinked && !ref.isOriginalLocation) {
          // Remove reference
          const updatedFolder = {
            ...folder,
            documentRefs: folder.documentRefs.filter(id => id !== documentId),
            statistics: {
              ...folder.statistics,
              documentCount: Math.max(0, folder.statistics.documentCount - 1)
            }
          };
          dispatch(updateFolder({ folderId: folder.id, updates: updatedFolder }));
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to update document references:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [folderReferences, folders, documentId, document, dispatch, onClose]);

  const getLinkedFoldersCount = () => {
    return folderReferences.filter(ref => ref.isLinked).length;
  };

  const getOriginalFolder = () => {
    return folderReferences.find(ref => ref.isOriginalLocation);
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Manage Document Locations</h2>
          <p className="text-sm text-gray-600">
            Add this document to multiple folders without creating duplicates
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Document Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Document: {document.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-blue-700">
              <span>Type: {document.type.toUpperCase()}</span>
              <span>Size: {(document.size / 1024 / 1024).toFixed(2)} MB</span>
              <span>Currently in {getLinkedFoldersCount()} folder(s)</span>
            </div>
          </div>

          {/* Original Location */}
          {getOriginalFolder() && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-1">Original Location</h4>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-700">{getOriginalFolder()?.folderPath}</span>
                <Badge variant="default">Primary</Badge>
              </div>
              <p className="text-xs text-green-600 mt-1">
                This is where the document actually resides. It cannot be removed from here.
              </p>
            </div>
          )}

          {/* Search */}
          <div>
            <Label htmlFor="search">Search Folders</Label>
            <Input
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by folder name or path..."
            />
          </div>

          {/* Folder List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <Label>Available Folders</Label>
            {filteredReferences.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No folders found matching your search.</p>
            ) : (
              filteredReferences.map(ref => (
                <div
                  key={ref.folderId}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    ref.isLinked ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={ref.isLinked}
                      onChange={(checked) => handleToggleReference(ref.folderId, checked)}
                      disabled={ref.isOriginalLocation}
                    />
                    <div>
                      <div className="font-medium">{ref.folderName}</div>
                      <div className="text-sm text-gray-500">{ref.folderPath}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {ref.isOriginalLocation && (
                      <Badge variant="default">Primary</Badge>
                    )}
                    {ref.isLinked && !ref.isOriginalLocation && (
                      <Badge variant="outline">Linked</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Total folders selected: {getLinkedFoldersCount()}</div>
              <div>Additional references: {getLinkedFoldersCount() - 1}</div>
              <div>
                The document will appear in all selected folders but only consume storage space once.
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentLinkManager;