import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectMfaRequired, selectNeedsOnboarding, selectUser } from '@/store/slices/authSlice'
import LanguageToggle from '@/components/common/LanguageToggle'
import LoginForm from '@/components/forms/LoginForm'
import MfaVerification from '@/components/forms/MfaVerification'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const mfaRequired = useSelector(selectMfaRequired)
  const needsOnboarding = useSelector(selectNeedsOnboarding)
  const user = useSelector(selectUser)
  const [mfaSession, setMfaSession] = useState<string | null>(null)
  const [showSsoOptions, setShowSsoOptions] = useState(false)

  const handleMfaRequired = (session: string) => {
    setMfaSession(session)
  }

  const handleLoginSuccess = () => {
    // Small delay to ensure token is persisted to storage before navigation
    setTimeout(() => {
      // Check if user needs onboarding
      if (user && !user.isOnboardingCompleted) {
        console.log('User needs onboarding - redirecting to onboarding page')
        navigate('/onboarding')
      } else {
        console.log('Login successful - redirect to dashboard')
        navigate('/dashboard')
      }
    }, 100)
  }

  const handleMfaSuccess = () => {
    setMfaSession(null)
    handleLoginSuccess()
  }

  return (
    <div className="auth-container flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Language Toggle */}
        <div className="flex justify-end">
          <LanguageToggle showLabels={false} />
        </div>

        {/* Main Auth Card */}
        <div className="auth-card rounded-xl shadow-2xl p-8">
          {/* Header with PieDocs Logo */}
          <div className="text-center mb-8">
            {/* Company Logo and Branding Area */}
            <div className="mx-auto mb-6">
              <img
                src="/assets/images/pie-docs-logo.png"
                alt="PieDocs"
                className="h-16 w-auto mx-auto object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-white">
              {mfaRequired ? t('mfa.title') : t('title')}
            </h2>
            <p className="mt-2 text-sm text-white">
              {mfaRequired ? t('mfa.subtitle') : t('subtitle')}
            </p>
          </div>

          {/* Auth Forms */}
          {mfaRequired && mfaSession ? (
            <MfaVerification
              mfaSession={mfaSession}
              onSuccess={handleMfaSuccess}
              onBack={() => setMfaSession(null)}
            />
          ) : (
            <>
              <LoginForm
                onMfaRequired={handleMfaRequired}
                onSuccess={handleLoginSuccess}
              />

              {/* SSO Options */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-white">{t('or')}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setShowSsoOptions(!showSsoOptions)}
                    className="w-full flex justify-center items-center px-4 py-3 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <svg className="w-5 h-5 me-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                    {t('signInWith')} {t('sso')}
                    <svg
                      className={`w-4 h-4 ms-2 transition-transform ${showSsoOptions ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showSsoOptions && (
                    <div className="mt-4 space-y-3">
                      <button
                        className="w-full flex justify-center items-center px-4 py-3 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        onClick={() => console.log('SAML SSO clicked')}
                      >
                        <svg className="w-5 h-5 me-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        {t('signInWith')} {t('saml')}
                      </button>
                      <button
                        className="w-full flex justify-center items-center px-4 py-3 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        onClick={() => console.log('OAuth SSO clicked')}
                      >
                        <svg className="w-5 h-5 me-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {t('signInWith')} {t('oauth')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-white/80">
            {t('footer')}
          </p>
          {/* New User Link */}
          <div className="mt-4">
            <span className="text-sm text-white/60">
              {t('newUser')}{' '}
            </span>
            <button
              onClick={() => navigate('/onboarding')}
              className="text-sm text-primary-400 hover:text-primary-300 underline font-medium"
            >
              {t('getStarted')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}