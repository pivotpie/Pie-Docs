import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  rolesPermissionsService,
  type Role,
  type Permission,
  type RoleCreate,
  type RoleUpdate,
} from '@/services/api/rolesPermissionsService'

type ViewMode = 'list' | 'matrix' | 'card'
type FilterMode = 'all' | 'granted' | 'denied'

interface HistoryEntry {
  roleId: string
  permissions: Set<string>
  timestamp: number
}

interface PermissionGroup {
  resource: string
  permissions: Permission[]
  grantedCount: number
}

export default function ModernRolePermissionManager() {
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

  // Comparison State
  const [compareRole, setCompareRole] = useState<Role | null>(null)
  const [comparePermissions, setComparePermissions] = useState<Set<string>>(new Set())

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResourceFilter, setSelectedResourceFilter] = useState<string>('all')
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isModified, setIsModified] = useState(false)

  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Role Form State
  const [roleFormData, setRoleFormData] = useState<RoleCreate>({
    name: '',
    display_name: '',
    description: '',
    priority: 100,
    permission_ids: [],
  })

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load role permissions when selection changes
  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id)
      const allResources = new Set(allPermissions.map((p) => p.resource))
      setExpandedGroups(allResources)
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
      // Reset history when switching roles
      setHistory([])
      setHistoryIndex(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load role permissions')
    }
  }

  const addToHistory = (roleId: string, permissions: Set<string>) => {
    const newEntry: HistoryEntry = {
      roleId,
      permissions: new Set(permissions),
      timestamp: Date.now(),
    }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newEntry)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1]
      setRolePermissions(new Set(prevEntry.permissions))
      setHistoryIndex(historyIndex - 1)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextEntry = history[historyIndex + 1]
      setRolePermissions(new Set(nextEntry.permissions))
      setHistoryIndex(historyIndex + 1)
    }
  }

  const handleTogglePermission = (permissionId: string, isChecked: boolean) => {
    if (!selectedRole) return
    addToHistory(selectedRole.id, rolePermissions)
    const newPermissions = new Set(rolePermissions)
    if (isChecked) {
      newPermissions.add(permissionId)
    } else {
      newPermissions.delete(permissionId)
    }
    setRolePermissions(newPermissions)
  }

  const handleBulkToggle = (permissionIds: string[], grant: boolean) => {
    if (!selectedRole) return
    addToHistory(selectedRole.id, rolePermissions)
    const newPermissions = new Set(rolePermissions)
    permissionIds.forEach((id) => {
      if (grant) {
        newPermissions.add(id)
      } else {
        newPermissions.delete(id)
      }
    })
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
      setHistory([])
      setHistoryIndex(-1)
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
    setHistory([])
    setHistoryIndex(-1)
  }

  const handleCreateRole = async () => {
    if (!roleFormData.name || !roleFormData.display_name) {
      setError('Name and display name are required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      await rolesPermissionsService.createRole(roleFormData)

      await loadInitialData()
      setShowRoleModal(false)
      setRoleFormData({
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

  const handleCloneRole = () => {
    if (!selectedRole) return

    setRoleFormData({
      name: `${selectedRole.name}_copy`,
      display_name: `${selectedRole.display_name} (Copy)`,
      description: selectedRole.description || '',
      priority: selectedRole.priority - 1,
      permission_ids: Array.from(rolePermissions),
    })
    setShowRoleModal(true)
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return

    try {
      await rolesPermissionsService.deleteRole(roleId)
      await loadInitialData()
      setSuccessMessage('Role deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role')
    }
  }

  const handleCompareRole = async (role: Role) => {
    try {
      setCompareRole(role)
      const roleData = await rolesPermissionsService.getRole(role.id)
      const permissionIds = new Set(roleData.permissions?.map((p) => p.id) || [])
      setComparePermissions(permissionIds)
      setShowCompareModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison role')
    }
  }

  const toggleGroup = (resource: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource)
    } else {
      newExpanded.add(resource)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleAllGroups = () => {
    if (expandedGroups.size === uniqueResources.length) {
      setExpandedGroups(new Set())
    } else {
      setExpandedGroups(new Set(uniqueResources))
    }
  }

  // Extract unique resources and actions
  const uniqueResources = useMemo(() => {
    return Array.from(new Set(allPermissions.map((p) => p.resource))).sort()
  }, [allPermissions])

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(allPermissions.map((p) => p.action))).sort()
  }, [allPermissions])

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
  const filteredPermissionGroups = useMemo((): PermissionGroup[] => {
    let filtered = allPermissions

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.resource.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply resource filter
    if (selectedResourceFilter !== 'all') {
      filtered = filtered.filter((p) => p.resource === selectedResourceFilter)
    }

    // Apply action filter
    if (selectedActionFilter !== 'all') {
      filtered = filtered.filter((p) => p.action === selectedActionFilter)
    }

    // Apply permission filter
    if (filterMode !== 'all') {
      filtered = filtered.filter((p) => {
        const isGranted = rolePermissions.has(p.id)
        return filterMode === 'granted' ? isGranted : !isGranted
      })
    }

    // Group by resource
    const grouped = filtered.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = []
      }
      acc[permission.resource].push(permission)
      return acc
    }, {} as Record<string, Permission[]>)

    // Convert to array with metadata
    return Object.entries(grouped).map(([resource, permissions]) => ({
      resource,
      permissions,
      grantedCount: permissions.filter((p) => rolePermissions.has(p.id)).length,
    }))
  }, [allPermissions, searchTerm, selectedResourceFilter, selectedActionFilter, filterMode, rolePermissions])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = allPermissions.length
    const granted = rolePermissions.size
    const denied = total - granted
    const percentage = total > 0 ? Math.round((granted / total) * 100) : 0

    return { total, granted, denied, percentage }
  }, [allPermissions, rolePermissions])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isModified) handleSaveChanges()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModified, historyIndex, history])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70 text-lg">Loading permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Role & Permission Manager</h2>
                <p className="text-white/60 mt-1">Advanced permission management with granular control</p>
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
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors border border-green-500/30 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export</span>
              </button>

              <button
                onClick={handleCloneRole}
                disabled={!selectedRole}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Clone</span>
              </button>

              <button
                onClick={() => setShowRoleModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-blue-500/30"
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
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all" style={{ width: `${stats.percentage}%` }} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-xl p-4 border border-red-500/30">
                <div className="text-red-300 text-xs uppercase tracking-wide mb-1">Denied</div>
                <div className="text-2xl font-bold text-red-400">{stats.denied}</div>
                <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all" style={{ width: `${100 - stats.percentage}%` }} />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
        {/* Left Sidebar - Roles List */}
        <div className="w-80 border-r border-white/10 bg-black/20 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Roles ({roles.length})</h3>
              <button
                onClick={() => setShowRoleModal(true)}
                className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
                title="Create new role"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              placeholder="Search roles..."
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {roles.map((role) => {
              const isActive = selectedRole?.id === role.id

              return (
                <div
                  key={role.id}
                  className={`relative border-b border-white/5 transition-all ${
                    isActive ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20' : 'hover:bg-white/5'
                  }`}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-cyan-500"></div>}

                  <button
                    onClick={() => setSelectedRole(role)}
                    className="w-full text-left p-4 pl-5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-white font-semibold flex items-center space-x-2 mb-1">
                          <span>{role.display_name}</span>
                          {role.is_system_role && (
                            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-medium flex items-center space-x-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
                        {isActive ? rolePermissions.size : role.permission_count || 0} / {allPermissions.length}
                      </div>
                      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 transition-all"
                          style={{
                            width: `${((isActive ? rolePermissions.size : role.permission_count || 0) / allPermissions.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </button>

                  {isActive && !role.is_system_role && (
                    <div className="px-4 pb-3 flex items-center space-x-2">
                      <button
                        onClick={() => handleCompareRole(role)}
                        className="flex-1 px-2 py-1.5 bg-white/10 text-white text-xs rounded hover:bg-white/20 transition-colors flex items-center justify-center space-x-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Compare</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="px-2 py-1.5 bg-red-500/20 text-red-300 text-xs rounded hover:bg-red-500/30 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )
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
                        viewMode === 'list' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
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
                        viewMode === 'card' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
                      }`}
                      title="Card View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('matrix')}
                      className={`px-3 py-1.5 rounded transition-all ${
                        viewMode === 'matrix' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
                      }`}
                      title="Matrix View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
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

                  {/* Resource Filter */}
                  <select
                    value={selectedResourceFilter}
                    onChange={(e) => setSelectedResourceFilter(e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all" className="bg-gray-800">All Resources</option>
                    {uniqueResources.map((resource) => (
                      <option key={resource} value={resource} className="bg-gray-800">
                        {resource}
                      </option>
                    ))}
                  </select>

                  {/* Action Filter */}
                  <select
                    value={selectedActionFilter}
                    onChange={(e) => setSelectedActionFilter(e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all" className="bg-gray-800">All Actions</option>
                    {uniqueActions.map((action) => (
                      <option key={action} value={action} className="bg-gray-800">
                        {action}
                      </option>
                    ))}
                  </select>

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
                        filterMode === 'granted' ? 'bg-green-500/30 text-green-300 font-medium' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Granted
                    </button>
                    <button
                      onClick={() => setFilterMode('denied')}
                      className={`px-3 py-1.5 rounded text-xs transition-all ${
                        filterMode === 'denied' ? 'bg-red-500/30 text-red-300 font-medium' : 'text-white/60 hover:text-white'
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
                    {expandedGroups.size === uniqueResources.length ? 'Collapse' : 'Expand'} All
                  </button>
                </div>
              </div>

              {/* Permissions Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredPermissionGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <svg className="w-20 h-20 text-white/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-white/60 text-lg mb-2">No permissions found</p>
                    <p className="text-white/40 text-sm">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  filteredPermissionGroups.map((group) => {
                    const isExpanded = expandedGroups.has(group.resource)
                    const allGranted = group.grantedCount === group.permissions.length
                    const someGranted = group.grantedCount > 0 && group.grantedCount < group.permissions.length

                    return (
                      <div key={group.resource} className="border-b border-white/5 last:border-0">
                        {/* Group Header */}
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border-b border-white/10">
                          <div className="flex items-center justify-between p-4">
                            <button
                              onClick={() => toggleGroup(group.resource)}
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
                              <div className="flex items-center space-x-3 flex-1">
                                <h4 className="text-white font-semibold uppercase text-sm tracking-wide group-hover:text-blue-400 transition-colors">
                                  {group.resource}
                                </h4>
                                <span className="text-white/40 text-xs">
                                  {group.grantedCount} / {group.permissions.length}
                                </span>
                                <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                                    style={{ width: `${(group.grantedCount / group.permissions.length) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleBulkToggle(group.permissions.map(p => p.id), true)}
                                disabled={allGranted}
                                className="px-3 py-1 text-xs bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Grant All</span>
                              </button>
                              <button
                                onClick={() => handleBulkToggle(group.permissions.map(p => p.id), false)}
                                disabled={group.grantedCount === 0}
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
                          <div className={viewMode === 'card' ? 'grid grid-cols-2 xl:grid-cols-3 gap-3 p-4' : 'divide-y divide-white/5'}>
                            {group.permissions.map((permission) => {
                              const isGranted = rolePermissions.has(permission.id)

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
                                        onChange={(e) => handleTogglePermission(permission.id, e.target.checked)}
                                        className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
                                      />
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-sm mb-1">{permission.display_name}</div>
                                        <div className="text-white/40 text-xs">{permission.name}</div>
                                      </div>
                                    </div>
                                    {permission.description && (
                                      <p className="text-white/50 text-xs mb-3 line-clamp-2">{permission.description}</p>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                                        {permission.action}
                                      </span>
                                      {isGranted && (
                                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                )
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
                                    onChange={(e) => handleTogglePermission(permission.id, e.target.checked)}
                                    className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-white font-medium">{permission.display_name}</span>
                                      {permission.is_system_permission && (
                                        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="text-white/40 text-sm">{permission.name}</div>
                                    {permission.description && (
                                      <div className="text-white/50 text-xs mt-1">{permission.description}</div>
                                    )}
                                  </div>
                                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded text-sm font-medium">
                                    {permission.action}
                                  </span>
                                  {isGranted && (
                                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="p-6 bg-white/5 rounded-full inline-block mb-4">
                  <svg className="w-16 h-16 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-white/60 text-lg font-medium mb-2">Select a role to manage permissions</p>
                <p className="text-white/40 text-sm">Choose a role from the left sidebar to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Role Modal */}
      {showRoleModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center z-50 p-4 pt-[10px] animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setShowRoleModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl border border-white/20 p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Create New Role</h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-white/60 hover:text-white transition-colors p-2"
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
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                    placeholder="e.g., content_editor"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Display Name *</label>
                  <input
                    type="text"
                    value={roleFormData.display_name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, display_name: e.target.value })}
                    placeholder="e.g., Content Editor"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="Brief description of this role..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Priority</label>
                <input
                  type="number"
                  value={roleFormData.priority}
                  onChange={(e) => setRoleFormData({ ...roleFormData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-white/40 text-xs mt-2">Higher priority = more important (1000 = highest)</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={saving || !roleFormData.name || !roleFormData.display_name}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium shadow-lg shadow-blue-500/30"
              >
                {saving && (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
  )
}
