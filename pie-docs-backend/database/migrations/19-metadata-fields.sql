-- ============================================
-- Metadata Fields Table
-- ============================================
-- This migration creates a separate table for metadata fields
-- to properly support the flow: Document Types → Metadata Schemas → Metadata Fields → Document Metadata

CREATE TABLE IF NOT EXISTS metadata_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship to metadata schema
    schema_id UUID NOT NULL REFERENCES metadata_schemas(id) ON DELETE CASCADE,

    -- Field definition
    field_name VARCHAR(255) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- text, number, date, dropdown, multiselect, checkbox, textarea, etc.

    -- Field configuration
    description TEXT,
    default_value TEXT,
    placeholder TEXT,

    -- Validation rules
    is_required BOOLEAN DEFAULT false,
    min_length INTEGER,
    max_length INTEGER,
    min_value DECIMAL,
    max_value DECIMAL,
    pattern VARCHAR(500), -- regex pattern for validation

    -- Options for dropdown/multiselect fields
    options JSONB, -- [{value: 'option1', label: 'Option 1'}, ...]

    -- Display settings
    display_order INTEGER DEFAULT 0,
    display_width VARCHAR(50) DEFAULT 'full', -- full, half, third, quarter
    group_name VARCHAR(255), -- for grouping fields in UI

    -- Conditional display
    conditional_logic JSONB, -- {field: 'other_field', operator: 'equals', value: 'something'}

    -- Help text and documentation
    help_text TEXT,
    help_url VARCHAR(1000),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique field names within a schema
    UNIQUE(schema_id, field_name)
);

-- ============================================
-- Update metadata_schemas table
-- ============================================
-- Remove old JSONB fields column (now using separate metadata_fields table)
ALTER TABLE metadata_schemas
DROP COLUMN IF EXISTS fields;

-- Remove old document_types array column (now using document_type_id foreign key)
ALTER TABLE metadata_schemas
DROP COLUMN IF EXISTS document_types;

-- Add document_type_id foreign key to properly link schemas to document types
ALTER TABLE metadata_schemas
ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES document_types(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_metadata_schemas_document_type
ON metadata_schemas(document_type_id);

-- ============================================
-- Indexes for metadata_fields
-- ============================================
CREATE INDEX IF NOT EXISTS idx_metadata_fields_schema_id
ON metadata_fields(schema_id);

CREATE INDEX IF NOT EXISTS idx_metadata_fields_display_order
ON metadata_fields(schema_id, display_order);

-- ============================================
-- Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_metadata_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER metadata_fields_updated_at
    BEFORE UPDATE ON metadata_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_metadata_fields_updated_at();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE metadata_fields IS 'Individual metadata fields belonging to metadata schemas';
COMMENT ON COLUMN metadata_fields.schema_id IS 'Foreign key to metadata_schemas table';
COMMENT ON COLUMN metadata_fields.field_type IS 'Type of field: text, number, date, dropdown, multiselect, checkbox, textarea, etc.';
COMMENT ON COLUMN metadata_fields.options IS 'Options for dropdown/multiselect fields stored as JSONB array';
COMMENT ON COLUMN metadata_fields.conditional_logic IS 'Rules for conditional display of fields based on other field values';
