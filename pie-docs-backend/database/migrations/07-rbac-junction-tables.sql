-- ============================================
-- Migration 07: RBAC Junction Tables
-- Creates user_roles and role_permissions junction tables
-- Critical: Blocks API development
-- ============================================

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

-- Create indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON user_roles(assigned_by);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_role_permission UNIQUE(role_id, permission_id)
);

-- Create indexes for role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_granted_by ON role_permissions(granted_by);

-- Migrate existing user.role data to user_roles table
-- This assumes roles table has records with names matching the users.role values
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT
    u.id as user_id,
    r.id as role_id,
    u.created_at as assigned_at
FROM users u
INNER JOIN roles r ON LOWER(r.name) = LOWER(u.role)
WHERE u.role IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 07 completed:';
    RAISE NOTICE '  - user_roles table created with % rows', (SELECT COUNT(*) FROM user_roles);
    RAISE NOTICE '  - role_permissions table created with % rows', (SELECT COUNT(*) FROM role_permissions);
END $$;
