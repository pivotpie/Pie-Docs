-- ==========================================
-- User Management Database Schema
-- ==========================================
-- This schema implements a comprehensive Role-Based Access Control (RBAC) system
-- with support for users, roles, permissions, and their relationships.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- TABLES
-- ==========================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone_number VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_superuser BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    resource VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    is_system_permission BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Roles (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- Role Permissions (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    UNIQUE(role_id, permission_id)
);

-- User Sessions Table (for tracking active sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log Table (for tracking all user management actions)
CREATE TABLE IF NOT EXISTS user_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES
-- ==========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

-- Permissions indexes
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- User Roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Role Permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- User Sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- Audit Log indexes
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_action ON user_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON user_audit_log(created_at);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- INITIAL SYSTEM DATA
-- ==========================================

-- Insert default system permissions
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
-- User Management Permissions
('users.view', 'View Users', 'View user information', 'users', 'view', TRUE),
('users.create', 'Create Users', 'Create new users', 'users', 'create', TRUE),
('users.update', 'Update Users', 'Update existing users', 'users', 'update', TRUE),
('users.delete', 'Delete Users', 'Delete users', 'users', 'delete', TRUE),

-- Role Management Permissions
('roles.view', 'View Roles', 'View roles', 'roles', 'view', TRUE),
('roles.create', 'Create Roles', 'Create new roles', 'roles', 'create', TRUE),
('roles.update', 'Update Roles', 'Update existing roles', 'roles', 'update', TRUE),
('roles.delete', 'Delete Roles', 'Delete roles', 'roles', 'delete', TRUE),

-- Permission Management Permissions
('permissions.view', 'View Permissions', 'View permissions', 'permissions', 'view', TRUE),
('permissions.manage', 'Manage Permissions', 'Assign/revoke permissions', 'permissions', 'manage', TRUE),

-- Document Permissions
('documents.view', 'View Documents', 'View documents', 'documents', 'view', TRUE),
('documents.create', 'Create Documents', 'Create new documents', 'documents', 'create', TRUE),
('documents.update', 'Update Documents', 'Update existing documents', 'documents', 'update', TRUE),
('documents.delete', 'Delete Documents', 'Delete documents', 'documents', 'delete', TRUE),
('documents.share', 'Share Documents', 'Share documents with others', 'documents', 'share', TRUE),

-- Workflow Permissions
('workflows.view', 'View Workflows', 'View workflows', 'workflows', 'view', TRUE),
('workflows.create', 'Create Workflows', 'Create new workflows', 'workflows', 'create', TRUE),
('workflows.update', 'Update Workflows', 'Update existing workflows', 'workflows', 'update', TRUE),
('workflows.delete', 'Delete Workflows', 'Delete workflows', 'workflows', 'delete', TRUE),
('workflows.execute', 'Execute Workflows', 'Execute workflows', 'workflows', 'execute', TRUE),

-- Analytics Permissions
('analytics.view', 'View Analytics', 'View analytics and reports', 'analytics', 'view', TRUE),
('analytics.export', 'Export Analytics', 'Export analytics data', 'analytics', 'export', TRUE),

-- Settings Permissions
('settings.view', 'View Settings', 'View system settings', 'settings', 'view', TRUE),
('settings.update', 'Update Settings', 'Update system settings', 'settings', 'update', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert default system roles
INSERT INTO roles (name, display_name, description, is_system_role, priority) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', TRUE, 1000),
('admin', 'Administrator', 'Administrative access to manage users and settings', TRUE, 900),
('manager', 'Manager', 'Manage documents, workflows, and team members', TRUE, 700),
('user', 'Standard User', 'Standard user with basic document access', TRUE, 500),
('viewer', 'Viewer', 'Read-only access to documents', TRUE, 300),
('guest', 'Guest', 'Limited guest access', TRUE, 100)
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to super_admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'super_admin'),
    id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions
WHERE name IN (
    'users.view', 'users.create', 'users.update',
    'roles.view', 'roles.create', 'roles.update',
    'permissions.view',
    'documents.view', 'documents.create', 'documents.update', 'documents.delete', 'documents.share',
    'workflows.view', 'workflows.create', 'workflows.update', 'workflows.delete', 'workflows.execute',
    'analytics.view', 'analytics.export',
    'settings.view', 'settings.update'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'manager'),
    id
FROM permissions
WHERE name IN (
    'users.view',
    'documents.view', 'documents.create', 'documents.update', 'documents.share',
    'workflows.view', 'workflows.create', 'workflows.update', 'workflows.execute',
    'analytics.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to user role
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'user'),
    id
FROM permissions
WHERE name IN (
    'documents.view', 'documents.create', 'documents.update',
    'workflows.view', 'workflows.execute'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'viewer'),
    id
FROM permissions
WHERE name IN (
    'documents.view',
    'workflows.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to guest role
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'guest'),
    id
FROM permissions
WHERE name IN (
    'documents.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ==========================================
-- VIEWS
-- ==========================================

-- View to get all users with their roles
CREATE OR REPLACE VIEW v_users_with_roles AS
SELECT
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.is_active,
    u.is_verified,
    u.is_superuser,
    u.last_login,
    u.created_at,
    ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as role_names,
    ARRAY_AGG(DISTINCT r.display_name) FILTER (WHERE r.display_name IS NOT NULL) as role_display_names
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id;

-- View to get all roles with their permissions
CREATE OR REPLACE VIEW v_roles_with_permissions AS
SELECT
    r.id,
    r.name,
    r.display_name,
    r.description,
    r.is_active,
    r.priority,
    COUNT(DISTINCT rp.permission_id) as permission_count,
    ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permission_names,
    ARRAY_AGG(DISTINCT p.display_name) FILTER (WHERE p.display_name IS NOT NULL) as permission_display_names
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.id;

-- View to get user permissions (both direct and via roles)
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT DISTINCT
    u.id as user_id,
    u.username,
    u.email,
    p.id as permission_id,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.resource,
    p.action
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN role_permissions rp ON ur.role_id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM v_user_permissions
        WHERE user_id = p_user_id
        AND permission_name = p_permission_name
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get all user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name VARCHAR, permission_display_name VARCHAR, resource VARCHAR, action VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        vup.permission_name,
        vup.permission_display_name,
        vup.resource,
        vup.action
    FROM v_user_permissions vup
    WHERE vup.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to assign role to user
CREATE OR REPLACE FUNCTION assign_role_to_user(
    p_user_id UUID,
    p_role_id UUID,
    p_assigned_by UUID DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_user_role_id UUID;
BEGIN
    INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
    VALUES (p_user_id, p_role_id, p_assigned_by, p_expires_at)
    ON CONFLICT (user_id, role_id) DO UPDATE
    SET expires_at = EXCLUDED.expires_at
    RETURNING id INTO v_user_role_id;

    RETURN v_user_role_id;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke role from user
CREATE OR REPLACE FUNCTION revoke_role_from_user(
    p_user_id UUID,
    p_role_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM user_roles
    WHERE user_id = p_user_id AND role_id = p_role_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON TABLE roles IS 'Stores role definitions';
COMMENT ON TABLE permissions IS 'Stores permission definitions';
COMMENT ON TABLE user_roles IS 'Maps users to their assigned roles';
COMMENT ON TABLE role_permissions IS 'Maps roles to their granted permissions';
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions';
COMMENT ON TABLE user_audit_log IS 'Logs all user management actions for auditing';
