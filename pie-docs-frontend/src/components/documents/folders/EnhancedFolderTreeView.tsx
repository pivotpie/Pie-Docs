import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { DocumentFolder } from '@/types/domain/Document';
import {
  selectFolderHierarchy,
  selectExpandedFolders,
  selectSelectedFolderIds,
  toggleFolderExpanded,
  selectFolder,
  clearFolderSelection,
  createFolder,
  deleteFolder,
  updateFolder,
  navigateToFolder
} from '@/store/slices/documentsSlice';
import { Input } from '@/components/ui/Input';

interface EnhancedFolderTreeViewProps {
  onFolderSelect?: (folderId: string) => void;
  onFolderContextMenu?: (folderId: string, event: React.MouseEvent) => void;
  searchable?: boolean;
  showContextMenu?: boolean;
  enableKeyboardNavigation?: boolean;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  folderId: string;
}

export const EnhancedFolderTreeView: React.FC<EnhancedFolderTreeViewProps> = ({
  onFolderSelect,
  onFolderContextMenu,
  searchable = true,
  showContextMenu = true,
  enableKeyboardNavigation = true
}) => {
  const dispatch = useDispatch();
  const folderHierarchy = useSelector(selectFolderHierarchy);
  const expandedFolders = useSelector(selectExpandedFolders);
  const selectedFolderIds = useSelector(selectSelectedFolderIds);

  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    folderId: ''
  });
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [focusedFolderId, setFocusedFolderId] = useState<string | null>(null);

  const treeRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingFolderId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingFolderId]);

  const filteredHierarchy = useCallback((folders: DocumentFolder[]): DocumentFolder[] => {
    if (!searchQuery.trim()) return folders;

    const query = searchQuery.toLowerCase();
    return folders.filter(folder => {
      const matchesName = folder.name.toLowerCase().includes(query);
      const matchesPath = folder.path.toLowerCase().includes(query);
      const hasMatchingChildren = folder.childFolders.length > 0; // Simplified check

      return matchesName || matchesPath || hasMatchingChildren;
    });
  }, [searchQuery]);

  const handleFolderClick = useCallback((folderId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      dispatch(selectFolder(folderId));
    } else if (event.shiftKey && selectedFolderIds.length > 0) {
      // Range select with Shift (simplified implementation)
      dispatch(selectFolder(folderId));
    } else {
      // Single select
      dispatch(clearFolderSelection());
      dispatch(selectFolder(folderId));
      dispatch(navigateToFolder(folderId));
    }

    setFocusedFolderId(folderId);

    if (onFolderSelect) {
      onFolderSelect(folderId);
    }
  }, [dispatch, selectedFolderIds.length, onFolderSelect]);

  const handleFolderDoubleClick = useCallback((folderId: string) => {
    dispatch(toggleFolderExpanded(folderId));
  }, [dispatch]);

  const handleContextMenu = useCallback((folderId: string, event: React.MouseEvent) => {
    if (!showContextMenu) return;

    event.preventDefault();

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      folderId
    });

    if (onFolderContextMenu) {
      onFolderContextMenu(folderId, event);
    }
  }, [showContextMenu, onFolderContextMenu]);

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handleContextMenuAction = useCallback((action: string) => {
    const { folderId } = contextMenu;

    switch (action) {
      case 'create':
        const newFolder = {
          id: `folder_${Date.now()}`,
          name: 'New Folder',
          path: `/new-folder-${Date.now()}`,
          type: 'regular' as const,
          parentId: folderId === 'root' ? undefined : folderId,
          childFolders: [],
          documentCount: 0,
          totalSize: 0,
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          documentRefs: [],
          permissions: {
            canView: true,
            canEdit: true,
            canDelete: true,
            canCreateChild: true,
            canManagePermissions: true,
            inheritPermissions: true
          },
          statistics: {
            documentCount: 0,
            totalSize: 0,
            averageFileSize: 0,
            lastActivity: new Date().toISOString(),
            fileTypeDistribution: {}
          }
        };
        dispatch(createFolder(newFolder));
        break;

      case 'rename':
        const folder = folderHierarchy.find(f => f.id === folderId);
        if (folder) {
          setRenamingFolderId(folderId);
          setRenameValue(folder.name);
        }
        break;

      case 'delete':
        if (confirm('Are you sure you want to delete this folder?')) {
          dispatch(deleteFolder(folderId));
        }
        break;

      case 'expand':
        dispatch(toggleFolderExpanded(folderId));
        break;
    }

    hideContextMenu();
  }, [contextMenu, folderHierarchy, dispatch, hideContextMenu]);

  const handleRename = useCallback((folderId: string, newName: string) => {
    if (newName.trim() && newName !== renameValue) {
      dispatch(updateFolder({
        folderId,
        updates: { name: newName.trim() }
      }));
    }
    setRenamingFolderId(null);
    setRenameValue('');
  }, [dispatch, renameValue]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, folderId: string) => {
    if (!enableKeyboardNavigation) return;

    switch (event.key) {
      case 'Enter':
        if (renamingFolderId === folderId) {
          handleRename(folderId, renameValue);
        } else {
          handleFolderClick(folderId, event as any);
        }
        break;

      case 'Escape':
        if (renamingFolderId === folderId) {
          setRenamingFolderId(null);
          setRenameValue('');
        }
        break;

      case 'F2':
        event.preventDefault();
        setRenamingFolderId(folderId);
        const folder = folderHierarchy.find(f => f.id === folderId);
        if (folder) {
          setRenameValue(folder.name);
        }
        break;

      case 'Delete':
        if (selectedFolderIds.includes(folderId) && !renamingFolderId) {
          if (confirm('Are you sure you want to delete the selected folder(s)?')) {
            selectedFolderIds.forEach(id => dispatch(deleteFolder(id)));
          }
        }
        break;

      case 'ArrowRight':
        if (!expandedFolders.includes(folderId)) {
          dispatch(toggleFolderExpanded(folderId));
        }
        break;

      case 'ArrowLeft':
        if (expandedFolders.includes(folderId)) {
          dispatch(toggleFolderExpanded(folderId));
        }
        break;
    }
  }, [enableKeyboardNavigation, renamingFolderId, renameValue, handleRename, handleFolderClick, folderHierarchy, selectedFolderIds, expandedFolders, dispatch]);

  const renderFolder = useCallback((folder: DocumentFolder, level: number = 0) => {
    const isExpanded = expandedFolders.includes(folder.id);
    const isSelected = selectedFolderIds.includes(folder.id);
    const isFocused = focusedFolderId === folder.id;
    const isRenaming = renamingFolderId === folder.id;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 text-blue-900' : ''
          } ${isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
          style={{ paddingLeft: `${(level * 20) + 8}px` }}
          onClick={(e) => handleFolderClick(folder.id, e)}
          onDoubleClick={() => handleFolderDoubleClick(folder.id)}
          onContextMenu={(e) => handleContextMenu(folder.id, e)}
          onKeyDown={(e) => handleKeyDown(e, folder.id)}
          tabIndex={0}
          role="treeitem"
          aria-expanded={isExpanded}
          aria-selected={isSelected}
        >
          {folder.childFolders.length > 0 && (
            <button
              className="w-4 h-4 flex items-center justify-center mr-1 hover:bg-gray-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(toggleFolderExpanded(folder.id));
              }}
              aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          <span className="w-4 h-4 mr-2 flex items-center justify-center">
            {folder.type === 'smart' ? '🔍' : isExpanded ? '📂' : '📁'}
          </span>

          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRename(folder.id, renameValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename(folder.id, renameValue);
                } else if (e.key === 'Escape') {
                  setRenamingFolderId(null);
                  setRenameValue('');
                }
                e.stopPropagation();
              }}
              className="flex-1 px-1 py-0 border rounded text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-sm truncate">
              {folder.name}
            </span>
          )}

          <span className="text-xs text-gray-500 ml-2">
            {folder.documentCount}
          </span>
        </div>

        {isExpanded && folder.childFolders.length > 0 && (
          <div role="group">
            {folder.childFolders.map(childId => {
              const childFolder = folderHierarchy.find(f => f.id === childId);
              return childFolder ? renderFolder(childFolder, level + 1) : null;
            })}
          </div>
        )}
      </div>
    );
  }, [
    expandedFolders,
    selectedFolderIds,
    focusedFolderId,
    renamingFolderId,
    renameValue,
    folderHierarchy,
    handleFolderClick,
    handleFolderDoubleClick,
    handleContextMenu,
    handleKeyDown,
    dispatch,
    handleRename
  ]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => hideContextMenu();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [hideContextMenu]);

  const filteredFolders = filteredHierarchy(folderHierarchy);

  return (
    <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg">
      {searchable && (
        <div className="p-3 border-b border-gray-200">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search folders..."
            className="text-sm"
          />
        </div>
      )}

      <div
        ref={treeRef}
        className="flex-1 overflow-y-auto p-2"
        role="tree"
        aria-label="Folder tree"
      >
        {filteredFolders.length > 0 ? (
          filteredFolders
            .filter(folder => !folder.parentId) // Root folders only
            .map(folder => renderFolder(folder))
        ) : (
          <div className="text-center text-gray-500 text-sm py-4">
            {searchQuery ? 'No folders match your search' : 'No folders found'}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
            onClick={() => handleContextMenuAction('create')}
          >
            Create Folder
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
            onClick={() => handleContextMenuAction('rename')}
          >
            Rename
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
            onClick={() => handleContextMenuAction('expand')}
          >
            {expandedFolders.includes(contextMenu.folderId) ? 'Collapse' : 'Expand'}
          </button>
          <hr className="my-1" />
          <button
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => handleContextMenuAction('delete')}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedFolderTreeView;