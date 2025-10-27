import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface User {
  id: string
  email: string
  name: string
  role: string
  preferredLanguage: 'en' | 'ar'
  isOnboardingCompleted?: boolean
  lastLogin?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  refreshToken: string | null
  rememberMe: boolean
  isLoading: boolean
  error: string | null
  mfaRequired: boolean
  mfaSession: string | null
  language: 'en' | 'ar'
}

const getStoredAuth = (): Partial<AuthState> => {
  try {
    const rememberMe = localStorage.getItem('rememberMe') === 'true'
    const storageType = rememberMe ? localStorage : sessionStorage
    const token = storageType.getItem('authToken')
    const refreshToken = storageType.getItem('refreshToken')
    const userStr = storageType.getItem('user')
    const language = (localStorage.getItem('language') as 'en' | 'ar') || 'en'

    return {
      token,
      refreshToken,
      user: userStr ? JSON.parse(userStr) : null,
      isAuthenticated: !!token,
      rememberMe,
      language,
    }
  } catch {
    return { language: 'en' }
  }
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  rememberMe: false,
  isLoading: false,
  error: null,
  mfaRequired: false,
  mfaSession: null,
  language: 'en',
  ...getStoredAuth(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loginSuccess: (state, action: PayloadAction<{
      user: User
      token: string
      refreshToken: string
      rememberMe: boolean
    }>) => {
      const { user, token, refreshToken, rememberMe } = action.payload

      state.isAuthenticated = true
      state.user = user
      state.token = token
      state.refreshToken = refreshToken
      state.rememberMe = rememberMe
      state.isLoading = false
      state.error = null
      state.mfaRequired = false
      state.mfaSession = null

      // Persist to storage
      const storageType = rememberMe ? localStorage : sessionStorage
      storageType.setItem('authToken', token)
      storageType.setItem('refreshToken', refreshToken)
      storageType.setItem('user', JSON.stringify(user))
      localStorage.setItem('rememberMe', rememberMe.toString())
    },
    loginError: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
      state.mfaRequired = false
      state.mfaSession = null
    },
    mfaRequired: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.mfaRequired = true
      state.mfaSession = action.payload
      state.error = null
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.mfaRequired = false
      state.mfaSession = null
      state.error = null

      // Clear storage
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('rememberMe')
      sessionStorage.removeItem('authToken')
      sessionStorage.removeItem('refreshToken')
      sessionStorage.removeItem('user')
    },
    clearError: (state) => {
      state.error = null
    },
    setLanguage: (state, action: PayloadAction<'en' | 'ar'>) => {
      state.language = action.payload
      localStorage.setItem('language', action.payload)
    },
    refreshTokenSuccess: (state, action: PayloadAction<{
      token: string
      refreshToken: string
    }>) => {
      const { token, refreshToken } = action.payload
      state.token = token
      state.refreshToken = refreshToken

      const storageType = state.rememberMe ? localStorage : sessionStorage
      storageType.setItem('authToken', token)
      storageType.setItem('refreshToken', refreshToken)
    },
    completeOnboarding: (state) => {
      if (state.user) {
        state.user.isOnboardingCompleted = true
        const storageType = state.rememberMe ? localStorage : sessionStorage
        storageType.setItem('user', JSON.stringify(state.user))
      }
    },
  },
})

export const {
  loginStart,
  loginSuccess,
  loginError,
  mfaRequired,
  logout,
  clearError,
  setLanguage,
  refreshTokenSuccess,
  completeOnboarding,
} = authSlice.actions

export default authSlice.reducer

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error
export const selectMfaRequired = (state: { auth: AuthState }) => state.auth.mfaRequired
export const selectLanguage = (state: { auth: AuthState }) => state.auth.language
export const selectNeedsOnboarding = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated && state.auth.user && !state.auth.user.isOnboardingCompleted