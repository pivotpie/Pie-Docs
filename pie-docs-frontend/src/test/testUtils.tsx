import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from 'i18next'
import authReducer from '@/store/slices/authSlice'
import uiReducer from '@/store/slices/uiSlice'

// Mock i18n instance for tests
const testI18n = i18n.createInstance()
testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      auth: {
        title: 'Sign In',
        subtitle: 'Enter your credentials to access your account',
        email: 'Email',
        password: 'Password',
        signIn: 'Sign In',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot password?',
        or: 'or',
        signInWith: 'Sign in with',
        saml: 'SAML',
        oauth: 'OAuth',
        errors: {
          required: 'This field is required',
          invalidEmail: 'Please enter a valid email',
          minLength: 'Must be at least {{min}} characters',
        },
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
})

export const createMockStore = (isAuthenticated = false) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated,
        user: isAuthenticated ? { id: '1', name: 'Test User', email: 'test@example.com', role: 'user' } : null,
        token: isAuthenticated ? 'mock-token' : null,
        refreshToken: null,
        rememberMe: false,
        isLoading: false,
        error: null,
        mfaRequired: false,
        mfaSession: null,
        language: 'en',
      },
      ui: {
        loading: {},
        sidebarCollapsed: false,
        mobileMenuOpen: false,
        theme: 'light'
      },
    },
  })
}

export const renderWithProviders = (
  ui: React.ReactElement,
  isAuthenticated = false,
  initialEntries = ['/']
) => {
  const store = createMockStore(isAuthenticated)
  return render(
    <Provider store={store}>
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter initialEntries={initialEntries}>
          {ui}
        </MemoryRouter>
      </I18nextProvider>
    </Provider>
  )
}

export const renderWithProvidersNoRouter = (
  ui: React.ReactElement,
  isAuthenticated = false
) => {
  const store = createMockStore(isAuthenticated)
  return render(
    <Provider store={store}>
      <I18nextProvider i18n={testI18n}>
        {ui}
      </I18nextProvider>
    </Provider>
  )
}

export { testI18n }