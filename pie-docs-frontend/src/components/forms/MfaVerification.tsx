import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { loginSuccess, loginError, clearError } from '@/store/slices/authSlice'
import { selectAuthLoading, selectAuthError } from '@/store/slices/authSlice'
import { mockAuthService } from '@/services/mock/authService'

const mfaSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must contain only numbers'),
})

type MfaFormData = z.infer<typeof mfaSchema>

interface MfaVerificationProps {
  mfaSession: string
  onSuccess: () => void
  onBack: () => void
}

export default function MfaVerification({ mfaSession, onSuccess, onBack }: MfaVerificationProps) {
  const { t } = useTranslation('auth')
  const dispatch = useDispatch()
  const isLoading = useSelector(selectAuthLoading)
  const error = useSelector(selectAuthError)

  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendSuccess, setResendSuccess] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    setError,
  } = useForm<MfaFormData>({
    resolver: zodResolver(mfaSchema),
  })

  const codeValue = watch('code', '')

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Handle cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Clear error when user starts typing
  useEffect(() => {
    if (error && codeValue.length > 0) {
      dispatch(clearError())
    }
  }, [codeValue, error, dispatch])

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)

    // Update the form value
    const newCode = codeValue.split('')
    newCode[index] = digit
    const updatedCode = newCode.join('').slice(0, 6)
    setValue('code', updatedCode)

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    setValue('code', pastedData)

    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5)
    inputRefs.current[nextIndex]?.focus()
  }

  const onSubmit = async (data: MfaFormData) => {
    try {
      const response = await mockAuthService.verifyMfa({
        mfaSession,
        code: data.code,
      })

      dispatch(loginSuccess({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
        rememberMe: false, // This should come from the initial login attempt
      }))

      onSuccess()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code'

      if (errorMessage.includes('Invalid') || errorMessage.includes('expired')) {
        setError('code', { message: errorMessage })
      } else {
        dispatch(loginError(errorMessage))
      }
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return

    try {
      await mockAuthService.resendMfaCode(mfaSession)
      setResendCooldown(30) // 30 second cooldown
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend code'
      dispatch(loginError(errorMessage))
    }
  }

  const renderCodeInputs = () => {
    return Array.from({ length: 6 }, (_, index) => (
      <input
        key={index}
        ref={(el) => { inputRefs.current[index] = el }}
        type="text"
        inputMode="numeric"
        maxLength={1}
        className={`w-12 h-12 text-center text-lg font-semibold border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
          errors.code
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300'
        }`}
        value={codeValue[index] || ''}
        onChange={(e) => handleInputChange(index, e.target.value)}
        onKeyDown={(e) => handleKeyDown(index, e)}
        onPaste={handlePaste}
        disabled={isLoading}
        aria-label={`Digit ${index + 1}`}
      />
    ))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Hidden input for form validation */}
      <input
        {...register('code')}
        type="hidden"
      />

      {/* Code Input Grid */}
      <div>
        <label className="block text-sm font-medium text-white mb-4 text-center">
          {t('mfa.code')}
        </label>
        <div className="flex justify-center space-x-3 rtl:space-x-reverse">
          {renderCodeInputs()}
        </div>
        {errors.code && (
          <p className="mt-2 text-sm text-red-600 text-center">
            {t(`errors.${errors.code.message}`) || errors.code.message}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 text-center">
            {t(`errors.${error}`) || error}
          </p>
        </div>
      )}

      {/* Success Message */}
      {resendSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 text-center">
            {t('mfa.codeResent')}
          </p>
        </div>
      )}

      {/* Verify Button */}
      <button
        type="submit"
        disabled={isLoading || codeValue.length !== 6}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ms-1 me-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('loading.verifying')}
          </div>
        ) : (
          t('mfa.verify')
        )}
      </button>

      {/* Resend Code */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resendCooldown > 0}
          className="text-sm text-primary-600 hover:text-primary-500 focus:outline-none focus:underline disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {resendCooldown > 0
            ? t('mfa.resendIn', { seconds: resendCooldown })
            : t('mfa.resend')
          }
        </button>
      </div>

      {/* Back Button */}
      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-500 focus:outline-none focus:underline"
          disabled={isLoading}
        >
          ← {t('back')}
        </button>
      </div>
    </form>
  )
}