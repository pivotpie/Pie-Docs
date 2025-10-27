import React, { useState, useCallback } from 'react';
import type { DocumentFolder } from '@/types/domain/Document';

interface FolderPermissionsProps {
  isOpen: boolean;
  onClose: () => void;
  folder: DocumentFolder;
  onUpdate: (permissions: Partial<DocumentFolder['permissions']>) => void;
}

interface UserPermission {
  id: string;
  name: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  permissions: DocumentFolder['permissions'];
}

interface GroupPermission {
  id: string;
  name: string;
  memberCount: number;
  permissions: DocumentFolder['permissions'];
}

const FolderPermissions: React.FC<FolderPermissionsProps> = ({
  isOpen,
  onClose,
  folder,
  onUpdate,
}) => {
  const [localPermissions, setLocalPermissions] = useState(folder.permissions);
  const [inheritPermissions, setInheritPermissions] = useState(folder.permissions.inheritPermissions);
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'groups'>('general');

  // Mock data - In real implementation, these would come from API
  const [userPermissions] = useState<UserPermission[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'admin',
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canCreateChild: true,
        canManagePermissions: true,
        inheritPermissions: false,
      },
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'editor',
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: false,
        canCreateChild: true,
        canManagePermissions: false,
        inheritPermissions: false,
      },
    },
  ]);

  const [groupPermissions] = useState<GroupPermission[]>([
    {
      id: '1',
      name: 'Document Managers',
      memberCount: 5,
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canCreateChild: true,
        canManagePermissions: false,
        inheritPermissions: false,
      },
    },
    {
      id: '2',
      name: 'Read Only Users',
      memberCount: 12,
      permissions: {
        canView: true,
        canEdit: false,
        canDelete: false,
        canCreateChild: false,
        canManagePermissions: false,
        inheritPermissions: false,
      },
    },
  ]);

  const handlePermissionChange = useCallback((
    permission: keyof DocumentFolder['permissions'],
    value: boolean
  ) => {
    setLocalPermissions(prev => ({ ...prev, [permission]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onUpdate({
      ...localPermissions,
      inheritPermissions,
    });
    onClose();
  }, [localPermissions, inheritPermissions, onUpdate, onClose]);

  const getPermissionPreset = useCallback((preset: 'viewer' | 'editor' | 'admin') => {
    switch (preset) {
      case 'viewer':
        return {
          canView: true,
          canEdit: false,
          canDelete: false,
          canCreateChild: false,
          canManagePermissions: false,
        };
      case 'editor':
        return {
          canView: true,
          canEdit: true,
          canDelete: false,
          canCreateChild: true,
          canManagePermissions: false,
        };
      case 'admin':
        return {
          canView: true,
          canEdit: true,
          canDelete: true,
          canCreateChild: true,
          canManagePermissions: true,
        };
    }
  }, []);

  const applyPreset = useCallback((preset: 'viewer' | 'editor' | 'admin') => {
    const presetPermissions = getPermissionPreset(preset);
    setLocalPermissions(prev => ({ ...prev, ...presetPermissions }));
  }, [getPermissionPreset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Folder Permissions - {folder.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'general'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Users ({userPermissions.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'groups'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Groups ({groupPermissions.length})
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Inheritance Setting */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={inheritPermissions}
                    onChange={(e) => setInheritPermissions(e.target.checked)}
                    className="mr-3 rounded text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Inherit permissions from parent folder
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      When enabled, this folder will use permissions from its parent folder
                    </div>
                  </div>
                </label>
              </div>

              {/* Permission Presets */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Presets</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => applyPreset('viewer')}
                    className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">Viewer</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Read-only access</div>
                  </button>
                  <button
                    onClick={() => applyPreset('editor')}
                    className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">Editor</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Can modify content</div>
                  </button>
                  <button
                    onClick={() => applyPreset('admin')}
                    className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">Admin</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Full control</div>
                  </button>
                </div>
              </div>

              {/* Detailed Permissions */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Detailed Permissions</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">View</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Can view folder and its contents</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={localPermissions.canView}
                      onChange={(e) => handlePermissionChange('canView', e.target.checked)}
                      className="rounded text-blue-600"
                      disabled={inheritPermissions}
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Edit</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Can modify folder properties and documents</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={localPermissions.canEdit}
                      onChange={(e) => handlePermissionChange('canEdit', e.target.checked)}
                      className="rounded text-blue-600"
                      disabled={inheritPermissions}
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Delete</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Can delete folder and its contents</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={localPermissions.canDelete}
                      onChange={(e) => handlePermissionChange('canDelete', e.target.checked)}
                      className="rounded text-blue-600"
                      disabled={inheritPermissions}
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Create Subfolders</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Can create child folders</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={localPermissions.canCreateChild}
                      onChange={(e) => handlePermissionChange('canCreateChild', e.target.checked)}
                      className="rounded text-blue-600"
                      disabled={inheritPermissions}
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Manage Permissions</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Can modify folder permissions</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={localPermissions.canManagePermissions}
                      onChange={(e) => handlePermissionChange('canManagePermissions', e.target.checked)}
                      className="rounded text-blue-600"
                      disabled={inheritPermissions}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">User Permissions</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Add User
                </button>
              </div>

              <div className="space-y-3">
                {userPermissions.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <select
                        value={user.role}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="text-red-600 hover:text-red-800 dark:text-red-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groups Tab */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Group Permissions</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Add Group
                </button>
              </div>

              <div className="space-y-3">
                {groupPermissions.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{group.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{group.memberCount} members</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <select className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="text-red-600 hover:text-red-800 dark:text-red-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderPermissions;