import React from 'react'
import { useTranslation } from 'react-i18next'

export default function WorkflowSettings() {
  const { t } = useTranslation(['common', 'settings'])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">{t('settings:workflows')}</h2>
      <p className="text-white/60 mb-6">Configure workflow engine settings</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Max Approval Levels</label>
          <input type="number" defaultValue={5} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Default SLA (hours)</label>
          <input type="number" defaultValue={24} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
    </div>
  )
}
