-- ============================================
-- SEED DEFAULT ROLES WITH PERMISSIONS
-- Populate the roles table with predefined roles and assign permissions
-- ============================================

-- ============================================
-- 1. CREATE ROLES
-- ============================================

INSERT INTO roles (name, display_name, description, is_system_role, is_active, priority) VALUES
('super_admin', 'Super Admin', 'Full system access with all permissions', true, true, 1000),
('admin', 'Administrator', 'System administrator with elevated privileges', true, true, 900),
('manager', 'Manager', 'Department manager with approval and oversight permissions', true, true, 700),
('document_controller', 'Document Controller', 'Manages documents, folders, and metadata', true, true, 500),
('approver', 'Approver', 'Reviews and approves workflow requests', true, true, 400),
('user', 'Standard User', 'Basic user with document viewing and creation rights', true, true, 200),
('guest', 'Guest', 'Read-only access to public documents', true, true, 100)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. ASSIGN PERMISSIONS TO ROLES
-- ============================================

-- Super Admin: ALL PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'super_admin'),
    p.id
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: All permissions except system-critical operations
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'admin'),
    p.id
FROM permissions p
WHERE p.name NOT IN (
    'system.manage',
    'settings.manage',
    'users.impersonate'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: Management, approval, and oversight permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'manager'),
    p.id
FROM permissions p
WHERE p.resource IN (
    'documents', 'folders', 'cabinets', 'tags', 'document_types',
    'approvals', 'workflows', 'tasks', 'users', 'audit_logs',
    'physical_locations', 'checkinout', 'warehouse'
)
AND p.action IN ('view', 'create', 'edit', 'manage', 'approve', 'assign')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Document Controller: Full document management
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'document_controller'),
    p.id
FROM permissions p
WHERE p.resource IN (
    'documents', 'folders', 'cabinets', 'tags', 'document_types',
    'metadata_schemas', 'annotations', 'physical_locations',
    'barcodes', 'checkinout', 'ocr', 'warehouse'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Approver: Approval and workflow permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'approver'),
    p.id
FROM permissions p
WHERE (
    p.resource IN ('approvals', 'workflows', 'tasks', 'notifications')
    OR
    (p.resource IN ('documents', 'folders') AND p.action IN ('view', 'preview', 'download'))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User: Standard document operations
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'user'),
    p.id
FROM permissions p
WHERE (
    p.resource = 'documents' AND p.action IN ('view', 'create', 'edit', 'download', 'preview', 'share')
    OR
    p.resource = 'folders' AND p.action IN ('view', 'create', 'edit')
    OR
    p.resource = 'tags' AND p.action IN ('view', 'apply')
    OR
    p.resource = 'annotations' AND p.action IN ('view', 'create', 'edit', 'delete')
    OR
    p.resource = 'tasks' AND p.action IN ('view', 'create', 'edit', 'complete')
    OR
    p.resource = 'notifications' AND p.action IN ('view', 'mark_read')
    OR
    p.resource = 'barcodes' AND p.action IN ('scan')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Guest: Read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'guest'),
    p.id
FROM permissions p
WHERE p.action = 'view' AND p.resource IN ('documents', 'folders', 'tags')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 3. VERIFY ROLE PERMISSIONS
-- ============================================

DO $$
DECLARE
    role_record RECORD;
    perm_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'ROLES AND PERMISSIONS SEEDED SUCCESSFULLY';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';

    FOR role_record IN
        SELECT r.name, r.display_name, r.priority, COUNT(rp.permission_id) as permission_count
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        WHERE r.is_system_role = true
        GROUP BY r.id, r.name, r.display_name, r.priority
        ORDER BY r.priority DESC
    LOOP
        RAISE NOTICE '  % (%) - % permissions [Priority: %]',
            role_record.display_name,
            role_record.name,
            role_record.permission_count,
            role_record.priority;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Total System Roles: %', (SELECT COUNT(*) FROM roles WHERE is_system_role = true);
    RAISE NOTICE 'Total Permissions: %', (SELECT COUNT(*) FROM permissions);
    RAISE NOTICE 'Total Role-Permission Assignments: %', (SELECT COUNT(*) FROM role_permissions);
    RAISE NOTICE '';
END $$;
