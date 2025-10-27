import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const savedLanguage = localStorage.getItem('language') as 'en' | 'ar' || 'en'

// Custom backend for lazy loading translations
const customBackend = {
  type: 'backend' as const,
  init: () => {},
  read: async (language: string, namespace: string, callback: (err: Error | null, data?: unknown) => void) => {
    try {
      // Dynamically import translations only when needed
      const translations = await import(`@/locales/${language}/${namespace}.json`)
      callback(null, translations.default)
    } catch (error) {
      callback(error as Error)
    }
  },
}

i18n
  .use(customBackend)
  .use(initReactI18next)
  .init({
    lng: savedLanguage,
    fallbackLng: 'en',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },

    ns: ['common', 'auth', 'navigation', 'dashboard'],
    defaultNS: 'common',
  })

// Listen for language changes and update document direction
i18n.on('languageChanged', (lng) => {
  const direction = lng === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.dir = direction
  document.documentElement.lang = lng
  localStorage.setItem('language', lng)
})

// Set initial direction
const initialDirection = savedLanguage === 'ar' ? 'rtl' : 'ltr'
document.documentElement.dir = initialDirection
document.documentElement.lang = savedLanguage

export default i18n