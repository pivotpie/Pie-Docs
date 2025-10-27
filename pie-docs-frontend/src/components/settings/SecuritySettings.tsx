import React from 'react'
import { useTranslation } from 'react-i18next'

export default function SecuritySettings() {
  const { t } = useTranslation(['common', 'settings'])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Security Settings</h2>
      <p className="text-white/60 mb-6">Configure security policies and authentication</p>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Password Policy</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Minimum Length</label>
              <input type="number" defaultValue={8} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-blue-500" />
              <span className="text-white">Require Uppercase Letters</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-blue-500" />
              <span className="text-white">Require Numbers</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-blue-500" />
              <span className="text-white">Require Special Characters</span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Session Settings</h3>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Session Timeout (minutes)</label>
            <input type="number" defaultValue={30} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Login Protection</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Max Login Attempts</label>
              <input type="number" defaultValue={5} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-blue-500" />
              <span className="text-white">Enable Two-Factor Authentication</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
