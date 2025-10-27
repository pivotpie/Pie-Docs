const API_BASE_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8001/api/v1'

export interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
  is_system_permission: boolean
  created_at: string
  updated_at?: string
}

export interface Role {
  id: string
  name: string
  display_name: string
  description?: string
  is_system_role: boolean
  is_active: boolean
  priority: number
  permission_count?: number
  permissions?: Permission[]
  created_at: string
  updated_at?: string
  created_by?: string
  updated_by?: string
}

export interface PermissionListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  permissions: Permission[]
}

export interface RoleListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  roles: Role[]
}

export interface RoleCreate {
  name: string
  display_name: string
  description?: string
  priority?: number
  is_system_role?: boolean
  permission_ids?: string[]
}

export interface RoleUpdate {
  display_name?: string
  description?: string
  priority?: number
  is_active?: boolean
}

export interface PermissionCreate {
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
  is_system_permission?: boolean
}

export interface RolePermissionAssignment {
  permission_ids: string[]
  granted_by?: string
}

class RolesPermissionsService {
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

  // ============= Permissions =============

  async getPermissions(params: {
    page?: number
    page_size?: number
    search?: string
    resource?: string
    action?: string
  } = {}): Promise<PermissionListResponse> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.resource) queryParams.append('resource', params.resource)
    if (params.action) queryParams.append('action', params.action)

    return this.request<PermissionListResponse>(`/permissions?${queryParams}`)
  }

  async getPermission(permissionId: string): Promise<Permission> {
    return this.request<Permission>(`/permissions/${permissionId}`)
  }

  async createPermission(data: PermissionCreate): Promise<Permission> {
    return this.request<Permission>('/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePermission(permissionId: string, data: Partial<PermissionCreate>): Promise<Permission> {
    return this.request<Permission>(`/permissions/${permissionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deletePermission(permissionId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/permissions/${permissionId}`, {
      method: 'DELETE',
    })
  }

  async getResources(): Promise<{ resources: string[] }> {
    return this.request<{ resources: string[] }>('/permissions/resources')
  }

  async getActions(): Promise<{ actions: string[] }> {
    return this.request<{ actions: string[] }>('/permissions/actions')
  }

  async getPermissionRoles(permissionId: string): Promise<{ permission_id: string; roles: Role[] }> {
    return this.request<{ permission_id: string; roles: Role[] }>(`/permissions/${permissionId}/roles`)
  }

  // ============= Roles =============

  async getRoles(params: {
    page?: number
    page_size?: number
    search?: string
    is_active?: boolean
  } = {}): Promise<RoleListResponse> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())

    return this.request<RoleListResponse>(`/roles?${queryParams}`)
  }

  async getRole(roleId: string): Promise<Role> {
    return this.request<Role>(`/roles/${roleId}`)
  }

  async createRole(data: RoleCreate): Promise<Role> {
    return this.request<Role>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRole(roleId: string, data: RoleUpdate): Promise<Role> {
    return this.request<Role>(`/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteRole(roleId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/roles/${roleId}`, {
      method: 'DELETE',
    })
  }

  async assignPermissionsToRole(
    roleId: string,
    data: RolePermissionAssignment
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/roles/${roleId}/permissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async revokePermissionFromRole(
    roleId: string,
    permissionId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/roles/${roleId}/permissions/${permissionId}`, {
      method: 'DELETE',
    })
  }

  async getRoleUsers(roleId: string): Promise<{ role_id: string; users: any[] }> {
    return this.request<{ role_id: string; users: any[] }>(`/roles/${roleId}/users`)
  }
}

export const rolesPermissionsService = new RolesPermissionsService()
