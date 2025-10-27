import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { userPreferencesService, type UserPreferencesData } from '@/services/api/userPreferencesService'

export default function UserPreferences() {
  const { t, i18n } = useTranslation(['common', 'settings'])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<UserPreferencesData>({
    language: 'en',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    theme: 'dark',
    notifications_email: true,
    notifications_inapp: true,
    notifications_push: false,
    default_document_view: 'grid',
  })

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await userPreferencesService.getUserPreferences()
      setPreferences(data)
      // Update i18n language
      if (data.language !== i18n.language) {
        i18n.changeLanguage(data.language)
      }
    } catch (err) {
      console.error('Failed to load preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await userPreferencesService.updateUserPreferences(preferences)
      // Update i18n language if changed
      if (preferences.language !== i18n.language) {
        i18n.changeLanguage(preferences.language)
      }
    } catch (err) {
      console.error('Failed to save preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-white/60">Loading preferences...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('settings:preferences')}</h2>
          <p className="text-white/60 mt-1">{t('settings:customizeExperience')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? t('common:saving') : t('common:saveChanges')}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Localization */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings:localization')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('settings:language')}
            </label>
            <select
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('settings:timezone')}
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('settings:dateFormat')}
            </label>
            <select
              value={preferences.date_format}
              onChange={(e) => setPreferences({ ...preferences, date_format: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="mb-8 pb-8 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings:appearance')}</h3>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {t('settings:theme')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setPreferences({ ...preferences, theme: 'light' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                preferences.theme === 'light'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              <svg className="w-6 h-6 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <div className="text-sm text-white font-medium">{t('settings:light')}</div>
            </button>
            <button
              onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                preferences.theme === 'dark'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              <svg className="w-6 h-6 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <div className="text-sm text-white font-medium">{t('settings:dark')}</div>
            </button>
            <button
              onClick={() => setPreferences({ ...preferences, theme: 'auto' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                preferences.theme === 'auto'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              <svg className="w-6 h-6 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div className="text-sm text-white font-medium">{t('settings:auto')}</div>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-8 pb-8 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings:notifications')}</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <div className="text-white font-medium">{t('settings:emailNotifications')}</div>
              <div className="text-white/60 text-sm">{t('settings:emailNotificationsDesc')}</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications_email}
              onChange={(e) =>
                setPreferences({ ...preferences, notifications_email: e.target.checked })
              }
              className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <div className="text-white font-medium">{t('settings:inAppNotifications')}</div>
              <div className="text-white/60 text-sm">{t('settings:inAppNotificationsDesc')}</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications_inapp}
              onChange={(e) =>
                setPreferences({ ...preferences, notifications_inapp: e.target.checked })
              }
              className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <div>
              <div className="text-white font-medium">{t('settings:pushNotifications')}</div>
              <div className="text-white/60 text-sm">{t('settings:pushNotificationsDesc')}</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications_push}
              onChange={(e) =>
                setPreferences({ ...preferences, notifications_push: e.target.checked })
              }
              className="w-5 h-5 rounded border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Default Views */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings:defaultViews')}</h3>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {t('settings:defaultDocumentView')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setPreferences({ ...preferences, default_document_view: 'grid' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                preferences.default_document_view === 'grid'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              <svg className="w-6 h-6 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <div className="text-sm text-white font-medium">{t('settings:grid')}</div>
            </button>
            <button
              onClick={() => setPreferences({ ...preferences, default_document_view: 'list' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                preferences.default_document_view === 'list'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              <svg className="w-6 h-6 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <div className="text-sm text-white font-medium">{t('settings:list')}</div>
            </button>
            <button
              onClick={() => setPreferences({ ...preferences, default_document_view: 'tree' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                preferences.default_document_view === 'tree'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              <svg className="w-6 h-6 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <div className="text-sm text-white font-medium">{t('settings:tree')}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
