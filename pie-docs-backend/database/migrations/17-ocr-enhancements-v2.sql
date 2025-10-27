-- ============================================
-- TASK-DB-003: Enhanced OCR Results Table
-- ============================================
-- Description: Create comprehensive OCR results tracking
-- Priority: P0
-- Dependencies: TASK-DB-001
-- Estimated Time: 1.5 hours
-- ============================================

-- Create enhanced OCR results table
CREATE TABLE IF NOT EXISTS document_ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- OCR Processing Info
    job_id VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'pending',
    -- Status values: pending, queued, processing, completed, failed, cancelled

    -- OCR Engine Configuration
    engine VARCHAR(50) DEFAULT 'tesseract',
    -- Engines: tesseract, azure_cv, aws_textract, google_vision
    language VARCHAR(10) DEFAULT 'auto',
    -- Language codes: eng, spa, fra, deu, auto (auto-detect)

    -- Results
    extracted_text TEXT,
    structured_data JSONB, -- For forms, tables, key-value pairs
    -- Example: {"tables": [...], "forms": {...}, "key_value_pairs": [...]}

    -- Quality Metrics
    overall_confidence DECIMAL(5,2) CHECK (overall_confidence >= 0 AND overall_confidence <= 100),
    page_confidences JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"page": 1, "confidence": 95.5, "word_count": 450}, ...]

    -- Processing Details
    processing_time_seconds DECIMAL(10,2),
    page_count INTEGER,
    word_count INTEGER,
    character_count INTEGER,

    -- Error Handling
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- OCR Settings used for this job
    ocr_settings JSONB DEFAULT '{
        "dpi": 300,
        "denoise": true,
        "deskew": true,
        "contrast": 1.2,
        "brightness": 1.0,
        "language": "auto",
        "output_format": "text",
        "psm": 3,
        "oem": 3
    }'::jsonb,

    -- Cost tracking (for cloud OCR services)
    processing_cost DECIMAL(10,4), -- In USD
    api_calls_count INTEGER DEFAULT 1,

    -- Timestamps
    queued_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure only one OCR result per document (latest one)
    UNIQUE(document_id)
);

