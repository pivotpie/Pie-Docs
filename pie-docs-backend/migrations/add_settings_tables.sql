-- Migration: Add Settings Management Tables
-- Description: Adds tables for API keys and extends settings functionality

-- ============================================================================
-- API KEYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    rate_limit INTEGER DEFAULT 1000,
    allowed_ips TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- ============================================================================
-- USER PREFERENCES TABLE (Extended)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(100) DEFAULT 'UTC',
    date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
    time_format VARCHAR(50) DEFAULT '12h',
    notifications_email BOOLEAN DEFAULT true,
    notifications_inapp BOOLEAN DEFAULT true,
    notifications_push BOOLEAN DEFAULT false,
    default_dashboard_layout JSONB,
    default_document_view VARCHAR(20) DEFAULT 'grid',
    sidebar_collapsed BOOLEAN DEFAULT false,
    email_digest_frequency VARCHAR(20) DEFAULT 'daily',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- ENHANCE SYSTEM_SETTINGS (add more metadata)
-- ============================================================================
-- system_settings table already exists, we'll just add comments and ensure it has what we need
COMMENT ON TABLE system_settings IS 'Stores application-level configuration settings';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique key for the setting (e.g., app.name, smtp.host)';
COMMENT ON COLUMN system_settings.setting_value IS 'JSONB value of the setting';
COMMENT ON COLUMN system_settings.value_type IS 'Type of value: string, number, boolean, object, array';
COMMENT ON COLUMN system_settings.category IS 'Category: general, document, workflow, search, email, security, analytics';
COMMENT ON COLUMN system_settings.is_public IS 'Whether this setting is visible to non-admin users';
COMMENT ON COLUMN system_settings.is_encrypted IS 'Whether the value should be encrypted at rest';

-- ============================================================================
-- SYSTEM HEALTH METRICS TABLE (for monitoring)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cpu_usage_percent NUMERIC(5,2),
    memory_usage_percent NUMERIC(5,2),
    memory_used_mb NUMERIC(10,2),
    memory_total_mb NUMERIC(10,2),
    disk_usage_percent NUMERIC(5,2),
    disk_used_gb NUMERIC(10,2),
    disk_total_gb NUMERIC(10,2),
    active_connections INTEGER,
    active_users INTEGER,
    api_response_time_ms INTEGER,
    database_size_mb NUMERIC(10,2),
    uptime_seconds BIGINT,
    status VARCHAR(20) DEFAULT 'healthy',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_health_timestamp ON system_health_metrics(metric_timestamp DESC);
CREATE INDEX idx_system_health_status ON system_health_metrics(status);

-- ============================================================================
-- CACHE STATISTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cache_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_name VARCHAR(100) NOT NULL,
    total_keys INTEGER DEFAULT 0,
    memory_usage_mb NUMERIC(10,2),
    hit_count BIGINT DEFAULT 0,
    miss_count BIGINT DEFAULT 0,
    eviction_count BIGINT DEFAULT 0,
    hit_rate NUMERIC(5,2),
    miss_rate NUMERIC(5,2),
    avg_ttl_seconds INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_stats_name ON cache_statistics(cache_name);
CREATE INDEX idx_cache_stats_recorded_at ON cache_statistics(recorded_at DESC);

-- ============================================================================
-- DATABASE BACKUP HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS database_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(50) DEFAULT 'full',
    backup_size_mb NUMERIC(10,2),
    backup_path TEXT,
    backup_status VARCHAR(50) DEFAULT 'completed',
    database_size_mb NUMERIC(10,2),
    duration_seconds INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_database_backups_status ON database_backups(backup_status);
CREATE INDEX idx_database_backups_created_at ON database_backups(created_at DESC);

-- ============================================================================
-- SEED INITIAL SYSTEM SETTINGS
-- ============================================================================
INSERT INTO system_settings (setting_key, setting_value, value_type, description, category, is_public) VALUES
    -- General Settings
    ('app.name', '"Pie-Docs"', 'string', 'Application name', 'general', true),
    ('app.company_name', '"Pivot Pie"', 'string', 'Company name', 'general', true),
    ('app.default_language', '"en"', 'string', 'Default application language', 'general', true),
    ('app.default_timezone', '"UTC"', 'string', 'Default timezone', 'general', true),
    ('app.date_format', '"MM/DD/YYYY"', 'string', 'Default date format', 'general', true),

    -- Document Settings
    ('document.max_file_size_mb', '100', 'number', 'Maximum file upload size in MB', 'document', false),
    ('document.allowed_file_types', '["pdf","doc","docx","txt","jpg","png"]', 'array', 'Allowed file types', 'document', false),
    ('document.enable_ocr', 'true', 'boolean', 'Enable OCR processing', 'document', false),
    ('document.ocr_engine', '"tesseract"', 'string', 'OCR engine to use', 'document', false),
    ('document.enable_versioning', 'true', 'boolean', 'Enable document versioning', 'document', false),
    ('document.retention_days', '365', 'number', 'Document retention period in days', 'document', false),

    -- Workflow Settings
    ('workflow.max_approval_levels', '5', 'number', 'Maximum approval levels', 'workflow', false),
    ('workflow.default_sla_hours', '24', 'number', 'Default SLA in hours', 'workflow', false),
    ('workflow.enable_notifications', 'true', 'boolean', 'Enable workflow notifications', 'workflow', false),

    -- Search & AI Settings
    ('search.enable_semantic', 'true', 'boolean', 'Enable semantic search', 'search', false),
    ('search.ai_provider', '"openai"', 'string', 'AI provider for search', 'search', false),
    ('search.max_results', '50', 'number', 'Maximum search results', 'search', false),

    -- Email Settings
    ('email.smtp_host', '"smtp.example.com"', 'string', 'SMTP server host', 'email', false),
    ('email.smtp_port', '587', 'number', 'SMTP server port', 'email', false),
    ('email.smtp_use_tls', 'true', 'boolean', 'Use TLS for SMTP', 'email', false),
    ('email.from_email', '"noreply@piedocs.com"', 'string', 'From email address', 'email', false),
    ('email.from_name', '"Pie-Docs"', 'string', 'From email name', 'email', false),

    -- Security Settings
    ('security.password_min_length', '8', 'number', 'Minimum password length', 'security', false),
    ('security.password_require_uppercase', 'true', 'boolean', 'Require uppercase in password', 'security', false),
    ('security.password_require_numbers', 'true', 'boolean', 'Require numbers in password', 'security', false),
    ('security.password_require_special', 'true', 'boolean', 'Require special characters', 'security', false),
    ('security.session_timeout_minutes', '30', 'number', 'Session timeout in minutes', 'security', false),
    ('security.max_login_attempts', '5', 'number', 'Maximum failed login attempts', 'security', false),
    ('security.enable_2fa', 'false', 'boolean', 'Enable two-factor authentication', 'security', false),

    -- Analytics Settings
    ('analytics.data_retention_days', '90', 'number', 'Analytics data retention in days', 'analytics', false),
    ('analytics.enable_tracking', 'true', 'boolean', 'Enable usage tracking', 'analytics', false)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANTS (Adjust as needed for your user)
-- ============================================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;

COMMENT ON TABLE api_keys IS 'API keys for programmatic access to the application';
COMMENT ON TABLE user_preferences IS 'Extended user preferences and settings';
COMMENT ON TABLE system_health_metrics IS 'System health and performance metrics';
COMMENT ON TABLE cache_statistics IS 'Cache performance statistics';
COMMENT ON TABLE database_backups IS 'Database backup history and metadata';
