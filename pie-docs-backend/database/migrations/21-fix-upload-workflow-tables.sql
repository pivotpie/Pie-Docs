-- ============================================
-- Fix Upload Workflow Tables
-- ============================================
-- This migration creates tables needed by the enhanced upload workflow
-- to support metadata storage and OCR results tracking

-- ============================================
-- 1. document_metadata table
-- ============================================
-- Stores custom metadata fields extracted from documents
CREATE TABLE IF NOT EXISTS document_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    metadata_type VARCHAR(255) NOT NULL,  -- Field name/key
    metadata_value JSONB NOT NULL,        -- Field value as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one value per metadata type per document
    UNIQUE(document_id, metadata_type)
);

CREATE INDEX IF NOT EXISTS idx_document_metadata_document_id
ON document_metadata(document_id);

CREATE INDEX IF NOT EXISTS idx_document_metadata_type
ON document_metadata(metadata_type);

COMMENT ON TABLE document_metadata IS 'Stores extracted metadata fields from documents';
COMMENT ON COLUMN document_metadata.metadata_type IS 'Name of the metadata field (e.g., invoice_number, date, amount)';
COMMENT ON COLUMN document_metadata.metadata_value IS 'Value of the metadata field stored as JSONB';

-- ============================================
-- 2. ocr_jobs table
-- ============================================
-- Tracks OCR processing jobs for documents
CREATE TABLE IF NOT EXISTS ocr_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'eng',   -- Language code: eng, spa, fra, etc.
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    progress INTEGER DEFAULT 0,           -- 0-100
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_document_id
ON ocr_jobs(document_id);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status
ON ocr_jobs(status);

COMMENT ON TABLE ocr_jobs IS 'Tracks OCR processing jobs for documents';

-- ============================================
-- 3. ocr_results table
-- ============================================
-- Stores OCR extraction results
CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES ocr_jobs(id) ON DELETE CASCADE,
    full_text TEXT,                       -- Complete extracted text
    page_count INTEGER DEFAULT 1,
    total_confidence DECIMAL(5,2),        -- Average confidence 0-100
    metadata JSONB,                       -- Additional OCR metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(job_id)
);

CREATE INDEX IF NOT EXISTS idx_ocr_results_job_id
ON ocr_results(job_id);

COMMENT ON TABLE ocr_results IS 'Stores OCR extraction results for jobs';
COMMENT ON COLUMN ocr_results.full_text IS 'Complete text extracted from document';
COMMENT ON COLUMN ocr_results.total_confidence IS 'Average OCR confidence score (0-100)';

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_document_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_metadata_updated_at
    BEFORE UPDATE ON document_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_document_metadata_updated_at();

CREATE OR REPLACE FUNCTION update_ocr_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ocr_jobs_updated_at
    BEFORE UPDATE ON ocr_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_ocr_jobs_updated_at();
