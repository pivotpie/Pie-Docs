-- Warehouse Mobile Scanning Tables
-- Tables for mobile barcode scanning, sessions, and inventory verification

-- Drop existing tables if they exist
DROP TABLE IF EXISTS scan_records CASCADE;
DROP TABLE IF EXISTS scan_sessions CASCADE;

-- Scan Sessions Table
CREATE TABLE scan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode VARCHAR(50) NOT NULL CHECK (mode IN ('lookup', 'inventory', 'document_capture', 'movement')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan Records Table
CREATE TABLE scan_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
    barcode VARCHAR(100) NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('zone', 'shelf', 'rack', 'document', 'unknown')),
    entity_id UUID,
    entity_name VARCHAR(255),
    entity_location_path TEXT,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location_lat DECIMAL(10, 8),
    location_lon DECIMAL(11, 8),
    photo_url TEXT,
    notes TEXT,
    verified BOOLEAN DEFAULT FALSE,
    offline BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_scan_sessions_user ON scan_sessions(user_id);
CREATE INDEX idx_scan_sessions_status ON scan_sessions(status);
CREATE INDEX idx_scan_sessions_location ON scan_sessions(location_id);
CREATE INDEX idx_scan_sessions_warehouse ON scan_sessions(warehouse_id);
CREATE INDEX idx_scan_sessions_zone ON scan_sessions(zone_id);
CREATE INDEX idx_scan_sessions_started ON scan_sessions(started_at);

CREATE INDEX idx_scan_records_session ON scan_records(session_id);
CREATE INDEX idx_scan_records_barcode ON scan_records(barcode);
CREATE INDEX idx_scan_records_entity_type ON scan_records(entity_type);
CREATE INDEX idx_scan_records_entity_id ON scan_records(entity_id);
CREATE INDEX idx_scan_records_scanned_at ON scan_records(scanned_at);
CREATE INDEX idx_scan_records_verified ON scan_records(verified);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_scan_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scan_sessions_updated_at
BEFORE UPDATE ON scan_sessions
FOR EACH ROW
EXECUTE FUNCTION update_scan_sessions_timestamp();

-- Comments
COMMENT ON TABLE scan_sessions IS 'Mobile scanning sessions for warehouse inventory and document tracking';
COMMENT ON TABLE scan_records IS 'Individual barcode scans recorded during mobile sessions';

COMMENT ON COLUMN scan_sessions.mode IS 'Scan mode: lookup, inventory, document_capture, movement';
COMMENT ON COLUMN scan_sessions.status IS 'Session status: active, completed, cancelled';
COMMENT ON COLUMN scan_records.entity_type IS 'Type of entity scanned: zone, shelf, rack, document, unknown';
COMMENT ON COLUMN scan_records.verified IS 'Whether the scanned entity was found and verified in the database';
COMMENT ON COLUMN scan_records.offline IS 'Whether this scan was recorded while offline and synced later';
