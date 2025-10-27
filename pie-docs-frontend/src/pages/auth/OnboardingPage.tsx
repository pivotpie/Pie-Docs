import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDispatch } from 'react-redux'
import { completeOnboarding } from '@/store/slices/authSlice'
import LanguageToggle from '@/components/common/LanguageToggle'

// Onboarding form schema
const onboardingSchema = z.object({
  // Personal preferences
  displayName: z.string().min(1, 'required'),
  timezone: z.string().min(1, 'required'),
  dateFormat: z.string().min(1, 'required'),

  // Notification preferences
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  desktopNotifications: z.boolean(),

  // Initial folder structure
  createDefaultFolders: z.boolean(),
  folderStructureType: z.string(),

  // Tutorial preferences
  showTutorial: z.boolean(),
  tutorialType: z.string(),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

interface OnboardingStep {
  id: string
  title: string
  subtitle: string
  icon: JSX.Element
}

export default function OnboardingPage() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: 'MM/DD/YYYY',
      emailNotifications: true,
      smsNotifications: false,
      desktopNotifications: true,
      createDefaultFolders: true,
      folderStructureType: 'department',
      showTutorial: true,
      tutorialType: 'interactive',
    },
  })

  const watchShowTutorial = watch('showTutorial')
  const watchCreateDefaultFolders = watch('createDefaultFolders')

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: t('onboarding.welcome.title'),
      subtitle: t('onboarding.welcome.subtitle'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3.5" />
        </svg>
      ),
    },
    {
      id: 'preferences',
      title: t('onboarding.preferences.title'),
      subtitle: t('onboarding.preferences.subtitle'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      title: t('onboarding.notifications.title'),
      subtitle: t('onboarding.notifications.subtitle'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 19.481a8.966 8.966 0 01-.868-3.96c0-2.314.87-4.426 2.296-6.01L12 3l5.704 6.511A8.966 8.966 0 0120 15.52a8.966 8.966 0 01-.868 3.961" />
        </svg>
      ),
    },
    {
      id: 'folders',
      title: t('onboarding.folders.title'),
      subtitle: t('onboarding.folders.subtitle'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      id: 'tutorial',
      title: t('onboarding.tutorial.title'),
      subtitle: t('onboarding.tutorial.subtitle'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
  ]

  const onSubmit = async (data: OnboardingFormData) => {
    setIsCompleting(true)

    try {
      // Simulate API call to save onboarding preferences
      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('Onboarding completed with data:', data)

      // Mark onboarding as completed in the auth store
      dispatch(completeOnboarding())

      // Navigate to dashboard after completion
      navigate('/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    // Mark onboarding as completed even when skipped
    dispatch(completeOnboarding())
    navigate('/dashboard')
  }

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            {/* PieDocs Logo */}
            <div className="mx-auto mb-8">
              <img
                src="/assets/images/pie-docs-logo.png"
                alt="PieDocs"
                className="h-24 w-auto mx-auto object-contain"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white">
                {t('onboarding.welcome.message')}
              </h3>
              <p className="text-white/80 max-w-md mx-auto leading-relaxed">
                {t('onboarding.welcome.description')}
              </p>
            </div>

            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="text-sm font-medium text-white">{t('onboarding.features.documents')}</h4>
              </div>
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h4 className="text-sm font-medium text-white">{t('onboarding.features.search')}</h4>
              </div>
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h4 className="text-sm font-medium text-white">{t('onboarding.features.analytics')}</h4>
              </div>
            </div>
          </div>
        )

      case 'preferences':
        return (
          <div className="space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-white mb-2">
                {t('onboarding.preferences.displayName')}
              </label>
              <input
                {...register('displayName')}
                type="text"
                id="displayName"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={t('onboarding.preferences.displayNamePlaceholder')}
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-400">{t(`errors.${errors.displayName.message}`)}</p>
              )}
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-white mb-2">
                {t('onboarding.preferences.timezone')}
              </label>
              <select
                {...register('timezone')}
                id="timezone"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="America/New_York">Eastern Time (UTC-5)</option>
                <option value="America/Chicago">Central Time (UTC-6)</option>
                <option value="America/Denver">Mountain Time (UTC-7)</option>
                <option value="America/Los_Angeles">Pacific Time (UTC-8)</option>
                <option value="Asia/Dubai">Gulf Standard Time (UTC+4)</option>
                <option value="Asia/Riyadh">Arabia Standard Time (UTC+3)</option>
              </select>
            </div>

            {/* Date Format */}
            <div>
              <label htmlFor="dateFormat" className="block text-sm font-medium text-white mb-2">
                {t('onboarding.preferences.dateFormat')}
              </label>
              <select
                {...register('dateFormat')}
                id="dateFormat"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  {...register('emailNotifications')}
                  type="checkbox"
                  className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <div>
                  <div className="text-white font-medium">{t('onboarding.notifications.email')}</div>
                  <div className="text-white/70 text-sm">{t('onboarding.notifications.emailDesc')}</div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  {...register('smsNotifications')}
                  type="checkbox"
                  className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <div>
                  <div className="text-white font-medium">{t('onboarding.notifications.sms')}</div>
                  <div className="text-white/70 text-sm">{t('onboarding.notifications.smsDesc')}</div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  {...register('desktopNotifications')}
                  type="checkbox"
                  className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <div>
                  <div className="text-white font-medium">{t('onboarding.notifications.desktop')}</div>
                  <div className="text-white/70 text-sm">{t('onboarding.notifications.desktopDesc')}</div>
                </div>
              </label>
            </div>
          </div>
        )

      case 'folders':
        return (
          <div className="space-y-6">
            <label className="flex items-start space-x-3">
              <input
                {...register('createDefaultFolders')}
                type="checkbox"
                className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 mt-1"
              />
              <div>
                <div className="text-white font-medium">{t('onboarding.folders.createDefault')}</div>
                <div className="text-white/70 text-sm">{t('onboarding.folders.createDefaultDesc')}</div>
              </div>
            </label>

            {watchCreateDefaultFolders && (
              <div>
                <label htmlFor="folderStructureType" className="block text-sm font-medium text-white mb-2">
                  {t('onboarding.folders.structureType')}
                </label>
                <select
                  {...register('folderStructureType')}
                  id="folderStructureType"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="department">{t('onboarding.folders.department')}</option>
                  <option value="project">{t('onboarding.folders.project')}</option>
                  <option value="document-type">{t('onboarding.folders.documentType')}</option>
                  <option value="custom">{t('onboarding.folders.custom')}</option>
                </select>
              </div>
            )}
          </div>
        )

      case 'tutorial':
        return (
          <div className="space-y-6">
            <label className="flex items-start space-x-3">
              <input
                {...register('showTutorial')}
                type="checkbox"
                className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 mt-1"
              />
              <div>
                <div className="text-white font-medium">{t('onboarding.tutorial.showTutorial')}</div>
                <div className="text-white/70 text-sm">{t('onboarding.tutorial.showTutorialDesc')}</div>
              </div>
            </label>

            {watchShowTutorial && (
              <div>
                <label htmlFor="tutorialType" className="block text-sm font-medium text-white mb-2">
                  {t('onboarding.tutorial.type')}
                </label>
                <select
                  {...register('tutorialType')}
                  id="tutorialType"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="interactive">{t('onboarding.tutorial.interactive')}</option>
                  <option value="video">{t('onboarding.tutorial.video')}</option>
                  <option value="guide">{t('onboarding.tutorial.guide')}</option>
                </select>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="auth-container flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header with Language Toggle and Back to Login */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-white/60 hover:text-white flex items-center"
          >
            ← {t('common:back')} {t('common:login', 'Login')}
          </button>
          <LanguageToggle showLabels={false} />
        </div>

        {/* Progress Indicator */}
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Main Onboarding Card */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="auth-card rounded-xl shadow-2xl p-8">
            {/* Step Header */}
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-4 text-white">
                {steps[currentStep].icon}
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {steps[currentStep].title}
              </h2>
              <p className="text-white/80">
                {steps[currentStep].subtitle}
              </p>
              <div className="text-sm text-white/60 mt-2">
                {t('onboarding.step')} {currentStep + 1} {t('common:of')} {steps.length}
              </div>
            </div>

            {/* Step Content */}
            <div className="mb-8">
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <div>
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-6 py-3 border border-gray-600 rounded-lg text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    {t('common:previous')}
                  </button>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-6 py-3 text-white/70 hover:text-white focus:outline-none focus:underline transition-colors"
                >
                  {t('onboarding.skip')}
                </button>

                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    {t('common:next')}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isCompleting}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCompleting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ms-1 me-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t('onboarding.completing')}
                      </div>
                    ) : (
                      t('onboarding.complete')
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}