-- ============================================
-- PHASE 1: CRITICAL FOUNDATION (FIXED VERSION)
-- ============================================
-- Priority: CRITICAL - Must complete before ANY API work
-- Tables: 8 (6 new + 2 enhanced)
-- Time Estimate: 1-2 hours to execute
-- Dependencies: None
--
-- This migration creates the foundational tables required for:
-- - Authentication (login, MFA, password reset)
-- - Document permissions
-- - Audit logging
-- - System configuration
--
-- FIXED: Includes roles/permissions tables if they don't exist
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- ============================================
-- 0. ENSURE DEPENDENT TABLES EXIST
-- ============================================
-- Create roles table if it doesn't exist (required for document_permissions FK)

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active) WHERE is_active = true;

COMMENT ON TABLE roles IS 'User roles for RBAC (created if missing for Phase 1)';

-- Create permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    description TEXT,
    resource VARCHAR(100),
    action VARCHAR(100),
    is_system_permission BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

COMMENT ON TABLE permissions IS 'System permissions for RBAC (created if missing for Phase 1)';

-- ============================================
-- 1. AUTHENTICATION ENHANCEMENTS
-- ============================================

-- 1.1 Enhance existing users table with auth fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255);

-- Add indexes for auth columns
CREATE INDEX IF NOT EXISTS idx_users_refresh_token ON users(refresh_token) WHERE refresh_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_locked ON users(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_mfa ON users(mfa_enabled) WHERE mfa_enabled = true;

COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.refresh_token IS 'Current JWT refresh token (hashed)';
COMMENT ON COLUMN users.failed_login_attempts IS 'Failed login attempt counter for account lockout';
COMMENT ON COLUMN users.locked_until IS 'Account locked until this timestamp';
COMMENT ON COLUMN users.mfa_secret IS 'TOTP secret for multi-factor authentication';

-- ============================================
-- 2. AUTH TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_auth_tokens_type CHECK (token_type IN ('access', 'refresh', 'reset_password', 'email_verification'))
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_auth_tokens_type ON auth_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_type ON auth_tokens(user_id, token_type);

COMMENT ON TABLE auth_tokens IS 'JWT token management and blacklisting system';
COMMENT ON COLUMN auth_tokens.token_hash IS 'SHA-256 hash of the JWT token for revocation checking';
COMMENT ON COLUMN auth_tokens.ip_address IS 'IP address from which token was issued';

-- ============================================
-- 3. PASSWORD RESET TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at) WHERE used = false;

COMMENT ON TABLE password_reset_tokens IS 'One-time password reset tokens with expiration';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of reset token sent via email';

-- ============================================
-- 4. MFA CODES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS mfa_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_mfa_codes_attempts CHECK (attempts <= 5)
);

CREATE INDEX IF NOT EXISTS idx_mfa_codes_user ON mfa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_codes_session ON mfa_codes(session_id);
CREATE INDEX IF NOT EXISTS idx_mfa_codes_expires ON mfa_codes(expires_at) WHERE verified = false;

COMMENT ON TABLE mfa_codes IS 'Multi-factor authentication verification codes';
COMMENT ON COLUMN mfa_codes.session_id IS 'Unique session identifier for MFA flow';
COMMENT ON COLUMN mfa_codes.attempts IS 'Failed verification attempts (max 5)';

-- ============================================
-- 5. DOCUMENT ENHANCEMENTS
-- ============================================

-- 5.1 Add columns to existing documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS download_url VARCHAR(1000);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path VARCHAR(1000);

-- 5.2 Add indexes
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON documents(deleted_at) WHERE deleted_at IS NULL;

-- 5.3 Add check constraint (drop if exists first to avoid conflict)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_documents_status'
        AND conrelid = 'documents'::regclass
    ) THEN
        ALTER TABLE documents DROP CONSTRAINT check_documents_status;
    END IF;
END $$;

ALTER TABLE documents ADD CONSTRAINT check_documents_status
    CHECK (status IN ('draft', 'published', 'archived', 'processing', 'failed'));

