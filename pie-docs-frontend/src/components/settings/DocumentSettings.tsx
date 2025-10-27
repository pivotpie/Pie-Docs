import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function DocumentSettings() {
  const { t } = useTranslation(['common', 'settings'])

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">{t('settings:documents')}</h2>
      <p className="text-white/60 mb-6">Configure document management settings</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Max File Size (MB)</label>
          <input type="number" defaultValue={100} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-blue-500" />
            <span className="text-white">Enable OCR Processing</span>
          </label>
        </div>

        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-white/20 text-blue-500" />
            <span className="text-white">Enable Document Versioning</span>
          </label>
        </div>
      </div>
    </div>
  )
}
