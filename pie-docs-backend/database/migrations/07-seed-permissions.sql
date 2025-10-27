-- ============================================
-- SEED PERMISSIONS
-- Populate the permissions table with all system permissions
-- ============================================

-- ============================================
-- 1. AUTHENTICATION & USER MANAGEMENT
-- ============================================

-- Users
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('users.view', 'View Users', 'View user profiles and information', 'users', 'view', true),
('users.create', 'Create Users', 'Create new user accounts', 'users', 'create', true),
('users.edit', 'Edit Users', 'Modify user profiles and information', 'users', 'edit', true),
('users.delete', 'Delete Users', 'Delete user accounts', 'users', 'delete', true),
('users.manage', 'Manage Users', 'Full user management access', 'users', 'manage', true),
('users.activate', 'Activate/Deactivate Users', 'Activate or deactivate user accounts', 'users', 'activate', true),
('users.reset_password', 'Reset User Passwords', 'Reset passwords for user accounts', 'users', 'reset_password', true),
('users.impersonate', 'Impersonate Users', 'Log in as another user', 'users', 'impersonate', true)
ON CONFLICT (name) DO NOTHING;

-- Roles
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('roles.view', 'View Roles', 'View role definitions and assignments', 'roles', 'view', true),
('roles.create', 'Create Roles', 'Create new role definitions', 'roles', 'create', true),
('roles.edit', 'Edit Roles', 'Modify role definitions', 'roles', 'edit', true),
('roles.delete', 'Delete Roles', 'Delete role definitions', 'roles', 'delete', true),
('roles.manage', 'Manage Roles', 'Full role management access', 'roles', 'manage', true),
('roles.assign', 'Assign Roles', 'Assign roles to users', 'roles', 'assign', true)
ON CONFLICT (name) DO NOTHING;

