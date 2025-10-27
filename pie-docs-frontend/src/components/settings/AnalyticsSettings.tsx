import React from 'react'
import { useTranslation } from 'react-i18next'

export default function AnalyticsSettings() {
  const { t } = useTranslation(['common', 'settings'])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Analytics Settings</h2>
      <p className="text-white/60 mb-6">Configure analytics and reporting</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Data Retention (days)</label>
          <input type="number" defaultValue={90} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-blue-500" />
            <span className="text-white">Enable Usage Tracking</span>
          </label>
        </div>
      </div>
    </div>
  )
}
