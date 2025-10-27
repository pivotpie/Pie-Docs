-- ============================================
-- COMPREHENSIVE PIEDOCS DATABASE SCHEMA
-- Based on frontend analysis
-- ============================================

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(1000),
    role VARCHAR(50) DEFAULT 'user', -- user, manager, admin, super_admin
    department VARCHAR(100),
    job_title VARCHAR(100),

    -- Preferences
    preferences JSONB DEFAULT '{}'::jsonb,
    notification_settings JSONB DEFAULT '{}'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FOLDERS & CABINETS
-- ============================================

CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,

    -- Folder type
    folder_type VARCHAR(20) DEFAULT 'regular', -- regular, smart

    -- Smart folder criteria
    smart_criteria JSONB,
    auto_refresh BOOLEAN DEFAULT false,
    last_refreshed_at TIMESTAMP WITH TIME ZONE,

    -- Visual
    color VARCHAR(20),
    icon VARCHAR(100),

    -- Statistics
    document_count INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0,

    -- Permissions
    permissions JSONB DEFAULT '{}'::jsonb,

    -- Ownership
    owner_id UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS cabinets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR(500) NOT NULL,
    description TEXT,

    -- Mayan EDMS integration
    mayan_cabinet_id INTEGER,

    document_count INTEGER DEFAULT 0,
    permissions JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Link documents to cabinets (many-to-many)
CREATE TABLE IF NOT EXISTS cabinet_documents (
    cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cabinet_id, document_id)
);

-- ============================================
-- ENHANCED DOCUMENTS TABLE
-- ============================================

-- Add missing columns to existing documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name VARCHAR(500);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- TAGS
-- ============================================

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(20),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_tags (
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    added_by UUID REFERENCES users(id),
    PRIMARY KEY (document_id, tag_id)
);

-- ============================================
-- TASKS & COMMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Status and priority
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical

    -- Assignment
    assignee_id UUID REFERENCES users(id),
    assigned_by_id UUID REFERENCES users(id),

    -- Related entities
    document_id UUID REFERENCES documents(id),
    workflow_id UUID,
    workflow_step_id UUID,

    -- Time tracking
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    deadline TIMESTAMP WITH TIME ZONE,

    -- Tags
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000),
    file_type VARCHAR(100),
    file_size BIGINT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- APPROVAL WORKFLOWS
-- ============================================

CREATE TABLE IF NOT EXISTS approval_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Configuration
    is_active BOOLEAN DEFAULT true,
    document_types TEXT[],

    -- Ownership
    created_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_chain_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id UUID REFERENCES approval_chains(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,

    -- Approval configuration
    approver_ids UUID[] NOT NULL, -- Array of user IDs
    parallel_approval BOOLEAN DEFAULT false,
    consensus_type VARCHAR(20) DEFAULT 'unanimous', -- unanimous, majority, any
    timeout_days INTEGER DEFAULT 3,
    escalation_chain UUID[], -- Array of user IDs

    -- Conditions
    conditions JSONB DEFAULT '[]'::jsonb,
    is_optional BOOLEAN DEFAULT false,

    UNIQUE(chain_id, step_number)
);

CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id),
    chain_id UUID REFERENCES approval_chains(id),

    -- Request info
    requester_id UUID REFERENCES users(id),
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, escalated, changes_requested
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical

    -- Parallel approval
    parallel_approval_required BOOLEAN DEFAULT false,
    consensus_type VARCHAR(20) DEFAULT 'unanimous',
    assigned_to UUID[], -- Array of user IDs currently assigned

    -- Deadlines
    deadline TIMESTAMP WITH TIME ZONE,
    escalation_date TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS approval_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    -- Action details
    action VARCHAR(50) NOT NULL, -- approve, reject, request_changes, escalate
    comments TEXT,
    annotations JSONB DEFAULT '[]'::jsonb,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Rule configuration
    conditions JSONB NOT NULL,
    target_chain_id UUID REFERENCES approval_chains(id),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WORKFLOWS (Visual Workflow Designer)
-- ============================================

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Workflow configuration
    elements JSONB DEFAULT '[]'::jsonb,
    connections JSONB DEFAULT '[]'::jsonb,
    version INTEGER DEFAULT 1,

    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, active, archived

    -- Ownership
    created_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id),
    document_id UUID REFERENCES documents(id),

    -- Execution state
    current_step_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'running', -- running, completed, failed, paused
    execution_data JSONB DEFAULT '{}'::jsonb,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Error tracking
    error_message TEXT,
    error_stack TEXT
);

