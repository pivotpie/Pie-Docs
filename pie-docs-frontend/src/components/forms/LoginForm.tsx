import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { loginStart, loginSuccess, loginError, mfaRequired } from '@/store/slices/authSlice'
import { selectAuthLoading, selectAuthError } from '@/store/slices/authSlice'
import { authService } from '@/services/api/authService'

const loginSchema = z.object({
  username: z.string().min(1, 'required'),
  password: z.string().min(1, 'required').min(6, 'minLength'),
  rememberMe: z.boolean(),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onMfaRequired?: (mfaSession: string) => void
  onSuccess?: () => void
}

export default function LoginForm({ onMfaRequired, onSuccess }: LoginFormProps) {
  const { t } = useTranslation('auth')
  const dispatch = useDispatch()
  const isLoading = useSelector(selectAuthLoading)
  const error = useSelector(selectAuthError)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      dispatch(loginStart())

      // Use real API service
      const response = await authService.login(data)

      if (response.mfaRequired && response.mfaSession) {
        dispatch(mfaRequired(response.mfaSession))
        onMfaRequired?.(response.mfaSession)
      } else {
        dispatch(loginSuccess({
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken,
          rememberMe: data.rememberMe,
        }))
        onSuccess?.()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'

      // Map error messages to form fields if needed
      if (errorMessage.includes('username') || errorMessage.includes('password')) {
        setError('username', { message: 'invalidCredentials' })
      } else {
        dispatch(loginError(errorMessage))
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Username Field */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
          {t('username')}
        </label>
        <input
          {...register('username')}
          type="text"
          id="username"
          autoComplete="username"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
            errors.username
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
          }`}
          placeholder={t('username')}
          disabled={isLoading}
        />
        {errors.username && (
          <p className="mt-1 text-sm text-red-600">
            {t(`errors.${errors.username.message}`, { min: 6 })}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
          {t('password')}
        </label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            className={`w-full px-4 py-3 pe-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              errors.password
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300'
            }`}
            placeholder={t('password')}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute end-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={isLoading}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">
            {t(`errors.${errors.password.message}`, { min: 6 })}
          </p>
        )}
      </div>

      {/* Remember Me */}
      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input
            {...register('rememberMe')}
            type="checkbox"
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
            disabled={isLoading}
          />
          <span className="ms-2 text-sm text-white">{t('rememberMe')}</span>
        </label>
        <button
          type="button"
          className="text-sm text-primary-600 hover:text-primary-500 focus:outline-none focus:underline"
          disabled={isLoading}
          onClick={() => {
            // Handle forgot password navigation
            console.log('Navigate to forgot password')
          }}
        >
          {t('forgotPassword')}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{t(`errors.${error}`) || error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ms-1 me-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('loading.signingIn')}
          </div>
        ) : (
          t('signIn')
        )}
      </button>
    </form>
  )
}