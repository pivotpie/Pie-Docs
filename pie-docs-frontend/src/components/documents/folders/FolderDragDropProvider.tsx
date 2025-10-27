import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  CollisionDetection,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Document, DocumentFolder } from '@/types/domain/Document';

export interface DragItem {
  id: string;
  type: 'document' | 'folder';
  data: Document | DocumentFolder;
  selectedCount?: number; // Number of selected items when dragging multiple
  hasMultiple?: boolean;  // Whether multiple items are being dragged
}

interface FolderDragDropProviderProps {
  children: React.ReactNode;
  folders: DocumentFolder[];
  documents: Document[];
  selectedDocumentIds?: string[];
  selectedFolderIds?: string[];
  onDocumentMove: (documentId: string, targetFolderId?: string) => void;
  onFolderMove: (folderId: string, targetParentId?: string) => void;
  onDocumentReorder: (documentIds: string[]) => void;
  onFolderReorder: (folderIds: string[]) => void;
  onBulkDocumentMove?: (documentIds: string[], targetFolderId?: string) => void;
  onBulkFolderMove?: (folderIds: string[], targetParentId?: string) => void;
  disabled?: boolean;
}

const FolderDragDropProvider: React.FC<FolderDragDropProviderProps> = ({
  children,
  folders,
  documents,
  selectedDocumentIds = [],
  selectedFolderIds = [],
  onDocumentMove,
  onFolderMove,
  onDocumentReorder,
  onFolderReorder,
  onBulkDocumentMove,
  onBulkFolderMove,
  disabled = false,
}) => {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure sensors for different input methods
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { context: { active, translatedRect } }) => {
        if (!active || !translatedRect) return { x: 0, y: 0 };

        const { code } = event;
        const { left, top } = translatedRect;

        switch (code) {
          case 'ArrowDown':
            return { x: left, y: top + 25 };
          case 'ArrowUp':
            return { x: left, y: top - 25 };
          case 'ArrowRight':
            return { x: left + 25, y: top };
          case 'ArrowLeft':
            return { x: left - 25, y: top };
          default:
            return { x: left, y: top };
        }
      },
    })
  );

  // Custom collision detection for folder/document interactions
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // First try closest corners for precise detection
    const closestCornersCollisions = closestCorners(args);
    if (closestCornersCollisions.length > 0) {
      return closestCornersCollisions;
    }

    // Fallback to rectangle intersection for broader detection
    return rectIntersection(args);
  }, []);

  // Function to announce messages to screen readers
  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (disabled) return;

    const { active } = event;
    const itemId = active.id as string;

    // Determine if dragging a document or folder
    const document = documents.find(doc => doc.id === itemId);
    const folder = folders.find(f => f.id === itemId);

    if (document) {
      // Check if this document is part of a multi-selection
      const isInSelection = selectedDocumentIds.includes(itemId);
      const selectedCount = isInSelection ? selectedDocumentIds.length : 1;
      const hasMultiple = isInSelection && selectedDocumentIds.length > 1;

      setActiveItem({
        id: itemId,
        type: 'document',
        data: document,
        selectedCount,
        hasMultiple,
      });

      // Announce drag start for screen readers
      const message = hasMultiple
        ? `Started dragging ${selectedCount} documents including: ${document.name}`
        : `Started dragging document: ${document.name}`;
      announceToScreenReader(message);
    } else if (folder) {
      // Check if this folder is part of a multi-selection
      const isInSelection = selectedFolderIds.includes(itemId);
      const selectedCount = isInSelection ? selectedFolderIds.length : 1;
      const hasMultiple = isInSelection && selectedFolderIds.length > 1;

      setActiveItem({
        id: itemId,
        type: 'folder',
        data: folder,
        selectedCount,
        hasMultiple,
      });

      // Announce drag start for screen readers
      const message = hasMultiple
        ? `Started dragging ${selectedCount} folders including: ${folder.name}`
        : `Started dragging folder: ${folder.name}`;
      announceToScreenReader(message);
    }
  }, [disabled, documents, folders, selectedDocumentIds, selectedFolderIds, announceToScreenReader]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (disabled) return;

    const { over } = event;
    setOverId(over ? over.id as string : null);
  }, [disabled]);

  // Helper function to check if a folder is a descendant of another
  const isDescendantFolder = useCallback((ancestorId: string, folderId: string, allFolders: DocumentFolder[]): boolean => {
    const folder = allFolders.find(f => f.id === folderId);
    if (!folder || !folder.parentId) return false;

    if (folder.parentId === ancestorId) return true;

    return isDescendantFolder(ancestorId, folder.parentId, allFolders);
  }, []);

  const handleDocumentDrop = useCallback((documentId: string, targetId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;

    // Check if this is part of a multi-selection
    const isInSelection = selectedDocumentIds.includes(documentId);
    const documentsToMove = isInSelection ? selectedDocumentIds : [documentId];

    // Check if dropping on a folder
    const targetFolder = folders.find(f => f.id === targetId);
    if (targetFolder) {
      // Prevent dropping on smart folders (they auto-populate)
      if (targetFolder.type === 'smart') {
        announceToScreenReader('Cannot move documents to smart folders');
        return;
      }

      // Handle bulk move if multiple documents selected
      if (documentsToMove.length > 1 && onBulkDocumentMove) {
        onBulkDocumentMove(documentsToMove, targetId);
        announceToScreenReader(`${documentsToMove.length} documents moved to folder "${targetFolder.name}"`);
      } else {
        // Move single document to folder
        onDocumentMove(documentId, targetId);
        announceToScreenReader(`Document "${document.name}" moved to folder "${targetFolder.name}"`);
      }
      return;
    }

    // Check if dropping on another document (for reordering)
    const targetDocument = documents.find(doc => doc.id === targetId);
    if (targetDocument && document.parentFolderId === targetDocument.parentFolderId) {
      // Reorder documents within the same folder
      const folderDocuments = documents.filter(doc => doc.parentFolderId === document.parentFolderId);
      const oldIndex = folderDocuments.findIndex(doc => doc.id === documentId);
      const newIndex = folderDocuments.findIndex(doc => doc.id === targetId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reorderedIds = [...folderDocuments.map(doc => doc.id)];
        const [movedId] = reorderedIds.splice(oldIndex, 1);
        reorderedIds.splice(newIndex, 0, movedId);

        onDocumentReorder(reorderedIds);
        announceToScreenReader(`Document "${document.name}" reordered`);
      }
    }

    // If dropping on a drop zone (like root area)
    if (targetId === 'root-drop-zone') {
      if (documentsToMove.length > 1 && onBulkDocumentMove) {
        onBulkDocumentMove(documentsToMove, undefined);
        announceToScreenReader(`${documentsToMove.length} documents moved to root folder`);
      } else {
        onDocumentMove(documentId, undefined);
        announceToScreenReader(`Document "${document.name}" moved to root folder`);
      }
    }
  }, [documents, folders, selectedDocumentIds, onDocumentMove, onDocumentReorder, onBulkDocumentMove, announceToScreenReader]);

  const handleFolderDrop = useCallback((folderId: string, targetId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    // Check if this is part of a multi-selection
    const isInSelection = selectedFolderIds.includes(folderId);
    const foldersToMove = isInSelection ? selectedFolderIds : [folderId];

    // Check if dropping on another folder (for nesting)
    const targetFolder = folders.find(f => f.id === targetId);
    if (targetFolder) {
      // Prevent circular references for any folders in selection
      const hasCircularReference = foldersToMove.some(id =>
        isDescendantFolder(targetFolder.id, id, folders)
      );

      if (hasCircularReference) {
        announceToScreenReader('Cannot move folder into its own descendant');
        return;
      }

      // Prevent moving to same parent
      if (folder.parentId === targetFolder.id) {
        announceToScreenReader('Folder is already in this location');
        return;
      }

      // Handle bulk move if multiple folders selected
      if (foldersToMove.length > 1 && onBulkFolderMove) {
        onBulkFolderMove(foldersToMove, targetFolder.id);
        announceToScreenReader(`${foldersToMove.length} folders moved into "${targetFolder.name}"`);
      } else {
        // Move single folder to be child of target folder
        onFolderMove(folderId, targetFolder.id);
        announceToScreenReader(`Folder "${folder.name}" moved into "${targetFolder.name}"`);
      }
      return;
    }

    // Check if dropping on another folder for reordering
    const siblingFolders = folders.filter(f => f.parentId === folder.parentId);
    const targetFolderInSiblings = siblingFolders.find(f => f.id === targetId);

    if (targetFolderInSiblings) {
      // Reorder folders at the same level
      const oldIndex = siblingFolders.findIndex(f => f.id === folderId);
      const newIndex = siblingFolders.findIndex(f => f.id === targetId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reorderedIds = [...siblingFolders.map(f => f.id)];
        const [movedId] = reorderedIds.splice(oldIndex, 1);
        reorderedIds.splice(newIndex, 0, movedId);

        onFolderReorder(reorderedIds);
        announceToScreenReader(`Folder "${folder.name}" reordered`);
      }
    }

    // If dropping on root drop zone
    if (targetId === 'root-drop-zone') {
      if (folder.parentId) {
        if (foldersToMove.length > 1 && onBulkFolderMove) {
          onBulkFolderMove(foldersToMove, undefined);
          announceToScreenReader(`${foldersToMove.length} folders moved to root level`);
        } else {
          onFolderMove(folderId, undefined);
          announceToScreenReader(`Folder "${folder.name}" moved to root level`);
        }
      }
    }
  }, [folders, selectedFolderIds, onFolderMove, onFolderReorder, onBulkFolderMove, announceToScreenReader, isDescendantFolder]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (disabled) return;

    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    setActiveItem(null);
    setOverId(null);

    if (!over || activeId === overId) {
      announceToScreenReader('Drag cancelled or item returned to original position');
      return;
    }

    // Handle different drag scenarios
    if (activeItem) {
      if (activeItem.type === 'document') {
        handleDocumentDrop(activeId, overId);
      } else if (activeItem.type === 'folder') {
        handleFolderDrop(activeId, overId);
      }
    }
  }, [disabled, activeItem, handleDocumentDrop, handleFolderDrop, announceToScreenReader]);

  // Create combined items list for sortable context
  const allItems = [
    ...folders.map(folder => folder.id),
    ...documents.map(doc => doc.id),
    'root-drop-zone' // Special drop zone for root level
  ];

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allItems} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <DragPreview item={activeItem} isOverDropZone={!!overId} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// Drag preview component
interface DragPreviewProps {
  item: DragItem;
  isOverDropZone: boolean;
}

