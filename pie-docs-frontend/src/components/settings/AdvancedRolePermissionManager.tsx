import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  rolesPermissionsService,
  type Role,
  type Permission,
  type RoleCreate,
} from '@/services/api/rolesPermissionsService'

type ViewMode = 'compact' | 'detailed' | 'grid'
type FilterMode = 'all' | 'granted' | 'denied'

interface PermissionTemplate {
  id: string
  name: string
  description: string
  permissionIds: string[]
}

export default function AdvancedRolePermissionManager() {
  const { t } = useTranslation(['common', 'settings'])

  // Core State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Data State
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set())
  const [originalPermissions, setOriginalPermissions] = useState<Set<string>>(new Set())

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [compareRoleId, setCompareRoleId] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [isModified, setIsModified] = useState(false)

  // Role Creation State
  const [newRoleData, setNewRoleData] = useState<RoleCreate>({
    name: '',
    display_name: '',
    description: '',
    priority: 100,
    permission_ids: [],
  })

  // Templates
  const [templates] = useState<PermissionTemplate[]>([
    {
      id: 'read-only',
      name: 'Read Only Access',
      description: 'View-only permissions for all resources',
      permissionIds: [],
    },
    {
      id: 'content-creator',
      name: 'Content Creator',
      description: 'Create and edit documents, folders, and tags',
      permissionIds: [],
    },
    {
      id: 'approver',
      name: 'Workflow Approver',
      description: 'Approve workflows and manage tasks',
      permissionIds: [],
    },
  ])

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load role permissions when selection changes
  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id)
      // Auto-expand all resource groups
      const allResources = new Set(allPermissions.map((p) => p.resource))
      setExpandedResources(allResources)
    }
  }, [selectedRole])

  // Track modifications
  useEffect(() => {
    if (selectedRole) {
      const hasChanges = !areSetsEqual(rolePermissions, originalPermissions)
      setIsModified(hasChanges)
    }
  }, [rolePermissions, originalPermissions, selectedRole])

  const areSetsEqual = (a: Set<string>, b: Set<string>) => {
    if (a.size !== b.size) return false
    for (const item of a) if (!b.has(item)) return false
    return true
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [rolesData, permissionsData] = await Promise.all([
        rolesPermissionsService.getRoles({ page_size: 100 }),
        rolesPermissionsService.getPermissions({ page_size: 200 }),
      ])

      setRoles(rolesData.roles)
      setAllPermissions(permissionsData.permissions)

      if (rolesData.roles.length > 0) {
        setSelectedRole(rolesData.roles[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadRolePermissions = async (roleId: string) => {
    try {
      const roleData = await rolesPermissionsService.getRole(roleId)
      const permissionIds = new Set(roleData.permissions?.map((p) => p.id) || [])
      setRolePermissions(permissionIds)
      setOriginalPermissions(new Set(permissionIds))
      setIsModified(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load role permissions')
    }
  }

  const handleTogglePermission = (permissionId: string, isChecked: boolean) => {
    const newPermissions = new Set(rolePermissions)
    if (isChecked) {
      newPermissions.add(permissionId)
    } else {
      newPermissions.delete(permissionId)
    }
    setRolePermissions(newPermissions)
  }

  const handleSaveChanges = async () => {
    if (!selectedRole || !isModified) return

    try {
      setSaving(true)
      setError(null)

      await rolesPermissionsService.assignPermissionsToRole(selectedRole.id, {
        permission_ids: Array.from(rolePermissions),
      })

      setOriginalPermissions(new Set(rolePermissions))
      setIsModified(false)
      setSuccessMessage('Changes saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardChanges = () => {
    setRolePermissions(new Set(originalPermissions))
    setIsModified(false)
  }

  const handleBulkToggle = (resource: string, grant: boolean) => {
    const resourcePermissions = allPermissions
      .filter((p) => p.resource === resource)
      .map((p) => p.id)

    const newPermissions = new Set(rolePermissions)
    resourcePermissions.forEach((id) => {
      if (grant) {
        newPermissions.add(id)
      } else {
        newPermissions.delete(id)
      }
    })
    setRolePermissions(newPermissions)
  }

  const handleMultiSelect = (permissionId: string, isShiftKey: boolean) => {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId)
    } else {
      newSelected.add(permissionId)
    }
    setSelectedPermissions(newSelected)
  }

  const handleToggleSelectedPermissions = (grant: boolean) => {
    const newPermissions = new Set(rolePermissions)
    selectedPermissions.forEach((id) => {
      if (grant) {
        newPermissions.add(id)
      } else {
        newPermissions.delete(id)
      }
    })
    setRolePermissions(newPermissions)
    setSelectedPermissions(new Set())
  }

  const handleCreateRole = async () => {
    if (!newRoleData.name || !newRoleData.display_name) {
      setError('Name and display name are required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      await rolesPermissionsService.createRole(newRoleData)

      await loadInitialData()
      setShowRoleModal(false)
      setNewRoleData({
        name: '',
        display_name: '',
        description: '',
        priority: 100,
        permission_ids: [],
      })
      setSuccessMessage('Role created successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  const handleCloneRole = async () => {
    if (!selectedRole) return

    const clonedName = `${selectedRole.name}_copy`
    const clonedDisplayName = `${selectedRole.display_name} (Copy)`

    setNewRoleData({
      name: clonedName,
      display_name: clonedDisplayName,
      description: selectedRole.description || '',
      priority: selectedRole.priority - 1,
      permission_ids: Array.from(rolePermissions),
    })
    setShowRoleModal(true)
  }

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    let templatePermissions: string[] = []

    switch (templateId) {
      case 'read-only':
        templatePermissions = allPermissions
          .filter((p) => p.action === 'view')
          .map((p) => p.id)
        break
      case 'content-creator':
        templatePermissions = allPermissions
          .filter(
            (p) =>
              ['documents', 'folders', 'tags', 'annotations'].includes(p.resource) &&
              ['view', 'create', 'edit'].includes(p.action)
          )
          .map((p) => p.id)
        break
      case 'approver':
        templatePermissions = allPermissions
          .filter(
            (p) =>
              ['approvals', 'workflows', 'tasks'].includes(p.resource) ||
              (p.resource === 'documents' && ['view', 'download'].includes(p.action))
          )
          .map((p) => p.id)
        break
    }

    setRolePermissions(new Set(templatePermissions))
    setShowTemplateModal(false)
  }

  const toggleResource = (resource: string) => {
    const newExpanded = new Set(expandedResources)
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource)
    } else {
      newExpanded.add(resource)
    }
    setExpandedResources(newExpanded)
  }

  const toggleAllResources = () => {
    if (expandedResources.size === Object.keys(groupedPermissions).length) {
      setExpandedResources(new Set())
    } else {
      const allResources = new Set(Object.keys(groupedPermissions))
      setExpandedResources(allResources)
    }
  }

  // Group permissions by resource
  const groupedPermissions = useMemo(() => {
    return allPermissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = []
      }
      acc[permission.resource].push(permission)
      return acc
    }, {} as Record<string, Permission[]>)
  }, [allPermissions])

  // Filter and search permissions
  const filteredGroupedPermissions = useMemo(() => {
    return Object.entries(groupedPermissions).reduce((acc, [resource, permissions]) => {
      let filtered = permissions

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Apply permission filter
      if (filterMode !== 'all') {
        filtered = filtered.filter((p) => {
          const isGranted = rolePermissions.has(p.id)
          return filterMode === 'granted' ? isGranted : !isGranted
        })
      }

      if (filtered.length > 0) {
        acc[resource] = filtered
      }

      return acc
    }, {} as Record<string, Permission[]>)
  }, [groupedPermissions, searchTerm, filterMode, rolePermissions])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = allPermissions.length
    const granted = rolePermissions.size
    const denied = total - granted
    const percentage = total > 0 ? Math.round((granted / total) * 100) : 0

    const byResource = Object.entries(groupedPermissions).map(([resource, perms]) => ({
      resource,
      total: perms.length,
      granted: perms.filter((p) => rolePermissions.has(p.id)).length,
    }))

    return { total, granted, denied, percentage, byResource }
  }, [allPermissions, rolePermissions, groupedPermissions])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/60">Loading permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{t('settings:rolePermissionManager')}</span>
              </h2>
              <p className="text-white/60 mt-1">{t('settings:selectRoleManagePermissions')}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTemplateModal(true)}
                disabled={!selectedRole}
                className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Templates</span>
              </button>

              <button
                onClick={handleCloneRole}
                disabled={!selectedRole}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Clone Role</span>
              </button>

              <button
                onClick={() => setShowRoleModal(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-blue-500/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>New Role</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          {selectedRole && (
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Total Permissions</div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                <div className="text-green-300 text-xs uppercase tracking-wide mb-1">Granted</div>
                <div className="text-2xl font-bold text-green-400">{stats.granted}</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                <div className="text-red-300 text-xs uppercase tracking-wide mb-1">Denied</div>
                <div className="text-2xl font-bold text-red-400">{stats.denied}</div>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                <div className="text-blue-300 text-xs uppercase tracking-wide mb-1">Coverage</div>
                <div className="text-2xl font-bold text-blue-400">{stats.percentage}%</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
                <div className="text-yellow-300 text-xs uppercase tracking-wide mb-1">Status</div>
                <div className="text-sm font-bold text-yellow-400">
                  {isModified ? '● Modified' : '✓ Saved'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="mx-6 mb-4 bg-green-500/10 border border-green-500/50 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-300 font-medium">{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-400 hover:text-green-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-300 font-medium">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {isModified && (
          <div className="mx-6 mb-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-yellow-300 font-medium">You have unsaved changes</span>
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
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {saving && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
        {/* Left Sidebar - Role List */}
        <div className="w-80 border-r border-white/10 bg-black/20 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">Roles ({roles.length})</h3>
            <input
              type="text"
              placeholder="Search roles..."
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {roles.map((role) => {
              const roleStats = stats.byResource.reduce((sum, r) => sum + r.granted, 0)
              const isActive = selectedRole?.id === role.id

              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-4 border-b border-white/5 transition-all ${
                    isActive
                      ? 'bg-blue-500/20 border-l-4 border-l-blue-500 shadow-lg'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-white font-semibold flex items-center space-x-2">
                        <span>{role.display_name}</span>
                        {role.is_system_role && (
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </div>
                      <div className="text-white/40 text-sm">{role.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/60">Priority</div>
                      <div className="text-white font-medium">{role.priority}</div>
                    </div>
                  </div>

                  {role.description && (
                    <p className="text-white/60 text-xs mb-2 line-clamp-2">{role.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/50">
                      {isActive ? rolePermissions.size : role.permission_count || 0} / {allPermissions.length} permissions
                    </div>
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                        style={{
                          width: `${((isActive ? rolePermissions.size : role.permission_count || 0) / allPermissions.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Content - Permissions Matrix */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedRole ? (
            <>
              {/* Toolbar */}
              <div className="flex-shrink-0 p-4 border-b border-white/10 bg-black/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                      <span>{selectedRole.display_name}</span>
                      {selectedRole.is_system_role && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                          System
                        </span>
                      )}
                    </h3>
                    <p className="text-white/60 text-sm">{selectedRole.description}</p>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('compact')}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        viewMode === 'compact'
                          ? 'bg-blue-500 text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                      title="Compact View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('detailed')}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        viewMode === 'detailed'
                          ? 'bg-blue-500 text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                      title="Detailed View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-blue-500 text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                      title="Grid View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
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
                      className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg className="absolute left-3 top-2.5 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        filterMode === 'all'
                          ? 'bg-white/20 text-white font-medium'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterMode('granted')}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        filterMode === 'granted'
                          ? 'bg-green-500/30 text-green-300 font-medium'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Granted
                    </button>
                    <button
                      onClick={() => setFilterMode('denied')}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
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
                    onClick={toggleAllResources}
                    className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
                  >
                    {expandedResources.size === Object.keys(groupedPermissions).length ? 'Collapse' : 'Expand'} All
                  </button>

                  {/* Multi-select Actions */}
                  {selectedPermissions.size > 0 && (
                    <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right duration-200">
                      <span className="text-white/60 text-sm">{selectedPermissions.size} selected</span>
                      <button
                        onClick={() => handleToggleSelectedPermissions(true)}
                        className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition-colors text-sm"
                      >
                        Grant
                      </button>
                      <button
                        onClick={() => handleToggleSelectedPermissions(false)}
                        className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors text-sm"
                      >
                        Revoke
                      </button>
                      <button
                        onClick={() => setSelectedPermissions(new Set())}
                        className="px-3 py-1.5 bg-white/10 text-white rounded hover:bg-white/20 transition-colors text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions List */}
              <div className="flex-1 overflow-y-auto">
                {Object.entries(filteredGroupedPermissions)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([resource, permissions]) => {
                    const isExpanded = expandedResources.has(resource)
                    const grantedCount = permissions.filter((p) => rolePermissions.has(p.id)).length
                    const allGranted = grantedCount === permissions.length
                    const someGranted = grantedCount > 0 && grantedCount < permissions.length

                    return (
                      <div key={resource} className="border-b border-white/5">
                        {/* Resource Header */}
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border-b border-white/10">
                          <div className="flex items-center justify-between p-4">
                            <button
                              onClick={() => toggleResource(resource)}
                              className="flex items-center space-x-3 flex-1 text-left group"
                            >
                              <svg
                                className={`w-5 h-5 text-white/60 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div className="flex items-center space-x-3">
                                <h4 className="text-white font-semibold uppercase text-sm tracking-wide group-hover:text-blue-400 transition-colors">
                                  {resource}
                                </h4>
                                <span className="text-white/40 text-xs">
                                  {grantedCount} / {permissions.length}
                                </span>
                                <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                                    style={{ width: `${(grantedCount / permissions.length) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleBulkToggle(resource, true)}
                                disabled={allGranted}
                                className="px-3 py-1 text-xs bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                ✓ Grant All
                              </button>
                              <button
                                onClick={() => handleBulkToggle(resource, false)}
                                disabled={grantedCount === 0}
                                className="px-3 py-1 text-xs bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                ✗ Revoke All
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Permission Items */}
                        {isExpanded && (
                          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2 p-4' : 'divide-y divide-white/5'}>
                            {permissions.map((permission) => {
                              const isGranted = rolePermissions.has(permission.id)
                              const isSelected = selectedPermissions.has(permission.id)

                              if (viewMode === 'compact') {
                                return (
                                  <div
                                    key={permission.id}
                                    className={`flex items-center justify-between px-4 py-2 hover:bg-white/5 transition-colors ${
                                      isSelected ? 'bg-blue-500/10' : ''
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={isGranted}
                                        onChange={(e) => handleTogglePermission(permission.id, e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
                                      />
                                      <button
                                        onClick={() => handleMultiSelect(permission.id, false)}
                                        className="flex-1 text-left"
                                      >
                                        <span className="text-white text-sm">{permission.display_name}</span>
                                      </button>
                                    </div>
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                                      {permission.action}
                                    </span>
                                  </div>
                                )
                              }

                              if (viewMode === 'grid') {
                                return (
                                  <div
                                    key={permission.id}
                                    className={`p-3 rounded-lg border transition-all ${
                                      isGranted
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                                  >
                                    <div className="flex items-start space-x-2 mb-2">
                                      <input
                                        type="checkbox"
                                        checked={isGranted}
                                        onChange={(e) => handleTogglePermission(permission.id, e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
                                      />
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-sm">{permission.display_name}</div>
                                        <div className="text-white/40 text-xs mt-0.5">{permission.name}</div>
                                      </div>
                                    </div>
                                    {permission.description && (
                                      <p className="text-white/50 text-xs mb-2 line-clamp-2">{permission.description}</p>
                                    )}
                                    <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                                      {permission.action}
                                    </span>
                                  </div>
                                )
                              }

                              // Detailed view
                              return (
                                <div
                                  key={permission.id}
                                  className={`flex items-center space-x-4 px-4 py-3 hover:bg-white/5 transition-all ${
                                    isSelected ? 'bg-blue-500/10' : ''
                                  } ${isGranted ? 'border-l-2 border-l-green-500' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isGranted}
                                    onChange={(e) => handleTogglePermission(permission.id, e.target.checked)}
                                    className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => handleMultiSelect(permission.id, false)}
                                    className="flex-1 text-left"
                                  >
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-white font-medium">{permission.display_name}</span>
                                      {permission.is_system_permission && (
                                        <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="text-white/40 text-sm">{permission.name}</div>
                                    {permission.description && (
                                      <div className="text-white/50 text-xs mt-1">{permission.description}</div>
                                    )}
                                  </button>
                                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded text-sm font-medium">
                                    {permission.action}
                                  </span>
                                  {isGranted && (
                                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                {Object.keys(filteredGroupedPermissions).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <svg className="w-16 h-16 text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-white/60 text-lg mb-2">No permissions found</p>
                    <p className="text-white/40 text-sm">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-20 h-20 text-white/10 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-white/60 text-lg">Select a role to manage permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {showRoleModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowRoleModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/10 p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Create New Role</h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Name (Identifier) *</label>
                  <input
                    type="text"
                    value={newRoleData.name}
                    onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                    placeholder="e.g., content_editor"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Display Name *</label>
                  <input
                    type="text"
                    value={newRoleData.display_name}
                    onChange={(e) => setNewRoleData({ ...newRoleData, display_name: e.target.value })}
                    placeholder="e.g., Content Editor"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                <textarea
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                  placeholder="Brief description of this role..."
                  rows={3}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Priority</label>
                <input
                  type="number"
                  value={newRoleData.priority}
                  onChange={(e) => setNewRoleData({ ...newRoleData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-white/40 text-xs mt-1">Higher priority = more important (1000 = highest)</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={saving || !newRoleData.name || !newRoleData.display_name}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>Create Role</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/10 p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Permission Templates</h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-white/60 mb-6">Apply a permission template to quickly configure this role</p>

            <div className="space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleApplyTemplate(template.id)}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-lg transition-all text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                        {template.name}
                      </h4>
                      <p className="text-white/60 text-sm mt-1">{template.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-white/40 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
