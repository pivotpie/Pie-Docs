/**
 * User Management API Service
 * API client for user, role, and permission management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

// ==========================================
// Types
// ==========================================

export interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  phone_number?: string
  avatar_url?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  last_login?: string
  created_at: string
  updated_at: string
  roles?: Role[]
  role_names?: string[]
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
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
  is_system_permission: boolean
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  total: number
  page: number
  page_size: number
  total_pages: number
  items: T[]
}

export interface UserListResponse extends PaginatedResponse<User> {
  users: User[]
}

export interface RoleListResponse extends PaginatedResponse<Role> {
  roles: Role[]
}

export interface PermissionListResponse extends PaginatedResponse<Permission> {
  permissions: Permission[]
}

// ==========================================
// User API
// ==========================================

export const userApi = {
  async listUsers(params?: {
    page?: number
    page_size?: number
    search?: string
    is_active?: boolean
    role_id?: string
  }): Promise<UserListResponse> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
    if (params?.role_id) queryParams.append('role_id', params.role_id)

    const response = await fetch(`${API_BASE_URL}/api/v1/users?${queryParams}`)
    if (!response.ok) throw new Error('Failed to fetch users')
    return response.json()
  },

  async getUser(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`)
    if (!response.ok) throw new Error('Failed to fetch user')
    return response.json()
  },

  async createUser(userData: {
    username: string
    email: string
    password: string
    first_name?: string
    last_name?: string
    phone_number?: string
    is_active?: boolean
    is_verified?: boolean
    role_ids?: string[]
  }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })
    if (!response.ok) throw new Error('Failed to create user')
    return response.json()
  },

  async updateUser(
    userId: string,
    userData: Partial<{
      email: string
      first_name: string
      last_name: string
      phone_number: string
      avatar_url: string
      is_active: boolean
      is_verified: boolean
    }>
  ): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })
    if (!response.ok) throw new Error('Failed to update user')
    return response.json()
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete user')
    return response.json()
  },

  async assignRoles(userId: string, roleIds: string[]): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role_ids: roleIds }),
    })
    if (!response.ok) throw new Error('Failed to assign roles')
    return response.json()
  },

  async revokeRole(userId: string, roleId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to revoke role')
    return response.json()
  },

  async updatePassword(
    userId: string,
    passwordData: { current_password: string; new_password: string }
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordData),
    })
    if (!response.ok) throw new Error('Failed to update password')
    return response.json()
  },

  async getUserPermissions(userId: string): Promise<{ user_id: string; permissions: Permission[] }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/permissions`)
    if (!response.ok) throw new Error('Failed to fetch user permissions')
    return response.json()
  },
}

// ==========================================
// Role API
// ==========================================

export const roleApi = {
  async listRoles(params?: {
    page?: number
    page_size?: number
    search?: string
    is_active?: boolean
  }): Promise<RoleListResponse> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())

    const response = await fetch(`${API_BASE_URL}/api/v1/roles?${queryParams}`)
    if (!response.ok) throw new Error('Failed to fetch roles')
    return response.json()
  },

  async getRole(roleId: string): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/api/v1/roles/${roleId}`)
    if (!response.ok) throw new Error('Failed to fetch role')
    return response.json()
  },

  async createRole(roleData: {
    name: string
    display_name: string
    description?: string
    priority?: number
    is_system_role?: boolean
    permission_ids?: string[]
  }): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/api/v1/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    })
    if (!response.ok) throw new Error('Failed to create role')
    return response.json()
  },

  async updateRole(
    roleId: string,
    roleData: Partial<{
      display_name: string
      description: string
      priority: number
      is_active: boolean
    }>
  ): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/api/v1/roles/${roleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    })
    if (!response.ok) throw new Error('Failed to update role')
    return response.json()
  },

  async deleteRole(roleId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/roles/${roleId}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete role')
    return response.json()
  },

  async assignPermissions(
    roleId: string,
    permissionIds: string[]
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/roles/${roleId}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId, permission_ids: permissionIds }),
    })
    if (!response.ok) throw new Error('Failed to assign permissions')
    return response.json()
  },

  async revokePermission(roleId: string, permissionId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/roles/${roleId}/permissions/${permissionId}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to revoke permission')
    return response.json()
  },

  async getRoleUsers(roleId: string): Promise<{ role_id: string; users: User[] }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/roles/${roleId}/users`)
    if (!response.ok) throw new Error('Failed to fetch role users')
    return response.json()
  },
}

// ==========================================
// Permission API
// ==========================================

export const permissionApi = {
  async listPermissions(params?: {
    page?: number
    page_size?: number
    search?: string
    resource?: string
    action?: string
  }): Promise<PermissionListResponse> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.resource) queryParams.append('resource', params.resource)
    if (params?.action) queryParams.append('action', params.action)

    const response = await fetch(`${API_BASE_URL}/api/v1/permissions?${queryParams}`)
    if (!response.ok) throw new Error('Failed to fetch permissions')
    return response.json()
  },

  async getPermission(permissionId: string): Promise<Permission> {
    const response = await fetch(`${API_BASE_URL}/api/v1/permissions/${permissionId}`)
    if (!response.ok) throw new Error('Failed to fetch permission')
    return response.json()
  },

  async createPermission(permissionData: {
    name: string
    display_name: string
    description?: string
    resource: string
    action: string
    is_system_permission?: boolean
  }): Promise<Permission> {
    const response = await fetch(`${API_BASE_URL}/api/v1/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permissionData),
    })
    if (!response.ok) throw new Error('Failed to create permission')
    return response.json()
  },

  async updatePermission(
    permissionId: string,
    permissionData: Partial<{
      display_name: string
      description: string
    }>
  ): Promise<Permission> {
    const response = await fetch(`${API_BASE_URL}/api/v1/permissions/${permissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permissionData),
    })
    if (!response.ok) throw new Error('Failed to update permission')
    return response.json()
  },

  async deletePermission(permissionId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/permissions/${permissionId}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete permission')
    return response.json()
  },

  async listResources(): Promise<{ resources: string[] }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/permissions/resources`)
    if (!response.ok) throw new Error('Failed to fetch resources')
    return response.json()
  },

  async listActions(): Promise<{ actions: string[] }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/permissions/actions`)
    if (!response.ok) throw new Error('Failed to fetch actions')
    return response.json()
  },

  async getPermissionRoles(permissionId: string): Promise<{ permission_id: string; roles: Role[] }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/permissions/${permissionId}/roles`)
    if (!response.ok) throw new Error('Failed to fetch permission roles')
    return response.json()
  },
}
