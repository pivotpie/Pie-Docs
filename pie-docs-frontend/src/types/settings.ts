/**
 * Type definitions for Settings
 * Settings type definitions for the application
 */

export interface AppSettings {
  id?: string
  app_name: string
  company_name?: string
  logo_url?: string
  favicon_url?: string
  default_language: string
  default_timezone: string
  date_format: string
  time_format: string
  created_at?: string
  updated_at?: string
}

export interface DocumentSettings {
  max_file_size_mb: number
  allowed_file_types: string[]
  storage_path?: string
  enable_ocr: boolean
  ocr_engine?: string
  auto_tagging: boolean
  retention_days?: number
  enable_versioning: boolean
}

export interface WorkflowSettings {
  max_approval_levels: number
  default_sla_hours: number
  enable_email_notifications: boolean
  auto_assign_tasks: boolean
}

export interface SearchSettings {
  enable_semantic_search: boolean
  ai_provider?: string
  ai_api_key?: string
  ai_model?: string
  max_search_results: number
  enable_nlp: boolean
}

export interface EmailSettings {
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password?: string
  smtp_use_tls: boolean
  smtp_use_ssl: boolean
  from_email: string
  from_name: string
}

export interface SecuritySettings {
  password_min_length: number
  password_require_uppercase: boolean
  password_require_lowercase: boolean
  password_require_numbers: boolean
  password_require_special: boolean
  password_expiry_days?: number
  session_timeout_minutes: number
  max_login_attempts: number
  lockout_duration_minutes: number
  enable_2fa: boolean
  ip_whitelist?: string[]
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

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  uptime_seconds: number
  active_users: number
  api_response_time_ms: number
}

export interface BackgroundJob {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  created_at: string
  started_at?: string
  completed_at?: string
  error?: string
}

export interface CacheStats {
  total_keys: number
  memory_usage_mb: number
  hit_rate: number
  miss_rate: number
  eviction_count: number
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string
  expires_at?: string
  last_used?: string
  is_active: boolean
  permissions: string[]
}

export interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  secret?: string
  created_at: string
  last_triggered?: string
}

export interface UserPreferences {
  user_id: string
  theme?: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  date_format: string
  notifications_email: boolean
  notifications_inapp: boolean
  notifications_push: boolean
  default_dashboard_layout?: string
  default_document_view?: 'grid' | 'list' | 'tree'
}

// Settings section type
export type SettingsSection = string

export interface SettingsNavItem {
  id: SettingsSection
  name: string
  icon: React.ReactNode
  adminOnly: boolean
  category: 'user' | 'admin'
}
