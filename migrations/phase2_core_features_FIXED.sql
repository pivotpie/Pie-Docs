-- ============================================================================
-- PHASE 2: CORE FEATURES DATABASE MIGRATION (SCHEMA FIX VERSION)
-- ============================================================================
-- Project: Pie-Docs Document Management System
-- Phase: 2 - Core Features (OCR, Approvals, Document Features)
-- Tables: 15 total
-- This version fixes existing incomplete schemas and adds missing columns
-- ============================================================================

-- ============================================================================
-- SECTION 1: OCR PROCESSING (5 TABLES)
-- ============================================================================

-- 1. OCR Jobs Table
CREATE TABLE IF NOT EXISTS ocr_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    language VARCHAR(50) DEFAULT 'auto',
    detected_language VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    processing_duration INTEGER,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_code VARCHAR(50),
    error_message TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CHECK (retry_count <= max_retries)
);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_document ON ocr_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status ON ocr_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_created_by ON ocr_jobs(created_by);

COMMENT ON TABLE ocr_jobs IS 'OCR processing job queue';

-- 2. OCR Results Table
CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES ocr_jobs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    extracted_text TEXT NOT NULL,
    formatted_text TEXT,
    language VARCHAR(50),
    overall_confidence DECIMAL(5,2) CHECK (overall_confidence >= 0 AND overall_confidence <= 100),
    processing_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id)
);

CREATE INDEX IF NOT EXISTS idx_ocr_results_job ON ocr_results(job_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_document ON ocr_results(document_id);

COMMENT ON TABLE ocr_results IS 'OCR extraction results';

-- 3. OCR Text Blocks Table
CREATE TABLE IF NOT EXISTS ocr_text_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocr_result_id UUID NOT NULL REFERENCES ocr_results(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    page_number INTEGER NOT NULL CHECK (page_number > 0),
    bounding_box JSONB,
    block_type VARCHAR(50),
    sequence INTEGER NOT NULL,
    CHECK (block_type IN ('paragraph', 'heading', 'table', 'list'))
);

CREATE INDEX IF NOT EXISTS idx_ocr_blocks_result ON ocr_text_blocks(ocr_result_id, sequence);
CREATE INDEX IF NOT EXISTS idx_ocr_blocks_page ON ocr_text_blocks(ocr_result_id, page_number);

COMMENT ON TABLE ocr_text_blocks IS 'Individual OCR text blocks with positioning';

-- 4. OCR Quality Metrics Table
CREATE TABLE IF NOT EXISTS ocr_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocr_result_id UUID NOT NULL REFERENCES ocr_results(id) ON DELETE CASCADE,
    text_coverage DECIMAL(5,2),
    layout_preservation DECIMAL(5,2),
    quality_rating VARCHAR(50),
    issues TEXT[],
    recommendations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ocr_result_id),
    CHECK (quality_rating IN ('low', 'medium', 'high', 'excellent'))
);

CREATE INDEX IF NOT EXISTS idx_ocr_quality_result ON ocr_quality_metrics(ocr_result_id);

COMMENT ON TABLE ocr_quality_metrics IS 'OCR quality assessment';

-- 5. OCR Edit History Table
CREATE TABLE IF NOT EXISTS ocr_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocr_result_id UUID NOT NULL REFERENCES ocr_results(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    original_text TEXT NOT NULL,
    edited_text TEXT NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ocr_edits_result ON ocr_edit_history(ocr_result_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_edits_user ON ocr_edit_history(user_id);

COMMENT ON TABLE ocr_edit_history IS 'OCR text edit history';

-- ============================================================================
-- SECTION 2: APPROVAL WORKFLOWS (5 TABLES)
-- ============================================================================

-- Fix existing approval_requests table by adding missing columns
DO $$
BEGIN
    -- Add requested_by if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='approval_requests' AND column_name='requested_by') THEN
        ALTER TABLE approval_requests ADD COLUMN requested_by UUID REFERENCES users(id);
    END IF;

    -- Add request_message if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='approval_requests' AND column_name='request_message') THEN
        ALTER TABLE approval_requests ADD COLUMN request_message TEXT;
    END IF;

    -- Add workflow_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='approval_requests' AND column_name='workflow_id') THEN
        ALTER TABLE approval_requests ADD COLUMN workflow_id UUID;
    END IF;

    -- Add requires_all_approvers if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='approval_requests' AND column_name='requires_all_approvers') THEN
        ALTER TABLE approval_requests ADD COLUMN requires_all_approvers BOOLEAN DEFAULT false;
    END IF;

    -- Add due_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='approval_requests' AND column_name='due_date') THEN
        ALTER TABLE approval_requests ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add completed_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='approval_requests' AND column_name='completed_at') THEN
        ALTER TABLE approval_requests ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='approval_requests' AND column_name='updated_at') THEN
        ALTER TABLE approval_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create approval_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    requested_by UUID REFERENCES users(id),
    request_message TEXT,
    workflow_id UUID,
    requires_all_approvers BOOLEAN DEFAULT false,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'escalated'))
);

