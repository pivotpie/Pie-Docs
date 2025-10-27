const API_BASE_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8001/api/v1'

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
  is_active: boolean
  expires_at?: string
  last_used_at?: string
  usage_count: number
  created_at: string
}

export interface CreateApiKeyRequest {
  name: string
  permissions?: string[]
  expires_in_days?: number
  rate_limit?: number
}

export interface CreateApiKeyResponse {
  api_key: ApiKey
  api_key_secret: string
}

export interface ApiKeyListResponse {
  api_keys: ApiKey[]
  total: number
}

class ApiKeysService {
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

  async listApiKeys(): Promise<ApiKeyListResponse> {
    return this.request<ApiKeyListResponse>('/api-keys')
  }

  async createApiKey(data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return this.request<CreateApiKeyResponse>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async revokeApiKey(keyId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api-keys/${keyId}`, {
      method: 'DELETE',
    })
  }

  async toggleApiKey(keyId: string): Promise<ApiKey> {
    return this.request<ApiKey>(`/api-keys/${keyId}/toggle`, {
      method: 'PATCH',
    })
  }
}

export const apiKeysService = new ApiKeysService()
