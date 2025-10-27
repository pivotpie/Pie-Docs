const API_BASE_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8001/api/v1'

export interface UserPreferencesData {
  id?: string
  user_id?: string
  language: string
  timezone: string
  date_format: string
  time_format?: string
  theme: string
  notifications_email: boolean
  notifications_inapp: boolean
  notifications_push: boolean
  default_document_view: string
  sidebar_collapsed?: boolean
  email_digest_frequency?: string
}

class UserPreferencesService {
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

  async getUserPreferences(): Promise<UserPreferencesData> {
    return this.request<UserPreferencesData>('/user-preferences')
  }

  async updateUserPreferences(data: Partial<UserPreferencesData>): Promise<UserPreferencesData> {
    return this.request<UserPreferencesData>('/user-preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }
}

export const userPreferencesService = new UserPreferencesService()
