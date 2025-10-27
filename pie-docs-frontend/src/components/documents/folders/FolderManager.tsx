import React, { useState, useEffect } from 'react';
import { foldersService } from '@/services/api/foldersService';

// Type definitions
export interface Folder {
  id: string;
  name: string;
  itemCount: number;
  modified: string;
  type: 'folder';
  parentId?: string;
  children?: Folder[];
  path?: string;
  size?: string;
  owner?: string;
  shared?: boolean;
  color?: string;
  description?: string;
}

export type FolderViewMode = 'org-tree' | 'classic-tree' | 'grid' | 'list';

interface TreeNodeProps {
  folder: Folder;
  selectedFolder: Folder | null;
  expandedFolders: Set<string>;
  onSelect: (folder: Folder) => void;
  onToggleExpand: (folderId: string) => void;
  level: number;
}

// OrgTreeNode Component
const OrgTreeNode: React.FC<TreeNodeProps> = ({ folder, selectedFolder, expandedFolders, onSelect, onToggleExpand, level }) => {
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolder?.id === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/40 bg-blue-500/10',
    purple: 'border-purple-500/40 bg-purple-500/10',
    green: 'border-green-500/40 bg-green-500/10',
    orange: 'border-orange-500/40 bg-orange-500/10',
  };

  return (
    <div className="flex flex-col items-center">
      {/* Folder Node */}
      <div
        className={`
          relative p-3 rounded-lg border-2 cursor-pointer transition-all min-w-[200px] max-w-[150px]
          ${isSelected ? 'border-indigo-500/60 bg-indigo-500/20 shadow-lg shadow-indigo-500/20' : colorClasses[folder.color || ''] || 'border-white/20 bg-white/5'}
        `}
        onClick={() => onSelect(folder)}
        onDoubleClick={() => hasChildren && onToggleExpand(folder.id)}
      >
        <div className="flex flex-col items-center text-center">
          <div className="text-2xl mb-2">
            {isExpanded ? '📂' : '📁'}
          </div>
          <div className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
            {folder.name}
            {folder.shared && <span className="text-xs">👥</span>}
          </div>
          <div className="text-xs text-white/60 mb-1">
            {folder.itemCount} items • {folder.size || 'N/A'}
          </div>
          <div className="text-xs text-white/50">{folder.owner}</div>
          {hasChildren && (
            <div className="mt-2 text-xs text-white/40">
              {isExpanded ? '▼ Double-click to collapse' : '▶ Double-click to expand'}
            </div>
          )}
        </div>
      </div>

      {/* Vertical Connection Line */}
      {hasChildren && isExpanded && (
        <div className="w-0.5 h-8 bg-white/20 my-2" />
      )}

      {/* Children Container */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Horizontal Line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20" style={{ top: '-16px' }} />

          {/* Children Grid */}
          <div className="flex gap-6 items-start justify-center">
            {folder.children!.map((child) => (
              <div key={child.id} className="relative">
                {/* Vertical line to this child */}
                <div className="absolute w-0.5 h-4 bg-white/20 left-1/2 -translate-x-1/2" style={{ top: '-16px' }} />

                <OrgTreeNode
                  folder={child}
                  selectedFolder={selectedFolder}
                  expandedFolders={expandedFolders}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                  level={level + 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ClassicTreeNode Component
const ClassicTreeNode: React.FC<TreeNodeProps> = ({ folder, selectedFolder, expandedFolders, onSelect, onToggleExpand, level }) => {
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolder?.id === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all
          ${isSelected ? 'bg-indigo-500/20 text-white' : 'text-white/80'}
        `}
        style={{ paddingLeft: `${12 + level * 20}px` }}
        onClick={() => onSelect(folder)}
        onDoubleClick={() => hasChildren && onToggleExpand(folder.id)}
      >
        <span className="w-4 text-white/60">
          {hasChildren && (isExpanded ? '▼' : '▶')}
        </span>
        <span>{hasChildren ? (isExpanded ? '📂' : '📁') : '📄'}</span>
        <span className="flex-1 text-sm">{folder.name}</span>
        <span className="text-xs text-white/50">{folder.itemCount}</span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {folder.children!.map(child => (
            <ClassicTreeNode
              key={child.id}
              folder={child}
              selectedFolder={selectedFolder}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main FolderManager Component
export interface FolderManagerProps {}

const FolderManager: React.FC<FolderManagerProps> = () => {
  const [folderViewMode, setFolderViewMode] = useState<FolderViewMode>('org-tree');
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root'])); // Start with root expanded
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderTree, setFolderTree] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load folders from API
  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load flat folder list
      const response = await foldersService.getFolders({ page: 1, page_size: 100 });

      // Transform API folders to local format
      const transformedFolders: Folder[] = response.folders.map((folder: any) => ({
        id: folder.id,
        name: folder.name,
        itemCount: folder.document_count || 0,
        modified: new Date(folder.updated_at || folder.created_at).toLocaleDateString(),
        type: 'folder' as const,
        parentId: folder.parent_id,
        path: folder.path || `/${folder.name}`,
        size: formatSize(folder.total_size || 0),
        owner: 'Admin', // TODO: Get from folder owner_id
        shared: folder.is_shared || false,
        color: folder.color,
        description: folder.description
      }));

      setFolders(transformedFolders);

      // Build tree structure
      const tree = buildFolderTree(transformedFolders);
      setFolderTree(tree);

    } catch (err) {
      console.error('Error loading folders:', err);
      setError('Failed to load folders');
      // Fallback to mock data if API fails
      setFolderTree(mockFolderTree);
      setFolders(mockFolders);
    } finally {
      setLoading(false);
    }
  };

  const buildFolderTree = (flatFolders: Folder[]): Folder[] => {
    const folderMap = new Map<string, Folder>();
    const rootChildren: Folder[] = [];

    // Create map of all folders
    flatFolders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Build tree
    flatFolders.forEach(folder => {
      const node = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parent = folderMap.get(folder.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        rootChildren.push(node);
      }
    });

    // Create virtual root folder to contain all top-level folders
    const rootFolder: Folder = {
      id: 'root',
      name: 'All Documents',
      itemCount: flatFolders.reduce((sum, f) => sum + f.itemCount, 0),
      modified: new Date().toLocaleDateString(),
      type: 'folder',
      path: '/',
      size: flatFolders.reduce((sum, f) => {
        const bytes = parseInt(f.size?.replace(/[^\d]/g, '') || '0');
        return sum + bytes;
      }, 0).toString(),
      owner: 'System',
      shared: false,
      children: rootChildren
    };

    return [rootFolder];
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // CRUD Operations
  const handleCreateFolder = async (folderData: { name: string; parent_id?: string; description?: string; color?: string }) => {
    try {
      setLoading(true);
      await foldersService.createFolder(folderData);
      await loadFolders(); // Reload folders
      setShowNewFolderInput(false);
      setNewFolderName('');
    } catch (err) {
      console.error('Error creating folder:', err);
      setError('Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFolder = async (folderId: string, folderData: { name?: string; description?: string; color?: string }) => {
    try {
      setLoading(true);
      await foldersService.updateFolder(folderId, folderData);
      await loadFolders(); // Reload folders
    } catch (err) {
      console.error('Error updating folder:', err);
      setError('Failed to update folder');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      setLoading(true);
      await foldersService.deleteFolder(folderId);
      await loadFolders(); // Reload folders
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError('Failed to delete folder');
    } finally {
      setLoading(false);
    }
  };

  // Fallback mock data for when API is not available
  const mockFolderTree: Folder[] = [
    {
      id: 'root',
      name: 'Company Documents',
      itemCount: 450,
      modified: '2025-10-02',
      type: 'folder',
      path: '/',
      size: '12.5 GB',
      owner: 'Admin',
      color: 'blue',
      children: [
        {
          id: 'legal',
          name: 'Legal',
          itemCount: 156,
          modified: '2025-09-28',
          type: 'folder',
          parentId: 'root',
          path: '/Legal',
          size: '3.2 GB',
          owner: 'Legal Team',
          color: 'purple',
          children: [
            { id: 'contracts', name: 'Contracts', itemCount: 89, modified: '2025-09-28', type: 'folder', parentId: 'legal', path: '/Legal/Contracts', size: '1.8 GB', owner: 'Legal Team' },
            { id: 'patents', name: 'Patents & IP', itemCount: 35, modified: '2025-09-26', type: 'folder', parentId: 'legal', path: '/Legal/Patents & IP', size: '850 MB', owner: 'Legal Team' },
            { id: 'compliance', name: 'Compliance', itemCount: 32, modified: '2025-09-25', type: 'folder', parentId: 'legal', path: '/Legal/Compliance', size: '550 MB', owner: 'Legal Team' },
          ]
        },
        {
          id: 'finance',
          name: 'Finance',
          itemCount: 189,
          modified: '2025-09-27',
          type: 'folder',
          parentId: 'root',
          path: '/Finance',
          size: '4.8 GB',
          owner: 'Finance Team',
          color: 'green',
          children: [
            { id: 'invoices', name: 'Invoices', itemCount: 120, modified: '2025-09-27', type: 'folder', parentId: 'finance', path: '/Finance/Invoices', size: '2.4 GB', owner: 'Finance Team' },
            { id: 'reports', name: 'Financial Reports', itemCount: 45, modified: '2025-09-26', type: 'folder', parentId: 'finance', path: '/Finance/Financial Reports', size: '1.5 GB', owner: 'Finance Team' },
            { id: 'budgets', name: 'Budgets', itemCount: 24, modified: '2025-09-20', type: 'folder', parentId: 'finance', path: '/Finance/Budgets', size: '900 MB', owner: 'Finance Team' },
          ]
        },
        {
          id: 'hr',
          name: 'Human Resources',
          itemCount: 105,
          modified: '2025-09-29',
          type: 'folder',
          parentId: 'root',
          path: '/Human Resources',
          size: '2.1 GB',
          owner: 'HR Team',
          color: 'orange',
          shared: true,
          children: [
            { id: 'employees', name: 'Employee Records', itemCount: 67, modified: '2025-09-29', type: 'folder', parentId: 'hr', path: '/Human Resources/Employee Records', size: '1.2 GB', owner: 'HR Team' },
            { id: 'policies', name: 'Policies', itemCount: 23, modified: '2025-09-15', type: 'folder', parentId: 'hr', path: '/Human Resources/Policies', size: '450 MB', owner: 'HR Team' },
            { id: 'training', name: 'Training Materials', itemCount: 15, modified: '2025-09-10', type: 'folder', parentId: 'hr', path: '/Human Resources/Training Materials', size: '450 MB', owner: 'HR Team' },
          ]
        },
      ]
    }
  ];

  const mockFolders: Folder[] = [
    { id: 'f1', name: 'Q3 2025 Contracts', itemCount: 24, modified: '2025-09-28', type: 'folder' },
    { id: 'f2', name: 'Invoices', itemCount: 156, modified: '2025-09-27', type: 'folder' },
    { id: 'f3', name: 'Patents & IP', itemCount: 12, modified: '2025-09-26', type: 'folder' },
    { id: 'f4', name: 'Legal Documents', itemCount: 89, modified: '2025-09-25', type: 'folder' },
  ];

  // Handlers
  const toggleFolderExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderSelect = (folder: Folder) => {
    setSelectedFolder(folder);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Loading/Error States */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel p-6 rounded-lg">
            <div className="text-white text-center">
              <div className="text-2xl mb-2">⏳</div>
              <div>Loading folders...</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
          <div className="text-red-200 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => {
                setError(null);
                loadFolders();
              }}
              className="ml-auto btn-glass px-3 py-1 text-xs"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* View Switcher - Above Main Area */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 glass-strong">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Folder Manager</h2>
            {folders.length > 0 && (
              <span className="text-sm text-white/60">({folders.length} folders)</span>
            )}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setFolderViewMode('org-tree')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  folderViewMode === 'org-tree' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
                title="Organization Tree View"
              >
                🏢 Org Tree
              </button>
              <button
                onClick={() => setFolderViewMode('classic-tree')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  folderViewMode === 'classic-tree' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
                title="Classic Tree View"
              >
                📂 Classic
              </button>
              <button
                onClick={() => setFolderViewMode('grid')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  folderViewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
                title="Grid View"
              >
                ▦ Grid
              </button>
              <button
                onClick={() => setFolderViewMode('list')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  folderViewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
                title="List View"
              >
                ☰ List
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewFolderInput(true)}
              disabled={!selectedFolder}
              className="btn-glass px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!selectedFolder ? "Select a folder first" : "Create new subfolder"}
            >
              <span>➕</span>
              New Folder
            </button>
            <input
              type="text"
              placeholder="Search folders..."
              className="glass-input text-sm px-3 py-2 w-64"
            />
          </div>
        </div>

        {/* New Folder Input */}
        {showNewFolderInput && selectedFolder && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
            <span className="text-sm text-white/70">Creating subfolder in: <span className="text-white font-medium">{selectedFolder.name}</span></span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="flex-1 glass-input text-sm px-3 py-2"
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
              }}
              autoFocus
            />
            <select className="glass-input text-sm px-3 py-2">
              <option value="public" className="bg-slate-800 text-white">🌍 Public</option>
              <option value="internal" className="bg-slate-800 text-white">🏢 Internal</option>
              <option value="confidential" className="bg-slate-800 text-white">🔒 Confidential</option>
              <option value="private" className="bg-slate-800 text-white">🔐 Private</option>
            </select>
            <button onClick={handleCreateFolder} className="btn-glass px-4 py-2 text-sm">Create</button>
            <button onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }} className="btn-glass px-4 py-2 text-sm">Cancel</button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Folder Tree/View Area */}
        <div className="flex-1 overflow-auto p-6">
          {folderViewMode === 'org-tree' ? (
            /* Organization Tree View */
            <div className="flex justify-center items-start min-h-full py-8 px-8">
              <div className="space-y-8 w-full max-w-[1600px]">
                {folderTree.map(folder => (
                  <OrgTreeNode
                    key={folder.id}
                    folder={folder}
                    selectedFolder={selectedFolder}
                    expandedFolders={expandedFolders}
                    onSelect={handleFolderSelect}
                    onToggleExpand={toggleFolderExpand}
                    level={0}
                  />
                ))}
              </div>
            </div>
          ) : folderViewMode === 'classic-tree' ? (
            /* Classic Tree View */
            <div className="glass-panel p-4 rounded-lg">
              <div className="space-y-1">
                {folderTree.map(folder => (
                  <ClassicTreeNode
                    key={folder.id}
                    folder={folder}
                    selectedFolder={selectedFolder}
                    expandedFolders={expandedFolders}
                    onSelect={handleFolderSelect}
                    onToggleExpand={toggleFolderExpand}
                    level={0}
                  />
                ))}
              </div>
            </div>
          ) : folderViewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-4 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => handleFolderSelect(folder)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedFolder?.id === folder.id
                      ? 'bg-indigo-500/20 border-2 border-indigo-500/40'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="text-4xl mb-2">📁</div>
                  <div className="text-sm font-medium text-white mb-1">{folder.name}</div>
                  <div className="text-xs text-white/60">{folder.itemCount} items</div>
                  <div className="text-xs text-white/40 mt-1">{folder.modified}</div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="glass-panel rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/60">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/60">Items</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/60">Modified</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/60">Owner</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-white/60">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((folder) => (
                    <tr
                      key={folder.id}
                      onClick={() => handleFolderSelect(folder)}
                      className={`border-b border-white/5 cursor-pointer transition-all ${
                        selectedFolder?.id === folder.id
                          ? 'bg-indigo-500/20'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📁</span>
                          <span className="text-sm text-white font-medium">{folder.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70">{folder.itemCount}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{folder.modified}</td>
                      <td className="px-4 py-3 text-sm text-white/70">Admin</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt('Enter new folder name:', folder.name);
                            if (newName && newName !== folder.name) {
                              handleUpdateFolder(folder.id, { name: newName });
                            }
                          }}
                          className="btn-glass px-3 py-1 text-xs mr-2"
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="btn-glass px-3 py-1 text-xs"
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Panel - Folder Details */}
        {selectedFolder && (
          <div className="w-80 border-l border-white/10 glass-strong overflow-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">📁</span>
                Folder Details
              </h3>

              <div className="space-y-4">
                {/* Folder Name */}
                <div>
                  <div className="text-xs text-white/60 mb-1">Name</div>
                  <div className="text-sm text-white font-medium">{selectedFolder.name}</div>
                </div>

                {/* Path */}
                {selectedFolder.path && (
                  <div>
                    <div className="text-xs text-white/60 mb-1">Path</div>
                    <div className="text-xs text-white/80 font-mono bg-white/5 px-2 py-1 rounded">{selectedFolder.path}</div>
                  </div>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-panel p-3 rounded-lg">
                    <div className="text-xs text-white/60">Items</div>
                    <div className="text-lg font-bold text-white">{selectedFolder.itemCount}</div>
                  </div>
                  {selectedFolder.size && (
                    <div className="glass-panel p-3 rounded-lg">
                      <div className="text-xs text-white/60">Size</div>
                      <div className="text-lg font-bold text-white">{selectedFolder.size}</div>
                    </div>
                  )}
                </div>

                {/* Owner */}
                {selectedFolder.owner && (
                  <div>
                    <div className="text-xs text-white/60 mb-1">Owner</div>
                    <div className="text-sm text-white">{selectedFolder.owner}</div>
                  </div>
                )}

                {/* Modified */}
                <div>
                  <div className="text-xs text-white/60 mb-1">Last Modified</div>
                  <div className="text-sm text-white">{selectedFolder.modified}</div>
                </div>

                {/* Tags */}
                <div>
                  <div className="text-xs text-white/60 mb-2">Access Level</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">🌍 Public</span>
                  </div>
                </div>

                {/* Shared */}
                {selectedFolder.shared && (
                  <div className="glass-panel p-3 rounded-lg border border-indigo-500/30">
                    <div className="flex items-center gap-2 text-sm text-indigo-300">
                      <span>👥</span>
                      <span>Shared with team</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>✏️</span>
                    Rename
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>🔗</span>
                    Share
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>📊</span>
                    Analytics
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2 text-red-400">
                    <span>🗑️</span>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderManager;