COMMENT ON COLUMN documents.status IS 'Document lifecycle status';
COMMENT ON COLUMN documents.owner_id IS 'Primary document owner with full permissions';
COMMENT ON COLUMN documents.deleted_at IS 'Soft delete timestamp for trash/recovery';

-- ============================================
-- 6. DOCUMENT PERMISSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS document_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,

    -- Permission flags
    can_view BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_share BOOLEAN DEFAULT false,
    can_download BOOLEAN DEFAULT false,

    -- Grant metadata
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT check_doc_perms_target CHECK (user_id IS NOT NULL OR role_id IS NOT NULL),
    CONSTRAINT check_doc_perms_exclusive CHECK (user_id IS NULL OR role_id IS NULL)
);

-- Drop existing unique constraints if they exist to avoid conflicts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_doc_perms_user') THEN
        ALTER TABLE document_permissions DROP CONSTRAINT unique_doc_perms_user;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_doc_perms_role') THEN
        ALTER TABLE document_permissions DROP CONSTRAINT unique_doc_perms_role;
    END IF;
END $$;

-- Add unique constraints
ALTER TABLE document_permissions ADD CONSTRAINT unique_doc_perms_user UNIQUE(document_id, user_id);
ALTER TABLE document_permissions ADD CONSTRAINT unique_doc_perms_role UNIQUE(document_id, role_id);

CREATE INDEX IF NOT EXISTS idx_doc_perms_document ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_perms_user ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_perms_role ON document_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_doc_perms_granted_by ON document_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_doc_perms_expires ON document_permissions(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE document_permissions IS 'Granular document-level permissions (user or role-based)';

-- ============================================
-- 7. AUDIT LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Event classification
    event_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,

    -- Actor information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Event details
    action VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Change tracking
    old_values JSONB,
    new_values JSONB,

    -- Result
    success BOOLEAN DEFAULT true,
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING gin(metadata);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system events';
COMMENT ON COLUMN audit_logs.event_type IS 'Event category: login, logout, document_view, document_edit, etc.';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional event context stored as JSON';

-- Create function to log audit events easily
CREATE OR REPLACE FUNCTION log_audit_event(
    p_event_type VARCHAR,
    p_action VARCHAR,
    p_user_id UUID DEFAULT NULL,
    p_resource_type VARCHAR DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        event_type, action, user_id, resource_type, resource_id,
        description, metadata, old_values, new_values, success, error_message
    ) VALUES (
        p_event_type, p_action, p_user_id, p_resource_type, p_resource_id,
        p_description, p_metadata, p_old_values, p_new_values, p_success, p_error_message
    ) RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_audit_event IS 'Helper function to log audit events';

-- ============================================
-- 8. SYSTEM SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Setting identification
    setting_key VARCHAR(255) NOT NULL UNIQUE,

    -- Value storage
    setting_value JSONB NOT NULL,
    value_type VARCHAR(50) NOT NULL,

    -- Metadata
    description TEXT,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT false,

    -- Modification tracking
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_system_settings_type CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'array'))
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public) WHERE is_public = true;

COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN system_settings.setting_value IS 'JSONB value for flexible type storage';
COMMENT ON COLUMN system_settings.is_encrypted IS 'Flag indicating if value should be encrypted at rest';

-- ============================================
-- 9. INSERT DEFAULT SYSTEM SETTINGS
-- ============================================

