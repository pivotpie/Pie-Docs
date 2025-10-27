import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PasswordChangeData {
  current_password: string
  new_password: string
  confirm_password: string
}

interface Session {
  id: string
  device: string
  location: string
  ip_address: string
  last_active: string
  is_current: boolean
}

export default function UserSecurity() {
  const { t } = useTranslation(['common', 'settings'])
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      device: 'Chrome on Windows',
      location: 'New York, USA',
      ip_address: '192.168.1.1',
      last_active: '2 minutes ago',
      is_current: true,
    },
    {
      id: '2',
      device: 'Safari on iPhone',
      location: 'New York, USA',
      ip_address: '192.168.1.2',
      last_active: '2 hours ago',
      is_current: false,
    },
  ])

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert(t('settings:passwordsDoNotMatch'))
      return
    }

    setIsSaving(true)
    try {
      await import('@/services/api/settingsService').then(({ settingsService }) =>
        settingsService.changePassword({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          confirm_password: passwordData.confirm_password,
        })
      )
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      setIsChangingPassword(false)
      alert('Password changed successfully')
    } catch (error) {
      console.error('Failed to change password:', error)
      alert(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm(t('settings:confirmRevokeSession'))) return

    try {
      await import('@/services/api/settingsService').then(({ settingsService }) =>
        settingsService.revokeSession(sessionId)
      )
      setSessions(sessions.filter((s) => s.id !== sessionId))
    } catch (error) {
      console.error('Failed to revoke session:', error)
      alert(error instanceof Error ? error.message : 'Failed to revoke session')
    }
  }

  const handleToggle2FA = async () => {
    try {
      if (!twoFactorEnabled) {
        const response = await import('@/services/api/settingsService').then(({ settingsService }) =>
          settingsService.enable2FA()
        )
        // Show QR code and setup UI
        console.log('2FA Setup:', response)
      } else {
        const code = prompt('Enter your 2FA code to disable:')
        if (code) {
          await import('@/services/api/settingsService').then(({ settingsService }) =>
            settingsService.disable2FA(code)
          )
        }
      }
      setTwoFactorEnabled(!twoFactorEnabled)
    } catch (error) {
      console.error('Failed to toggle 2FA:', error)
      alert(error instanceof Error ? error.message : 'Failed to toggle 2FA')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{t('settings:passwordSecurity')}</h2>
        <p className="text-white/60 mt-1">{t('settings:manageSecuritySettings')}</p>
      </div>

      {/* Password Change */}
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{t('settings:changePassword')}</h3>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
            >
              {t('settings:changePassword')}
            </button>
          )}
        </div>

        {isChangingPassword && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                {t('settings:currentPassword')}
              </label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, current_password: e.target.value })
                }
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                {t('settings:newPassword')}
              </label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-white/40 mt-1">{t('settings:passwordRequirements')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                {t('settings:confirmPassword')}
              </label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirm_password: e.target.value })
                }
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsChangingPassword(false)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? t('common:saving') : t('settings:updatePassword')}
              </button>
            </div>
          </div>
        )}

        {!isChangingPassword && (
          <p className="text-white/60 text-sm">{t('settings:lastPasswordChange')}: 30 days ago</p>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{t('settings:twoFactorAuth')}</h3>
            <p className="text-white/60 text-sm mt-1">{t('settings:twoFactorAuthDesc')}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={handleToggle2FA}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {twoFactorEnabled && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-green-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="text-green-300 font-medium">{t('settings:2faEnabled')}</div>
                <div className="text-green-200/80 text-sm mt-1">{t('settings:2faEnabledDesc')}</div>
                <button className="mt-3 text-sm text-green-300 hover:text-green-200 underline">
                  {t('settings:viewBackupCodes')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings:activeSessions')}</h3>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-white/60 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <div className="text-white font-medium flex items-center space-x-2">
                    <span>{session.device}</span>
                    {session.is_current && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full">
                        {t('settings:currentSession')}
                      </span>
                    )}
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    {session.location} • {session.ip_address}
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    {t('settings:lastActive')}: {session.last_active}
                  </div>
                </div>
              </div>
              {!session.is_current && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                >
                  {t('settings:revoke')}
                </button>
              )}
            </div>
          ))}
        </div>

        <button className="mt-4 w-full px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium">
          {t('settings:revokeAllOtherSessions')}
        </button>
      </div>
    </div>
  )
}
