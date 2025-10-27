-- Migration: Document Types Management
-- Description: Create document_types table for managing document type definitions
-- Date: 2025-10-05

-- Create document_types table
CREATE TABLE IF NOT EXISTS document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(20) DEFAULT '#6366f1',

    -- Metadata configuration
    metadata_schema_id UUID REFERENCES metadata_schemas(id),
    required_fields JSONB DEFAULT '[]'::jsonb,
    optional_fields JSONB DEFAULT '[]'::jsonb,

    -- Document configuration
    default_folder_id UUID REFERENCES folders(id),
    allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt', 'jpg', 'png']::TEXT[],
    max_file_size_mb INTEGER DEFAULT 50,

    -- Workflow and approval settings
    default_workflow_id UUID REFERENCES workflows(id),
    default_approval_chain_id UUID REFERENCES approval_chains(id),
    requires_approval BOOLEAN DEFAULT FALSE,

    -- Retention and lifecycle
    retention_days INTEGER,
    auto_delete_after_retention BOOLEAN DEFAULT FALSE,

    -- Permissions and visibility
    is_active BOOLEAN DEFAULT TRUE,
    is_system_type BOOLEAN DEFAULT FALSE,
    restricted_to_roles UUID[] DEFAULT ARRAY[]::UUID[],

    -- Usage tracking
    document_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_document_types_name ON document_types(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_types_is_active ON document_types(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_types_created_at ON document_types(created_at);

-- Create trigger to update modified timestamp
CREATE OR REPLACE FUNCTION update_document_types_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_types_update_timestamp
    BEFORE UPDATE ON document_types
    FOR EACH ROW
    EXECUTE FUNCTION update_document_types_timestamp();

-- Insert some default document types
INSERT INTO document_types (name, display_name, description, icon, color, is_system_type, allowed_file_types) VALUES
('invoice', 'Invoice', 'Financial invoices and billing documents', '📄', '#10b981', true, ARRAY['pdf', 'jpg', 'png']),
('contract', 'Contract', 'Legal contracts and agreements', '📋', '#f59e0b', true, ARRAY['pdf', 'doc', 'docx']),
('report', 'Report', 'Business reports and analytics', '📊', '#3b82f6', true, ARRAY['pdf', 'doc', 'docx', 'xls', 'xlsx']),
('letter', 'Letter', 'Correspondence and letters', '✉️', '#8b5cf6', true, ARRAY['pdf', 'doc', 'docx']),
('presentation', 'Presentation', 'Slide decks and presentations', '📽️', '#ec4899', true, ARRAY['pdf', 'ppt', 'pptx']),
('image', 'Image', 'Photos and images', '🖼️', '#06b6d4', true, ARRAY['jpg', 'jpeg', 'png', 'gif', 'webp']),
('spreadsheet', 'Spreadsheet', 'Data spreadsheets and tables', '📈', '#14b8a6', true, ARRAY['xls', 'xlsx', 'csv']),
('general', 'General Document', 'General purpose documents', '📃', '#6366f1', true, ARRAY['pdf', 'doc', 'docx', 'txt', 'rtf'])
ON CONFLICT (name) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE document_types IS 'Defines document type templates with metadata schemas, workflows, and retention policies';
