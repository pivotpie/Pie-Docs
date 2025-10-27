-- =====================================================
-- FIX DOCUMENTS TABLE TIMESTAMP COLUMN
-- =====================================================
-- Adds updated_at column to documents table to work with update_modified_timestamp() trigger
-- =====================================================

-- Add updated_at column if it doesn't exist
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Initialize updated_at from modified_at for existing records
UPDATE documents
SET updated_at = COALESCE(modified_at, created_at)
WHERE updated_at IS NULL;

COMMENT ON COLUMN documents.updated_at IS 'Automatically updated timestamp when record is modified';
