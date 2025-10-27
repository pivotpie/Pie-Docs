-- Fix duplicate barcode formats and add unique constraint
-- This migration removes duplicate barcode format entries and adds a unique constraint

-- First, create a temporary table with only the first occurrence of each format
CREATE TEMP TABLE unique_formats AS
SELECT DISTINCT ON (standard) *
FROM barcode_formats
ORDER BY standard, created_at ASC;

-- Update any foreign key references to point to the kept formats
UPDATE barcode_records br
SET format_id = uf.id
FROM barcode_formats bf
JOIN unique_formats uf ON bf.standard = uf.standard
WHERE br.format_id = bf.id
  AND bf.id != uf.id;

-- Delete all duplicate formats
DELETE FROM barcode_formats
WHERE id NOT IN (SELECT id FROM unique_formats);

-- Add unique constraint on standard field to prevent future duplicates
ALTER TABLE barcode_formats
ADD CONSTRAINT barcode_formats_standard_unique UNIQUE (standard);

-- Clean up
DROP TABLE unique_formats;
