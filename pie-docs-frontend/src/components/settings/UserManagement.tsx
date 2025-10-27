import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  roles: Role[]
  role_names: string[]
  created_at: string
  last_login?: string
}

interface Role {
  id: string
  name: string
  display_name: string
}

interface UserFormData {
  username: string
  email: string
  password?: string
  first_name: string
  last_name: string
  phone_number: string
  is_active: boolean
  is_verified: boolean
  role_ids: string[]
}

export default function UserManagement() {
  const { t } = useTranslation(['common', 'settings'])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])

  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    is_active: true,
    is_verified: false,
    role_ids: [],
  })

  // Load users
  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [page, searchTerm])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `http://localhost:8001/api/v1/users?page=${page}&page_size=10${searchTerm ? `&search=${searchTerm}` : ''}`
      )
      const data = await response.json()
      setUsers(data.users || [])
      setTotalPages(data.total_pages || 1)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/roles?page_size=100')
      const data = await response.json()
      setAvailableRoles(data.roles || [])
    } catch (error) {
      console.error('Failed to load roles:', error)
    }
  }

  const handleCreateUser = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      is_active: true,
      is_verified: false,
      role_ids: [],
    })
    setShowModal(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't populate password for editing
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: '',
      is_active: user.is_active,
      is_verified: user.is_verified,
      role_ids: user.roles.map((r) => r.id),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingUser
        ? `http://localhost:8001/api/v1/users/${editingUser.id}`
        : 'http://localhost:8001/api/v1/users'

      const method = editingUser ? 'PUT' : 'POST'

      const payload = editingUser
        ? {
            // For update, don't send password unless it's being changed
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone_number: formData.phone_number,
            is_active: formData.is_active,
            is_verified: formData.is_verified,
          }
        : formData

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // Update role assignments
      if (editingUser) {
        await fetch(`http://localhost:8001/api/v1/users/${editingUser.id}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_ids: formData.role_ids }),
        })
      }

      setShowModal(false)
      loadUsers()
    } catch (error) {
      console.error('Failed to save user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('settings:confirmDeleteUser'))) return

    try {
      await fetch(`http://localhost:8001/api/v1/users/${userId}`, {
        method: 'DELETE',
      })
      loadUsers()
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const toggleUserActive = async (user: User) => {
    try {
      await fetch(`http://localhost:8001/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      loadUsers()
    } catch (error) {
      console.error('Failed to toggle user status:', error)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('settings:userManagement')}</h2>
          <p className="text-white/60 mt-1">{t('settings:manageUsersDescription')}</p>
        </div>
        <button
          onClick={handleCreateUser}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{t('settings:createUser')}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={t('settings:searchUsers')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">{t('settings:user')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">{t('settings:email')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">{t('settings:roles')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">{t('settings:status')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">{t('settings:lastLogin')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-white/60">{t('settings:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.username}</div>
                          <div className="text-white/40 text-sm">
                            {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/80">{user.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.role_names.map((role, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {user.is_active ? t('settings:active') : t('settings:inactive')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/60 text-sm">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : t('settings:never')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title={t('settings:edit')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleUserActive(user)}
                          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title={user.is_active ? t('settings:deactivate') : t('settings:activate')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          title={t('settings:delete')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="modal-glass rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingUser ? t('settings:editUser') : t('settings:createUser')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('settings:username')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser} // Username cannot be changed
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('settings:email')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Password (only for new users) */}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('settings:password')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* First and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">{t('settings:firstName')}</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">{t('settings:lastName')}</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">{t('settings:phoneNumber')}</label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">{t('settings:roles')}</label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-white/5 rounded-lg">
                  {availableRoles.map((role) => (
                    <label key={role.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white/10 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.role_ids.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, role_ids: [...formData.role_ids, role.id] })
                          } else {
                            setFormData({ ...formData, role_ids: formData.role_ids.filter((id) => id !== role.id) })
                          }
                        }}
                        className="rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-white">{role.display_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Toggles */}
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white">{t('settings:activeStatus')}</span>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white">{t('settings:verifiedStatus')}</span>
                  <input
                    type="checkbox"
                    checked={formData.is_verified}
                    onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  {editingUser ? t('common:update') : t('common:create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
