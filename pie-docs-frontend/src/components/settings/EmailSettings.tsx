import React from 'react'
import { useTranslation } from 'react-i18next'

export default function EmailSettings() {
  const { t } = useTranslation(['common', 'settings'])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Email Settings</h2>
      <p className="text-white/60 mb-6">Configure SMTP and email notifications</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">SMTP Host</label>
            <input type="text" placeholder="smtp.example.com" className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">SMTP Port</label>
            <input type="number" defaultValue={587} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">From Email</label>
          <input type="email" placeholder="noreply@example.com" className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-blue-500" />
            <span className="text-white">Use TLS</span>
          </label>
        </div>
      </div>
    </div>
  )
}
