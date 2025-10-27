import React, { useState, useEffect } from 'react';
import {
  FolderIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ChevronRightIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';

interface Folder {
  id: string;
  name: string;
  path: string;
  parent_id?: string | null;
  description?: string;
  created_at: string;
}

interface FolderSelectorProps {
  selectedFolderId?: string;
  onFolderSelect: (folderId: string, folderPath: string) => void;
  onCreateNew?: () => void;
  className?: string;
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  selectedFolderId,
  onFolderSelect,
  onCreateNew,
  className = ''
}) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string>('');

  // Load available folders
  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/folders?status=active&page=1&page_size=100');
      const data = await response.json();
      setFolders(data.folders || data || []);
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter folder name');
      return;
    }

    try {
      const response = await fetch('/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          description: newFolderDescription,
          parent_id: newFolderParentId || null
        })
      });

      if (response.ok) {
        const newFolder = await response.json();
        setFolders([newFolder, ...folders]);
        onFolderSelect(newFolder.id, newFolder.path || newFolder.name);
        setShowNewFolderModal(false);
        setNewFolderName('');
        setNewFolderDescription('');
        setNewFolderParentId('');
      } else {
        const error = await response.json();
        alert(`Failed to create folder: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    }
  };

  const filteredFolders = folders.filter(folder =>
    folder.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.path?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const buildFolderPath = (folder: Folder): string => {
    if (folder.path) return folder.path;
    // Build path from parent hierarchy if needed
    let path = folder.name;
    let current = folder;
    while (current.parent_id) {
      const parent = folders.find(f => f.id === current.parent_id);
      if (parent) {
        path = `${parent.name} / ${path}`;
        current = parent;
      } else {
        break;
      }
    }
    return path;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Digital Location (Folder)</h4>
        <button
          onClick={() => onCreateNew ? onCreateNew() : setShowNewFolderModal(true)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Create New
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search folders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
      </div>

      {/* Folder List */}
      <div className={`border rounded-lg max-h-64 overflow-y-auto ${
        theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
      }`}>
        {isLoading ? (
          <div className={`p-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading folders...
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="p-4 text-center">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No folders found
            </p>
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="mt-2 text-sm text-green-500 hover:text-green-400"
            >
              Create your first folder
            </button>
          </div>
        ) : (
          <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filteredFolders.map((folder) => {
              const folderPath = buildFolderPath(folder);
              const isSelected = selectedFolderId === folder.id;

              return (
                <div
                  key={folder.id}
                  onClick={() => onFolderSelect(folder.id, folderPath)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? theme === 'dark'
                        ? 'bg-green-900/30 border-l-4 border-green-500'
                        : 'bg-green-50 border-l-4 border-green-500'
                      : theme === 'dark'
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {folder.parent_id ? (
                        <FolderOpenIcon className={`h-5 w-5 flex-shrink-0 ${
                          isSelected
                            ? 'text-green-400'
                            : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                      ) : (
                        <FolderIcon className={`h-5 w-5 flex-shrink-0 ${
                          isSelected
                            ? 'text-green-400'
                            : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isSelected
                            ? theme === 'dark' ? 'text-green-300' : 'text-green-900'
                            : theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {folder.name}
                        </p>
                        {folderPath !== folder.name && (
                          <p className={`text-xs mt-0.5 flex items-center ${
                            isSelected
                              ? theme === 'dark' ? 'text-green-400' : 'text-green-700'
                              : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <span className="truncate">{folderPath}</span>
                          </p>
                        )}
                        {folder.description && (
                          <p className={`text-xs mt-1 line-clamp-1 ${
                            isSelected
                              ? theme === 'dark' ? 'text-green-500' : 'text-green-600'
                              : theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                          }`}>
                            {folder.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckIcon className={`h-5 w-5 ml-2 flex-shrink-0 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${
            theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Create New Folder
              </h3>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name (e.g., Invoices, Contracts)"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Description (Optional)
                </label>
                <textarea
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Enter folder description"
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Parent Folder (Optional)
                </label>
                <select
                  value={newFolderParentId}
                  onChange={(e) => setNewFolderParentId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">None (Root Level)</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {buildFolderPath(folder)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:bg-gray-400"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderSelector;
