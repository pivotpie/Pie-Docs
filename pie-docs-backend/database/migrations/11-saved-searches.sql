-- ============================================
-- Migration 11: Saved Searches Table
-- Creates table for user saved searches
-- Critical: Blocks API development
-- ============================================

-- Create saved_searches table
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query_text TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    is_favorite BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_is_favorite ON saved_searches(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_used ON saved_searches(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_filters ON saved_searches USING gin(filters);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_search_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saved_searches_updated_at_trigger ON saved_searches;
CREATE TRIGGER saved_searches_updated_at_trigger
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_search_timestamp();

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 11 completed:';
    RAISE NOTICE '  - Created saved_searches table';
    RAISE NOTICE '  - Created indexes and triggers';
END $$;
