-- Create signatures table for storing document signatures
CREATE TABLE IF NOT EXISTS document_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signature_data TEXT NOT NULL, -- Base64 encoded PNG image
    signature_type VARCHAR(10) NOT NULL CHECK (signature_type IN ('draw', 'upload')),
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_signatures_document_id ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_created_by ON document_signatures(created_by);
CREATE INDEX IF NOT EXISTS idx_signatures_created_at ON document_signatures(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_signature_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_signature_timestamp
    BEFORE UPDATE ON document_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_signature_updated_at();

-- Add comment to table
COMMENT ON TABLE document_signatures IS 'Stores digital signatures captured for documents';
COMMENT ON COLUMN document_signatures.signature_data IS 'Base64 encoded PNG image data';
COMMENT ON COLUMN document_signatures.signature_type IS 'Type of signature: draw (hand-drawn) or upload (uploaded image)';
COMMENT ON COLUMN document_signatures.metadata IS 'Additional metadata like dimensions, device info, etc.';
