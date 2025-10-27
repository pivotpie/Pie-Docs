-- ============================================
-- Migration 08: User Fields Enhancement
-- Adds first_name, last_name, is_superuser columns
-- Migrates full_name to separate fields
-- Critical: Blocks API development
-- ============================================

-- Add new columns to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE;

-- Migrate full_name to first_name and last_name
UPDATE users
SET
    first_name = CASE
        WHEN full_name IS NULL THEN NULL
        WHEN POSITION(' ' IN full_name) = 0 THEN full_name
        ELSE SPLIT_PART(full_name, ' ', 1)
    END,
    last_name = CASE
        WHEN full_name IS NULL THEN NULL
        WHEN POSITION(' ' IN full_name) = 0 THEN NULL
        ELSE SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    END
WHERE first_name IS NULL OR last_name IS NULL;

-- Create indexes for name searches
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
CREATE INDEX IF NOT EXISTS idx_users_is_superuser ON users(is_superuser) WHERE is_superuser = TRUE;

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 08 completed:';
    RAISE NOTICE '  - Added first_name, last_name, is_superuser columns';
    RAISE NOTICE '  - Migrated % user names', (SELECT COUNT(*) FROM users WHERE first_name IS NOT NULL);
END $$;
