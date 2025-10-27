import React from 'react'
import { useTranslation } from 'react-i18next'

export default function SearchSettings() {
  const { t } = useTranslation(['common', 'settings'])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Search & AI Settings</h2>
      <p className="text-white/60 mb-6">Configure AI and search functionality</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">AI Provider</label>
          <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-gray-800 [&>option]:text-white">
            <option>OpenAI</option>
            <option>Anthropic</option>
            <option>Local Model</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">API Key</label>
          <input type="password" placeholder="••••••••" className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-blue-500" />
            <span className="text-white">Enable Semantic Search</span>
          </label>
        </div>
      </div>
    </div>
  )
}
