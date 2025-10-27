-- ============================================
-- SEED DATA FOR PIEDOCS
-- Sample users, tags, folders, and test data
-- ============================================

-- ============================================
-- USERS
-- ============================================
-- Default password for all test users: "password123"
-- Hash generated with bcrypt: $2b$12$Yo809yc6tQfL/ZZtFmJGHOQT63ad1kg.nSwgvFlSPtGrzm8Ex7QwW
INSERT INTO users (id, email, username, full_name, password_hash, role, department, is_active, is_verified) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@piedocs.com', 'admin', 'System Administrator', '$2b$12$Yo809yc6tQfL/ZZtFmJGHOQT63ad1kg.nSwgvFlSPtGrzm8Ex7QwW', 'super_admin', 'IT', true, true),
('00000000-0000-0000-0000-000000000002', 'john.doe@piedocs.com', 'johndoe', 'John Doe', '$2b$12$Yo809yc6tQfL/ZZtFmJGHOQT63ad1kg.nSwgvFlSPtGrzm8Ex7QwW', 'manager', 'Finance', true, true),
('00000000-0000-0000-0000-000000000003', 'jane.smith@piedocs.com', 'janesmith', 'Jane Smith', '$2b$12$Yo809yc6tQfL/ZZtFmJGHOQT63ad1kg.nSwgvFlSPtGrzm8Ex7QwW', 'user', 'HR', true, true),
('00000000-0000-0000-0000-000000000004', 'bob.johnson@piedocs.com', 'bobjohnson', 'Bob Johnson', '$2b$12$Yo809yc6tQfL/ZZtFmJGHOQT63ad1kg.nSwgvFlSPtGrzm8Ex7QwW', 'user', 'Legal', true, true),
('00000000-0000-0000-0000-000000000005', 'alice.brown@piedocs.com', 'alicebrown', 'Alice Brown', '$2b$12$Yo809yc6tQfL/ZZtFmJGHOQT63ad1kg.nSwgvFlSPtGrzm8Ex7QwW', 'manager', 'Operations', true, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TAGS
-- ============================================
INSERT INTO tags (name, color, usage_count) VALUES
('urgent', '#FF5252', 15),
('invoice', '#4CAF50', 25),
('contract', '#2196F3', 18),
('policy', '#9C27B0', 12),
('financial', '#FFC107', 20),
('hr', '#00BCD4', 10),
('legal', '#607D8B', 8),
('archived', '#9E9E9E', 30),
('draft', '#FF9800', 5),
('approved', '#8BC34A', 22),
('confidential', '#F44336', 14),
('public', '#CDDC39', 40)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- FOLDERS
-- ============================================
INSERT INTO folders (id, name, description, path, folder_type, color, icon, owner_id) VALUES
('10000000-0000-0000-0000-000000000001', 'Finance', 'Financial documents and reports', '/Finance', 'regular', '#4CAF50', 'trending-up', '00000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000002', 'Invoices', 'All company invoices', '/Finance/Invoices', 'regular', '#FF9800', 'receipt', '00000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000003', 'Contracts', 'Legal contracts and agreements', '/Legal/Contracts', 'regular', '#2196F3', 'file-text', '00000000-0000-0000-0000-000000000004'),
('10000000-0000-0000-0000-000000000004', 'HR Documents', 'Human resources documentation', '/HR', 'regular', '#9C27B0', 'users', '00000000-0000-0000-0000-000000000003'),
('10000000-0000-0000-0000-000000000005', 'Policies', 'Company policies and procedures', '/HR/Policies', 'regular', '#607D8B', 'book-open', '00000000-0000-0000-0000-000000000003'),
('10000000-0000-0000-0000-000000000006', 'Recent Documents', 'Documents accessed in last 7 days', '/Smart/Recent', 'smart', '#E91E63', 'clock', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000007', 'Large Files', 'Files larger than 10MB', '/Smart/LargeFiles', 'smart', '#FF5722', 'hard-drive', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Set parent relationships
UPDATE folders SET parent_id = '10000000-0000-0000-0000-000000000001' WHERE id = '10000000-0000-0000-0000-000000000002';
UPDATE folders SET parent_id = '10000000-0000-0000-0000-000000000004' WHERE id = '10000000-0000-0000-0000-000000000005';

-- Smart folder criteria
UPDATE folders SET smart_criteria = '{
  "dateRange": {"start": "2025-01-01", "end": "2025-12-31"},
  "status": ["published"]
}'::jsonb WHERE id = '10000000-0000-0000-0000-000000000006';

UPDATE folders SET smart_criteria = '{
  "sizeRange": {"min": 10485760, "max": null}
}'::jsonb WHERE id = '10000000-0000-0000-0000-000000000007';

