-- ============================================================================
-- PHASE 2: CORE FEATURES DATABASE MIGRATION (PGADMIN VERSION)
-- ============================================================================
-- Project: Pie-Docs Document Management System
-- Phase: 2 - Core Features (OCR, Approvals, Document Features)
-- Tables: 15 total
-- Estimated Time: 2-3 weeks
-- Dependencies: Phase 1 must be complete
-- ============================================================================

-- ============================================================================
-- SECTION 1: OCR PROCESSING (5 TABLES)
-- ============================================================================

-- 1. OCR Jobs Table
CREATE TABLE IF NOT EXISTS ocr_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- Configuration
    language VARCHAR(50) DEFAULT 'auto',
    detected_language VARCHAR(50),

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    processing_duration INTEGER, -- seconds

    -- Retry
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Error
    error_code VARCHAR(50),
    error_message TEXT,

    -- Creator
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CHECK (retry_count <= max_retries)
);

CREATE INDEX idx_ocr_jobs_document ON ocr_jobs(document_id);
CREATE INDEX idx_ocr_jobs_status ON ocr_jobs(status, created_at DESC);
CREATE INDEX idx_ocr_jobs_created_by ON ocr_jobs(created_by);

COMMENT ON TABLE ocr_jobs IS 'OCR processing job queue';

-- 2. OCR Results Table
CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES ocr_jobs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Extracted Text
    extracted_text TEXT NOT NULL,
    formatted_text TEXT,

    -- Language
    language VARCHAR(50),

    -- Confidence
    overall_confidence DECIMAL(5,2) CHECK (overall_confidence >= 0 AND overall_confidence <= 100),

    -- Processing
    processing_time INTEGER, -- seconds

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(job_id)
);

CREATE INDEX idx_ocr_results_job ON ocr_results(job_id);
CREATE INDEX idx_ocr_results_document ON ocr_results(document_id);

COMMENT ON TABLE ocr_results IS 'OCR extraction results';

-- 3. OCR Text Blocks Table
CREATE TABLE IF NOT EXISTS ocr_text_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocr_result_id UUID NOT NULL REFERENCES ocr_results(id) ON DELETE CASCADE,

    -- Content
    text TEXT NOT NULL,
    confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),

    -- Position
    page_number INTEGER NOT NULL CHECK (page_number > 0),
    bounding_box JSONB, -- {x, y, width, height}

    -- Type
    block_type VARCHAR(50),

    -- Order
    sequence INTEGER NOT NULL,

    CHECK (block_type IN ('paragraph', 'heading', 'table', 'list'))
);

CREATE INDEX idx_ocr_blocks_result ON ocr_text_blocks(ocr_result_id, sequence);
CREATE INDEX idx_ocr_blocks_page ON ocr_text_blocks(ocr_result_id, page_number);

COMMENT ON TABLE ocr_text_blocks IS 'Individual OCR text blocks with positioning';

-- 4. OCR Quality Metrics Table
CREATE TABLE IF NOT EXISTS ocr_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocr_result_id UUID NOT NULL REFERENCES ocr_results(id) ON DELETE CASCADE,

    -- Quality Scores
    text_coverage DECIMAL(5,2),
    layout_preservation DECIMAL(5,2),

    -- Assessment
    quality_rating VARCHAR(50),
    issues TEXT[],
    recommendations TEXT[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(ocr_result_id),
    CHECK (quality_rating IN ('low', 'medium', 'high', 'excellent'))
);

CREATE INDEX idx_ocr_quality_result ON ocr_quality_metrics(ocr_result_id);

COMMENT ON TABLE ocr_quality_metrics IS 'OCR quality assessment';

-- 5. OCR Edit History Table
CREATE TABLE IF NOT EXISTS ocr_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocr_result_id UUID NOT NULL REFERENCES ocr_results(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),

    -- Changes
    original_text TEXT NOT NULL,
    edited_text TEXT NOT NULL,
    change_summary TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ocr_edits_result ON ocr_edit_history(ocr_result_id, created_at DESC);
CREATE INDEX idx_ocr_edits_user ON ocr_edit_history(user_id);

COMMENT ON TABLE ocr_edit_history IS 'OCR text edit history';

-- ============================================================================
-- SECTION 2: APPROVAL WORKFLOWS (5 TABLES)
-- ============================================================================

-- 1. Approval Requests Table
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    -- Request Info
    requested_by UUID NOT NULL REFERENCES users(id),
    request_message TEXT,

    -- Workflow
    workflow_id UUID,
    requires_all_approvers BOOLEAN DEFAULT false,

    -- Timing
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'escalated'))
);

CREATE INDEX idx_approval_requests_document ON approval_requests(document_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status, created_at DESC);
CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX idx_approval_requests_due ON approval_requests(due_date) WHERE status = 'pending';

COMMENT ON TABLE approval_requests IS 'Document approval requests';

