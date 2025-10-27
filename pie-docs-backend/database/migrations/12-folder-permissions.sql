-- ============================================
-- Migration 12: Folder Permissions Table
-- Creates table for granular folder-level permissions
-- Critical: Blocks API development
-- ============================================

-- Create folder_permissions table
CREATE TABLE IF NOT EXISTS folder_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL, -- read, write, delete, share, manage
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_inherited BOOLEAN DEFAULT FALSE,
    CONSTRAINT check_user_or_role CHECK (
        (user_id IS NOT NULL AND role_id IS NULL) OR
        (user_id IS NULL AND role_id IS NOT NULL)
    ),
    CONSTRAINT unique_folder_user_permission UNIQUE(folder_id, user_id, permission_type),
    CONSTRAINT unique_folder_role_permission UNIQUE(folder_id, role_id, permission_type)
);

-- Create indexes for permission lookups
CREATE INDEX IF NOT EXISTS idx_folder_permissions_folder_id ON folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_user_id ON folder_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_role_id ON folder_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_permission_type ON folder_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_granted_by ON folder_permissions(granted_by);

-- Create function to check folder permissions
CREATE OR REPLACE FUNCTION check_folder_permission(
    p_folder_id UUID,
    p_user_id UUID,
    p_permission_type VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN;
BEGIN
    -- Check direct user permission
    SELECT EXISTS (
        SELECT 1 FROM folder_permissions
        WHERE folder_id = p_folder_id
          AND user_id = p_user_id
          AND permission_type = p_permission_type
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ) INTO has_permission;

    IF has_permission THEN
        RETURN TRUE;
    END IF;

    -- Check role-based permission
    SELECT EXISTS (
        SELECT 1 FROM folder_permissions fp
        INNER JOIN user_roles ur ON fp.role_id = ur.role_id
        WHERE fp.folder_id = p_folder_id
          AND ur.user_id = p_user_id
          AND fp.permission_type = p_permission_type
          AND (fp.expires_at IS NULL OR fp.expires_at > CURRENT_TIMESTAMP)
          AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    ) INTO has_permission;

    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 12 completed:';
    RAISE NOTICE '  - Created folder_permissions table';
    RAISE NOTICE '  - Created permission checking function';
END $$;