-- Create indexes for performance
CREATE INDEX idx_ocr_document ON document_ocr_results(document_id);
CREATE INDEX idx_ocr_status ON document_ocr_results(status);
CREATE INDEX idx_ocr_job ON document_ocr_results(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_ocr_engine ON document_ocr_results(engine);
CREATE INDEX idx_ocr_confidence ON document_ocr_results(overall_confidence DESC);
CREATE INDEX idx_ocr_created ON document_ocr_results(created_at DESC);
CREATE INDEX idx_ocr_processing_time ON document_ocr_results(processing_time_seconds);

-- Full-text search index on extracted text
CREATE INDEX idx_ocr_extracted_text_fts ON document_ocr_results USING GIN(to_tsvector('english', COALESCE(extracted_text, '')));

-- JSON indexes for structured data
CREATE INDEX idx_ocr_structured_data ON document_ocr_results USING GIN(structured_data);
CREATE INDEX idx_ocr_settings ON document_ocr_results USING GIN(ocr_settings);

-- Add comments for documentation
COMMENT ON TABLE document_ocr_results IS 'Stores OCR processing results and metadata for documents';
COMMENT ON COLUMN document_ocr_results.job_id IS 'Unique identifier for the OCR processing job';
COMMENT ON COLUMN document_ocr_results.status IS 'Current status: pending, queued, processing, completed, failed, cancelled';
COMMENT ON COLUMN document_ocr_results.engine IS 'OCR engine used: tesseract, azure_cv, aws_textract, google_vision';
COMMENT ON COLUMN document_ocr_results.extracted_text IS 'Full text extracted from the document';
COMMENT ON COLUMN document_ocr_results.structured_data IS 'Structured data extracted (tables, forms, key-value pairs)';
COMMENT ON COLUMN document_ocr_results.overall_confidence IS 'Overall OCR confidence score (0-100)';
COMMENT ON COLUMN document_ocr_results.page_confidences IS 'Per-page confidence scores';
COMMENT ON COLUMN document_ocr_results.ocr_settings IS 'Settings used for this OCR job';

-- Create OCR history table (for keeping track of all OCR attempts)
CREATE TABLE IF NOT EXISTS document_ocr_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ocr_result_id UUID REFERENCES document_ocr_results(id) ON DELETE SET NULL,

    -- Processing details
    job_id VARCHAR(100),
    engine VARCHAR(50),
    status VARCHAR(50),
    overall_confidence DECIMAL(5,2),
    processing_time_seconds DECIMAL(10,2),

    -- Error info
    error_message TEXT,
    error_code VARCHAR(50),

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ocr_history_document ON document_ocr_history(document_id);
CREATE INDEX idx_ocr_history_created ON document_ocr_history(created_at DESC);

COMMENT ON TABLE document_ocr_history IS 'Historical log of all OCR processing attempts';

-- Create function to auto-update document OCR flag
CREATE OR REPLACE FUNCTION update_document_ocr_flag()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the is_ocr_processed flag in documents table
    IF NEW.status = 'completed' THEN
        UPDATE documents
        SET
            is_ocr_processed = TRUE,
            ocr_language = NEW.language,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.document_id;

        -- Also update the content field with extracted text
        UPDATE documents
        SET content = COALESCE(content, '') || E'\n\n--- OCR EXTRACTED TEXT ---\n\n' || NEW.extracted_text
        WHERE id = NEW.document_id
        AND content IS NOT NULL
        AND NEW.extracted_text IS NOT NULL;
    END IF;

    -- Update updated_at timestamp
    NEW.updated_at := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_document_ocr_flag ON document_ocr_results;
CREATE TRIGGER trigger_update_document_ocr_flag
    BEFORE INSERT OR UPDATE ON document_ocr_results
    FOR EACH ROW
    EXECUTE FUNCTION update_document_ocr_flag();

-- Create function to log OCR attempts to history
CREATE OR REPLACE FUNCTION log_ocr_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- Log every OCR attempt to history
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        INSERT INTO document_ocr_history (
            document_id,
            ocr_result_id,
            job_id,
            engine,
            status,
            overall_confidence,
            processing_time_seconds,
            error_message,
            error_code,
            started_at,
            completed_at
        ) VALUES (
            NEW.document_id,
            NEW.id,
            NEW.job_id,
            NEW.engine,
            NEW.status,
            NEW.overall_confidence,
            NEW.processing_time_seconds,
            NEW.error_message,
            NEW.error_code,
            NEW.started_at,
            NEW.completed_at
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_ocr_attempt ON document_ocr_results;
CREATE TRIGGER trigger_log_ocr_attempt
    AFTER INSERT OR UPDATE ON document_ocr_results
    FOR EACH ROW
    EXECUTE FUNCTION log_ocr_attempt();

-- Create view for OCR statistics
CREATE OR REPLACE VIEW document_ocr_statistics AS
SELECT
    engine,
    status,
    COUNT(*) AS total_jobs,
    AVG(overall_confidence) AS avg_confidence,
    AVG(processing_time_seconds) AS avg_processing_time,
    SUM(processing_cost) AS total_cost,
    SUM(api_calls_count) AS total_api_calls,
    MIN(completed_at) AS first_job,
    MAX(completed_at) AS last_job
FROM document_ocr_results
GROUP BY engine, status;

COMMENT ON VIEW document_ocr_statistics IS 'Statistics on OCR processing by engine and status';

-- Create helper function to get OCR quality rating
CREATE OR REPLACE FUNCTION get_ocr_quality_rating(p_confidence DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE
        WHEN p_confidence >= 95 THEN 'Excellent'
        WHEN p_confidence >= 85 THEN 'Good'
        WHEN p_confidence >= 75 THEN 'Fair'
        WHEN p_confidence >= 60 THEN 'Poor'
        ELSE 'Very Poor'
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ocr_quality_rating IS 'Returns a quality rating based on OCR confidence score';

-- ============================================
-- MIGRATION VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Verify tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_ocr_results') THEN
        RAISE EXCEPTION 'Migration failed: document_ocr_results table not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_ocr_history') THEN
        RAISE EXCEPTION 'Migration failed: document_ocr_history table not created';
    END IF;

    -- Verify view exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'document_ocr_statistics') THEN
        RAISE EXCEPTION 'Migration failed: document_ocr_statistics view not created';
    END IF;

    -- Verify functions exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_ocr_quality_rating') THEN
        RAISE EXCEPTION 'Migration failed: get_ocr_quality_rating function not created';
    END IF;

    RAISE NOTICE 'Migration successful: OCR tables, views, and functions created';
END $$;