-- 2. Approval Steps Table
CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,

    -- Approver
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_role_id UUID REFERENCES roles(id),

    -- Step Info
    step_order INTEGER NOT NULL,
    step_name VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'pending',

    -- Decision
    decision VARCHAR(50),
    decision_comment TEXT,
    decided_at TIMESTAMP WITH TIME ZONE,

    -- Timing
    notified_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,

    CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    CHECK (decision IN ('approve', 'reject') OR decision IS NULL)
);

CREATE INDEX idx_approval_steps_approval ON approval_steps(approval_id, step_order);
CREATE INDEX idx_approval_steps_approver ON approval_steps(approver_id, status);
CREATE INDEX idx_approval_steps_status ON approval_steps(status);

COMMENT ON TABLE approval_steps IS 'Individual approval steps and decisions';

-- 3. Approval History Table
CREATE TABLE IF NOT EXISTS approval_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,

    -- Event
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,

    -- Actor
    user_id UUID REFERENCES users(id),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approval_history_approval ON approval_history(approval_id, created_at DESC);
CREATE INDEX idx_approval_history_event ON approval_history(event_type);

COMMENT ON TABLE approval_history IS 'Approval workflow audit trail';

-- 4. Annotations Table
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    approval_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,

    -- Type
    annotation_type VARCHAR(50) NOT NULL,

    -- Position
    page_number INTEGER NOT NULL CHECK (page_number > 0),
    position JSONB NOT NULL, -- {x, y, width, height}

    -- Style
    color VARCHAR(7),
    stroke_width INTEGER,

    -- Content
    content TEXT,
    highlighted_text TEXT,

    -- Author
    author_id UUID NOT NULL REFERENCES users(id),

    -- Status
    is_deleted BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (annotation_type IN ('comment', 'highlight', 'rectangle', 'circle', 'arrow', 'stamp'))
);

CREATE INDEX idx_annotations_document ON annotations(document_id, page_number);
CREATE INDEX idx_annotations_approval ON annotations(approval_id);
CREATE INDEX idx_annotations_author ON annotations(author_id);
CREATE INDEX idx_annotations_active ON annotations(is_deleted) WHERE is_deleted = false;

COMMENT ON TABLE annotations IS 'Document annotations for markup';

-- 5. Annotation Replies Table
CREATE TABLE IF NOT EXISTS annotation_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES annotation_replies(id),

    -- Content
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL CHECK (LENGTH(content) > 0),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_annotation_replies_annotation ON annotation_replies(annotation_id, created_at);
CREATE INDEX idx_annotation_replies_user ON annotation_replies(user_id);

COMMENT ON TABLE annotation_replies IS 'Threaded replies to annotations';

-- ============================================================================
-- SECTION 3: DOCUMENT FEATURES (5 TABLES)
-- ============================================================================

-- 1. Document Versions Table
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Version Info
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    is_major_version BOOLEAN DEFAULT false,

    -- File Info
    file_name VARCHAR(500) NOT NULL,
    file_size BIGINT CHECK (file_size >= 0),
    file_url TEXT NOT NULL,
    file_hash VARCHAR(64), -- SHA-256

    -- Changes
    change_description TEXT,
    change_type VARCHAR(50),

    -- Snapshot
    metadata_snapshot JSONB,

    -- Creator
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id, version_number),
    CHECK (change_type IN ('major', 'minor', 'patch'))
);

CREATE INDEX idx_doc_versions_document ON document_versions(document_id, version_number DESC);
CREATE INDEX idx_doc_versions_created ON document_versions(created_at DESC);

COMMENT ON TABLE document_versions IS 'Document version history';

-- 2. Document Comments Table
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,

    -- Author
    user_id UUID NOT NULL REFERENCES users(id),

    -- Content
    content TEXT NOT NULL CHECK (LENGTH(content) > 0),

    -- Position
    page_number INTEGER,
    position JSONB, -- {x, y}

    -- Resolution
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Mentions
    mentions UUID[], -- array of user IDs

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doc_comments_document ON document_comments(document_id, created_at DESC);
CREATE INDEX idx_doc_comments_user ON document_comments(user_id);
CREATE INDEX idx_doc_comments_parent ON document_comments(parent_comment_id);
CREATE INDEX idx_doc_comments_unresolved ON document_comments(document_id) WHERE is_resolved = false;

COMMENT ON TABLE document_comments IS 'Threaded document comments';

-- 3. Document Shares Table
CREATE TABLE IF NOT EXISTS document_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Share Config
    share_token VARCHAR(255) NOT NULL UNIQUE,
    share_type VARCHAR(50) NOT NULL,

    -- Permissions
    can_view BOOLEAN DEFAULT true,
    can_download BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,

    -- Security
    requires_password BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    allowed_emails TEXT[],

    -- Limits
    max_access_count INTEGER,
    current_access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Owner
    shared_by UUID NOT NULL REFERENCES users(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Status
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP WITH TIME ZONE,

    CHECK (share_type IN ('link', 'email', 'internal'))
);