-- ============================================
-- CABINETS (Mayan EDMS Integration)
-- ============================================
INSERT INTO cabinets (id, label, description) VALUES
('20000000-0000-0000-0000-000000000001', 'General Documents', 'General purpose document cabinet'),
('20000000-0000-0000-0000-000000000002', 'Financial Records', 'All financial records and statements'),
('20000000-0000-0000-0000-000000000003', 'Legal & Compliance', 'Legal documents and compliance records')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- APPROVAL CHAINS
-- ============================================
INSERT INTO approval_chains (id, name, description, document_types, is_active, created_by) VALUES
('30000000-0000-0000-0000-000000000001', 'Standard Invoice Approval', 'Standard approval workflow for invoices under $10,000', ARRAY['invoice', 'receipt'], true, '00000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000002', 'Contract Approval', 'Legal review and executive approval for contracts', ARRAY['contract', 'agreement'], true, '00000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000003', 'Policy Approval', 'HR and executive approval for company policies', ARRAY['policy', 'procedure'], true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Approval Chain Steps
INSERT INTO approval_chain_steps (chain_id, step_number, name, approver_ids, parallel_approval, consensus_type, timeout_days) VALUES
('30000000-0000-0000-0000-000000000001', 1, 'Manager Review', ARRAY['00000000-0000-0000-0000-000000000002']::UUID[], false, 'unanimous', 2),
('30000000-0000-0000-0000-000000000001', 2, 'Finance Director', ARRAY['00000000-0000-0000-0000-000000000005']::UUID[], false, 'unanimous', 3),
('30000000-0000-0000-0000-000000000002', 1, 'Legal Review', ARRAY['00000000-0000-0000-0000-000000000004']::UUID[], false, 'unanimous', 5),
('30000000-0000-0000-0000-000000000002', 2, 'Executive Approval', ARRAY['00000000-0000-0000-0000-000000000001']::UUID[], false, 'unanimous', 7),
('30000000-0000-0000-0000-000000000003', 1, 'HR Manager', ARRAY['00000000-0000-0000-0000-000000000003']::UUID[], false, 'unanimous', 3),
('30000000-0000-0000-0000-000000000003', 2, 'Department Heads', ARRAY['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005']::UUID[], true, 'majority', 5)
ON CONFLICT (chain_id, step_number) DO NOTHING;

-- ============================================
-- ROUTING RULES
-- ============================================
INSERT INTO routing_rules (id, name, description, conditions, target_chain_id, priority, is_active) VALUES
('40000000-0000-0000-0000-000000000001', 'Auto-route Invoices', 'Automatically route invoices to standard approval',
 '[{"field": "type", "operator": "equals", "value": "invoice"}]'::jsonb,
 '30000000-0000-0000-0000-000000000001', 10, true),
('40000000-0000-0000-0000-000000000002', 'Auto-route Contracts', 'Automatically route contracts to legal review',
 '[{"field": "type", "operator": "equals", "value": "contract"}]'::jsonb,
 '30000000-0000-0000-0000-000000000002', 9, true),
('40000000-0000-0000-0000-000000000003', 'Auto-route Policies', 'Automatically route policies to HR approval',
 '[{"field": "type", "operator": "equals", "value": "policy"}]'::jsonb,
 '30000000-0000-0000-0000-000000000003', 8, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE LOCATIONS
-- ============================================
INSERT INTO storage_locations (id, name, description, location_type, capacity) VALUES
('50000000-0000-0000-0000-000000000001', 'Building A', 'Main office building', 'building', 10000),
('50000000-0000-0000-0000-000000000002', 'Archive Room 101', 'Document archive room', 'room', 5000),
('50000000-0000-0000-0000-000000000003', 'Cabinet A-1', 'Filing cabinet A-1', 'cabinet', 500),
('50000000-0000-0000-0000-000000000004', 'Shelf A-1-1', 'Top shelf', 'shelf', 100),
('50000000-0000-0000-0000-000000000005', 'Shelf A-1-2', 'Middle shelf', 'shelf', 100)
ON CONFLICT (id) DO NOTHING;

-- Set location hierarchy
UPDATE storage_locations SET parent_id = '50000000-0000-0000-0000-000000000001' WHERE id = '50000000-0000-0000-0000-000000000002';
UPDATE storage_locations SET parent_id = '50000000-0000-0000-0000-000000000002' WHERE id = '50000000-0000-0000-0000-000000000003';
UPDATE storage_locations SET parent_id = '50000000-0000-0000-0000-000000000003' WHERE id IN ('50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000005');

-- ============================================
-- LABEL TEMPLATES
-- ============================================
INSERT INTO label_templates (id, name, description, dimensions, elements, is_default) VALUES
('60000000-0000-0000-0000-000000000001', 'Standard Barcode Label', 'Standard 2x4 inch barcode label',
 '{"width": 51, "height": 102, "unit": "mm"}'::jsonb,
 '[{"id": "barcode-1", "type": "barcode", "position": {"x": 5, "y": 10}, "size": {"width": 40, "height": 20}}]'::jsonb,
 true),
('60000000-0000-0000-0000-000000000002', 'QR Code Label', 'QR code label with document title',
 '{"width": 51, "height": 51, "unit": "mm"}'::jsonb,
 '[{"id": "qr-1", "type": "qr", "position": {"x": 5, "y": 5}, "size": {"width": 40, "height": 40}}]'::jsonb,
 false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- METADATA SCHEMAS
-- ============================================
INSERT INTO metadata_schemas (id, name, description, document_types, fields, is_active, created_by) VALUES
('70000000-0000-0000-0000-000000000001', 'Invoice Metadata', 'Standard metadata fields for invoices',
 ARRAY['invoice'],
 '[
   {"name": "vendor", "type": "string", "required": true},
   {"name": "amount", "type": "number", "required": true},
   {"name": "currency", "type": "string", "required": true, "default": "USD"},
   {"name": "invoice_number", "type": "string", "required": true},
   {"name": "invoice_date", "type": "date", "required": true},
   {"name": "due_date", "type": "date", "required": false}
 ]'::jsonb,
 true, '00000000-0000-0000-0000-000000000001'),
('70000000-0000-0000-0000-000000000002', 'Contract Metadata', 'Standard metadata fields for contracts',
 ARRAY['contract', 'agreement'],
 '[
   {"name": "party_a", "type": "string", "required": true},
   {"name": "party_b", "type": "string", "required": true},
   {"name": "contract_value", "type": "number", "required": false},
   {"name": "start_date", "type": "date", "required": true},
   {"name": "end_date", "type": "date", "required": false},
   {"name": "renewal_terms", "type": "text", "required": false}
 ]'::jsonb,
 true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- LINK EXISTING DOCUMENTS TO FOLDERS
-- ============================================
UPDATE documents
SET folder_id = '10000000-0000-0000-0000-000000000002',
    owner_id = '00000000-0000-0000-0000-000000000002',
    status = 'published'
WHERE document_type = 'Invoice';

UPDATE documents
SET folder_id = '10000000-0000-0000-0000-000000000003',
    owner_id = '00000000-0000-0000-0000-000000000004',
    status = 'published'
WHERE document_type = 'Research Paper';

-- ============================================
-- SAMPLE TASKS
-- ============================================
INSERT INTO tasks (id, title, description, status, priority, assignee_id, assigned_by_id, deadline, tags) VALUES
('80000000-0000-0000-0000-000000000001', 'Review Q4 Budget Proposal', 'Review and approve Q4 budget allocations', 'pending', 'high', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', NOW() + INTERVAL '3 days', ARRAY['urgent', 'financial']),
('80000000-0000-0000-0000-000000000002', 'Update Employee Handbook', 'Update handbook with new remote work policies', 'in_progress', 'medium', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', NOW() + INTERVAL '7 days', ARRAY['hr', 'policy']),
('80000000-0000-0000-0000-000000000003', 'Contract Review - Vendor X', 'Legal review of new vendor contract', 'pending', 'critical', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', NOW() + INTERVAL '2 days', ARRAY['legal', 'urgent'])
ON CONFLICT (id) DO NOTHING;

-- Add task comments
INSERT INTO task_comments (task_id, author_id, content) VALUES
('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Please prioritize this for end of week review'),
('80000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Draft is ready for initial review');

-- ============================================
-- WEBHOOKS
-- ============================================
INSERT INTO webhooks (id, name, url, events, is_active, headers) VALUES
('90000000-0000-0000-0000-000000000001', 'Slack Notifications', 'https://hooks.slack.com/services/example',
 ARRAY['document_uploaded', 'approval_required', 'task_assigned'], true,
 '{"Content-Type": "application/json"}'::jsonb),
('90000000-0000-0000-0000-000000000002', 'Email Notifications', 'https://api.piedocs.com/webhooks/email',
 ARRAY['approval_completed', 'task_overdue'], true,
 '{"Content-Type": "application/json", "Authorization": "Bearer token123"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE users IS 'Sample data includes 5 test users with different roles';
COMMENT ON TABLE folders IS 'Sample data includes regular and smart folders';
COMMENT ON TABLE approval_chains IS 'Sample data includes 3 approval workflows';
