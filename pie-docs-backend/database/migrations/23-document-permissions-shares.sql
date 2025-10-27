-- ============================================
-- Document-Level Permissions and Sharing
-- Migration: 23-document-permissions-shares
-- ============================================

-- ============================================
-- Document Permissions Table
-- Manages fine-grained access control at the document level
-- ============================================
CREATE TABLE IF NOT EXISTS document_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Permission can be granted to either a user or a role
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,

    -- Permission flags
    can_view BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_share BOOLEAN DEFAULT FALSE,
    can_download BOOLEAN DEFAULT FALSE,

    -- Expiration and audit
    expires_at TIMESTAMP WITH TIME ZONE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Either user_id or role_id must be set, but not both
    CONSTRAINT check_user_or_role CHECK (
        (user_id IS NOT NULL AND role_id IS NULL) OR
        (user_id IS NULL AND role_id IS NOT NULL)
    ),

    -- Prevent duplicate permissions for the same user/role on the same document
    CONSTRAINT unique_user_document UNIQUE (document_id, user_id),
    CONSTRAINT unique_role_document UNIQUE (document_id, role_id)
);

-- ============================================
-- Document Shares Table
-- Manages public/private sharing links for documents
-- ============================================
CREATE TABLE IF NOT EXISTS document_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Unique share token for URL access
    share_token VARCHAR(100) UNIQUE NOT NULL,

    -- Share configuration
    share_type VARCHAR(20) NOT NULL, -- 'public', 'password', 'email'
    can_view BOOLEAN DEFAULT TRUE,
    can_download BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,

    -- Security
    requires_password BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255), -- Hashed password if requires_password is true
    allowed_emails TEXT[] DEFAULT '{}', -- Array of allowed email addresses

    -- Access limits
    max_access_count INTEGER, -- NULL means unlimited
    current_access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Ownership and status
    shared_by UUID NOT NULL REFERENCES users(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),

    -- Ensure share_type is valid
    CONSTRAINT valid_share_type CHECK (share_type IN ('public', 'password', 'email'))
);