-- Permissions
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('permissions.view', 'View Permissions', 'View permission definitions', 'permissions', 'view', true),
('permissions.manage', 'Manage Permissions', 'Full permission management access', 'permissions', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. DOCUMENT MANAGEMENT
-- ============================================

-- Documents
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('documents.view', 'View Documents', 'View document metadata and content', 'documents', 'view', true),
('documents.create', 'Upload Documents', 'Upload and create new documents', 'documents', 'create', true),
('documents.edit', 'Edit Documents', 'Modify document metadata', 'documents', 'edit', true),
('documents.delete', 'Delete Documents', 'Delete documents', 'documents', 'delete', true),
('documents.manage', 'Manage Documents', 'Full document management access', 'documents', 'manage', true),
('documents.download', 'Download Documents', 'Download document files', 'documents', 'download', true),
('documents.preview', 'Preview Documents', 'Preview document content', 'documents', 'preview', true),
('documents.share', 'Share Documents', 'Share documents with others', 'documents', 'share', true),
('documents.version', 'Manage Document Versions', 'View and manage document versions', 'documents', 'version', true),
('documents.export', 'Export Documents', 'Export documents in bulk', 'documents', 'export', true),
('documents.bulk_upload', 'Bulk Upload Documents', 'Upload multiple documents at once', 'documents', 'bulk_upload', true),
('documents.bulk_delete', 'Bulk Delete Documents', 'Delete multiple documents at once', 'documents', 'bulk_delete', true)
ON CONFLICT (name) DO NOTHING;

-- Folders
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('folders.view', 'View Folders', 'View folder structure and contents', 'folders', 'view', true),
('folders.create', 'Create Folders', 'Create new folders', 'folders', 'create', true),
('folders.edit', 'Edit Folders', 'Modify folder properties', 'folders', 'edit', true),
('folders.delete', 'Delete Folders', 'Delete folders', 'folders', 'delete', true),
('folders.manage', 'Manage Folders', 'Full folder management access', 'folders', 'manage', true),
('folders.move', 'Move Folders', 'Move folders in hierarchy', 'folders', 'move', true)
ON CONFLICT (name) DO NOTHING;

-- Cabinets
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('cabinets.view', 'View Cabinets', 'View cabinet structure', 'cabinets', 'view', true),
('cabinets.create', 'Create Cabinets', 'Create new cabinets', 'cabinets', 'create', true),
('cabinets.edit', 'Edit Cabinets', 'Modify cabinet properties', 'cabinets', 'edit', true),
('cabinets.delete', 'Delete Cabinets', 'Delete cabinets', 'cabinets', 'delete', true),
('cabinets.manage', 'Manage Cabinets', 'Full cabinet management access', 'cabinets', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- Tags
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('tags.view', 'View Tags', 'View available tags', 'tags', 'view', true),
('tags.create', 'Create Tags', 'Create new tags', 'tags', 'create', true),
('tags.edit', 'Edit Tags', 'Modify tag properties', 'tags', 'edit', true),
('tags.delete', 'Delete Tags', 'Delete tags', 'tags', 'delete', true),
('tags.manage', 'Manage Tags', 'Full tag management access', 'tags', 'manage', true),
('tags.apply', 'Apply Tags', 'Apply tags to documents', 'tags', 'apply', true)
ON CONFLICT (name) DO NOTHING;

-- Document Types
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('document_types.view', 'View Document Types', 'View document type definitions', 'document_types', 'view', true),
('document_types.create', 'Create Document Types', 'Create new document types', 'document_types', 'create', true),
('document_types.edit', 'Edit Document Types', 'Modify document type definitions', 'document_types', 'edit', true),
('document_types.delete', 'Delete Document Types', 'Delete document types', 'document_types', 'delete', true),
('document_types.manage', 'Manage Document Types', 'Full document type management', 'document_types', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. METADATA & CLASSIFICATION
-- ============================================

-- Metadata Schemas
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('metadata_schemas.view', 'View Metadata Schemas', 'View metadata schema definitions', 'metadata_schemas', 'view', true),
('metadata_schemas.create', 'Create Metadata Schemas', 'Create new metadata schemas', 'metadata_schemas', 'create', true),
('metadata_schemas.edit', 'Edit Metadata Schemas', 'Modify metadata schemas', 'metadata_schemas', 'edit', true),
('metadata_schemas.delete', 'Delete Metadata Schemas', 'Delete metadata schemas', 'metadata_schemas', 'delete', true),
('metadata_schemas.manage', 'Manage Metadata Schemas', 'Full metadata schema management', 'metadata_schemas', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- Annotations
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('annotations.view', 'View Annotations', 'View document annotations', 'annotations', 'view', true),
('annotations.create', 'Create Annotations', 'Create new annotations', 'annotations', 'create', true),
('annotations.edit', 'Edit Annotations', 'Modify own annotations', 'annotations', 'edit', true),
('annotations.delete', 'Delete Annotations', 'Delete own annotations', 'annotations', 'delete', true),
('annotations.manage', 'Manage All Annotations', 'Manage all user annotations', 'annotations', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. WORKFLOW & APPROVALS
-- ============================================

-- Workflows
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('workflows.view', 'View Workflows', 'View workflow definitions', 'workflows', 'view', true),
('workflows.create', 'Create Workflows', 'Create new workflows', 'workflows', 'create', true),
('workflows.edit', 'Edit Workflows', 'Modify workflow definitions', 'workflows', 'edit', true),
('workflows.delete', 'Delete Workflows', 'Delete workflows', 'workflows', 'delete', true),
('workflows.manage', 'Manage Workflows', 'Full workflow management', 'workflows', 'manage', true),
('workflows.assign', 'Assign Workflows', 'Assign workflows to documents', 'workflows', 'assign', true)
ON CONFLICT (name) DO NOTHING;

-- Approvals
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('approvals.view', 'View Approval Requests', 'View approval requests', 'approvals', 'view', true),
('approvals.approve', 'Approve Requests', 'Approve pending requests', 'approvals', 'approve', true),
('approvals.reject', 'Reject Requests', 'Reject pending requests', 'approvals', 'reject', true),
('approvals.manage', 'Manage All Approvals', 'Manage all approval requests', 'approvals', 'manage', true),
('approvals.reassign', 'Reassign Approvals', 'Reassign approval requests', 'approvals', 'reassign', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. TASKS & NOTIFICATIONS
-- ============================================

-- Tasks
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('tasks.view', 'View Tasks', 'View assigned tasks', 'tasks', 'view', true),
('tasks.create', 'Create Tasks', 'Create new tasks', 'tasks', 'create', true),
('tasks.edit', 'Edit Tasks', 'Modify task details', 'tasks', 'edit', true),
('tasks.delete', 'Delete Tasks', 'Delete tasks', 'tasks', 'delete', true),
('tasks.manage', 'Manage All Tasks', 'Manage all tasks', 'tasks', 'manage', true),
('tasks.assign', 'Assign Tasks', 'Assign tasks to users', 'tasks', 'assign', true),
('tasks.complete', 'Complete Tasks', 'Mark tasks as complete', 'tasks', 'complete', true)
ON CONFLICT (name) DO NOTHING;

-- Notifications
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('notifications.view', 'View Notifications', 'View own notifications', 'notifications', 'view', true),
('notifications.manage', 'Manage All Notifications', 'Manage all notifications', 'notifications', 'manage', true),
('notifications.send', 'Send Notifications', 'Send notifications to users', 'notifications', 'send', true),
('notifications.mark_read', 'Mark Notifications Read', 'Mark notifications as read', 'notifications', 'mark_read', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. PHYSICAL DOCUMENT MANAGEMENT
-- ============================================

-- Physical Locations
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('physical_locations.view', 'View Storage Locations', 'View physical storage locations', 'physical_locations', 'view', true),
('physical_locations.create', 'Create Locations', 'Create new storage locations', 'physical_locations', 'create', true),
('physical_locations.edit', 'Edit Locations', 'Modify storage locations', 'physical_locations', 'edit', true),
('physical_locations.delete', 'Delete Locations', 'Delete storage locations', 'physical_locations', 'delete', true),
('physical_locations.manage', 'Manage Locations', 'Full storage location management', 'physical_locations', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- Barcodes
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('barcodes.view', 'View Barcodes', 'View barcode information', 'barcodes', 'view', true),
('barcodes.generate', 'Generate Barcodes', 'Generate new barcodes', 'barcodes', 'generate', true),
('barcodes.print', 'Print Barcode Labels', 'Print barcode labels', 'barcodes', 'print', true),
('barcodes.scan', 'Scan Barcodes', 'Scan barcodes (mobile)', 'barcodes', 'scan', true),
('barcodes.manage', 'Manage Barcodes', 'Full barcode management', 'barcodes', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- Check-In/Check-Out
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('checkinout.view', 'View Checkout History', 'View check-in/out history', 'checkinout', 'view', true),
('checkinout.checkout', 'Check Out Documents', 'Check out physical documents', 'checkinout', 'checkout', true),
('checkinout.checkin', 'Check In Documents', 'Check in physical documents', 'checkinout', 'checkin', true),
('checkinout.override', 'Override Checkouts', 'Override existing checkouts', 'checkinout', 'override', true),
('checkinout.manage', 'Manage Check-In/Out', 'Full check-in/out management', 'checkinout', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. OCR & PROCESSING
-- ============================================

-- OCR
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('ocr.view', 'View OCR Results', 'View OCR processing results', 'ocr', 'view', true),
('ocr.process', 'Process OCR', 'Trigger OCR processing', 'ocr', 'process', true),
('ocr.reprocess', 'Reprocess OCR', 'Reprocess OCR for documents', 'ocr', 'reprocess', true),
('ocr.manage', 'Manage OCR', 'Full OCR management', 'ocr', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. SYSTEM ADMINISTRATION
-- ============================================

-- Settings
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('settings.view', 'View System Settings', 'View system configuration', 'settings', 'view', true),
('settings.edit', 'Edit System Settings', 'Modify system configuration', 'settings', 'edit', true),
('settings.manage', 'Manage System Settings', 'Full settings management', 'settings', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- System Monitoring
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('system.monitor', 'Monitor System', 'View system health and metrics', 'system', 'monitor', true),
('system.cache_clear', 'Clear System Cache', 'Clear application cache', 'system', 'cache_clear', true),
('system.backup', 'Trigger Backups', 'Manually trigger system backups', 'system', 'backup', true),
('system.manage', 'Manage System', 'Full system management access', 'system', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- Audit Logs
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('audit_logs.view', 'View Audit Logs', 'View system audit logs', 'audit_logs', 'view', true),
('audit_logs.export', 'Export Audit Logs', 'Export audit logs', 'audit_logs', 'export', true),
('audit_logs.manage', 'Manage Audit Logs', 'Full audit log management', 'audit_logs', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- API Keys
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('api_keys.view', 'View API Keys', 'View API key information', 'api_keys', 'view', true),
('api_keys.create', 'Create API Keys', 'Generate new API keys', 'api_keys', 'create', true),
('api_keys.revoke', 'Revoke API Keys', 'Revoke existing API keys', 'api_keys', 'revoke', true),
('api_keys.manage', 'Manage API Keys', 'Full API key management', 'api_keys', 'manage', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 9. WAREHOUSE MANAGEMENT
-- ============================================

-- Warehouse
INSERT INTO permissions (name, display_name, description, resource, action, is_system_permission) VALUES
('warehouse.view', 'View Warehouse Items', 'View warehouse inventory', 'warehouse', 'view', true),
('warehouse.create', 'Create Warehouse Items', 'Add items to warehouse', 'warehouse', 'create', true),
('warehouse.edit', 'Edit Warehouse Items', 'Modify warehouse items', 'warehouse', 'edit', true),
('warehouse.delete', 'Delete Warehouse Items', 'Remove warehouse items', 'warehouse', 'delete', true),
('warehouse.manage', 'Manage Warehouse', 'Full warehouse management', 'warehouse', 'manage', true),
('warehouse.transfer', 'Transfer Items', 'Transfer items between locations', 'warehouse', 'transfer', true),
('warehouse.inventory', 'Manage Inventory', 'Perform inventory operations', 'warehouse', 'inventory', true)
ON CONFLICT (name) DO NOTHING;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Permissions seeded successfully';
END $$;
