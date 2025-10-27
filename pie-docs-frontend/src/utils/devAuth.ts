import { type Dispatch } from '@reduxjs/toolkit'
import { loginSuccess } from '@/store/slices/authSlice'
import type { User } from '@/store/slices/authSlice'

// Development helper to automatically authenticate for testing
export const initDevAuth = (dispatch: Dispatch) => {
  // Only in development mode
  if (import.meta.env.DEV) {
    // Check if user is already authenticated
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
    if (!token) {
      // Auto-login with test user for development
      // Using UUID format to match backend expectations
      const mockUser: User = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@piedocs.com',
        name: 'Admin User',
        role: 'admin',
        preferredLanguage: 'en',
      }

      const mockToken = 'dev-token-' + Date.now()
      const mockRefreshToken = 'dev-refresh-' + Date.now()

      dispatch(loginSuccess({
        user: mockUser,
        token: mockToken,
        refreshToken: mockRefreshToken,
        rememberMe: false,
      }))

      console.log('🔧 Development: Auto-authenticated as', mockUser.name)
      console.log('Available mock users for manual login:')
      console.log('- admin@pie-docs.com / admin123')
      console.log('- user@pie-docs.com / user123')
      console.log('- test@pie-docs.com / test123')
    }
  }
}