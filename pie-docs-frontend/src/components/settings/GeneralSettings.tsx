import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function GeneralSettings() {
  const { t } = useTranslation(['common', 'settings'])
  const [settings, setSettings] = useState({
    app_name: 'Pie-Docs',
    company_name: 'Pivot Pie',
    default_language: 'en',
    default_timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
  })

  const handleSave = async () => {
    // TODO: Implement API call
    console.log('Saving general settings:', settings)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('settings:general')}</h2>
          <p className="text-white/60 mt-1">Configure general application settings</p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          {t('common:saveChanges')}
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Application Name</label>
          <input
            type="text"
            value={settings.app_name}
            onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Company Name</label>
          <input
            type="text"
            value={settings.company_name}
            onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Default Language</label>
            <select
              value={settings.default_language}
              onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-gray-800 [&>option]:text-white"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Default Timezone</label>
            <select
              value={settings.default_timezone}
              onChange={(e) => setSettings({ ...settings, default_timezone: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-gray-800 [&>option]:text-white"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
