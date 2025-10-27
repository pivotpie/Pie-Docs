/**
 * Type definitions for User Management
 */

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
  created_by?: string
  updated_by?: string
}

export interface UserWithRoles extends User {
  roles: Role[]
  role_names: string[]
}

export interface UserWithPermissions extends UserWithRoles {
  permissions: Permission[]
}

export interface UserCreate {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone_number?: string
  is_active?: boolean
  is_verified?: boolean
  role_ids?: string[]
}

export interface UserUpdate {
  email?: string
  first_name?: string
  last_name?: string
  phone_number?: string
  avatar_url?: string
  is_active?: boolean
  is_verified?: boolean
}

export interface UserPasswordUpdate {
  current_password: string
  new_password: string
}

export interface Role {
  id: string
  name: string
  display_name: string
  description?: string
  is_system_role: boolean
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
  permission_count: number
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

export interface PermissionCreate {
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
  is_system_permission?: boolean
}

export interface PermissionUpdate {
  display_name?: string
  description?: string
}

export interface UserRoleAssignment {
  user_id: string
  role_ids: string[]
  assigned_by?: string
  expires_at?: string
}

export interface RolePermissionAssignment {
  role_id: string
  permission_ids: string[]
  granted_by?: string
}

export interface PaginatedResponse<T> {
  total: number
  page: number
  page_size: number
  total_pages: number
  items: T[]
}

export interface UserListResponse extends PaginatedResponse<UserWithRoles> {
  users: UserWithRoles[]
}

export interface RoleListResponse extends PaginatedResponse<RoleWithPermissions> {
  roles: RoleWithPermissions[]
}

export interface PermissionListResponse extends PaginatedResponse<Permission> {
  permissions: Permission[]
}

export interface SuccessResponse {
  success: boolean
  message: string
  data?: Record<string, any>
}

export interface ErrorResponse {
  success: boolean
  error: string
  details?: Record<string, any>
}

export interface UserSession {
  id: string
  user_id: string
  ip_address?: string
  user_agent?: string
  is_active: boolean
  created_at: string
  expires_at: string
  last_activity: string
}

export interface AuditLogEntry {
  id: string
  user_id?: string
  action: string
  resource_type: string
  resource_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// API Request Parameters
export interface UserListParams {
  page?: number
  page_size?: number
  search?: string
  is_active?: boolean
  role_id?: string
}

export interface RoleListParams {
  page?: number
  page_size?: number
  search?: string
  is_active?: boolean
}

export interface PermissionListParams {
  page?: number
  page_size?: number
  search?: string
  resource?: string
  action?: string
}

// Permission checking utilities
export type Resource =
  | 'users'
  | 'roles'
  | 'permissions'
  | 'documents'
  | 'workflows'
  | 'analytics'
  | 'settings'

export type Action = 'view' | 'create' | 'update' | 'delete' | 'share' | 'execute' | 'manage' | 'export'

export interface PermissionCheck {
  resource: Resource
  action: Action
}

// System role names
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  VIEWER = 'viewer',
  GUEST = 'guest',
}

// Permission names
export enum PermissionName {
  // Users
  USERS_VIEW = 'users.view',
  USERS_CREATE = 'users.create',
  USERS_UPDATE = 'users.update',
  USERS_DELETE = 'users.delete',

  // Roles
  ROLES_VIEW = 'roles.view',
  ROLES_CREATE = 'roles.create',
  ROLES_UPDATE = 'roles.update',
  ROLES_DELETE = 'roles.delete',

  // Permissions
  PERMISSIONS_VIEW = 'permissions.view',
  PERMISSIONS_MANAGE = 'permissions.manage',

  // Documents
  DOCUMENTS_VIEW = 'documents.view',
  DOCUMENTS_CREATE = 'documents.create',
  DOCUMENTS_UPDATE = 'documents.update',
  DOCUMENTS_DELETE = 'documents.delete',
  DOCUMENTS_SHARE = 'documents.share',

  // Workflows
  WORKFLOWS_VIEW = 'workflows.view',
  WORKFLOWS_CREATE = 'workflows.create',
  WORKFLOWS_UPDATE = 'workflows.update',
  WORKFLOWS_DELETE = 'workflows.delete',
  WORKFLOWS_EXECUTE = 'workflows.execute',

  // Analytics
  ANALYTICS_VIEW = 'analytics.view',
  ANALYTICS_EXPORT = 'analytics.export',

  // Settings
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_UPDATE = 'settings.update',
}
