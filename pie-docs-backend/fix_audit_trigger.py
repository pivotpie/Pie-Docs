"""Fix audit log checksum trigger"""
import logging
from app.database import init_db_pool, close_db_pool, get_db_cursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_audit_trigger():
    try:
        init_db_pool()

        logger.info("Fixing audit checksum trigger...")

        with get_db_cursor(commit=True) as cursor:
            # Drop and recreate the function with correct column names
            cursor.execute("""
                CREATE OR REPLACE FUNCTION calculate_audit_checksum()
                RETURNS TRIGGER AS $$
                DECLARE
                    prev_chain_checksum VARCHAR(64);
                    checksum_data TEXT;
                BEGIN
                    -- Calculate checksum using actual column names
                    checksum_data := CONCAT(
                        COALESCE(NEW.user_id::TEXT, ''),
                        COALESCE(NEW.action, ''),
                        COALESCE(NEW.resource_type, ''),
                        COALESCE(NEW.resource_id::TEXT, ''),
                        COALESCE(NEW.metadata::TEXT, '{}'),
                        COALESCE(NEW.ip_address::TEXT, ''),
                        COALESCE(NEW.created_at::TEXT, '')
                    );

                    NEW.checksum := encode(digest(checksum_data, 'sha256'), 'hex');

                    -- Get previous entry's chain checksum
                    SELECT chain_checksum INTO prev_chain_checksum
                    FROM audit_logs
                    WHERE id != NEW.id
                    ORDER BY created_at DESC
                    LIMIT 1;

                    -- Chain checksums
                    IF prev_chain_checksum IS NOT NULL THEN
                        NEW.chain_checksum := encode(digest(CONCAT(NEW.checksum, prev_chain_checksum), 'sha256'), 'hex');
                    ELSE
                        NEW.chain_checksum := NEW.checksum;
                    END IF;

                    NEW.verification_status := 'verified';

                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            """)

            logger.info("✓ Audit checksum trigger fixed successfully")
            logger.info("  - Updated column references to match actual schema")
            logger.info("  - entity_type -> resource_type")
            logger.info("  - entity_id -> resource_id")
            logger.info("  - changes -> metadata")

    except Exception as e:
        logger.error(f"Error fixing trigger: {e}")
        raise
    finally:
        close_db_pool()

if __name__ == "__main__":
    fix_audit_trigger()