INSERT INTO system_settings (setting_key, setting_value, value_type, category, description) VALUES
    ('jwt_access_token_expiry', '"15m"', 'string', 'auth', 'JWT access token expiration time'),
    ('jwt_refresh_token_expiry', '"7d"', 'string', 'auth', 'JWT refresh token expiration time'),
    ('max_login_attempts', '5', 'number', 'auth', 'Maximum failed login attempts before lockout'),
    ('account_lockout_duration', '"30m"', 'string', 'auth', 'Account lockout duration after max failed attempts'),
    ('password_reset_expiry', '"1h"', 'string', 'auth', 'Password reset token expiration time'),
    ('mfa_code_expiry', '"10m"', 'string', 'auth', 'MFA code expiration time'),
    ('mfa_code_length', '6', 'number', 'auth', 'Number of digits in MFA codes'),
    ('max_file_upload_size', '104857600', 'number', 'storage', 'Maximum file upload size in bytes (100MB)'),
    ('allowed_file_types', '["pdf","docx","xlsx","txt","jpg","png","gif","bmp","tiff"]', 'array', 'storage', 'Allowed file types for upload'),
    ('enable_document_versioning', 'true', 'boolean', 'documents', 'Enable automatic document versioning'),
    ('max_document_versions', '50', 'number', 'documents', 'Maximum versions to keep per document'),
    ('enable_audit_logging', 'true', 'boolean', 'system', 'Enable comprehensive audit logging'),
    ('audit_log_retention_days', '365', 'number', 'system', 'Days to retain audit logs'),
    ('session_timeout', '"24h"', 'string', 'auth', 'User session timeout duration'),
    ('password_min_length', '8', 'number', 'auth', 'Minimum password length'),
    ('password_require_uppercase', 'true', 'boolean', 'auth', 'Require uppercase letters in passwords'),
    ('password_require_lowercase', 'true', 'boolean', 'auth', 'Require lowercase letters in passwords'),
    ('password_require_numbers', 'true', 'boolean', 'auth', 'Require numbers in passwords'),
    ('password_require_special', 'true', 'boolean', 'auth', 'Require special characters in passwords'),
    ('default_document_permissions', '{"can_view": true, "can_edit": false, "can_delete": false}', 'json', 'documents', 'Default permissions for new documents')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- 10. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get setting value
CREATE OR REPLACE FUNCTION get_setting(p_key VARCHAR) RETURNS JSONB AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT setting_value INTO v_value
    FROM system_settings
    WHERE setting_key = p_key;

    RETURN v_value;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_setting IS 'Helper function to retrieve setting values';

-- Function to update setting
CREATE OR REPLACE FUNCTION update_setting(
    p_key VARCHAR,
    p_value JSONB,
    p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE system_settings
    SET setting_value = p_value,
        updated_by = p_user_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE setting_key = p_key;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_setting IS 'Helper function to update setting values';

-- Function to clean expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete expired auth tokens
    DELETE FROM auth_tokens
    WHERE expires_at < CURRENT_TIMESTAMP
    AND revoked = false;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Delete used password reset tokens older than 7 days
    DELETE FROM password_reset_tokens
    WHERE used = true
    AND used_at < CURRENT_TIMESTAMP - INTERVAL '7 days';

    -- Delete verified MFA codes older than 1 day
    DELETE FROM mfa_codes
    WHERE verified = true
    AND verified_at < CURRENT_TIMESTAMP - INTERVAL '1 day';

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_tokens IS 'Cleanup expired authentication tokens';

-- ============================================
-- 11. CREATE TRIGGERS
-- ============================================

-- Trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to system_settings if not exists
DROP TRIGGER IF EXISTS update_system_settings_modtime ON system_settings;
CREATE TRIGGER update_system_settings_modtime
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Verify all tables were created
DO $$
DECLARE
    v_table_count INTEGER;
    v_expected_tables TEXT[] := ARRAY[
        'roles',
        'permissions',
        'auth_tokens',
        'password_reset_tokens',
        'mfa_codes',
        'document_permissions',
        'audit_logs',
        'system_settings'
    ];
    v_table TEXT;
BEGIN
    RAISE NOTICE 'Validating Phase 1 migration...';

    FOREACH v_table IN ARRAY v_expected_tables
    LOOP
        IF EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = v_table
        ) THEN
            RAISE NOTICE '✓ Table % exists', v_table;
        ELSE
            RAISE WARNING '✗ Table % missing!', v_table;
        END IF;
    END LOOP;

    -- Count settings
    SELECT COUNT(*) INTO v_table_count FROM system_settings;
    RAISE NOTICE '✓ % system settings configured', v_table_count;

    RAISE NOTICE 'Phase 1 migration validation complete!';
END;
$$;

COMMIT;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 1 MIGRATION COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: 8 (6 new + 2 enhanced)';
    RAISE NOTICE 'Next: Start building Phase 1 APIs';
    RAISE NOTICE 'See: IMPLEMENTATION_ROADMAP.md';
    RAISE NOTICE '========================================';
END;
$$;