-- ============================================
-- WEBHOOKS & INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(1000) NOT NULL,

    -- Configuration
    events TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    secret VARCHAR(500),
    headers JSONB DEFAULT '{}'::jsonb,

    -- Statistics
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,

    -- Response
    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Success/failure
    success BOOLEAN,
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ANALYTICS
-- ============================================

-- Enhance existing search_history
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS was_successful BOOLEAN DEFAULT true;
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'basic';
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS clicked_document_id UUID REFERENCES documents(id);

CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id UUID NOT NULL,

    -- Session info
    search_sequence TEXT[],
    session_duration INTEGER, -- in seconds
    successful_queries INTEGER DEFAULT 0,
    failed_queries INTEGER DEFAULT 0,
    refinement_count INTEGER DEFAULT 0,
    abandonment_point VARCHAR(100),
    discovery_path TEXT[],

    -- User agent
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),

    -- Timestamp
    session_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS document_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    -- Access details
    access_type VARCHAR(50), -- view, download, edit, share
    duration_seconds INTEGER,

    -- Context
    session_id UUID,
    referrer VARCHAR(1000),

    -- Timestamp
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS popular_content (
    document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    access_count INTEGER DEFAULT 0,
    search_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- Trends
    trend_direction VARCHAR(10), -- up, down, stable
    trend_percentage DECIMAL(5, 2),

    last_accessed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PHYSICAL DOCUMENTS & BARCODES
-- ============================================

CREATE TABLE IF NOT EXISTS barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(255) UNIQUE NOT NULL,
    format VARCHAR(50) NOT NULL, -- QR, CODE128, EAN13, etc.

    -- Links
    document_id UUID REFERENCES documents(id),
    asset_id UUID, -- Can link to physical assets
    location_id UUID,

    -- Status
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    checksum VARCHAR(64),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS physical_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    digital_document_id UUID REFERENCES documents(id),
    barcode_id UUID REFERENCES barcodes(id),

    -- Location
    location_id UUID,
    shelf_location VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'available', -- available, checked_out, missing, damaged
    last_seen_at TIMESTAMP WITH TIME ZONE,

    -- Notes
    notes TEXT,
    condition VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location_type VARCHAR(50), -- shelf, cabinet, room, building
    parent_id UUID REFERENCES storage_locations(id),
    barcode_id UUID REFERENCES barcodes(id),

    -- Capacity
    capacity INTEGER,
    current_items INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS label_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Template configuration
    dimensions JSONB NOT NULL,
    elements JSONB DEFAULT '[]'::jsonb,

    is_default BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES label_templates(id),

    -- Job details
    barcode_ids UUID[],
    printer_name VARCHAR(255),
    copies INTEGER DEFAULT 1,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, printing, completed, failed
    progress INTEGER DEFAULT 0,
    error_message TEXT,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- DASHBOARD CONFIGURATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Configuration
    layout JSONB NOT NULL,
    widgets JSONB DEFAULT '[]'::jsonb,

    is_default BOOLEAN DEFAULT false,
    is_shared BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- METADATA SCHEMAS
-- ============================================

CREATE TABLE IF NOT EXISTS metadata_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Schema definition
    document_types TEXT[],
    fields JSONB NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,

    -- Ownership
    created_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Notification details
    title VARCHAR(500) NOT NULL,
    message TEXT,
    notification_type VARCHAR(50), -- info, warning, error, success

    -- Actions
    action_url VARCHAR(1000),
    action_label VARCHAR(100),

    -- Related entities
    related_document_id UUID REFERENCES documents(id),
    related_task_id UUID REFERENCES tasks(id),
    related_approval_id UUID REFERENCES approval_requests(id),

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),

    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,

    -- Changes
    old_values JSONB,
    new_values JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE documents IS 'Enhanced documents table with folder organization and full metadata';
COMMENT ON TABLE folders IS 'Document folders including smart folders with dynamic criteria';
COMMENT ON TABLE tasks IS 'Task management with time tracking and assignments';
COMMENT ON TABLE approval_requests IS 'Document approval workflow requests';
COMMENT ON TABLE approval_chains IS 'Approval workflow definitions';
COMMENT ON TABLE workflows IS 'Visual workflow designer configurations';
COMMENT ON TABLE barcodes IS 'Barcode management for physical document tracking';
COMMENT ON TABLE physical_documents IS 'Physical document locations and status';
COMMENT ON TABLE user_analytics IS 'User behavior and session analytics';
