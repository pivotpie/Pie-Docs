import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { apiKeysService, type ApiKey, type CreateApiKeyRequest } from '@/services/api/apiKeysService'

export default function ApiSettings() {
  const { t } = useTranslation(['common', 'settings'])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null)
  const [newKeyData, setNewKeyData] = useState<CreateApiKeyRequest>({
    name: '',
    permissions: [],
    rate_limit: 1000,
  })

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiKeysService.listApiKeys()
      setApiKeys(response.api_keys)
    } catch (err) {
      console.error('Failed to load API keys:', err)
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyData.name.trim()) {
      setError('API key name is required')
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      const response = await apiKeysService.createApiKey(newKeyData)
      setNewKeySecret(response.api_key_secret)
      await loadApiKeys()
      setNewKeyData({ name: '', permissions: [], rate_limit: 1000 })
    } catch (err) {
      console.error('Failed to create API key:', err)
      setError(err instanceof Error ? err.message : 'Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      setError(null)
      await apiKeysService.revokeApiKey(keyId)
      await loadApiKeys()
    } catch (err) {
      console.error('Failed to revoke API key:', err)
      setError(err instanceof Error ? err.message : 'Failed to revoke API key')
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const formatLastUsed = (dateString?: string) => {
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
        <div className="text-white/60">Loading API keys...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">API & Webhooks</h2>
          <p className="text-white/60 mt-1">Manage API keys and webhook integrations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          Create API Key
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* API Keys List */}
      <div className="space-y-3">
        {apiKeys.length === 0 ? (
          <div className="p-8 bg-white/5 rounded-lg border border-white/10 text-center text-white/60">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          apiKeys.map((key) => (
            <div key={key.id} className="p-4 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-white font-medium">{key.name}</div>
                <div className="text-white/60 text-sm">{key.key_prefix}</div>
                <div className="text-white/40 text-xs mt-1">
                  Created: {formatDate(key.created_at)} | Last used: {formatLastUsed(key.last_used_at)} | Usage: {key.usage_count}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${key.is_active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                  {key.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors text-sm"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => {
          if (!newKeySecret) setShowCreateModal(false)
        }}>
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {!newKeySecret ? (
              <>
                <h3 className="text-xl font-bold text-white mb-4">Create API Key</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Name</label>
                    <input
                      type="text"
                      value={newKeyData.name}
                      onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Production API"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Rate Limit (requests/hour)</label>
                    <input
                      type="number"
                      value={newKeyData.rate_limit}
                      onChange={(e) => setNewKeyData({ ...newKeyData, rate_limit: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Expires in (days, optional)</label>
                    <input
                      type="number"
                      value={newKeyData.expires_in_days || ''}
                      onChange={(e) => setNewKeyData({ ...newKeyData, expires_in_days: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave empty for no expiration"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCreateKey}
                    disabled={isCreating}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    disabled={isCreating}
                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-4">API Key Created</h3>
                <div className="mb-4">
                  <p className="text-white/60 text-sm mb-3">
                    Save this API key now. You won't be able to see it again!
                  </p>
                  <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                    <code className="text-green-400 break-all">{newKeySecret}</code>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setNewKeySecret(null)
                    setShowCreateModal(false)
                  }}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
