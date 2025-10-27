-- ========================================
-- UPDATE PHYSICAL_DOCUMENTS TABLE SCHEMA
-- Migrate from legacy barcode string to modern barcode_id reference
-- ========================================

-- Step 1: Make rack_id and location_id optional (allow NULL temporarily)
ALTER TABLE physical_documents
ALTER COLUMN rack_id DROP NOT NULL;

-- Step 2: Add new barcode_id column (references barcodes table)
ALTER TABLE physical_documents
ADD COLUMN IF NOT EXISTS barcode_id UUID REFERENCES barcodes(id) ON DELETE SET NULL;

-- Step 3: Add location_id column for zone reference
ALTER TABLE physical_documents
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES zones(id) ON DELETE SET NULL;

-- Step 4: Add last_seen_at column for tracking
ALTER TABLE physical_documents
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 5: Make the old barcode column optional (for backward compatibility)
ALTER TABLE physical_documents
ALTER COLUMN barcode DROP NOT NULL;

-- Step 6: Make old required fields optional for simplified workflow
ALTER TABLE physical_documents
ALTER COLUMN document_type DROP NOT NULL,
ALTER COLUMN document_category DROP NOT NULL,
ALTER COLUMN title DROP NOT NULL,
ALTER COLUMN physical_condition DROP NOT NULL,
ALTER COLUMN assigned_by DROP NOT NULL,
ALTER COLUMN created_by DROP NOT NULL,
ALTER COLUMN updated_by DROP NOT NULL;

-- Step 7: Add status column that matches our upload workflow
-- The old table has status with different values, let's make it more flexible
ALTER TABLE physical_documents
DROP CONSTRAINT IF EXISTS physical_documents_status_check;

ALTER TABLE physical_documents
ADD CONSTRAINT physical_documents_status_check
CHECK (status IN ('stored', 'retrieved', 'in_transit', 'missing', 'destroyed', 'available', 'reserved', 'archived'));

-- Step 8: Create index on new barcode_id column
CREATE INDEX IF NOT EXISTS idx_physical_documents_barcode_id ON physical_documents(barcode_id);

-- Step 9: Create index on location_id
CREATE INDEX IF NOT EXISTS idx_physical_documents_location_id ON physical_documents(location_id);

-- Migration complete
SELECT 'Physical documents table updated successfully!' AS status;
