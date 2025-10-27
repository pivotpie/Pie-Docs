-- Add workflow data columns to documents table
-- This allows us to store barcode assignments, warehouse locations, and AI classification results

-- Add document_type_id (foreign key to document_types for classification result)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS document_type_id UUID;

-- Add barcode_id (foreign key to barcode_records)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS barcode_id UUID REFERENCES barcode_records(id) ON DELETE SET NULL;

-- Add rack_id for warehouse location (foreign key to racks)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS rack_id UUID;

-- Add AI classification confidence and reasoning
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS classification_confidence DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS classification_reasoning TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_documents_document_type_id ON documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_documents_barcode_id ON documents(barcode_id);
CREATE INDEX IF NOT EXISTS idx_documents_rack_id ON documents(rack_id);
CREATE INDEX IF NOT EXISTS idx_documents_classification_confidence ON documents(classification_confidence);

-- Add foreign key constraint for document_type_id (if document_types table exists and constraint doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_types')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_document_type_id') THEN
        ALTER TABLE documents
        ADD CONSTRAINT fk_documents_document_type_id
        FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint for rack_id (if racks table exists and constraint doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'racks')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_rack_id') THEN
        ALTER TABLE documents
        ADD CONSTRAINT fk_documents_rack_id
        FOREIGN KEY (rack_id) REFERENCES racks(id) ON DELETE SET NULL;
    END IF;
END $$;
