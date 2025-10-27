import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
  is_system_permission: boolean
  created_at: string
}

export default function PermissionManagement() {
  const { t } = useTranslation(['common', 'settings'])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterResource, setFilterResource] = useState('')
  const [resources, setResources] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadPermissions()
    loadResources()
  }, [page, searchTerm, filterResource])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
      })
      if (searchTerm) params.append('search', searchTerm)
      if (filterResource) params.append('resource', filterResource)

      const response = await fetch(`http://localhost:8001/api/v1/permissions?${params}`)
      const data = await response.json()
      setPermissions(data.permissions || [])
      setTotalPages(data.total_pages || 1)
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadResources = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/permissions/resources')
      const data = await response.json()
      setResources(data.resources || [])
    } catch (error) {
      console.error('Failed to load resources:', error)
    }
  }

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, permission) => {
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
          <h2 className="text-2xl font-bold text-white">{t('settings:permissionManagement')}</h2>
          <p className="text-white/60 mt-1">{t('settings:managePermissionsDescription')}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <select
          value={filterResource}
          onChange={(e) => setFilterResource(e.target.value)}
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
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
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  )
}
