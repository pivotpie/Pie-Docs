-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================
-- Common database functions and triggers used across tables
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_modified_timestamp() IS 'Automatically updates the updated_at column when a row is modified';
