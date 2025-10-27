import type {
  LoginRequest,
  LoginResponse,
  MfaVerifyRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from '@/store/api/authApi'
import type { User } from '@/store/slices/authSlice'

// Mock data for development
const mockUsers: Record<string, { password: string; user: User; mfaEnabled: boolean }> = {
  'admin@pie-docs.com': {
    password: 'admin123',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@pie-docs.com',
      name: 'Admin User',
      role: 'admin',
      preferredLanguage: 'en',
      isOnboardingCompleted: true,
      lastLogin: '2025-09-20T10:00:00Z',
    },
    mfaEnabled: true,
  },
  'user@pie-docs.com': {
    password: 'user123',
    user: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'user@pie-docs.com',
      name: 'Regular User',
      role: 'user',
      preferredLanguage: 'ar',
      isOnboardingCompleted: true,
      lastLogin: '2025-09-21T14:30:00Z',
    },
    mfaEnabled: false,
  },
  'test@pie-docs.com': {
    password: 'test123',
    user: {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'test@pie-docs.com',
      name: 'Test User / مستخدم تجريبي',
      role: 'user',
      preferredLanguage: 'ar',
      isOnboardingCompleted: false, // This user needs onboarding
      lastLogin: undefined,
    },
    mfaEnabled: true,
  },
  'newuser@pie-docs.com': {
    password: 'new123',
    user: {
      id: '00000000-0000-0000-0000-000000000004',
      email: 'newuser@pie-docs.com',
      name: 'New User',
      role: 'user',
      preferredLanguage: 'en',
      isOnboardingCompleted: false, // This user needs onboarding
      lastLogin: undefined,
    },
    mfaEnabled: false,
  },
}

const mockMfaSessions: Record<string, { email: string; code: string; expiresAt: number }> = {}

class MockAuthService {
  private delay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateToken(): string {
    return `mock-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateMfaSession(): string {
    return `mfa-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    await this.delay(800)

    const mockUser = mockUsers[data.email]
    if (!mockUser || mockUser.password !== data.password) {
      throw new Error('Invalid email or password')
    }

    if (mockUser.mfaEnabled) {
      const mfaSession = this.generateMfaSession()
      const mfaCode = '123456' // Fixed code for testing

      mockMfaSessions[mfaSession] = {
        email: data.email,
        code: mfaCode,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      }

      return {
        user: mockUser.user,
        token: '',
        refreshToken: '',
        mfaRequired: true,
        mfaSession,
      }
    }

    return {
      user: mockUser.user,
      token: this.generateToken(),
      refreshToken: this.generateToken(),
    }
  }

  async verifyMfa(data: MfaVerifyRequest): Promise<LoginResponse> {
    await this.delay(500)

    const session = mockMfaSessions[data.mfaSession]
    if (!session || session.expiresAt < Date.now()) {
      throw new Error('Invalid or expired MFA session')
    }

    if (session.code !== data.code) {
      throw new Error('Invalid verification code')
    }

    const mockUser = mockUsers[session.email]
    delete mockMfaSessions[data.mfaSession]

    return {
      user: mockUser.user,
      token: this.generateToken(),
      refreshToken: this.generateToken(),
    }
  }

  async resendMfaCode(mfaSession: string): Promise<{ success: boolean }> {
    await this.delay(300)

    const session = mockMfaSessions[mfaSession]
    if (!session) {
      throw new Error('Invalid MFA session')
    }

    // Extend expiration and generate new code
    session.expiresAt = Date.now() + 5 * 60 * 1000
    session.code = '123456' // Keep same code for testing

    return { success: true }
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ success: boolean }> {
    await this.delay(1200)

    if (!mockUsers[data.email]) {
      throw new Error('Email not found')
    }

    console.log(`Mock: Password reset email sent to ${data.email}`)
    return { success: true }
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean }> {
    await this.delay(800)

    if (data.newPassword !== data.confirmPassword) {
      throw new Error('Passwords do not match')
    }

    if (data.newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    console.log('Mock: Password reset successfully')
    return { success: true }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    await this.delay(200)

    if (!refreshToken.startsWith('mock-token-')) {
      throw new Error('Invalid refresh token')
    }

    return {
      token: this.generateToken(),
      refreshToken: this.generateToken(),
    }
  }

  async logout(): Promise<void> {
    await this.delay(200)
    console.log('Mock: User logged out')
  }

  async getCurrentUser(): Promise<User> {
    await this.delay(300)

    // Return a default user for testing
    return {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@pie-docs.com',
      name: 'Admin User',
      role: 'admin',
      preferredLanguage: 'en',
    }
  }
}

export const mockAuthService = new MockAuthService()