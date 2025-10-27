-- Migration: API Keys Table
-- Description: Create table for managing API keys for programmatic access
-- Date: 2025-10-07

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,  -- First few chars + "..." for display
    key_hash VARCHAR(64) NOT NULL,    -- SHA-256 hash of the actual key
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    rate_limit INTEGER DEFAULT 1000,  -- Requests per hour
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Create indexes for api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE api_keys IS 'API keys for programmatic access to the system';
COMMENT ON COLUMN api_keys.key_prefix IS 'Display prefix of the key (first 12 chars + ...)';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the actual API key secret';
COMMENT ON COLUMN api_keys.permissions IS 'JSON array of permission strings';
COMMENT ON COLUMN api_keys.rate_limit IS 'Maximum requests per hour';
