-- ============================================
-- DOCUMENT CHECK-IN/CHECK-OUT SYSTEM
-- Comprehensive document locking and version control
-- ============================================

-- Check-in/Check-out records table
CREATE TABLE IF NOT EXISTS document_checkout_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,

    -- User information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_department VARCHAR(100),

    -- Checkout status
    status VARCHAR(50) DEFAULT 'checked-out', -- checked-out, checked-in, expired, force-checkin

    -- Checkout details
    checkout_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    checkin_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    lock_expiry TIMESTAMP WITH TIME ZONE,

    -- Version tracking
    version_at_checkout VARCHAR(50),
    version_at_checkin VARCHAR(50),

    -- Metadata
    reason TEXT,
    checkout_notes TEXT,
    checkin_notes TEXT,

    -- Document state snapshot
    document_snapshot JSONB,

    -- Flags
    is_overdue BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    was_forced BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partial unique index to ensure only one active checkout per document/user
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_active_unique
    ON document_checkout_records(document_id, user_id, status)
    WHERE status = 'checked-out' AND is_active = true;

-- Document locks table (for preventing concurrent edits)
CREATE TABLE IF NOT EXISTS document_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    checkout_record_id UUID REFERENCES document_checkout_records(id) ON DELETE CASCADE,

    -- Lock details
    locked_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    lock_type VARCHAR(50) DEFAULT 'exclusive', -- exclusive, shared, read-only
    lock_reason TEXT,

    -- Lock timing
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,

    -- Lock status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    session_id UUID,
    ip_address INET,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partial unique index to ensure only one active lock per document
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_lock_unique
    ON document_locks(document_id)
    WHERE is_active = true AND released_at IS NULL;

-- Checkout notifications/reminders table
CREATE TABLE IF NOT EXISTS document_checkout_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkout_record_id UUID REFERENCES document_checkout_records(id) ON DELETE CASCADE NOT NULL,

    -- Notification details
    notification_type VARCHAR(50) NOT NULL, -- reminder, overdue, forced-checkin
    notification_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed

    -- Timing
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,

    -- Content
    message TEXT,
    metadata JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Checkout history/audit trail
CREATE TABLE IF NOT EXISTS document_checkout_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkout_record_id UUID REFERENCES document_checkout_records(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,

    -- Action details
    action_type VARCHAR(50) NOT NULL, -- checkout, checkin, extend, force-checkin, expire
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Context
    action_details JSONB,
    reason TEXT,

    -- Timing
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Metadata
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkout_records_document_id ON document_checkout_records(document_id);
CREATE INDEX IF NOT EXISTS idx_checkout_records_user_id ON document_checkout_records(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_records_status ON document_checkout_records(status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_checkout_records_overdue ON document_checkout_records(is_overdue) WHERE is_overdue = true;
CREATE INDEX IF NOT EXISTS idx_checkout_records_due_date ON document_checkout_records(due_date) WHERE status = 'checked-out';

CREATE INDEX IF NOT EXISTS idx_locks_document_id ON document_locks(document_id);
CREATE INDEX IF NOT EXISTS idx_locks_locked_by ON document_locks(locked_by);
CREATE INDEX IF NOT EXISTS idx_locks_active ON document_locks(is_active, expires_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_checkout_notifications_record ON document_checkout_notifications(checkout_record_id);
CREATE INDEX IF NOT EXISTS idx_checkout_notifications_scheduled ON document_checkout_notifications(scheduled_for) WHERE notification_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_checkout_audit_document ON document_checkout_audit(document_id);
CREATE INDEX IF NOT EXISTS idx_checkout_audit_record ON document_checkout_audit(checkout_record_id);
CREATE INDEX IF NOT EXISTS idx_checkout_audit_performed_at ON document_checkout_audit(performed_at DESC);

-- Function to automatically mark overdue checkouts
CREATE OR REPLACE FUNCTION mark_overdue_checkouts()
RETURNS void AS $$
BEGIN
    UPDATE document_checkout_records
    SET is_overdue = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'checked-out'
      AND is_active = true
      AND due_date < CURRENT_TIMESTAMP
      AND is_overdue = false;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire locks
CREATE OR REPLACE FUNCTION expire_document_locks()
RETURNS void AS $$
BEGIN
    UPDATE document_locks
    SET is_active = false,
        released_at = CURRENT_TIMESTAMP
    WHERE is_active = true
      AND expires_at < CURRENT_TIMESTAMP
      AND released_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_checkout_record_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_checkout_record_timestamp
    BEFORE UPDATE ON document_checkout_records
    FOR EACH ROW
    EXECUTE FUNCTION update_checkout_record_timestamp();

-- Comments
COMMENT ON TABLE document_checkout_records IS 'Records of document check-outs and check-ins for version control and concurrent editing prevention';
COMMENT ON TABLE document_locks IS 'Active locks on documents to prevent concurrent modifications';
COMMENT ON TABLE document_checkout_notifications IS 'Scheduled notifications and reminders for checked-out documents';
COMMENT ON TABLE document_checkout_audit IS 'Complete audit trail of all checkout-related actions';
