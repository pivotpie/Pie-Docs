-- ============================================
-- TASK-DB-001: Document File Storage Enhancements
-- ============================================
-- Description: Add missing columns for internal file storage
-- Priority: P0 - CRITICAL
-- Dependencies: None
-- Estimated Time: 2 hours
-- ============================================

-- Add file storage columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS file_original_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS file_storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_storage_type VARCHAR(50) DEFAULT 'local', -- local, s3, azure
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS preview_path TEXT,
ADD COLUMN IF NOT EXISTS page_count INTEGER,
ADD COLUMN IF NOT EXISTS is_ocr_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ocr_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS checksum_md5 VARCHAR(32),
ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(64);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_file_storage_path ON documents(file_storage_path);
CREATE INDEX IF NOT EXISTS idx_documents_checksum_sha256 ON documents(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_documents_checksum_md5 ON documents(checksum_md5);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_processed ON documents(is_ocr_processed);
CREATE INDEX IF NOT EXISTS idx_documents_file_storage_type ON documents(file_storage_type);

-- Add comments for documentation
COMMENT ON COLUMN documents.file_original_name IS 'Original filename as uploaded by user';
COMMENT ON COLUMN documents.file_storage_path IS 'Actual path where file is stored on disk/cloud';
COMMENT ON COLUMN documents.file_storage_type IS 'Storage backend: local, s3, azure';
COMMENT ON COLUMN documents.thumbnail_path IS 'Path to generated thumbnail image';
COMMENT ON COLUMN documents.preview_path IS 'Path to generated preview (for PDFs)';
COMMENT ON COLUMN documents.page_count IS 'Number of pages in document (for PDFs)';
COMMENT ON COLUMN documents.is_ocr_processed IS 'Whether OCR has been performed on this document';
COMMENT ON COLUMN documents.ocr_language IS 'Language detected/used for OCR';
COMMENT ON COLUMN documents.checksum_md5 IS 'MD5 hash for duplicate detection';
COMMENT ON COLUMN documents.checksum_sha256 IS 'SHA256 hash for integrity verification';

-- Create function to update file size on insert/update
CREATE OR REPLACE FUNCTION update_document_file_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-set file_original_name from title if not provided
    IF NEW.file_original_name IS NULL AND NEW.title IS NOT NULL THEN
        NEW.file_original_name := NEW.title;
    END IF;

    -- Ensure updated_at is set
    NEW.updated_at := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_document_file_stats ON documents;
CREATE TRIGGER trigger_update_document_file_stats
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_file_stats();

-- ============================================
-- MIGRATION VERIFICATION
-- ============================================

-- Verify all columns were added
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    SELECT array_agg(column_name) INTO missing_columns
    FROM (
        SELECT unnest(ARRAY[
            'file_original_name',
            'file_storage_path',
            'file_storage_type',
            'thumbnail_path',
            'preview_path',
            'page_count',
            'is_ocr_processed',
            'ocr_language',
            'checksum_md5',
            'checksum_sha256'
        ]) AS column_name
    ) expected
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents'
        AND column_name = expected.column_name
    );

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Migration failed: Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'Migration successful: All columns added to documents table';
    END IF;
END $$;
