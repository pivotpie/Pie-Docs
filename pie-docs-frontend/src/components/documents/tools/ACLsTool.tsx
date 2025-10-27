/**
 * ACLsTool - Document Access Control Lists
 * Manages document-level permissions for roles
 * Similar to Role & Permission Manager but scoped to the current document
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import type { DocumentToolProps } from './types';
import type {
  DocumentPermission,
  DocumentShare,
  DocumentPermissionCreate,
} from '@/services/api/documentPermissionsService';
import documentPermissionsService from '@/services/api/documentPermissionsService';
import { rolesPermissionsService } from '@/services/api/rolesPermissionsService';
import type { Role } from '@/services/api/rolesPermissionsService';

type ViewMode = 'list' | 'card';
type FilterMode = 'all' | 'granted' | 'denied';

interface DocumentPermissionSet {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;
  can_download: boolean;
}

interface RolePermissionState {
  roleId: string;
  permissions: DocumentPermissionSet;
  originalPermissions: DocumentPermissionSet;
  permissionId?: string; // Existing permission ID if any
}

interface HistoryEntry {
  roleId: string;
  permissions: DocumentPermissionSet;
  timestamp: number;
}

// Document-specific permission definitions (matching backend schema)
const DOCUMENT_PERMISSIONS = [
  {
    id: 'can_view',
    name: 'View Document',
    description: 'View document content, metadata, and preview',
    group: 'Read Access',
    icon: '👁️',
  },
  {
    id: 'can_download',
    name: 'Download Document',
    description: 'Download document files to local device',
    group: 'Read Access',
    icon: '📥',
  },
  {
    id: 'can_edit',
    name: 'Edit Document',
    description: 'Modify document content, metadata, and properties',
    group: 'Write Access',
    icon: '✏️',
  },
  {
    id: 'can_delete',
    name: 'Delete Document',
    description: 'Permanently delete the document',
    group: 'Admin Access',
    icon: '🗑️',
  },
  {
    id: 'can_share',
    name: 'Share & Manage Access',
    description: 'Create share links and manage document permissions',
    group: 'Admin Access',
    icon: '🔗',
  },
];

const PERMISSION_GROUPS = ['Read Access', 'Write Access', 'Admin Access'];

export const ACLsTool: React.FC<DocumentToolProps & { onBack: () => void }> = ({
  document,
  onBack,
  className = '',
}) => {
  // Core State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data State
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Map<string, RolePermissionState>>(
    new Map()
  );
  const [isModified, setIsModified] = useState(false);

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(PERMISSION_GROUPS)
  );

  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Share links state
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Load initial data
  useEffect(() => {
    if (document?.id) {
      loadInitialData();
    }
  }, [document?.id]);

  // Track modifications
  useEffect(() => {
    if (selectedRole) {
      const roleState = rolePermissions.get(selectedRole.id);
      if (roleState) {
        const hasChanges = !arePermissionsEqual(
          roleState.permissions,
          roleState.originalPermissions
        );
        setIsModified(hasChanges);
      }
    }
  }, [rolePermissions, selectedRole]);

  const arePermissionsEqual = (a: DocumentPermissionSet, b: DocumentPermissionSet): boolean => {
    return Object.keys(a).every((key) => a[key as keyof DocumentPermissionSet] === b[key as keyof DocumentPermissionSet]);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load roles and document permissions in parallel
      const [rolesData, permissionsData, sharesData] = await Promise.all([
        rolesPermissionsService.getRoles({ page_size: 100, is_active: true }),
        documentPermissionsService.listDocumentPermissions(document.id),
        documentPermissionsService.listDocumentShares(document.id),
      ]);

      setRoles(rolesData.roles);
      setShares(sharesData);

      // Build permission map for all roles
      const permMap = new Map<string, RolePermissionState>();

      rolesData.roles.forEach((role) => {
        // Try to find existing permission by comparing both as strings
        const existingPerm = permissionsData.find((p) => {
          const pRoleId = String(p.role_id);
          const roleId = String(role.id);
          return pRoleId === roleId;
        });

        const permissions: DocumentPermissionSet = {
          can_view: existingPerm?.can_view || false,
          can_edit: existingPerm?.can_edit || false,
          can_delete: existingPerm?.can_delete || false,
          can_share: existingPerm?.can_share || false,
          can_download: existingPerm?.can_download || false,
        };

        permMap.set(role.id, {
          roleId: role.id,
          permissions: { ...permissions },
          originalPermissions: { ...permissions },
          permissionId: existingPerm?.id,
        });
      });

      setRolePermissions(permMap);

      if (rolesData.roles.length > 0) {
        setSelectedRole(rolesData.roles[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = (roleId: string, permissions: DocumentPermissionSet) => {
    const newEntry: HistoryEntry = {
      roleId,
      permissions: { ...permissions },
      timestamp: Date.now(),
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0 && selectedRole) {
      const prevEntry = history[historyIndex - 1];
      const roleState = rolePermissions.get(selectedRole.id);
      if (roleState) {
        const updated = new Map(rolePermissions);
        updated.set(selectedRole.id, {
          ...roleState,
          permissions: { ...prevEntry.permissions },
        });
        setRolePermissions(updated);
        setHistoryIndex(historyIndex - 1);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && selectedRole) {
      const nextEntry = history[historyIndex + 1];
      const roleState = rolePermissions.get(selectedRole.id);
      if (roleState) {
        const updated = new Map(rolePermissions);
        updated.set(selectedRole.id, {
          ...roleState,
          permissions: { ...nextEntry.permissions },
        });
        setRolePermissions(updated);
        setHistoryIndex(historyIndex + 1);
      }
    }
  };

  const handleTogglePermission = (permissionKey: keyof DocumentPermissionSet, isChecked: boolean) => {
    if (!selectedRole) return;

    const roleState = rolePermissions.get(selectedRole.id);
    if (!roleState) return;

    addToHistory(selectedRole.id, roleState.permissions);

    const updated = new Map(rolePermissions);
    updated.set(selectedRole.id, {
      ...roleState,
      permissions: {
        ...roleState.permissions,
        [permissionKey]: isChecked,
      },
    });
    setRolePermissions(updated);
  };

  const handleBulkToggle = (permissionKeys: string[], grant: boolean) => {
    if (!selectedRole) return;

    const roleState = rolePermissions.get(selectedRole.id);
    if (!roleState) return;

    addToHistory(selectedRole.id, roleState.permissions);

    const newPermissions = { ...roleState.permissions };
    permissionKeys.forEach((key) => {
      newPermissions[key as keyof DocumentPermissionSet] = grant;
    });

    const updated = new Map(rolePermissions);
    updated.set(selectedRole.id, {
      ...roleState,
      permissions: newPermissions,
    });
    setRolePermissions(updated);
  };

  const handleSaveChanges = async () => {
    if (!selectedRole || !isModified || !document?.id) return;

    try {
      setSaving(true);
      setError(null);

      const roleState = rolePermissions.get(selectedRole.id);
      if (!roleState) return;

      const permissionData: DocumentPermissionCreate = {
        ...roleState.permissions,
        role_id: selectedRole.id,
      };

      if (roleState.permissionId) {
        // Update existing permission
        await documentPermissionsService.updateDocumentPermission(
          document.id,
          roleState.permissionId,
          permissionData
        );
      } else {
        // Create new permission
        const created = await documentPermissionsService.grantDocumentPermission(
          document.id,
          permissionData
        );
        // Update local state with new permission ID
        const updated = new Map(rolePermissions);
        updated.set(selectedRole.id, {
          ...roleState,
          permissionId: created.id,
        });
        setRolePermissions(updated);
      }

      // Update original permissions
      const updated = new Map(rolePermissions);
      updated.set(selectedRole.id, {
        ...roleState,
        originalPermissions: { ...roleState.permissions },
      });
      setRolePermissions(updated);

      setIsModified(false);
      setHistory([]);
      setHistoryIndex(-1);
      setSuccessMessage('Permissions saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!selectedRole) return;

    const roleState = rolePermissions.get(selectedRole.id);
    if (!roleState) return;

    const updated = new Map(rolePermissions);
    updated.set(selectedRole.id, {
      ...roleState,
      permissions: { ...roleState.originalPermissions },
    });
    setRolePermissions(updated);
    setIsModified(false);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleCreateShare = async (shareType: 'public' | 'password') => {
    if (!document?.id) return;

    try {
      let share: DocumentShare;

      if (shareType === 'public') {
        share = await documentPermissionsService.createPublicShare(document.id, {
          can_download: true,
        });
      } else {
        const password = prompt('Enter password for this share:');
        if (!password) return;

        share = await documentPermissionsService.createPasswordProtectedShare(
          document.id,
          password,
          { can_download: true }
        );
      }

      // Copy URL to clipboard
      const url = documentPermissionsService.generateShareUrl(share.share_token);
      await navigator.clipboard.writeText(url);

      setSuccessMessage(`Share link created and copied to clipboard!`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reload shares
      const sharesData = await documentPermissionsService.listDocumentShares(document.id);
      setShares(sharesData);
      setShowShareDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share');
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!document?.id) return;

    if (!confirm('Are you sure you want to revoke this share link?')) return;

    try {
      await documentPermissionsService.revokeDocumentShare(document.id, shareId);
      const sharesData = await documentPermissionsService.listDocumentShares(document.id);
      setShares(sharesData);
      setSuccessMessage('Share link revoked');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke share');
    }
  };

  const copyShareLink = async (shareToken: string) => {
    const url = documentPermissionsService.generateShareUrl(shareToken);
    try {
      await navigator.clipboard.writeText(url);
      setSuccessMessage('Share link copied to clipboard!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleAllGroups = () => {
    if (expandedGroups.size === PERMISSION_GROUPS.length) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(PERMISSION_GROUPS));
    }
  };

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    if (!selectedRole) return [];

    const roleState = rolePermissions.get(selectedRole.id);
    if (!roleState) return [];

    let filtered = DOCUMENT_PERMISSIONS;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply permission filter
    if (filterMode !== 'all') {
      filtered = filtered.filter((p) => {
        const isGranted = roleState.permissions[p.id as keyof DocumentPermissionSet];
        return filterMode === 'granted' ? isGranted : !isGranted;
      });
    }

    return filtered;
  }, [selectedRole, rolePermissions, searchTerm, filterMode]);

  // Group filtered permissions
  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, typeof DOCUMENT_PERMISSIONS> = {};

    filteredPermissions.forEach((perm) => {
      if (!grouped[perm.group]) {
        grouped[perm.group] = [];
      }
      grouped[perm.group].push(perm);
    });

    return grouped;
  }, [filteredPermissions]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!selectedRole) return { total: 0, granted: 0, denied: 0, percentage: 0 };

    const roleState = rolePermissions.get(selectedRole.id);
    if (!roleState) return { total: 0, granted: 0, denied: 0, percentage: 0 };

    const total = DOCUMENT_PERMISSIONS.length;
    const granted = Object.values(roleState.permissions).filter(Boolean).length;
    const denied = total - granted;
    const percentage = total > 0 ? Math.round((granted / total) * 100) : 0;

    return { total, granted, denied, percentage };
  }, [selectedRole, rolePermissions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isModified) handleSaveChanges();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModified, historyIndex, history]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70 text-lg">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden -m-6">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                title="Back to preview"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Document Access Control</h2>
                <p className="text-white/60 mt-1">
                  Manage role-based permissions for <span className="text-indigo-400 font-medium">{document?.name || 'this document'}</span>
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md border border-purple-500/30">
                    ℹ️ Document-specific permissions
                  </span>
                  <span className="text-white/50">
                    These override system-level role permissions for this document only
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Undo/Redo */}
              {isModified && (
                <div className="flex items-center space-x-1 mr-2">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Undo (Ctrl+Z)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Redo (Ctrl+Y)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                    </svg>
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowShareDialog(true)}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors border border-cyan-500/30 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share Links</span>
              </button>
            </div>
          </div>

          {/* Info Banner for No Permissions */}
          {selectedRole && stats.granted === 0 && (
            <div className="mx-6 mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-blue-500/20 rounded-full">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-blue-300 font-medium">No document-specific permissions set for "{selectedRole.display_name}"</span>
                  <p className="text-blue-200/60 text-xs mt-1">
                    This role may still have system-level permissions. Grant document permissions below to create specific access rules for this document.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          {selectedRole && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Total</div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-white/40 text-xs mt-1">Permissions</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-xl p-4 border border-green-500/30">
                <div className="text-green-300 text-xs uppercase tracking-wide mb-1">Granted</div>
                <div className="text-2xl font-bold text-green-400">{stats.granted}</div>
                <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-xl p-4 border border-red-500/30">
                <div className="text-red-300 text-xs uppercase tracking-wide mb-1">Denied</div>
                <div className="text-2xl font-bold text-red-400">{stats.denied}</div>
                <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all"
                    style={{ width: `${100 - stats.percentage}%` }}
                  />
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl p-4 border border-blue-500/30">
                <div className="text-blue-300 text-xs uppercase tracking-wide mb-1">Coverage</div>
                <div className="text-2xl font-bold text-blue-400">{stats.percentage}%</div>
                <div className="text-white/40 text-xs mt-1 flex items-center space-x-1">
                  {isModified ? (
                    <>
                      <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                      <span>Unsaved</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                      <span>Saved</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="mx-6 mb-4 bg-green-500/10 border border-green-500/50 rounded-lg p-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-1 bg-green-500/20 rounded-full">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-green-300 font-medium flex-1">{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-1 bg-red-500/20 rounded-full">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-red-300 font-medium flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {isModified && (
          <div className="mx-6 mb-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1 bg-yellow-500/20 rounded-full">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-yellow-300 font-medium">You have unsaved changes</span>
                <span className="text-yellow-400/60 text-sm ml-2">(Ctrl+S to save)</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDiscardChanges}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {saving && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Roles List */}
        <div className="w-80 border-r border-white/10 bg-black/20 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Roles ({roles.length})</h3>
            </div>
            <input
              type="text"
              placeholder="Search roles..."
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {roles.map((role) => {
              const isActive = selectedRole?.id === role.id;
              const roleState = rolePermissions.get(role.id);
              const grantedCount = roleState
                ? Object.values(roleState.permissions).filter(Boolean).length
                : 0;

              return (
                <div
                  key={role.id}
                  className={`relative border-b border-white/5 transition-all ${
                    isActive ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : 'hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500"></div>
                  )}

                  <button onClick={() => setSelectedRole(role)} className="w-full text-left p-4 pl-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-white font-semibold flex items-center space-x-2 mb-1">
                          <span>{role.display_name}</span>
                          {role.is_system_role && (
                            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-medium flex items-center space-x-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              <span>System</span>
                            </span>
                          )}
                        </div>
                        <div className="text-white/40 text-xs">{role.name}</div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-xs text-white/60">Priority</div>
                        <div className="text-white font-medium text-sm">{role.priority}</div>
                      </div>
                    </div>

                    {role.description && (
                      <p className="text-white/60 text-xs mb-2 line-clamp-2">{role.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-white/50">
                        {grantedCount} / {DOCUMENT_PERMISSIONS.length}
                      </div>
                      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 transition-all"
                          style={{
                            width: `${(grantedCount / DOCUMENT_PERMISSIONS.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Content - Permissions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedRole ? (
            <>
              {/* Toolbar */}
              <div className="flex-shrink-0 p-4 border-b border-white/10 bg-black/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                      <span>{selectedRole.display_name}</span>
                    </h3>
                    <p className="text-white/60 text-sm">{selectedRole.description || 'No description'}</p>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-1 border border-white/10">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 rounded transition-all ${
                        viewMode === 'list' ? 'bg-purple-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
                      }`}
                      title="List View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-3 py-1.5 rounded transition-all ${
                        viewMode === 'card' ? 'bg-purple-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
                      }`}
                      title="Card View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search permissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <svg
                      className="absolute left-3 top-2.5 w-5 h-5 text-white/40"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>

                  {/* Filter Mode */}
                  <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1 border border-white/10">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1.5 rounded text-xs transition-all ${
                        filterMode === 'all' ? 'bg-white/20 text-white font-medium' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterMode('granted')}
                      className={`px-3 py-1.5 rounded text-xs transition-all ${
                        filterMode === 'granted'
                          ? 'bg-green-500/30 text-green-300 font-medium'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Granted
                    </button>
                    <button
                      onClick={() => setFilterMode('denied')}
                      className={`px-3 py-1.5 rounded text-xs transition-all ${
                        filterMode === 'denied'
                          ? 'bg-red-500/30 text-red-300 font-medium'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Denied
                    </button>
                  </div>

                  {/* Expand/Collapse All */}
                  <button
                    onClick={toggleAllGroups}
                    className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm whitespace-nowrap"
                  >
                    {expandedGroups.size === PERMISSION_GROUPS.length ? 'Collapse' : 'Expand'} All
                  </button>
                </div>
              </div>

              {/* Permissions Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {Object.keys(groupedPermissions).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <svg className="w-20 h-20 text-white/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-white/60 text-lg mb-2">No permissions found</p>
                    <p className="text-white/40 text-sm">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  PERMISSION_GROUPS.filter((group) => groupedPermissions[group]).map((group) => {
                    const groupPerms = groupedPermissions[group] || [];
                    const isExpanded = expandedGroups.has(group);
                    const roleState = rolePermissions.get(selectedRole.id);
                    if (!roleState) return null;

                    const grantedCount = groupPerms.filter(
                      (p) => roleState.permissions[p.id as keyof DocumentPermissionSet]
                    ).length;
                    const allGranted = grantedCount === groupPerms.length;

                    return (
                      <div key={group} className="border-b border-white/5 last:border-0">
                        {/* Group Header */}
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border-b border-white/10">
                          <div className="flex items-center justify-between p-4">
                            <button
                              onClick={() => toggleGroup(group)}
                              className="flex items-center space-x-3 flex-1 text-left group"
                            >
                              <svg
                                className={`w-5 h-5 text-white/60 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div className="flex items-center space-x-3 flex-1">
                                <h4 className="text-white font-semibold uppercase text-sm tracking-wide group-hover:text-purple-400 transition-colors">
                                  {group}
                                </h4>
                                <span className="text-white/40 text-xs">
                                  {grantedCount} / {groupPerms.length}
                                </span>
                                <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                                    style={{ width: `${(grantedCount / groupPerms.length) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleBulkToggle(groupPerms.map((p) => p.id), true)}
                                disabled={allGranted}
                                className="px-3 py-1 text-xs bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Grant All</span>
                              </button>
                              <button
                                onClick={() => handleBulkToggle(groupPerms.map((p) => p.id), false)}
                                disabled={grantedCount === 0}
                                className="px-3 py-1 text-xs bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Revoke All</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Permission Items */}
                        {isExpanded && (
                          <div
                            className={viewMode === 'card' ? 'grid grid-cols-2 xl:grid-cols-3 gap-3 p-4' : 'divide-y divide-white/5'}
                          >
                            {groupPerms.map((permission) => {
                              const isGranted = roleState.permissions[permission.id as keyof DocumentPermissionSet];

                              if (viewMode === 'card') {
                                return (
                                  <div
                                    key={permission.id}
                                    className={`p-4 rounded-lg border transition-all ${
                                      isGranted
                                        ? 'bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30 shadow-lg shadow-green-500/10'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    <div className="flex items-start space-x-3 mb-3">
                                      <input
                                        type="checkbox"
                                        checked={isGranted}
                                        onChange={(e) =>
                                          handleTogglePermission(permission.id as keyof DocumentPermissionSet, e.target.checked)
                                        }
                                        className="w-5 h-5 rounded border-white/20 text-purple-500 focus:ring-2 focus:ring-purple-500 mt-0.5"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <span className="text-xl">{permission.icon}</span>
                                          <div className="text-white font-medium text-sm">{permission.name}</div>
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-white/50 text-xs mb-3 line-clamp-2">{permission.description}</p>
                                    {isGranted && (
                                      <div className="flex items-center justify-end">
                                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // List view
                              return (
                                <div
                                  key={permission.id}
                                  className={`flex items-center space-x-4 px-6 py-4 hover:bg-white/5 transition-all ${
                                    isGranted ? 'bg-green-500/5 border-l-2 border-l-green-500' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isGranted}
                                    onChange={(e) =>
                                      handleTogglePermission(permission.id as keyof DocumentPermissionSet, e.target.checked)
                                    }
                                    className="w-5 h-5 rounded border-white/20 text-purple-500 focus:ring-2 focus:ring-purple-500"
                                  />
                                  <span className="text-2xl">{permission.icon}</span>
                                  <div className="flex-1">
                                    <div className="text-white font-medium">{permission.name}</div>
                                    <div className="text-white/50 text-xs mt-1">{permission.description}</div>
                                  </div>
                                  {isGranted && (
                                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="p-6 bg-white/5 rounded-full inline-block mb-4">
                  <svg className="w-16 h-16 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <p className="text-white/60 text-lg font-medium mb-2">Select a role to manage permissions</p>
                <p className="text-white/40 text-sm mb-4">Choose a role from the left sidebar to get started</p>
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-left">
                  <div className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>About Document Permissions</span>
                  </div>
                  <p className="text-blue-200/70 text-xs leading-relaxed">
                    Document permissions are separate from system-level role permissions. Grant specific access to roles for this document only. If a role has 0/5 permissions here, it means no document-specific overrides are set.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Links Modal */}
      {showShareDialog && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowShareDialog(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl border border-white/20 p-8 w-full max-w-3xl shadow-2xl animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Share Links</h3>
              <button
                onClick={() => setShowShareDialog(false)}
                className="text-white/60 hover:text-white transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Create Share Section */}
            <div className="mb-6">
              <h4 className="text-white font-medium mb-3">Create New Share Link</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleCreateShare('public')}
                  className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🌐</div>
                  <div className="font-medium text-white mb-1">Public Link</div>
                  <div className="text-xs text-white/60">Anyone with the link can access</div>
                </button>
                <button
                  onClick={() => handleCreateShare('password')}
                  className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🔐</div>
                  <div className="font-medium text-white mb-1">Password Protected</div>
                  <div className="text-xs text-white/60">Requires password to access</div>
                </button>
              </div>
            </div>

            {/* Existing Shares */}
            <div>
              <h4 className="text-white font-medium mb-3">Active Share Links ({shares.filter((s) => s.is_active).length})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {shares.length === 0 ? (
                  <div className="text-center text-white/50 py-8">No share links created yet</div>
                ) : (
                  shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{share.share_type === 'public' ? '🌐' : '🔐'}</span>
                          <span className="text-white text-sm font-medium">{share.share_type} link</span>
                          {!share.is_active && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300">Revoked</span>
                          )}
                        </div>
                        <div className="text-xs text-white/50 mt-1">
                          Created: {new Date(share.shared_at).toLocaleDateString()} • Accessed: {share.current_access_count}
                          {share.max_access_count && ` / ${share.max_access_count}`} times
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {share.is_active && (
                          <button
                            onClick={() => copyShareLink(share.share_token)}
                            className="text-blue-400 hover:text-blue-300 px-3 py-1 text-sm border border-blue-500/30 rounded"
                          >
                            Copy
                          </button>
                        )}
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          className="text-red-400 hover:text-red-300 px-3 py-1 text-sm border border-red-500/30 rounded"
                          disabled={!share.is_active}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default ACLsTool;
