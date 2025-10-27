import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { systemMonitoringService, type DatabaseStats } from '@/services/api/systemMonitoringService'

export default function DatabaseManagement() {
  const { t } = useTranslation(['common', 'settings'])
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)

  useEffect(() => {
    loadDatabaseStats()
  }, [])

  const loadDatabaseStats = async () => {
    try {
      setError(null)
      const data = await systemMonitoringService.getDatabaseStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load database stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load database stats')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackup = async () => {
    try {
      setIsCreatingBackup(true)
      setError(null)
      await systemMonitoringService.createBackup({ backup_type: 'full' })
      await loadDatabaseStats()
      alert('Backup created successfully!')
    } catch (err) {
      console.error('Failed to create backup:', err)
      setError(err instanceof Error ? err.message : 'Failed to create backup')
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const formatLastBackup = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-white/60">Loading database stats...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error || 'Failed to load database stats'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Database Management</h2>
      <p className="text-white/60 mb-6">Monitor and manage database operations</p>

      {error && (
        <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Total Size</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total_size}</div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Documents</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total_documents.toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Users</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total_users}</div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Workflows</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total_workflows}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <div className="text-white font-medium">Backup Database</div>
            <div className="text-white/60 text-sm">Last backup: {formatLastBackup(stats.last_backup)}</div>
          </div>
          <button
            onClick={handleBackup}
            disabled={isCreatingBackup}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isCreatingBackup ? 'Creating...' : 'Backup Now'}
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <div className="text-white font-medium">Export Data</div>
            <div className="text-white/60 text-sm">Export database to SQL file</div>
          </div>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Export
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <div className="text-white font-medium">Connection Pool</div>
            <div className="text-white/60 text-sm">{stats.active_connections} / {stats.connection_pool_size} connections active</div>
          </div>
        </div>
      </div>
    </div>
  )
}
