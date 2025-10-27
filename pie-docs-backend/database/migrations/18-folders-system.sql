-- Migration: 18-folders-system.sql
-- Description: Create folder hierarchy system for document organization
-- Author: System
-- Date: 2025-10-06

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Folder basic info
    name VARCHAR(500) NOT NULL,
    description TEXT,

    -- Hierarchy
    parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    path TEXT, -- Full path like /folder1/folder2/folder3
    level INTEGER DEFAULT 0, -- Depth in hierarchy (root = 0)

    -- Metadata
    color VARCHAR(20), -- UI color for folder
    icon VARCHAR(50), -- Icon identifier

    -- Ownership and permissions
    owner_id UUID, -- References users table (when implemented)
    is_shared BOOLEAN DEFAULT FALSE,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete support

    -- Constraints
    CONSTRAINT chk_folder_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT chk_folder_not_self_parent CHECK (id != parent_folder_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_folder_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_created_at ON folders(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name) WHERE deleted_at IS NULL;

-- Add foreign key constraint to documents table
-- (folder_id column should already exist from initial schema)
DO $$
BEGIN
    -- Check if FK constraint doesn't exist, then add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_documents_folder'
    ) THEN
        ALTER TABLE documents
        ADD CONSTRAINT fk_documents_folder
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create trigger to auto-update modified_at timestamp
CREATE OR REPLACE FUNCTION update_folders_modified_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_folders_modified_at
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folders_modified_at();

-- Create function to automatically update folder path when parent changes
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
BEGIN
    IF NEW.parent_folder_id IS NULL THEN
        -- Root folder
        NEW.path = '/' || NEW.name;
        NEW.level = 0;
    ELSE
        -- Get parent's path
        SELECT path, level INTO parent_path, NEW.level
        FROM folders
        WHERE id = NEW.parent_folder_id;

        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent folder not found: %', NEW.parent_folder_id;
        END IF;

        NEW.path = parent_path || '/' || NEW.name;
        NEW.level = NEW.level + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_folder_path
    BEFORE INSERT OR UPDATE OF name, parent_folder_id ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_path();

-- Create view for folder statistics
CREATE OR REPLACE VIEW folder_statistics AS
SELECT
    f.id,
    f.name,
    f.path,
    COUNT(DISTINCT d.id) AS document_count,
    COALESCE(SUM(d.file_size), 0) AS total_size,
    COUNT(DISTINCT sf.id) AS subfolder_count,
    MAX(d.modified_at) AS last_document_modified
FROM folders f
LEFT JOIN documents d ON d.folder_id = f.id AND d.deleted_at IS NULL
LEFT JOIN folders sf ON sf.parent_folder_id = f.id AND sf.deleted_at IS NULL
WHERE f.deleted_at IS NULL
GROUP BY f.id, f.name, f.path;

-- Create recursive CTE function to get folder tree
CREATE OR REPLACE FUNCTION get_folder_tree(root_folder_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    parent_folder_id UUID,
    path TEXT,
    level INTEGER,
    document_count BIGINT,
    total_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_tree AS (
        -- Base case: root folders or specified folder
        SELECT
            f.id,
            f.name,
            f.parent_folder_id,
            f.path,
            f.level,
            0::INTEGER AS depth
        FROM folders f
        WHERE f.deleted_at IS NULL
          AND (
              (root_folder_id IS NULL AND f.parent_folder_id IS NULL) OR
              (root_folder_id IS NOT NULL AND f.id = root_folder_id)
          )

        UNION ALL

        -- Recursive case: child folders
        SELECT
            f.id,
            f.name,
            f.parent_folder_id,
            f.path,
            f.level,
            ft.depth + 1
        FROM folders f
        INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
        WHERE f.deleted_at IS NULL
    )
    SELECT
        ft.id,
        ft.name,
        ft.parent_folder_id,
        ft.path,
        ft.level,
        COALESCE(COUNT(DISTINCT d.id), 0) AS document_count,
        COALESCE(SUM(d.file_size), 0) AS total_size
    FROM folder_tree ft
    LEFT JOIN documents d ON d.folder_id = ft.id AND d.deleted_at IS NULL
    GROUP BY ft.id, ft.name, ft.parent_folder_id, ft.path, ft.level, ft.depth
    ORDER BY ft.depth, ft.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to move folder (and update all child paths)
CREATE OR REPLACE FUNCTION move_folder(
    folder_id_to_move UUID,
    new_parent_folder_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    old_path TEXT;
    new_path TEXT;
BEGIN
    -- Prevent moving folder into itself or its descendants
    IF new_parent_folder_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM folders
            WHERE id = new_parent_folder_id
              AND path LIKE (SELECT path FROM folders WHERE id = folder_id_to_move) || '%'
        ) THEN
            RAISE EXCEPTION 'Cannot move folder into itself or its descendants';
        END IF;
    END IF;

    -- Get old path
    SELECT path INTO old_path FROM folders WHERE id = folder_id_to_move;

    -- Update parent
    UPDATE folders
    SET parent_folder_id = new_parent_folder_id,
        modified_at = CURRENT_TIMESTAMP
    WHERE id = folder_id_to_move;

    -- Get new path (trigger will have updated it)
    SELECT path INTO new_path FROM folders WHERE id = folder_id_to_move;

    -- Update all descendant paths
    UPDATE folders
    SET path = new_path || SUBSTRING(path FROM LENGTH(old_path) + 1),
        modified_at = CURRENT_TIMESTAMP
    WHERE path LIKE old_path || '/%'
      AND deleted_at IS NULL;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Insert some default folders for testing
INSERT INTO folders (name, description, color, icon) VALUES
    ('General', 'General documents', '#3B82F6', '📁'),
    ('Invoices', 'Invoice documents', '#10B981', '🧾'),
    ('Contracts', 'Contract documents', '#F59E0B', '📄'),
    ('Reports', 'Report documents', '#8B5CF6', '📊')
ON CONFLICT DO NOTHING;

-- Create comment
COMMENT ON TABLE folders IS 'Hierarchical folder structure for organizing documents';
COMMENT ON COLUMN folders.path IS 'Full path from root, auto-updated by trigger';
COMMENT ON COLUMN folders.level IS 'Depth in hierarchy, auto-calculated by trigger';
COMMENT ON FUNCTION get_folder_tree IS 'Recursively get folder tree with statistics';
COMMENT ON FUNCTION move_folder IS 'Move folder to new parent, updating all child paths';
