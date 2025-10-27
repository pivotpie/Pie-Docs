import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { settingsService, type UserProfile as UserProfileData } from '@/services/api/settingsService'

export default function UserProfile() {
  const { t } = useTranslation(['common', 'settings'])
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profile, setProfile] = useState<UserProfileData | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await settingsService.getUserProfile()
      setProfile(data)
    } catch (err) {
      console.error('Failed to load profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    setError(null)
    try {
      const updated = await settingsService.updateUserProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone_number: profile.phone_number,
      })
      setProfile(updated)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setUploadingAvatar(true)
    setError(null)
    try {
      const result = await settingsService.uploadAvatar(file)
      if (profile) {
        setProfile({ ...profile, avatar_url: result.avatar_url })
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleAvatarDelete = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return

    try {
      await settingsService.deleteAvatar()
      if (profile) {
        setProfile({ ...profile, avatar_url: undefined })
      }
    } catch (err) {
      console.error('Failed to delete avatar:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete avatar')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-white/60">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-red-300">Failed to load profile. Please refresh the page.</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('settings:myProfile')}</h2>
          <p className="text-white/60 mt-1">{t('settings:managePersonalInfo')}</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>{t('common:edit')}</span>
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              {t('common:cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? t('common:saving') : t('common:save')}
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 flex items-start">
          <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Profile Picture */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-white/80 mb-3">
          {t('settings:profilePicture')}
        </label>
        <div className="flex items-center space-x-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {profile.first_name?.charAt(0) || '?'}
              {profile.last_name?.charAt(0) || '?'}
            </div>
          )}
          {isEditing && (
            <div className="flex flex-col space-y-2">
              <label className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm cursor-pointer">
                {uploadingAvatar ? 'Uploading...' : t('settings:uploadPhoto')}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
              {profile.avatar_url && (
                <button
                  onClick={handleAvatarDelete}
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                >
                  {t('settings:removePhoto')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {t('settings:username')}
          </label>
          <input
            type="text"
            value={profile.username}
            disabled={!isEditing}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {t('settings:email')}
          </label>
          <input
            type="email"
            value={profile.email}
            disabled={!isEditing}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {t('settings:firstName')}
          </label>
          <input
            type="text"
            value={profile.first_name}
            disabled={!isEditing}
            onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {t('settings:lastName')}
          </label>
          <input
            type="text"
            value={profile.last_name}
            disabled={!isEditing}
            onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Phone Number */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white/80 mb-2">
            {t('settings:phoneNumber')}
          </label>
          <input
            type="tel"
            value={profile.phone_number}
            disabled={!isEditing}
            onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Account Info */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings:accountInfo')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/60">{t('settings:accountCreated')}:</span>
            <span className="text-white ml-2">Jan 15, 2024</span>
          </div>
          <div>
            <span className="text-white/60">{t('settings:lastLogin')}:</span>
            <span className="text-white ml-2">2 hours ago</span>
          </div>
          <div>
            <span className="text-white/60">{t('settings:accountStatus')}:</span>
            <span className="text-green-300 ml-2">{t('settings:active')}</span>
          </div>
          <div>
            <span className="text-white/60">{t('settings:emailVerified')}:</span>
            <span className="text-green-300 ml-2">{t('common:yes')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
