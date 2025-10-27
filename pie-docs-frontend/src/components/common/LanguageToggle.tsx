import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { setLanguage, selectLanguage } from '@/store/slices/authSlice'

interface LanguageToggleProps {
  className?: string
  showLabels?: boolean
}

export default function LanguageToggle({ className = '', showLabels = true }: LanguageToggleProps) {
  const { t, i18n } = useTranslation('common')
  const dispatch = useDispatch()
  const currentLanguage = useSelector(selectLanguage)

  const handleLanguageChange = (language: 'en' | 'ar') => {
    i18n.changeLanguage(language)
    dispatch(setLanguage(language))
  }

  return (
    <div className={`flex items-center space-x-2 rtl:space-x-reverse ${className}`}>
      {showLabels && (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {t('language')}:
        </span>
      )}
      <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <button
          onClick={() => handleLanguageChange('en')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
            currentLanguage === 'en'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          aria-pressed={currentLanguage === 'en'}
          aria-label="Switch to English"
        >
          EN
        </button>
        <button
          onClick={() => handleLanguageChange('ar')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
            currentLanguage === 'ar'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          aria-pressed={currentLanguage === 'ar'}
          aria-label="التبديل إلى العربية"
        >
          العربية
        </button>
      </div>
    </div>
  )
}