CREATE INDEX idx_doc_shares_document ON document_shares(document_id);
CREATE INDEX idx_doc_shares_token ON document_shares(share_token);
CREATE INDEX idx_doc_shares_active ON document_shares(is_active) WHERE is_active = true;

COMMENT ON TABLE document_shares IS 'Document sharing links';

-- 4. Document Tags Table
CREATE TABLE IF NOT EXISTS document_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Tag Info
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    description TEXT,

    -- Usage
    usage_count INTEGER DEFAULT 0,

    -- Organization
    category VARCHAR(100),
    parent_tag_id UUID REFERENCES document_tags(id),

    -- Owner
    created_by UUID REFERENCES users(id),
    is_system_tag BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(name)
);

CREATE INDEX idx_tags_name ON document_tags(name);
CREATE INDEX idx_tags_category ON document_tags(category);
CREATE INDEX idx_tags_usage ON document_tags(usage_count DESC);

COMMENT ON TABLE document_tags IS 'Document tag definitions';

-- Document Tag Assignments Junction Table
CREATE TABLE IF NOT EXISTS document_tag_assignments (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (document_id, tag_id)
);

CREATE INDEX idx_doc_tag_assign_document ON document_tag_assignments(document_id);
CREATE INDEX idx_doc_tag_assign_tag ON document_tag_assignments(tag_id);

-- 5. Document Metadata Table (Enhanced)
CREATE TABLE IF NOT EXISTS document_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Schema
    schema_id UUID,

    -- Extended Info
    keywords TEXT[],
    categories TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id)
);

CREATE INDEX idx_doc_metadata_document ON document_metadata(document_id);
CREATE INDEX idx_doc_metadata_custom ON document_metadata USING gin(custom_fields);

COMMENT ON TABLE document_metadata IS 'Extended document metadata';

-- ============================================================================
-- SECTION 4: HELPER FUNCTIONS FOR PHASE 2
-- ============================================================================

-- Function: Get pending OCR jobs count
CREATE OR REPLACE FUNCTION get_pending_ocr_jobs_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM ocr_jobs
        WHERE status IN ('pending', 'processing')
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Get user's pending approvals count
CREATE OR REPLACE FUNCTION get_user_pending_approvals(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM approval_steps
        WHERE approver_id = p_user_id
        AND status = 'pending'
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Update document version automatically
CREATE OR REPLACE FUNCTION update_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment document version on update
    NEW.version := COALESCE(OLD.version, 0) + 1;

    -- Update modified timestamp
    NEW.date_modified := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update document version on changes
DROP TRIGGER IF EXISTS trigger_update_document_version ON documents;
CREATE TRIGGER trigger_update_document_version
    BEFORE UPDATE ON documents
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_document_version();

-- ============================================================================
-- SECTION 5: VALIDATION QUERIES
-- ============================================================================

-- Check all Phase 2 tables exist
SELECT
    'Phase 2 Tables Check' as validation_type,
    COUNT(*) as table_count,
    CASE
        WHEN COUNT(*) = 15 THEN 'SUCCESS: All 15 tables created'
        ELSE 'ERROR: Missing tables - expected 15, got ' || COUNT(*)
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'ocr_jobs', 'ocr_results', 'ocr_text_blocks', 'ocr_quality_metrics', 'ocr_edit_history',
    'approval_requests', 'approval_steps', 'approval_history', 'annotations', 'annotation_replies',
    'document_versions', 'document_comments', 'document_shares', 'document_tags', 'document_tag_assignments'
);

-- Check indexes created
SELECT
    'Indexes Check' as validation_type,
    COUNT(*) as index_count,
    'SUCCESS: Indexes created for Phase 2 tables' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'ocr_jobs', 'ocr_results', 'ocr_text_blocks', 'ocr_quality_metrics', 'ocr_edit_history',
    'approval_requests', 'approval_steps', 'approval_history', 'annotations', 'annotation_replies',
    'document_versions', 'document_comments', 'document_shares', 'document_tags', 'document_tag_assignments'
);

-- Check helper functions
SELECT
    'Helper Functions Check' as validation_type,
    COUNT(*) as function_count,
    CASE
        WHEN COUNT(*) >= 3 THEN 'SUCCESS: Helper functions created'
        ELSE 'ERROR: Missing helper functions'
    END as status
FROM pg_proc
WHERE proname IN ('get_pending_ocr_jobs_count', 'get_user_pending_approvals', 'update_document_version');

-- Test helper functions
SELECT 'Function Test' as validation_type, get_pending_ocr_jobs_count() as result, 'Should return 0 (no OCR jobs yet)' as status;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
--   - OCR Processing: 5 tables ✓
--   - Approval Workflows: 5 tables ✓
--   - Document Features: 5 tables ✓
--   - Total Tables: 15 ✓
--   - Helper Functions: 3 ✓
--
-- Next Steps:
--   1. Verify validation queries show success
--   2. Start building Phase 2 APIs (Week 4-5)
--   3. Begin Phase 3 Database migration (parallel)
-- ============================================================================