-- ============================================
-- Document Share Access Log
-- Tracks who accessed shared documents and when
-- ============================================
CREATE TABLE IF NOT EXISTS document_share_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id UUID NOT NULL REFERENCES document_shares(id) ON DELETE CASCADE,

    -- Access details
    accessed_by_email VARCHAR(255), -- For tracked access
    ip_address INET,
    user_agent TEXT,

    -- What was accessed
    access_type VARCHAR(20) NOT NULL, -- 'view', 'download'

    -- Timestamp
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_access_type CHECK (access_type IN ('view', 'download'))
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Document permissions indexes
CREATE INDEX IF NOT EXISTS idx_document_permissions_document_id
    ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user_id
    ON document_permissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_permissions_role_id
    ON document_permissions(role_id) WHERE role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_permissions_expires_at
    ON document_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- Document shares indexes
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id
    ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_token
    ON document_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_by
    ON document_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_document_shares_active
    ON document_shares(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_document_shares_expires_at
    ON document_shares(expires_at) WHERE expires_at IS NOT NULL;

-- Share access log indexes
CREATE INDEX IF NOT EXISTS idx_share_access_log_share_id
    ON document_share_access_log(share_id);
CREATE INDEX IF NOT EXISTS idx_share_access_log_accessed_at
    ON document_share_access_log(accessed_at DESC);

-- ============================================
-- Helper Functions
-- ============================================

-- Check if a user has permission to access a document
CREATE OR REPLACE FUNCTION user_can_access_document(
    p_user_id UUID,
    p_document_id UUID,
    p_permission_type VARCHAR -- 'view', 'edit', 'delete', 'share', 'download'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    user_role_ids UUID[];
BEGIN
    -- Check direct user permissions
    IF p_permission_type = 'view' THEN
        SELECT EXISTS(
            SELECT 1 FROM document_permissions
            WHERE document_id = p_document_id
            AND user_id = p_user_id
            AND can_view = TRUE
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ) INTO has_permission;
    ELSIF p_permission_type = 'edit' THEN
        SELECT EXISTS(
            SELECT 1 FROM document_permissions
            WHERE document_id = p_document_id
            AND user_id = p_user_id
            AND can_edit = TRUE
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ) INTO has_permission;
    ELSIF p_permission_type = 'delete' THEN
        SELECT EXISTS(
            SELECT 1 FROM document_permissions
            WHERE document_id = p_document_id
            AND user_id = p_user_id
            AND can_delete = TRUE
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ) INTO has_permission;
    ELSIF p_permission_type = 'share' THEN
        SELECT EXISTS(
            SELECT 1 FROM document_permissions
            WHERE document_id = p_document_id
            AND user_id = p_user_id
            AND can_share = TRUE
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ) INTO has_permission;
    ELSIF p_permission_type = 'download' THEN
        SELECT EXISTS(
            SELECT 1 FROM document_permissions
            WHERE document_id = p_document_id
            AND user_id = p_user_id
            AND can_download = TRUE
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ) INTO has_permission;
    END IF;

    -- If direct permission found, return true
    IF has_permission THEN
        RETURN TRUE;
    END IF;

    -- Check role-based permissions
    -- Get all roles for this user
    SELECT ARRAY_AGG(role_id) INTO user_role_ids
    FROM user_roles
    WHERE user_id = p_user_id;

    -- Check if any of the user's roles have the permission
    IF user_role_ids IS NOT NULL THEN
        IF p_permission_type = 'view' THEN
            SELECT EXISTS(
                SELECT 1 FROM document_permissions
                WHERE document_id = p_document_id
                AND role_id = ANY(user_role_ids)
                AND can_view = TRUE
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ) INTO has_permission;
        ELSIF p_permission_type = 'edit' THEN
            SELECT EXISTS(
                SELECT 1 FROM document_permissions
                WHERE document_id = p_document_id
                AND role_id = ANY(user_role_ids)
                AND can_edit = TRUE
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ) INTO has_permission;
        ELSIF p_permission_type = 'delete' THEN
            SELECT EXISTS(
                SELECT 1 FROM document_permissions
                WHERE document_id = p_document_id
                AND role_id = ANY(user_role_ids)
                AND can_delete = TRUE
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ) INTO has_permission;
        ELSIF p_permission_type = 'share' THEN
            SELECT EXISTS(
                SELECT 1 FROM document_permissions
                WHERE document_id = p_document_id
                AND role_id = ANY(user_role_ids)
                AND can_share = TRUE
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ) INTO has_permission;
        ELSIF p_permission_type = 'download' THEN
            SELECT EXISTS(
                SELECT 1 FROM document_permissions
                WHERE document_id = p_document_id
                AND role_id = ANY(user_role_ids)
                AND can_download = TRUE
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ) INTO has_permission;
        END IF;
    END IF;

    RETURN has_permission;
END;
$$;

-- Increment share access count
CREATE OR REPLACE FUNCTION increment_share_access_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE document_shares
    SET current_access_count = current_access_count + 1
    WHERE id = NEW.share_id;

    RETURN NEW;
END;
$$;

-- Create trigger to auto-increment access count
CREATE TRIGGER trigger_increment_share_access
    AFTER INSERT ON document_share_access_log
    FOR EACH ROW
    EXECUTE FUNCTION increment_share_access_count();

-- Auto-deactivate shares that exceed max access count
CREATE OR REPLACE FUNCTION check_share_access_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.max_access_count IS NOT NULL
       AND NEW.current_access_count >= NEW.max_access_count THEN
        NEW.is_active := FALSE;
        NEW.revoked_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_share_access_limit
    BEFORE UPDATE ON document_shares
    FOR EACH ROW
    WHEN (OLD.current_access_count IS DISTINCT FROM NEW.current_access_count)
    EXECUTE FUNCTION check_share_access_limit();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE document_permissions IS 'Fine-grained access control for documents at user or role level';
COMMENT ON TABLE document_shares IS 'Public/private sharing links for documents with access tracking';
COMMENT ON TABLE document_share_access_log IS 'Audit log for document share access tracking';
COMMENT ON FUNCTION user_can_access_document IS 'Check if a user has specific permission on a document (including role-based)';
COMMENT ON FUNCTION increment_share_access_count IS 'Auto-increment access count when share is accessed';
COMMENT ON FUNCTION check_share_access_limit IS 'Auto-deactivate shares when max access count is reached';
