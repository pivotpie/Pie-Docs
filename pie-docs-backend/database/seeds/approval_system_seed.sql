-- Seed data for Approval System Testing
-- Run after migrations are complete

-- Note: This assumes users and documents tables already have some data
-- Adjust UUIDs as needed based on your existing data

-- ==========================================
-- Approval Chains
-- ==========================================

INSERT INTO approval_chains (id, name, description, is_active, document_types, created_by, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Standard Document Approval', 'Basic 2-step approval for general documents', true, ARRAY['memo', 'report', 'proposal'], NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('22222222-2222-2222-2222-222222222222', 'Contract Approval Workflow', 'Multi-step approval for contracts with legal review', true, ARRAY['contract', 'agreement'], NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('33333333-3333-3333-3333-333333333333', 'Policy Update Chain', 'Executive approval for policy changes', true, ARRAY['policy', 'procedure'], NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('44444444-4444-4444-4444-444444444444', 'Budget Approval', '3-tier approval for budget documents', true, ARRAY['budget', 'financial'], NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Approval Chain Steps
-- ==========================================

-- Standard Document Approval (2 steps)
INSERT INTO approval_chain_steps (id, chain_id, step_number, name, approver_ids, parallel_approval, consensus_type, timeout_days, is_optional, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 1, 'Manager Review', ARRAY[]::UUID[], false, 'any', 3, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 2, 'Director Approval', ARRAY[]::UUID[], false, 'any', 5, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Contract Approval Workflow (3 steps)
INSERT INTO approval_chain_steps (id, chain_id, step_number, name, approver_ids, parallel_approval, consensus_type, timeout_days, is_optional, created_at, updated_at)
VALUES
  ('a2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 1, 'Legal Review', ARRAY[]::UUID[], true, 'all', 5, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 2, 'Finance Approval', ARRAY[]::UUID[], false, 'any', 3, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 3, 'Executive Sign-off', ARRAY[]::UUID[], false, 'any', 7, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Policy Update Chain (2 steps)
INSERT INTO approval_chain_steps (id, chain_id, step_number, name, approver_ids, parallel_approval, consensus_type, timeout_days, is_optional, created_at, updated_at)
VALUES
  ('a3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 1, 'Compliance Review', ARRAY[]::UUID[], true, 'majority', 5, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 2, 'CEO Approval', ARRAY[]::UUID[], false, 'any', 7, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Budget Approval (3 steps)
INSERT INTO approval_chain_steps (id, chain_id, step_number, name, approver_ids, parallel_approval, consensus_type, timeout_days, is_optional, created_at, updated_at)
VALUES
  ('a4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 1, 'Department Head', ARRAY[]::UUID[], false, 'any', 3, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 2, 'Finance Director', ARRAY[]::UUID[], true, 'all', 5, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 3, 'CFO Approval', ARRAY[]::UUID[], false, 'any', 7, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Routing Rules
-- ==========================================

INSERT INTO routing_rules (id, name, description, conditions, target_chain_id, priority, is_active, created_at, updated_at)
VALUES
  ('r1111111-1111-1111-1111-111111111111',
   'High Value Contracts',
   'Route high-value contracts to contract approval workflow',
   '{"document_type": {"equals": "contract"}, "value": {"greater_than": 50000}}',
   '22222222-2222-2222-2222-222222222222',
   10,
   true,
   CURRENT_TIMESTAMP,
   CURRENT_TIMESTAMP),

  ('r2222222-2222-2222-2222-222222222222',
   'Policy Documents',
   'Route all policy documents to policy update chain',
   '{"document_type": {"in": ["policy", "procedure"]}}',
   '33333333-3333-3333-3333-333333333333',
   8,
   true,
   CURRENT_TIMESTAMP,
   CURRENT_TIMESTAMP),

  ('r3333333-3333-3333-3333-333333333333',
   'Budget Documents',
   'Route budget documents to budget approval chain',
   '{"document_type": {"in": ["budget", "financial"]}}',
   '44444444-4444-4444-4444-444444444444',
   9,
   true,
   CURRENT_TIMESTAMP,
   CURRENT_TIMESTAMP),

  ('r4444444-4444-4444-4444-444444444444',
   'Standard Documents',
   'Default routing for standard documents',
   '{"document_type": {"not_in": ["contract", "policy", "procedure", "budget", "financial"]}}',
   '11111111-1111-1111-1111-111111111111',
   1,
   true,
   CURRENT_TIMESTAMP,
   CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Sample Approval Requests (for testing)
-- ==========================================

-- Note: Replace document_id and user IDs with actual values from your database
-- These are template examples

/*
INSERT INTO approval_requests (id, document_id, chain_id, status, priority, deadline, assigned_to, current_step, metadata, created_at, updated_at)
VALUES
  ('e1111111-1111-1111-1111-111111111111',
   'doc-uuid-1', -- Replace with actual document ID
   '11111111-1111-1111-1111-111111111111',
   'pending',
   'high',
   CURRENT_TIMESTAMP + INTERVAL '3 days',
   ARRAY['user-uuid-1']::UUID[], -- Replace with actual user IDs
   1,
   '{"department": "Engineering", "value": 5000}',
   CURRENT_TIMESTAMP,
   CURRENT_TIMESTAMP),

  ('e2222222-2222-2222-2222-222222222222',
   'doc-uuid-2',
   '22222222-2222-2222-2222-222222222222',
   'in_progress',
   'critical',
   CURRENT_TIMESTAMP + INTERVAL '5 days',
   ARRAY['user-uuid-2', 'user-uuid-3']::UUID[],
   1,
   '{"department": "Legal", "value": 150000, "contract_type": "vendor"}',
   CURRENT_TIMESTAMP - INTERVAL '2 days',
   CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
*/

-- ==========================================
-- Indexes for Performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_priority ON approval_requests(priority);
CREATE INDEX IF NOT EXISTS idx_approval_requests_deadline ON approval_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_approval_requests_assigned_to ON approval_requests USING GIN(assigned_to);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON approval_actions(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_user_id ON approval_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_created_at ON approval_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_chain_steps_chain_id ON approval_chain_steps(chain_id);
CREATE INDEX IF NOT EXISTS idx_approval_chain_steps_step_number ON approval_chain_steps(chain_id, step_number);

CREATE INDEX IF NOT EXISTS idx_routing_rules_active ON routing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_routing_rules_priority ON routing_rules(priority DESC);

-- ==========================================
-- Success Message
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE 'Approval system seed data loaded successfully!';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 4 approval chains';
  RAISE NOTICE '  - 10 chain steps';
  RAISE NOTICE '  - 4 routing rules';
  RAISE NOTICE '  - Performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Update step approver_ids with actual user UUIDs from your database';
END $$;
