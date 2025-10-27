import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { systemMonitoringService, type SystemHealth as SystemHealthData } from '@/services/api/systemMonitoringService'

export default function SystemHealth() {
  const { t } = useTranslation(['common', 'settings'])
  const [health, setHealth] = useState<SystemHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSystemHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSystemHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadSystemHealth = async () => {
    try {
      setError(null)
      const data = await systemMonitoringService.getSystemHealth()
      setHealth(data)
    } catch (err) {
      console.error('Failed to load system health:', err)
      setError(err instanceof Error ? err.message : 'Failed to load system health')
    } finally {
      setIsLoading(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days} days, ${hours} hours`
    if (hours > 0) return `${hours} hours, ${minutes} minutes`
    return `${minutes} minutes`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/20 text-green-300'
      case 'warning': return 'bg-yellow-500/20 text-yellow-300'
      case 'critical': return 'bg-red-500/20 text-red-300'
      default: return 'bg-gray-500/20 text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-white/60">Loading system health...</div>
      </div>
    )
  }

  if (!health) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error || 'Failed to load system health'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">System Health</h2>
          <p className="text-white/60 mt-1">Monitor system performance and status</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSystemHealth}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            Refresh
          </button>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
            {health.status.toUpperCase()}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm mb-2">CPU Usage</div>
          <div className="text-2xl font-bold text-white mb-2">{health.cpu_usage}%</div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${health.cpu_usage}%` }}></div>
          </div>
        </div>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm mb-2">Memory Usage</div>
          <div className="text-2xl font-bold text-white mb-2">{health.memory_usage}%</div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${health.memory_usage}%` }}></div>
          </div>
        </div>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm mb-2">Disk Usage</div>
          <div className="text-2xl font-bold text-white mb-2">{health.disk_usage}%</div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${health.disk_usage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Uptime</div>
          <div className="text-xl font-bold text-white mt-1">{formatUptime(health.uptime_seconds)}</div>
        </div>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Active Users</div>
          <div className="text-xl font-bold text-white mt-1">{health.active_users}</div>
        </div>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">API Response Time</div>
          <div className="text-xl font-bold text-white mt-1">{health.api_response_time_ms}ms</div>
        </div>
      </div>
    </div>
  )
}
