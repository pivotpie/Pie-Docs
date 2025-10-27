-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Folders
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders USING gin(path gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_folders_owner_id ON folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_folders_type ON folders(folder_type);

-- Documents (additional indexes)
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm ON documents USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_keywords ON documents USING gin(keywords);

-- Cabinets
CREATE INDEX IF NOT EXISTS idx_cabinets_mayan_id ON cabinets(mayan_cabinet_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_documents_doc ON cabinet_documents(document_id);

-- Tags
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag_id ON document_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_added_by ON document_tags(added_by);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_document_id ON tasks(document_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- Approval Workflows
CREATE INDEX IF NOT EXISTS idx_approval_chains_active ON approval_chains(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_approval_chain_steps_chain ON approval_chain_steps(chain_id, step_number);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_doc ON approval_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_chain ON approval_requests(chain_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_deadline ON approval_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_approval_requests_assigned ON approval_requests USING gin(assigned_to);
CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON approval_actions(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_user ON approval_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_active ON routing_rules(is_active, priority DESC) WHERE is_active = true;

-- Workflows
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_document ON workflow_executions(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- Webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id, created_at DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_search_history_session ON search_history(session_id);
CREATE INDEX IF NOT EXISTS idx_search_history_source ON search_history(source);
CREATE INDEX IF NOT EXISTS idx_search_history_success ON search_history(was_successful);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user ON user_analytics(user_id, session_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_session ON user_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_doc ON document_access_log(document_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_log_user ON document_access_log(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_popular_content_access ON popular_content(access_count DESC);

-- Physical Documents
CREATE INDEX IF NOT EXISTS idx_barcodes_code ON barcodes(code);
CREATE INDEX IF NOT EXISTS idx_barcodes_document ON barcodes(document_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_active ON barcodes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_physical_docs_digital ON physical_documents(digital_document_id);
CREATE INDEX IF NOT EXISTS idx_physical_docs_barcode ON physical_documents(barcode_id);
CREATE INDEX IF NOT EXISTS idx_physical_docs_location ON physical_documents(location_id);
CREATE INDEX IF NOT EXISTS idx_physical_docs_status ON physical_documents(status);
CREATE INDEX IF NOT EXISTS idx_storage_locations_parent ON storage_locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created_by ON print_jobs(created_by);

-- Dashboard
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user ON dashboard_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_shared ON dashboard_configs(is_shared) WHERE is_shared = true;

-- Metadata Schemas
CREATE INDEX IF NOT EXISTS idx_metadata_schemas_active ON metadata_schemas(is_active) WHERE is_active = true;

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_folder_status ON documents(folder_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status, deadline);
CREATE INDEX IF NOT EXISTS idx_approval_req_user_status ON approval_requests(requester_id, status, created_at DESC);