-- Now safe to create indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_document ON approval_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status, created_at DESC);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='approval_requests' AND column_name='requested_by') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_approval_requests_requested_by') THEN
            CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_approval_requests_due') THEN
        CREATE INDEX idx_approval_requests_due ON approval_requests(due_date) WHERE status = 'pending';
    END IF;
END $$;

COMMENT ON TABLE approval_requests IS 'Document approval requests';

-- 2. Approval Steps Table
CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_role_id UUID REFERENCES roles(id),
    step_order INTEGER NOT NULL,
    step_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    decision VARCHAR(50),
    decision_comment TEXT,
    decided_at TIMESTAMP WITH TIME ZONE,
    notified_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    CHECK (decision IN ('approve', 'reject') OR decision IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_approval ON approval_steps(approval_id, step_order);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver ON approval_steps(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_status ON approval_steps(status);

COMMENT ON TABLE approval_steps IS 'Individual approval steps and decisions';

-- 3. Approval History Table
CREATE TABLE IF NOT EXISTS approval_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    user_id UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_history_approval ON approval_history(approval_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_history_event ON approval_history(event_type);

COMMENT ON TABLE approval_history IS 'Approval workflow audit trail';

-- 4. Annotations Table
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    approval_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
    annotation_type VARCHAR(50) NOT NULL,
    page_number INTEGER NOT NULL CHECK (page_number > 0),
    position JSONB NOT NULL,
    color VARCHAR(7),
    stroke_width INTEGER,
    content TEXT,
    highlighted_text TEXT,
    author_id UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (annotation_type IN ('comment', 'highlight', 'rectangle', 'circle', 'arrow', 'stamp'))
);

CREATE INDEX IF NOT EXISTS idx_annotations_document ON annotations(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_annotations_approval ON annotations(approval_id);
CREATE INDEX IF NOT EXISTS idx_annotations_author ON annotations(author_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_annotations_active') THEN
        CREATE INDEX idx_annotations_active ON annotations(is_deleted) WHERE is_deleted = false;
    END IF;
END $$;

COMMENT ON TABLE annotations IS 'Document annotations for markup';

-- 5. Annotation Replies Table
CREATE TABLE IF NOT EXISTS annotation_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES annotation_replies(id),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL CHECK (LENGTH(content) > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_annotation_replies_annotation ON annotation_replies(annotation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_annotation_replies_user ON annotation_replies(user_id);

COMMENT ON TABLE annotation_replies IS 'Threaded replies to annotations';

-- ============================================================================
-- SECTION 3: DOCUMENT FEATURES (5 TABLES)
-- ============================================================================

-- 1. Document Versions Table
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    is_major_version BOOLEAN DEFAULT false,
    file_name VARCHAR(500) NOT NULL,
    file_size BIGINT CHECK (file_size >= 0),
    file_url TEXT NOT NULL,
    file_hash VARCHAR(64),
    change_description TEXT,
    change_type VARCHAR(50),
    metadata_snapshot JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, version_number),
    CHECK (change_type IN ('major', 'minor', 'patch'))
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON document_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_doc_versions_created ON document_versions(created_at DESC);

COMMENT ON TABLE document_versions IS 'Document version history';

-- 2. Document Comments Table
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL CHECK (LENGTH(content) > 0),
    page_number INTEGER,
    position JSONB,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    mentions UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_comments_document ON document_comments(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_comments_user ON document_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_comments_parent ON document_comments(parent_comment_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doc_comments_unresolved') THEN
        CREATE INDEX idx_doc_comments_unresolved ON document_comments(document_id) WHERE is_resolved = false;
    END IF;
END $$;

COMMENT ON TABLE document_comments IS 'Threaded document comments';

-- 3. Document Shares Table
CREATE TABLE IF NOT EXISTS document_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    share_token VARCHAR(255) NOT NULL UNIQUE,
    share_type VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT true,
    can_download BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    requires_password BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    allowed_emails TEXT[],
    max_access_count INTEGER,
    current_access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    shared_by UUID NOT NULL REFERENCES users(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP WITH TIME ZONE,
    CHECK (share_type IN ('link', 'email', 'internal'))
);

CREATE INDEX IF NOT EXISTS idx_doc_shares_document ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_shares_token ON document_shares(share_token);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doc_shares_active') THEN
        CREATE INDEX idx_doc_shares_active ON document_shares(is_active) WHERE is_active = true;
    END IF;
END $$;

COMMENT ON TABLE document_shares IS 'Document sharing links';

-- 4. Document Tags Table
CREATE TABLE IF NOT EXISTS document_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    category VARCHAR(100),
    parent_tag_id UUID REFERENCES document_tags(id),
    created_by UUID REFERENCES users(id),
    is_system_tag BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON document_tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON document_tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON document_tags(usage_count DESC);

COMMENT ON TABLE document_tags IS 'Document tag definitions';

-- Document Tag Assignments Junction Table
CREATE TABLE IF NOT EXISTS document_tag_assignments (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_tag_assign_document ON document_tag_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_tag_assign_tag ON document_tag_assignments(tag_id);

-- 5. Document Metadata Table
CREATE TABLE IF NOT EXISTS document_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    schema_id UUID,
    keywords TEXT[],
    categories TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_metadata_document ON document_metadata(document_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doc_metadata_custom') THEN
        CREATE INDEX idx_doc_metadata_custom ON document_metadata USING gin(custom_fields);
    END IF;
END $$;

COMMENT ON TABLE document_metadata IS 'Extended document metadata';

-- ============================================================================
-- SECTION 4: HELPER FUNCTIONS FOR PHASE 2
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_ocr_jobs_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*)::INTEGER FROM ocr_jobs WHERE status IN ('pending', 'processing'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_pending_approvals(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*)::INTEGER FROM approval_steps WHERE approver_id = p_user_id AND status = 'pending');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_document_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version := COALESCE(OLD.version, 0) + 1;
    NEW.date_modified := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_document_version ON documents;
CREATE TRIGGER trigger_update_document_version
    BEFORE UPDATE ON documents
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_document_version();

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

SELECT
    'Phase 2 Tables Check' as validation_type,
    COUNT(*) as table_count,
    CASE
        WHEN COUNT(*) = 15 THEN 'SUCCESS: All 15 tables created'
        ELSE 'WARNING: Expected 15, got ' || COUNT(*) || ' tables'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'ocr_jobs', 'ocr_results', 'ocr_text_blocks', 'ocr_quality_metrics', 'ocr_edit_history',
    'approval_requests', 'approval_steps', 'approval_history', 'annotations', 'annotation_replies',
    'document_versions', 'document_comments', 'document_shares', 'document_tags', 'document_tag_assignments'
);

SELECT
    'Helper Functions Check' as validation_type,
    COUNT(*) as function_count,
    CASE
        WHEN COUNT(*) >= 3 THEN 'SUCCESS: Helper functions created'
        ELSE 'WARNING: Missing helper functions'
    END as status
FROM pg_proc
WHERE proname IN ('get_pending_ocr_jobs_count', 'get_user_pending_approvals', 'update_document_version');

SELECT 'Function Test' as validation_type, get_pending_ocr_jobs_count() as result, 'Pending OCR jobs count' as status;

-- Show approval_requests schema
SELECT
    'Approval Requests Schema' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'approval_requests'
ORDER BY ordinal_position;
