-- =====================================================
-- USER PREFERENCES TABLE MIGRATION
-- =====================================================
-- Creates user_preferences table for storing user-specific settings
-- =====================================================

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Localization
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC' NOT NULL,
    date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY' NOT NULL,
    time_format VARCHAR(50) DEFAULT '12h',

    -- Appearance
    theme VARCHAR(20) DEFAULT 'dark' NOT NULL CHECK (theme IN ('light', 'dark', 'auto')),
    sidebar_collapsed BOOLEAN DEFAULT false,

    -- Notifications
    notifications_email BOOLEAN DEFAULT true,
    notifications_inapp BOOLEAN DEFAULT true,
    notifications_push BOOLEAN DEFAULT false,
    email_digest_frequency VARCHAR(20) DEFAULT 'daily' CHECK (email_digest_frequency IN ('none', 'daily', 'weekly', 'monthly')),

    -- Default Views
    default_document_view VARCHAR(20) DEFAULT 'grid' CHECK (default_document_view IN ('grid', 'list', 'tree')),
    default_dashboard_layout JSONB DEFAULT '[]',

    -- Other Preferences
    items_per_page INTEGER DEFAULT 25 CHECK (items_per_page > 0 AND items_per_page <= 100),
    auto_save_enabled BOOLEAN DEFAULT true,
    compact_mode BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_language ON user_preferences(language);
CREATE INDEX IF NOT EXISTS idx_user_preferences_theme ON user_preferences(theme);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_preferences_timestamp ON user_preferences;
CREATE TRIGGER update_user_preferences_timestamp
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();

COMMENT ON TABLE user_preferences IS 'User-specific preferences and settings';

-- Create default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;
