import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  rolesPermissionsService,
  type Role,
  type Permission,
} from '@/services/api/rolesPermissionsService'

export default function RolePermissionManager() {
  const { t } = useTranslation(['common', 'settings'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Roles and Permissions data
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id)
    }
  }, [selectedRole])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load all roles and permissions in parallel
      const [rolesData, permissionsData] = await Promise.all([
        rolesPermissionsService.getRoles({ page_size: 100 }),
        rolesPermissionsService.getPermissions({ page_size: 200 }),
      ])

      setRoles(rolesData.roles)
      setAllPermissions(permissionsData.permissions)

      // Select first role by default
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load role permissions')
    }
  }

  const handleTogglePermission = async (permissionId: string, isChecked: boolean) => {
    if (!selectedRole) return

    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      // Optimistically update UI
      const newPermissions = new Set(rolePermissions)
      if (isChecked) {
        newPermissions.add(permissionId)
      } else {
        newPermissions.delete(permissionId)
      }
      setRolePermissions(newPermissions)

      // Update backend
      await rolesPermissionsService.assignPermissionsToRole(selectedRole.id, {
        permission_ids: Array.from(newPermissions),
      })

      setSuccessMessage('Permission updated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      // Revert on error
      setRolePermissions(new Set(rolePermissions))
      setError(err instanceof Error ? err.message : 'Failed to update permission')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectAll = async (resource: string) => {
    if (!selectedRole) return

    try {
      setSaving(true)
      setError(null)

      const resourcePermissions = allPermissions
        .filter((p) => p.resource === resource)
        .map((p) => p.id)

      const newPermissions = new Set(rolePermissions)
      resourcePermissions.forEach((id) => newPermissions.add(id))
      setRolePermissions(newPermissions)

      await rolesPermissionsService.assignPermissionsToRole(selectedRole.id, {
        permission_ids: Array.from(newPermissions),
      })

      setSuccessMessage(`All ${resource} permissions granted`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions')
    } finally {
      setSaving(false)
    }
  }

  const handleDeselectAll = async (resource: string) => {
    if (!selectedRole) return

    try {
      setSaving(true)
      setError(null)

      const resourcePermissions = allPermissions
        .filter((p) => p.resource === resource)
        .map((p) => p.id)

      const newPermissions = new Set(rolePermissions)
      resourcePermissions.forEach((id) => newPermissions.delete(id))
      setRolePermissions(newPermissions)

      await rolesPermissionsService.assignPermissionsToRole(selectedRole.id, {
        permission_ids: Array.from(newPermissions),
      })

      setSuccessMessage(`All ${resource} permissions revoked`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions')
    } finally {
      setSaving(false)
    }
  }

  // Group permissions by resource
  const groupedPermissions = allPermissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = []
    }
    acc[permission.resource].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  // Filter grouped permissions by search term
  const filteredGroupedPermissions = Object.entries(groupedPermissions).reduce((acc, [resource, permissions]) => {
    if (searchTerm) {
      const filtered = permissions.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (filtered.length > 0) {
        acc[resource] = filtered
      }
    } else {
      acc[resource] = permissions
    }
    return acc
  }, {} as Record<string, Permission[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{t('settings:rolePermissionManager')}</h2>
        <p className="text-white/60 mt-1">{t('settings:selectRoleManagePermissions')}</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-500/10 border border-green-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-300">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Role Selector */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">{t('settings:selectRole')}</h3>
            </div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                    selectedRole?.id === role.id
                      ? 'bg-blue-500/20 border-l-4 border-l-blue-500'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white font-medium">{role.display_name}</div>
                      <div className="text-white/40 text-sm">{role.name}</div>
                    </div>
                    {role.is_system_role && (
                      <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>
                  <div className="text-white/50 text-xs mt-1">
                    {rolePermissions.size} / {allPermissions.length} permissions
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content - Permissions Matrix */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <div className="bg-white/5 rounded-lg border border-white/10">
              {/* Header with Role Info and Search */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedRole.display_name}</h3>
                    <p className="text-white/60 text-sm">{selectedRole.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-white/60 text-sm">Priority: {selectedRole.priority}</div>
                    <div className="text-white font-medium">
                      {rolePermissions.size} / {allPermissions.length} permissions
                    </div>
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('settings:searchPermissions')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Permissions Table */}
              <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                {Object.entries(filteredGroupedPermissions)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([resource, permissions]) => {
                    const allChecked = permissions.every((p) => rolePermissions.has(p.id))
                    const someChecked = permissions.some((p) => rolePermissions.has(p.id))

                    return (
                      <div key={resource} className="border-b border-white/10 last:border-0">
                        {/* Resource Header */}
                        <div className="bg-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-white font-semibold uppercase text-sm tracking-wide">
                              {resource}
                            </h4>
                            <span className="text-white/40 text-xs">
                              ({permissions.filter((p) => rolePermissions.has(p.id)).length} / {permissions.length})
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSelectAll(resource)}
                              disabled={saving || allChecked}
                              className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => handleDeselectAll(resource)}
                              disabled={saving || !someChecked}
                              className="px-3 py-1 text-xs bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        {/* Permission Rows */}
                        <div className="divide-y divide-white/5">
                          {permissions.map((permission) => {
                            const isChecked = rolePermissions.has(permission.id)
                            const isDisabled = saving || (selectedRole.is_system_role && permission.is_system_permission)

                            return (
                              <div
                                key={permission.id}
                                className={`px-4 py-3 flex items-center space-x-4 hover:bg-white/5 transition-colors ${
                                  isDisabled ? 'opacity-50' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleTogglePermission(permission.id, e.target.checked)}
                                  disabled={isDisabled}
                                  className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
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
                                </div>
                                <div>
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                                    {permission.action}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-lg border border-white/10 p-12 text-center">
              <svg className="w-16 h-16 text-white/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-white/60">{t('settings:selectRoleToManagePermissions')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
