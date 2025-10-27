import type {
  LoginRequest,
  LoginResponse,
  MfaVerifyRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from '@/store/api/authApi'
import type { User } from '@/store/slices/authSlice'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// Rate limiting configuration
interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
}

interface RateLimitState {
  attempts: number
  firstAttemptTime: number
  blockedUntil?: number
}

class AuthService {
  private rateLimitConfig: Record<string, RateLimitConfig> = {
    login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
    forgotPassword: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 }, // 3 attempts per hour
    mfaVerify: { maxAttempts: 5, windowMs: 5 * 60 * 1000, blockDurationMs: 5 * 60 * 1000 }, // 5 attempts per 5 min
  }

  private rateLimitState: Record<string, RateLimitState> = {}

  private checkRateLimit(endpoint: string): boolean {
    const config = this.rateLimitConfig[endpoint]
    if (!config) return true // No rate limiting for this endpoint

    const now = Date.now()
    const state = this.rateLimitState[endpoint] || { attempts: 0, firstAttemptTime: now }

    // Check if currently blocked
    if (state.blockedUntil && now < state.blockedUntil) {
      throw new Error(`Too many attempts. Please try again in ${Math.ceil((state.blockedUntil - now) / 60000)} minutes.`)
    }

    // Reset window if expired
    if (now - state.firstAttemptTime > config.windowMs) {
      state.attempts = 0
      state.firstAttemptTime = now
      delete state.blockedUntil
    }

    // Check if limit exceeded
    if (state.attempts >= config.maxAttempts) {
      state.blockedUntil = now + config.blockDurationMs
      this.rateLimitState[endpoint] = state
      throw new Error(`Too many attempts. Please try again in ${Math.ceil(config.blockDurationMs / 60000)} minutes.`)
    }

    // Record attempt
    state.attempts++
    this.rateLimitState[endpoint] = state
    return true
  }

  private resetRateLimit(endpoint: string): void {
    delete this.rateLimitState[endpoint]
  }
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const token = this.getStoredToken()

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  private getStoredToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    this.checkRateLimit('login')
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: data.username, password: data.password }),
    })
    // Reset rate limit on successful login
    this.resetRateLimit('login')

    // Transform backend response to frontend format
    return {
      user: {
        id: response.user.id,
        email: response.user.email,
        name: response.user.full_name || response.user.username,
        role: 'admin', // You'll need to get this from backend
        preferredLanguage: 'en',
        isOnboardingCompleted: true,
      },
      token: response.access_token,
      refreshToken: response.refresh_token,
      mfaRequired: response.requires_mfa,
      mfaSession: response.mfa_session_id,
    }
  }

  async verifyMfa(data: MfaVerifyRequest): Promise<LoginResponse> {
    this.checkRateLimit('mfaVerify')
    const response = await this.request<LoginResponse>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    // Reset rate limit on successful MFA verification
    this.resetRateLimit('mfaVerify')
    return response
  }

  async resendMfaCode(mfaSession: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/auth/mfa/resend', {
      method: 'POST',
      body: JSON.stringify({ mfaSession }),
    })
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ success: boolean }> {
    this.checkRateLimit('forgotPassword')
    return this.request<{ success: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    return this.request<{ token: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  }

  async logout(): Promise<void> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
    })
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me')
  }
}

export const authService = new AuthService()