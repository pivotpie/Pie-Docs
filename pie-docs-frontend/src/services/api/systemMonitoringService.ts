const API_BASE_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8001/api/v1'

export interface SystemHealth {
  status: string
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  uptime_seconds: number
  active_users: number
  api_response_time_ms: number
}

export interface DatabaseStats {
  total_size: string
  table_count: number
  total_documents: number
  total_users: number
  total_workflows: number
  last_backup?: string
  connection_pool_size: number
  active_connections: number
}

export interface CacheStats {
  cache_name: string
  total_keys: number
  memory_usage_mb: number
  hit_rate: number
  miss_rate: number
  eviction_count: number
}

export interface BackupRequest {
  backup_type?: string
}

export interface BackupResponse {
  id: string
  backup_name: string
  backup_type: string
  backup_size_mb?: number
  backup_status: string
  started_at: string
  completed_at?: string
}

class SystemMonitoringService {
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

  async getSystemHealth(): Promise<SystemHealth> {
    return this.request<SystemHealth>('/system/health')
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    return this.request<DatabaseStats>('/system/database/stats')
  }

  async createBackup(data: BackupRequest = {}): Promise<BackupResponse> {
    return this.request<BackupResponse>('/system/database/backup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getCacheStats(): Promise<CacheStats[]> {
    return this.request<CacheStats[]>('/system/cache/stats')
  }

  async clearCache(cacheName: string): Promise<{ message: string; cache_name: string }> {
    return this.request<{ message: string; cache_name: string }>(`/system/cache/clear/${cacheName}`, {
      method: 'POST',
    })
  }

  async clearAllCaches(): Promise<{ message: string; caches_cleared: string[] }> {
    return this.request<{ message: string; caches_cleared: string[] }>('/system/cache/clear-all', {
      method: 'POST',
    })
  }
}

export const systemMonitoringService = new SystemMonitoringService()
