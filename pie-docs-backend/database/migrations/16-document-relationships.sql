-- ============================================
-- TASK-DB-002: Document Relationships Table
-- ============================================
-- Description: Create table for tracking document relationships
-- Priority: P0
-- Dependencies: TASK-DB-001
-- Estimated Time: 1 hour
-- ============================================

-- Create document relationships table
CREATE TABLE IF NOT EXISTS document_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Relationship type
    relationship_type VARCHAR(50) NOT NULL,
    -- Types: parent, child, reference, duplicate, version, related, supersedes, superseded_by

    -- Additional metadata about the relationship
    relationship_metadata JSONB DEFAULT '{}'::jsonb,

    -- For AI-detected relationships
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    detection_method VARCHAR(50), -- manual, ai_content, ai_metadata, ocr_similarity, filename_pattern

    -- Status
    is_verified BOOLEAN DEFAULT FALSE, -- Has a human verified this relationship?
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate relationships
    UNIQUE(source_document_id, target_document_id, relationship_type),

    -- Prevent self-referencing relationships
    CHECK (source_document_id != target_document_id)
);

-- Create indexes for performance
CREATE INDEX idx_doc_rel_source ON document_relationships(source_document_id);
CREATE INDEX idx_doc_rel_target ON document_relationships(target_document_id);
CREATE INDEX idx_doc_rel_type ON document_relationships(relationship_type);
CREATE INDEX idx_doc_rel_confidence ON document_relationships(confidence_score DESC);
CREATE INDEX idx_doc_rel_method ON document_relationships(detection_method);
CREATE INDEX idx_doc_rel_verified ON document_relationships(is_verified);
CREATE INDEX idx_doc_rel_metadata ON document_relationships USING GIN(relationship_metadata);

-- Create composite index for common queries
CREATE INDEX idx_doc_rel_source_type ON document_relationships(source_document_id, relationship_type);
CREATE INDEX idx_doc_rel_target_type ON document_relationships(target_document_id, relationship_type);

-- Add comments for documentation
COMMENT ON TABLE document_relationships IS 'Tracks relationships between documents (manual or AI-detected)';
COMMENT ON COLUMN document_relationships.source_document_id IS 'The document from which the relationship originates';
COMMENT ON COLUMN document_relationships.target_document_id IS 'The document to which the relationship points';
COMMENT ON COLUMN document_relationships.relationship_type IS 'Type of relationship: parent, child, reference, duplicate, version, related, supersedes, superseded_by';
COMMENT ON COLUMN document_relationships.confidence_score IS 'AI confidence score (0-100) for detected relationships';
COMMENT ON COLUMN document_relationships.detection_method IS 'How the relationship was detected: manual, ai_content, ai_metadata, ocr_similarity, filename_pattern';
COMMENT ON COLUMN document_relationships.is_verified IS 'Whether a human has verified this relationship';

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_relationship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_relationship_updated_at ON document_relationships;
CREATE TRIGGER trigger_update_relationship_updated_at
    BEFORE UPDATE ON document_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_relationship_updated_at();

-- Create view for bi-directional relationships
CREATE OR REPLACE VIEW document_relationships_bidirectional AS
SELECT
    id,
    source_document_id AS document_id,
    target_document_id AS related_document_id,
    relationship_type,
    'outgoing' AS direction,
    relationship_metadata,
    confidence_score,
    detection_method,
    is_verified,
    created_at
FROM document_relationships
UNION ALL
SELECT
    id,
    target_document_id AS document_id,
    source_document_id AS related_document_id,
    CASE relationship_type
        WHEN 'parent' THEN 'child'
        WHEN 'child' THEN 'parent'
        WHEN 'supersedes' THEN 'superseded_by'
        WHEN 'superseded_by' THEN 'supersedes'
        ELSE relationship_type
    END AS relationship_type,
    'incoming' AS direction,
    relationship_metadata,
    confidence_score,
    detection_method,
    is_verified,
    created_at
FROM document_relationships;

COMMENT ON VIEW document_relationships_bidirectional IS 'Bidirectional view of document relationships for easier querying';

-- Create helper function to get all related documents
CREATE OR REPLACE FUNCTION get_related_documents(
    p_document_id UUID,
    p_relationship_type VARCHAR(50) DEFAULT NULL,
    p_depth INTEGER DEFAULT 1
)
RETURNS TABLE (
    related_document_id UUID,
    relationship_type VARCHAR(50),
    relationship_path TEXT[],
    depth INTEGER,
    confidence_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE relationship_tree AS (
        -- Base case: direct relationships
        SELECT
            target_document_id AS related_document_id,
            r.relationship_type,
            ARRAY[source_document_id::TEXT, target_document_id::TEXT] AS relationship_path,
            1 AS depth,
            r.confidence_score
        FROM document_relationships r
        WHERE r.source_document_id = p_document_id
            AND (p_relationship_type IS NULL OR r.relationship_type = p_relationship_type)

        UNION ALL

        -- Recursive case: follow relationships
        SELECT
            r.target_document_id,
            r.relationship_type,
            rt.relationship_path || r.target_document_id::TEXT,
            rt.depth + 1,
            r.confidence_score
        FROM document_relationships r
        INNER JOIN relationship_tree rt ON r.source_document_id = rt.related_document_id
        WHERE rt.depth < p_depth
            AND NOT r.target_document_id = ANY(rt.relationship_path::UUID[]) -- Prevent cycles
            AND (p_relationship_type IS NULL OR r.relationship_type = p_relationship_type)
    )
    SELECT * FROM relationship_tree;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_related_documents IS 'Recursively find related documents up to specified depth';

-- ============================================
-- MIGRATION VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Verify table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'document_relationships'
    ) THEN
        RAISE EXCEPTION 'Migration failed: document_relationships table not created';
    END IF;

    -- Verify view exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'document_relationships_bidirectional'
    ) THEN
        RAISE EXCEPTION 'Migration failed: document_relationships_bidirectional view not created';
    END IF;

    -- Verify function exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'get_related_documents'
    ) THEN
        RAISE EXCEPTION 'Migration failed: get_related_documents function not created';
    END IF;

    RAISE NOTICE 'Migration successful: document_relationships table, view, and functions created';
END $$;
