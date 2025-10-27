import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description?: string
  is_system_role: boolean
  is_active: boolean
  priority: number
  permission_count: number
  permissions: Permission[]
  created_at: string
}

export default function RoleManagement() {
  const { t } = useTranslation(['common', 'settings'])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    priority: 0,
    permission_ids: [] as string[]
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadRoles()
    loadPermissions()
  }, [page, searchTerm])

  useEffect(() => {
    if (selectedRole) {
      setFormData({
        name: selectedRole.name,
        display_name: selectedRole.display_name,
        description: selectedRole.description || '',
        priority: selectedRole.priority,
        permission_ids: selectedRole.permissions.map(p => p.id)
      })
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        priority: 0,
        permission_ids: []
      })
    }
  }, [selectedRole])

  const loadPermissions = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/permissions')
      const data = await response.json()
      setAllPermissions(data.permissions || [])
    } catch (error) {
      console.error('Failed to load permissions:', error)
    }
  }

  const loadRoles = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `http://localhost:8001/api/v1/roles?page=${page}&page_size=10${searchTerm ? `&search=${searchTerm}` : ''}`
      )
      const data = await response.json()
      setRoles(data.roles || [])
      setTotalPages(data.total_pages || 1)
    } catch (error) {
      console.error('Failed to load roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm(t('settings:confirmDeleteRole'))) return

    try {
      await fetch(`http://localhost:8001/api/v1/roles/${roleId}`, {
        method: 'DELETE',
      })
      loadRoles()
    } catch (error) {
      console.error('Failed to delete role:', error)
    }
  }

  const handleSaveRole = async () => {
    if (!formData.name || !formData.display_name) {
      alert('Name and display name are required')
      return
    }

    try {
      setIsSaving(true)
      const url = selectedRole
        ? `http://localhost:8001/api/v1/roles/${selectedRole.id}`
        : 'http://localhost:8001/api/v1/roles'

      const method = selectedRole ? 'PUT' : 'POST'

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      setShowCreateModal(false)
      setSelectedRole(null)
      loadRoles()
    } catch (error) {
      console.error('Failed to save role:', error)
      alert('Failed to save role. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter(id => id !== permissionId)
        : [...prev.permission_ids, permissionId]
    }))
  }

  const groupedPermissions = allPermissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = []
    }
    acc[permission.resource].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('settings:roleManagement')}</h2>
          <p className="text-white/60 mt-1">{t('settings:manageRolesDescription')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{t('settings:createRole')}</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder={t('settings:searchRoles')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{role.display_name}</h3>
                  <p className="text-white/40 text-sm">{role.name}</p>
                </div>
                {role.is_system_role && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                    {t('settings:system')}
                  </span>
                )}
              </div>

              {role.description && <p className="text-white/60 text-sm mb-3">{role.description}</p>}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-white/60">
                    <span className="text-white font-medium">{role.permission_count}</span> permissions
                  </div>
                  <div className="text-white/60">
                    Priority: <span className="text-white font-medium">{role.priority}</span>
                  </div>
                </div>
              </div>

              {!role.is_system_role && (
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <button
                    onClick={() => setSelectedRole(role)}
                    className="flex-1 px-3 py-1.5 bg-white/10 text-white text-sm rounded hover:bg-white/20 transition-colors"
                  >
                    {t('settings:edit')}
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('common:previous')}
          </button>
          <span className="text-white/60">
            {t('common:page')} {page} {t('common:of')} {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('common:next')}
          </button>
        </div>
      )}

      {(showCreateModal || selectedRole) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => {
          setShowCreateModal(false)
          setSelectedRole(null)
        }}>
          <div className="modal-glass rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">
              {selectedRole ? t('settings:editRole') : t('settings:createRole')}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Name (Identifier)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., content_editor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Content Editor"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief description of this role"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">Permissions</label>
                <div className="max-h-64 overflow-y-auto space-y-3 bg-white/5 rounded-lg p-4">
                  {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                    <div key={resource} className="space-y-2">
                      <div className="text-sm font-semibold text-blue-400 uppercase tracking-wide">{resource}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {permissions.map((permission) => (
                          <label key={permission.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white/5 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.permission_ids.includes(permission.id)}
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
                  setShowCreateModal(false)
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
                {isSaving ? t('common:saving') : selectedRole ? t('settings:updateRole') : t('settings:createRole')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
