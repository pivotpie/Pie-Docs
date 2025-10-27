-- ============================================================================
-- PHASE 2: CREATE MISSING TABLES ONLY (FIXED TRIGGER)
-- ============================================================================
-- Project: Pie-Docs Document Management System
-- This migration creates ONLY the missing Phase 2 tables
-- Does NOT modify existing approval_requests, document_tags, or tags tables
-- ============================================================================

-- ============================================================================
-- SECTION 1: OCR PROCESSING (5 TABLES) - ALL MISSING
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
-- SECTION 2: ANNOTATIONS (2 TABLES) - MISSING
-- ============================================================================

-- Note: Using existing approval_requests table (with chain_id design)
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
-- SECTION 3: DOCUMENT FEATURES (4 TABLES) - MISSING
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

-- 4. Document Metadata Table (Enhanced)
-- Note: Using existing tags table instead of creating document_tags
CREATE TABLE IF NOT EXISTS document_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    schema_id UUID REFERENCES metadata_schemas(id),
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
-- SECTION 4: HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_ocr_jobs_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*)::INTEGER FROM ocr_jobs WHERE status IN ('pending', 'processing'));
END;
$$ LANGUAGE plpgsql;

-- Fixed trigger function - only update version when content changes
CREATE OR REPLACE FUNCTION update_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment version if actual content changed (not metadata, timestamps, etc)
    IF (OLD.content IS DISTINCT FROM NEW.content OR
        OLD.file_path IS DISTINCT FROM NEW.file_path OR
        OLD.file_size IS DISTINCT FROM NEW.file_size) THEN
        NEW.version := COALESCE(OLD.version, 0) + 1;
    END IF;

    -- Always update modified timestamp
    NEW.modified_at := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger without WHEN clause (avoid generated column issue)
DROP TRIGGER IF EXISTS trigger_update_document_version ON documents;
CREATE TRIGGER trigger_update_document_version
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_version();

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

SELECT
    'Phase 2 Missing Tables Created' as validation_type,
    COUNT(*) as table_count,
    CASE
        WHEN COUNT(*) = 11 THEN 'SUCCESS: All 11 missing tables created'
        ELSE 'PARTIAL: Expected 11, got ' || COUNT(*) || ' tables'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'ocr_jobs', 'ocr_results', 'ocr_text_blocks', 'ocr_quality_metrics', 'ocr_edit_history',
    'annotations', 'annotation_replies',
    'document_versions', 'document_comments', 'document_shares', 'document_metadata'
);

SELECT
    'Helper Functions Check' as validation_type,
    COUNT(*) as function_count,
    CASE
        WHEN COUNT(*) >= 2 THEN 'SUCCESS: Helper functions created'
        ELSE 'WARNING: Missing helper functions'
    END as status
FROM pg_proc
WHERE proname IN ('get_pending_ocr_jobs_count', 'update_document_version');

SELECT 'Pending OCR Jobs' as info, get_pending_ocr_jobs_count() as count;

-- Show what we already have
SELECT
    'Existing Approval System' as info,
    'approval_requests, approval_chains, approval_chain_steps, approval_actions' as tables,
    'Using existing approval_requests for annotations' as note;

SELECT
    'Existing Tags System' as info,
    'tags (tag definitions), document_tags (junction)' as tables,
    'Using existing tags and document_tags tables' as note;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
--   OCR Processing: 5 tables ✓
--   Annotations: 2 tables ✓
--   Document Features: 4 tables ✓
--   Total NEW tables: 11 ✓
--   Helper Functions: 2 ✓
--   Trigger: Fixed (no generated column issue) ✓
--
-- Existing tables reused:
--   - approval_requests (with chain_id design)
--   - tags (tag definitions)
--   - document_tags (document-tag junction)
--
-- Next: Start Phase 1 API development
-- ============================================================================
