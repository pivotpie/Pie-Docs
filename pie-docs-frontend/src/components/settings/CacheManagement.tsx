import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { systemMonitoringService, type CacheStats } from '@/services/api/systemMonitoringService'

export default function CacheManagement() {
  const { t } = useTranslation(['common', 'settings'])
  const [cacheStats, setCacheStats] = useState<CacheStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearingCache, setClearingCache] = useState<string | null>(null)

  useEffect(() => {
    loadCacheStats()
  }, [])

  const loadCacheStats = async () => {
    try {
      setError(null)
      const data = await systemMonitoringService.getCacheStats()
      setCacheStats(data)
    } catch (err) {
      console.error('Failed to load cache stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load cache stats')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearCache = async (cacheName: string) => {
    if (!confirm(`Are you sure you want to clear the ${cacheName}?`)) {
      return
    }

    try {
      setClearingCache(cacheName)
      setError(null)
      await systemMonitoringService.clearCache(cacheName)
      await loadCacheStats()
    } catch (err) {
      console.error('Failed to clear cache:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear cache')
    } finally {
      setClearingCache(null)
    }
  }

  const handleClearAllCaches = async () => {
    if (!confirm('Are you sure you want to clear all caches? This may temporarily affect performance.')) {
      return
    }

    try {
      setClearingCache('all')
      setError(null)
      await systemMonitoringService.clearAllCaches()
      await loadCacheStats()
    } catch (err) {
      console.error('Failed to clear all caches:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear all caches')
    } finally {
      setClearingCache(null)
    }
  }

  const getTotalStats = () => {
    return cacheStats.reduce(
      (acc, cache) => ({
        totalKeys: acc.totalKeys + cache.total_keys,
        memoryUsage: acc.memoryUsage + cache.memory_usage_mb,
        evictions: acc.evictions + cache.eviction_count,
      }),
      { totalKeys: 0, memoryUsage: 0, evictions: 0 }
    )
  }

  const getAverageHitRate = () => {
    if (cacheStats.length === 0) return 0
    const sum = cacheStats.reduce((acc, cache) => acc + cache.hit_rate, 0)
    return (sum / cacheStats.length).toFixed(1)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-white/60">Loading cache stats...</div>
      </div>
    )
  }

  const totalStats = getTotalStats()
  const avgHitRate = getAverageHitRate()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Cache Management</h2>
          <p className="text-white/60 mt-1">Monitor and manage application cache</p>
        </div>
        <button
          onClick={handleClearAllCaches}
          disabled={clearingCache === 'all'}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {clearingCache === 'all' ? 'Clearing...' : 'Clear All Cache'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Total Keys</div>
          <div className="text-2xl font-bold text-white mt-1">{totalStats.totalKeys.toLocaleString()}</div>
        </div>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Memory Usage</div>
          <div className="text-2xl font-bold text-white mt-1">{totalStats.memoryUsage.toFixed(1)} MB</div>
        </div>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Avg Hit Rate</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{avgHitRate}%</div>
        </div>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white/60 text-sm">Total Evictions</div>
          <div className="text-2xl font-bold text-white mt-1">{totalStats.evictions}</div>
        </div>
      </div>

      <div className="space-y-3">
        {cacheStats.map((cache) => (
          <div key={cache.cache_name} className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-white font-medium capitalize">{cache.cache_name.replace('_', ' ')}</div>
                <div className="text-white/60 text-sm mt-1">
                  {cache.total_keys} keys · {cache.memory_usage_mb.toFixed(1)} MB · Hit rate: {cache.hit_rate}%
                </div>
              </div>
              <button
                onClick={() => handleClearCache(cache.cache_name)}
                disabled={clearingCache === cache.cache_name}
                className="px-3 py-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded text-sm transition-colors disabled:opacity-50"
              >
                {clearingCache === cache.cache_name ? 'Clearing...' : 'Clear'}
              </button>
            </div>
          </div>
        ))}

        {cacheStats.length === 0 && (
          <div className="p-8 bg-white/5 rounded-lg border border-white/10 text-center text-white/60">
            No cache data available
          </div>
        )}
      </div>
    </div>
  )
}
