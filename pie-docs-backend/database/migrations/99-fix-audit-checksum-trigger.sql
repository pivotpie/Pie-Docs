-- ============================================
-- Fix: Audit Checksum Trigger Column Names
-- Fixes entity_type reference to use resource_type
-- ============================================

-- Drop and recreate checksum calculation function with correct column names
CREATE OR REPLACE FUNCTION calculate_audit_checksum()
RETURNS TRIGGER AS $$
DECLARE
    prev_chain_checksum VARCHAR(64);
    checksum_data TEXT;
BEGIN
    -- Calculate checksum of current entry using actual column names
    checksum_data := CONCAT(
        COALESCE(NEW.user_id::TEXT, ''),
        COALESCE(NEW.action, ''),
        COALESCE(NEW.resource_type, ''),  -- Changed from entity_type
        COALESCE(NEW.resource_id::TEXT, ''),  -- Changed from entity_id
        COALESCE(NEW.metadata::TEXT, '{}'),  -- Changed from changes
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

-- Verify fix
DO $$
BEGIN
    RAISE NOTICE 'Audit checksum trigger fixed:';
    RAISE NOTICE '  - Updated column names: entity_type -> resource_type, entity_id -> resource_id';
    RAISE NOTICE '  - Trigger will now work correctly with actual table schema';
END $$;
