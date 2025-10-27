-- ============================================
-- Migration 09: Audit Trail Security with Checksums
-- Adds checksum columns and verification trigger
-- Critical: Blocks API development
-- ============================================

-- Add security columns to audit_logs
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS checksum VARCHAR(64),
    ADD COLUMN IF NOT EXISTS chain_checksum VARCHAR(64),
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'verified';

-- Create index for verification queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_verification_status ON audit_logs(verification_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_checksum ON audit_logs(checksum);

-- Create checksum calculation function
CREATE OR REPLACE FUNCTION calculate_audit_checksum()
RETURNS TRIGGER AS $$
DECLARE
    prev_chain_checksum VARCHAR(64);
    checksum_data TEXT;
BEGIN
    -- Calculate checksum of current entry
    checksum_data := CONCAT(
        COALESCE(NEW.user_id::TEXT, ''),
        COALESCE(NEW.action, ''),
        COALESCE(NEW.entity_type, ''),
        COALESCE(NEW.entity_id::TEXT, ''),
        COALESCE(NEW.changes::TEXT, '{}'),
        COALESCE(NEW.ip_address::TEXT, ''),
        COALESCE(NEW.created_at::TEXT, '')
    );

    NEW.checksum := encode(digest(checksum_data, 'sha256'), 'hex');

    -- Get previous entry's chain checksum for chaining
    SELECT chain_checksum INTO prev_chain_checksum
    FROM audit_logs
    WHERE id != NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Chain current checksum with previous chain checksum
    IF prev_chain_checksum IS NOT NULL THEN
        NEW.chain_checksum := encode(digest(CONCAT(NEW.checksum, prev_chain_checksum), 'sha256'), 'hex');
    ELSE
        NEW.chain_checksum := NEW.checksum;
    END IF;

    NEW.verification_status := 'verified';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic checksum calculation
DROP TRIGGER IF EXISTS audit_checksum_trigger ON audit_logs;
CREATE TRIGGER audit_checksum_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_audit_checksum();

-- Calculate checksums for existing records (backward compatibility)
DO $$
DECLARE
    rec RECORD;
    prev_chain VARCHAR(64) := NULL;
    checksum_data TEXT;
    row_checksum VARCHAR(64);
BEGIN
    FOR rec IN
        SELECT * FROM audit_logs ORDER BY created_at ASC
    LOOP
        -- Calculate checksum
        checksum_data := CONCAT(
            COALESCE(rec.user_id::TEXT, ''),
            COALESCE(rec.action, ''),
            COALESCE(rec.entity_type, ''),
            COALESCE(rec.entity_id::TEXT, ''),
            COALESCE(rec.changes::TEXT, '{}'),
            COALESCE(rec.ip_address::TEXT, ''),
            COALESCE(rec.created_at::TEXT, '')
        );

        row_checksum := encode(digest(checksum_data, 'sha256'), 'hex');

        -- Update record
        UPDATE audit_logs
        SET
            checksum = row_checksum,
            chain_checksum = CASE
                WHEN prev_chain IS NOT NULL THEN encode(digest(CONCAT(row_checksum, prev_chain), 'sha256'), 'hex')
                ELSE row_checksum
            END,
            verification_status = 'verified'
        WHERE id = rec.id;

        -- Update prev_chain for next iteration
        SELECT chain_checksum INTO prev_chain FROM audit_logs WHERE id = rec.id;
    END LOOP;
END $$;

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 09 completed:';
    RAISE NOTICE '  - Added security columns to audit_logs';
    RAISE NOTICE '  - Created checksum calculation trigger';
    RAISE NOTICE '  - Calculated checksums for % existing records', (SELECT COUNT(*) FROM audit_logs WHERE checksum IS NOT NULL);
END $$;