const DragPreview: React.FC<DragPreviewProps> = ({ item, isOverDropZone }) => {
  const isDraggingDocument = item.type === 'document';
  const data = item.data as Document | DocumentFolder;
  const { selectedCount = 1, hasMultiple = false } = item;

  return (
    <div
      className={`
        dragging-preview transform transition-transform duration-200 pointer-events-none z-50
        ${isOverDropZone ? 'scale-105 rotate-2' : 'scale-100 rotate-1'}
      `}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-400 p-3 max-w-xs relative">
        {/* Multiple items indicator */}
        {hasMultiple && (
          <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
            {selectedCount}
          </div>
        )}

        <div className="flex items-center space-x-2">
          {/* Icon */}
          <div className="flex-shrink-0 relative">
            {isDraggingDocument ? (
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            )}

            {/* Multiple items stack effect */}
            {hasMultiple && (
              <>
                <div className="absolute -inset-0.5 bg-gray-300 dark:bg-gray-600 rounded -z-10 transform translate-x-0.5 translate-y-0.5" />
                <div className="absolute -inset-1 bg-gray-200 dark:bg-gray-700 rounded -z-20 transform translate-x-1 translate-y-1" />
              </>
            )}
          </div>

          {/* Name and info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {hasMultiple ? `${selectedCount} items` : data.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasMultiple
                ? `${selectedCount} ${isDraggingDocument ? 'documents' : 'folders'}`
                : (isDraggingDocument ? 'Document' : 'Folder')
              }
            </p>
            {hasMultiple && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                Including: {data.name}
              </p>
            )}
          </div>

          {/* Drag indicator */}
          <div className="flex-shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
        </div>

        {/* Visual feedback for valid drop zone */}
        {isOverDropZone && (
          <div className="mt-2 flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Drop to move{hasMultiple ? ` ${selectedCount} items` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderDragDropProvider;