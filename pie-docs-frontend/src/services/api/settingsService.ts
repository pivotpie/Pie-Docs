const API_BASE_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8001/api/v1'

export interface SystemSetting {
  setting_key: string
  setting_value: any
  value_type: string
  description?: string
  category?: string
  is_public: boolean
}

export interface UserProfile {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  phone_number?: string
  avatar_url?: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  last_login?: string
}

export interface PasswordChangeRequest {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface Enable2FAResponse {
  qr_code: string
  secret: string
  backup_codes: string[]
}

class SettingsService {
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
      const error = await response.json().catch(() => ({ detail: 'Network error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  private getStoredToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
  }

  // ============= System Settings =============

  async getSystemSettings(category?: string): Promise<{ settings: SystemSetting[]; total: number }> {
    const params = category ? `?category=${category}` : ''
    return this.request<{ settings: SystemSetting[]; total: number }>(`/settings${params}`)
  }

  async getSystemSetting(key: string): Promise<SystemSetting> {
    return this.request<SystemSetting>(`/settings/${key}`)
  }

  async updateSystemSetting(key: string, value: any, description?: string): Promise<SystemSetting> {
    return this.request<SystemSetting>(`/settings/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ setting_value: value, description }),
    })
  }

  async getSettingCategories(): Promise<{ categories: string[] }> {
    return this.request<{ categories: string[] }>('/settings/categories/list')
  }

  // ============= User Profile =============

  async getUserProfile(): Promise<UserProfile> {
    const response = await this.request<any>('/auth/me')

    // Transform backend response to match frontend interface
    return {
      id: response.id,
      username: response.username,
      email: response.email,
      first_name: response.full_name?.split(' ')[0] || '',
      last_name: response.full_name?.split(' ').slice(1).join(' ') || '',
      phone_number: response.phone_number,
      avatar_url: response.avatar_url,
      is_active: response.is_active,
      is_verified: response.is_verified || true,
      created_at: response.created_at,
      last_login: response.last_login,
    }
  }

  async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const token = this.getStoredToken()
    const response = await fetch(`${API_BASE_URL}/auth/me/avatar`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail || 'Upload failed')
    }

    return response.json()
  }

  async deleteAvatar(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/me/avatar', {
      method: 'DELETE',
    })
  }

  // ============= User Security =============

  async changePassword(data: PasswordChangeRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async enable2FA(): Promise<Enable2FAResponse> {
    return this.request<Enable2FAResponse>('/auth/2fa/enable', {
      method: 'POST',
    })
  }

  async verify2FA(code: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  }

  async disable2FA(code: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  }

  async getActiveSessions(): Promise<{ sessions: any[] }> {
    return this.request<{ sessions: any[] }>('/auth/sessions')
  }

  async revokeSession(sessionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    })
  }

  async revokeAllSessions(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/sessions/revoke-all', {
      method: 'POST',
    })
  }

  // ============= Email Settings =============

  async getEmailSettings(): Promise<any> {
    return this.request<any>('/settings?category=email')
  }

  async testEmailConnection(config: any): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/admin/email/test', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  // ============= API Keys =============

  async getAPIKeys(): Promise<{ api_keys: any[] }> {
    return this.request<{ api_keys: any[] }>('/api-keys')
  }

  async createAPIKey(name: string, permissions: string[]): Promise<{ api_key: string; key: any }> {
    return this.request<{ api_key: string; key: any }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, permissions }),
    })
  }

  async revokeAPIKey(keyId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api-keys/${keyId}`, {
      method: 'DELETE',
    })
  }

  // ============= System Monitoring =============

  async getSystemHealth(): Promise<any> {
    return this.request<any>('/system/health')
  }

  async getDatabaseStats(): Promise<any> {
    return this.request<any>('/system/database-stats')
  }

  async getCacheStats(): Promise<any> {
    return this.request<any>('/system/cache-stats')
  }

  async clearCache(cacheType?: string): Promise<{ message: string }> {
    const endpoint = cacheType ? `/system/cache/clear/${cacheType}` : '/system/cache/clear'
    return this.request<{ message: string }>(endpoint, {
      method: 'POST',
    })
  }

  // ============= Analytics Settings =============

  async getAnalyticsSettings(): Promise<any> {
    return this.request<any>('/settings?category=analytics')
  }

  async updateAnalyticsSettings(settings: any): Promise<any> {
    return this.request<any>('/settings/analytics', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
  }
}

export const settingsService = new SettingsService()
