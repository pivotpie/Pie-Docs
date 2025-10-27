import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  rolesPermissionsService,
  type Role,
  type Permission,
  type RoleCreate,
  type RoleUpdate,
} from '@/services/api/rolesPermissionsService'

type TabType = 'roles' | 'permissions'

export default function RolesPermissionsManager() {
  const { t } = useTranslation(['common', 'settings'])
  const [activeTab, setActiveTab] = useState<TabType>('roles')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Roles state
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleSearchTerm, setRoleSearchTerm] = useState('')
  const [rolePage, setRolePage] = useState(1)
  const [roleTotalPages, setRoleTotalPages] = useState(1)

  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('')
  const [filterResource, setFilterResource] = useState('')
  const [resources, setResources] = useState<string[]>([])
  const [permissionPage, setPermissionPage] = useState(1)
  const [permissionTotalPages, setPermissionTotalPages] = useState(1)

  // Role form state
  const [roleFormData, setRoleFormData] = useState<RoleCreate>({
    name: '',
    display_name: '',
    description: '',
    priority: 0,
    permission_ids: [],
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (activeTab === 'roles') {
      loadRoles()
      loadAllPermissions()
    } else {
      loadPermissions()
      loadResources()
    }
  }, [activeTab, rolePage, roleSearchTerm, permissionPage, permissionSearchTerm, filterResource])

  const loadRoles = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await rolesPermissionsService.getRoles({
        page: rolePage,
        page_size: 12,
        search: roleSearchTerm || undefined,
      })
      setRoles(data.roles)
      setRoleTotalPages(data.total_pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await rolesPermissionsService.getPermissions({
        page: permissionPage,
        page_size: 20,
        search: permissionSearchTerm || undefined,
        resource: filterResource || undefined,
      })
      setPermissions(data.permissions)
      setPermissionTotalPages(data.total_pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  const loadAllPermissions = async () => {
    try {
      const data = await rolesPermissionsService.getPermissions({ page_size: 200 })
      setAllPermissions(data.permissions)
    } catch (err) {
      console.error('Failed to load all permissions:', err)
    }
  }

  const loadResources = async () => {
    try {
      const data = await rolesPermissionsService.getResources()
      setResources(data.resources)
    } catch (err) {
      console.error('Failed to load resources:', err)
    }
  }

  const handleCreateRole = () => {
    setSelectedRole(null)
    setRoleFormData({
      name: '',
      display_name: '',
      description: '',
      priority: 0,
      permission_ids: [],
    })
    setShowRoleModal(true)
  }

  const handleEditRole = async (role: Role) => {
    try {
      const fullRole = await rolesPermissionsService.getRole(role.id)
      setSelectedRole(fullRole)
      setRoleFormData({
        name: fullRole.name,
        display_name: fullRole.display_name,
        description: fullRole.description || '',
        priority: fullRole.priority,
        permission_ids: fullRole.permissions?.map((p) => p.id) || [],
      })
      setShowRoleModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load role details')
    }
  }

  const handleSaveRole = async () => {
    if (!roleFormData.name || !roleFormData.display_name) {
      setError('Name and display name are required')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      if (selectedRole) {
        // Update existing role
        const updateData: RoleUpdate = {
          display_name: roleFormData.display_name,
          description: roleFormData.description,
          priority: roleFormData.priority,
        }
        await rolesPermissionsService.updateRole(selectedRole.id, updateData)

        // Update permissions
        await rolesPermissionsService.assignPermissionsToRole(selectedRole.id, {
          permission_ids: roleFormData.permission_ids || [],
        })
      } else {
        // Create new role
        await rolesPermissionsService.createRole(roleFormData)
      }

      setShowRoleModal(false)
      setSelectedRole(null)
      loadRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) return

    try {
      await rolesPermissionsService.deleteRole(roleId)
      loadRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role')
    }
  }

  const togglePermission = (permissionId: string) => {
    setRoleFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids?.includes(permissionId)
        ? prev.permission_ids.filter((id) => id !== permissionId)
        : [...(prev.permission_ids || []), permissionId],
    }))
  }

  const groupedPermissions = allPermissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = []
    }
    acc[permission.resource].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  const groupedPermissionsDisplay = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = []
    }
    acc[permission.resource].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {t('settings:rolesPermissionsManager')}
          </h2>
          <p className="text-white/60 mt-1">
            {t('settings:manageRolesPermissionsDescription')}
          </p>
        </div>
        {activeTab === 'roles' && (
          <button
            onClick={handleCreateRole}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{t('settings:createRole')}</span>
          </button>
        )}
      </div>

      {/* Error Alert */}
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

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'roles'
              ? 'text-blue-400'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          {t('settings:roles')}
          {activeTab === 'roles' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'permissions'
              ? 'text-blue-400'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          {t('settings:permissions')}
          {activeTab === 'permissions' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder={t('settings:searchRoles')}
                value={roleSearchTerm}
                onChange={(e) => {
                  setRoleSearchTerm(e.target.value)
                  setRolePage(1)
                }}
                className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Roles Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{role.display_name}</h3>
                      <p className="text-white/40 text-sm">{role.name}</p>
                    </div>
                    {role.is_system_role && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium flex-shrink-0">
                        {t('settings:system')}
                      </span>
                    )}
                  </div>

                  {role.description && <p className="text-white/60 text-sm mb-3">{role.description}</p>}

                  <div className="flex items-center justify-between mb-3 text-sm">
                    <div className="text-white/60">
                      <span className="text-white font-medium">{role.permission_count || 0}</span> permissions
                    </div>
                    <div className="text-white/60">
                      Priority: <span className="text-white font-medium">{role.priority}</span>
                    </div>
                  </div>

                  {!role.is_system_role && (
                    <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="flex-1 px-3 py-1.5 bg-white/10 text-white text-sm rounded hover:bg-white/20 transition-colors"
                      >
                        {t('settings:edit')}
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id, role.display_name)}
                        className="px-3 py-1.5 bg-red-500/20 text-red-300 text-sm rounded hover:bg-red-500/30 transition-colors"
                      >
                        {t('settings:delete')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {roleTotalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setRolePage((p) => Math.max(1, p - 1))}
                disabled={rolePage === 1}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common:previous')}
              </button>
              <span className="text-white/60">
                {t('common:page')} {rolePage} {t('common:of')} {roleTotalPages}
              </span>
              <button
                onClick={() => setRolePage((p) => Math.min(roleTotalPages, p + 1))}
                disabled={rolePage === roleTotalPages}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common:next')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div>
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder={t('settings:searchPermissions')}
                value={permissionSearchTerm}
                onChange={(e) => {
                  setPermissionSearchTerm(e.target.value)
                  setPermissionPage(1)
                }}
                className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={filterResource}
              onChange={(e) => {
                setFilterResource(e.target.value)
                setPermissionPage(1)
              }}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('settings:allResources')}</option>
              {resources.map((resource) => (
                <option key={resource} value={resource} className="bg-gray-800">
                  {resource}
                </option>
              ))}
            </select>
          </div>

          {/* Permissions Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissionsDisplay).map(([resource, perms]) => (
                <div key={resource} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-3 capitalize">{resource}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {perms.map((permission) => (
                      <div
                        key={permission.id}
                        className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-white font-medium text-sm">{permission.display_name}</div>
                            <div className="text-white/40 text-xs mt-1">{permission.name}</div>
                          </div>
                          {permission.is_system_permission && (
                            <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </div>
                        {permission.description && (
                          <p className="text-white/50 text-xs mb-2">{permission.description}</p>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                            {permission.action}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {permissionTotalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setPermissionPage((p) => Math.max(1, p - 1))}
                disabled={permissionPage === 1}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common:previous')}
              </button>
              <span className="text-white/60">
                {t('common:page')} {permissionPage} {t('common:of')} {permissionTotalPages}
              </span>
              <button
                onClick={() => setPermissionPage((p) => Math.min(permissionTotalPages, p + 1))}
                disabled={permissionPage === permissionTotalPages}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common:next')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            setShowRoleModal(false)
            setSelectedRole(null)
          }}
        >
          <div
            className="modal-glass rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {selectedRole ? t('settings:editRole') : t('settings:createRole')}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Name (Identifier) *
                  </label>
                  <input
                    type="text"
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                    disabled={!!selectedRole}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="e.g., content_editor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Display Name *</label>
                  <input
                    type="text"
                    value={roleFormData.display_name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, display_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Content Editor"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief description of this role"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Priority</label>
                <input
                  type="number"
                  value={roleFormData.priority}
                  onChange={(e) => setRoleFormData({ ...roleFormData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">Permissions</label>
                <div className="max-h-64 overflow-y-auto space-y-3 bg-white/5 rounded-lg p-4">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <div key={resource} className="space-y-2">
                      <div className="text-sm font-semibold text-blue-400 uppercase tracking-wide">{resource}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-white/5 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={roleFormData.permission_ids?.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="w-4 h-4 rounded border-white/20 text-blue-500"
                            />
                            <span className="text-white/80 text-sm">{permission.display_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  {allPermissions.length === 0 && (
                    <div className="text-white/40 text-center py-4">No permissions available</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false)
                  setSelectedRole(null)
                }}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                disabled={isSaving}
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={handleSaveRole}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving
                  ? t('common:saving')
                  : selectedRole
                  ? t('settings:updateRole')
                  : t('settings:createRole')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
