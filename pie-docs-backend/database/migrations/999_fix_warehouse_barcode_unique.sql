-- Fix warehouse barcode unique constraint to allow multiple NULL values
-- This migration replaces the UNIQUE constraint with a partial unique index
-- that only enforces uniqueness when barcode IS NOT NULL

BEGIN;

-- Drop the existing unique constraint on barcode
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS warehouses_barcode_key;

-- Create a partial unique index that only enforces uniqueness for non-NULL barcodes
-- Note: idx_warehouses_barcode already exists as a partial index, but it's not unique
-- We need to drop it and recreate as a UNIQUE partial index
DROP INDEX IF EXISTS idx_warehouses_barcode;

CREATE UNIQUE INDEX warehouses_barcode_unique_idx
ON warehouses (barcode)
WHERE barcode IS NOT NULL;

COMMIT;

-- This allows multiple warehouses to have NULL barcodes while ensuring
-- that any non-NULL barcode values are unique across all warehouses
