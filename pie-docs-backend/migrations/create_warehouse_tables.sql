-- ========================================
-- WAREHOUSE MANAGEMENT SYSTEM DATABASE SCHEMA
-- Physical Document Archiving System
-- Hierarchy: Location → Warehouse → Zone → Shelf → Rack → Document
-- ========================================

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS customer_rack_assignments CASCADE;
DROP TABLE IF EXISTS document_movements CASCADE;
DROP TABLE IF EXISTS physical_documents CASCADE;
DROP TABLE IF EXISTS racks CASCADE;
DROP TABLE IF EXISTS shelves CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- ========================================
-- LOCATIONS TABLE (Top Level)
-- ========================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    coordinates JSONB, -- {latitude: number, longitude: number}
    contact JSONB NOT NULL, -- {manager: string, phone: string, email: string}
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

COMMENT ON TABLE locations IS 'Physical locations housing warehouse facilities';
COMMENT ON COLUMN locations.code IS 'Unique location identifier (e.g., LOC-DXB-001)';
COMMENT ON COLUMN locations.coordinates IS 'GPS coordinates in JSON format';
COMMENT ON COLUMN locations.contact IS 'Location manager contact information';

-- ========================================
-- WAREHOUSES TABLE
-- ========================================
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    warehouse_type VARCHAR(50) NOT NULL CHECK (warehouse_type IN ('standard', 'climate_controlled', 'secure', 'mixed')),
    total_area DECIMAL(10,2) NOT NULL CHECK (total_area > 0),
    operational_hours JSONB, -- {monday: {open: string, close: string}, ...}
    contact JSONB NOT NULL, -- {supervisor: string, phone: string, email: string}
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

COMMENT ON TABLE warehouses IS 'Warehouse buildings within locations';
COMMENT ON COLUMN warehouses.code IS 'Unique warehouse identifier (e.g., WH-DXBJA-001)';
COMMENT ON COLUMN warehouses.total_area IS 'Total area in square meters';
COMMENT ON COLUMN warehouses.barcode IS 'Optional barcode for warehouse tracking';

-- ========================================
-- ZONES TABLE
-- ========================================
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    barcode_status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (barcode_status IN ('generated', 'printed', 'assigned', 'scanned', 'damaged', 'lost')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    zone_type VARCHAR(50) NOT NULL CHECK (zone_type IN ('storage', 'receiving', 'dispatch', 'processing', 'archive')),
    area DECIMAL(10,2) NOT NULL CHECK (area > 0),
    max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
    current_capacity INTEGER NOT NULL DEFAULT 0 CHECK (current_capacity >= 0 AND current_capacity <= max_capacity),
    environmental_control JSONB, -- {temperature_min, temperature_max, humidity_min, humidity_max, monitoring_enabled}
    access_level INTEGER NOT NULL CHECK (access_level BETWEEN 1 AND 5),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

COMMENT ON TABLE zones IS 'Zones within warehouses with barcode tracking';
COMMENT ON COLUMN zones.code IS 'Unique zone identifier (e.g., ZN-A-001)';
COMMENT ON COLUMN zones.barcode IS 'Required barcode for zone tracking';
COMMENT ON COLUMN zones.max_capacity IS 'Maximum number of shelves';
COMMENT ON COLUMN zones.current_capacity IS 'Current number of shelves';
COMMENT ON COLUMN zones.access_level IS 'Security access level (1-5, 5 being highest)';

-- ========================================
-- SHELVES TABLE
-- ========================================
CREATE TABLE shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    barcode_status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (barcode_status IN ('generated', 'printed', 'assigned', 'scanned', 'damaged', 'lost')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    shelf_type VARCHAR(50) NOT NULL CHECK (shelf_type IN ('standard', 'heavy_duty', 'mobile', 'compact', 'archive')),
    dimensions JSONB NOT NULL, -- {width: number, depth: number, height: number} in cm
    weight_capacity DECIMAL(10,2) NOT NULL CHECK (weight_capacity > 0),
    max_racks INTEGER NOT NULL CHECK (max_racks > 0),
    current_racks INTEGER NOT NULL DEFAULT 0 CHECK (current_racks >= 0 AND current_racks <= max_racks),
    position JSONB NOT NULL, -- {row: string, column: number, level: number}
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

COMMENT ON TABLE shelves IS 'Shelves within zones with barcode tracking';
COMMENT ON COLUMN shelves.code IS 'Unique shelf identifier (e.g., SH-A-001)';
COMMENT ON COLUMN shelves.barcode IS 'Required barcode for shelf tracking';
COMMENT ON COLUMN shelves.dimensions IS 'Shelf dimensions in JSON (width, depth, height in cm)';
COMMENT ON COLUMN shelves.weight_capacity IS 'Maximum weight capacity in kg';
COMMENT ON COLUMN shelves.max_racks IS 'Maximum number of racks';
COMMENT ON COLUMN shelves.current_racks IS 'Current number of racks';
COMMENT ON COLUMN shelves.position IS 'Position in JSON (row, column, level)';

-- ========================================
-- RACKS TABLE
-- ========================================
CREATE TABLE racks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_id UUID NOT NULL REFERENCES shelves(id) ON DELETE RESTRICT,
    code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    barcode_status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (barcode_status IN ('generated', 'printed', 'assigned', 'scanned', 'damaged', 'lost')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rack_type VARCHAR(50) NOT NULL CHECK (rack_type IN ('box', 'folder', 'drawer', 'tray', 'bin')),
    dimensions JSONB NOT NULL, -- {width: number, depth: number, height: number} in cm
    weight_capacity DECIMAL(10,2) NOT NULL CHECK (weight_capacity > 0),
    max_documents INTEGER NOT NULL CHECK (max_documents > 0),
    current_documents INTEGER NOT NULL DEFAULT 0 CHECK (current_documents >= 0 AND current_documents <= max_documents),
    position VARCHAR(50) NOT NULL, -- Position on shelf (e.g., "A1", "B2")
    customer_id UUID, -- Optional customer assignment
    assignment_type VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (assignment_type IN ('general', 'customer_dedicated', 'document_specific')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

COMMENT ON TABLE racks IS 'Storage racks within shelves with barcode tracking';
COMMENT ON COLUMN racks.code IS 'Unique rack identifier (e.g., RK-A-001)';
COMMENT ON COLUMN racks.barcode IS 'Required barcode for rack tracking';
COMMENT ON COLUMN racks.dimensions IS 'Rack dimensions in JSON (width, depth, height in cm)';
COMMENT ON COLUMN racks.weight_capacity IS 'Maximum weight capacity in kg';
COMMENT ON COLUMN racks.max_documents IS 'Maximum number of documents';
COMMENT ON COLUMN racks.current_documents IS 'Current number of documents';
COMMENT ON COLUMN racks.customer_id IS 'Optional customer ID if rack is dedicated to specific customer';

-- ========================================
-- PHYSICAL DOCUMENTS TABLE
-- ========================================
CREATE TABLE physical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digital_document_id UUID NOT NULL, -- Link to digital documents system
    rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE RESTRICT,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    barcode_status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (barcode_status IN ('generated', 'printed', 'assigned', 'scanned', 'damaged', 'lost')),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('original', 'copy', 'certified_copy', 'archive')),
    document_category VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    physical_condition VARCHAR(50) NOT NULL CHECK (physical_condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
    conservation_priority VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (conservation_priority IN ('low', 'medium', 'high', 'critical')),
    storage_requirements JSONB, -- {temperature_controlled, humidity_controlled, light_sensitive, special_handling}
    customer_id UUID, -- Optional customer ID
    assignment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID NOT NULL,
    retrieval_count INTEGER NOT NULL DEFAULT 0 CHECK (retrieval_count >= 0),
    last_accessed TIMESTAMP WITH TIME ZONE,
    last_accessed_by UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'stored' CHECK (status IN ('stored', 'retrieved', 'in_transit', 'missing', 'destroyed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

COMMENT ON TABLE physical_documents IS 'Physical documents stored in racks with barcode tracking';
COMMENT ON COLUMN physical_documents.digital_document_id IS 'Reference to digital document in main system';
COMMENT ON COLUMN physical_documents.barcode IS 'Required barcode for document tracking';
COMMENT ON COLUMN physical_documents.physical_condition IS 'Current physical condition of document';
COMMENT ON COLUMN physical_documents.conservation_priority IS 'Priority for conservation efforts';
COMMENT ON COLUMN physical_documents.retrieval_count IS 'Number of times document has been retrieved';

-- ========================================
-- DOCUMENT MOVEMENTS TABLE
-- ========================================
CREATE TABLE document_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES physical_documents(id) ON DELETE CASCADE,
    from_rack_id UUID REFERENCES racks(id) ON DELETE SET NULL,
    to_rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE RESTRICT,
    from_location_path TEXT,
    to_location_path TEXT NOT NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('initial_storage', 'relocation', 'retrieval', 'return')),
    reason TEXT,
    notes TEXT,
    requested_by UUID NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_by UUID,
    executed_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE document_movements IS 'Tracking of physical document movements between racks';
COMMENT ON COLUMN document_movements.from_rack_id IS 'Source rack (null for initial storage)';
COMMENT ON COLUMN document_movements.to_rack_id IS 'Destination rack';
COMMENT ON COLUMN document_movements.movement_type IS 'Type of movement operation';

-- ========================================
-- CUSTOMER RACK ASSIGNMENTS TABLE
-- ========================================
CREATE TABLE customer_rack_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL, -- Reference to customer in main system
    customer_name VARCHAR(255) NOT NULL,
    rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE RESTRICT,
    assignment_type VARCHAR(50) NOT NULL CHECK (assignment_type IN ('permanent', 'temporary', 'contract')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    rate DECIMAL(10,2),
    currency VARCHAR(10),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated', 'suspended')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

COMMENT ON TABLE customer_rack_assignments IS 'Customer assignments to dedicated racks';
COMMENT ON COLUMN customer_rack_assignments.assignment_type IS 'Type of rack assignment';
COMMENT ON COLUMN customer_rack_assignments.billing_cycle IS 'Billing frequency for rack rental';

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Locations indexes
CREATE INDEX idx_locations_status ON locations(status);
CREATE INDEX idx_locations_country_city ON locations(country, city);

-- Warehouses indexes
CREATE INDEX idx_warehouses_location ON warehouses(location_id);
CREATE INDEX idx_warehouses_status ON warehouses(status);
CREATE INDEX idx_warehouses_barcode ON warehouses(barcode) WHERE barcode IS NOT NULL;

-- Zones indexes
CREATE INDEX idx_zones_warehouse ON zones(warehouse_id);
CREATE INDEX idx_zones_barcode ON zones(barcode);
CREATE INDEX idx_zones_status ON zones(status);
CREATE INDEX idx_zones_capacity ON zones(warehouse_id, current_capacity, max_capacity);

-- Shelves indexes
CREATE INDEX idx_shelves_zone ON shelves(zone_id);
CREATE INDEX idx_shelves_barcode ON shelves(barcode);
CREATE INDEX idx_shelves_status ON shelves(status);
CREATE INDEX idx_shelves_capacity ON shelves(zone_id, current_racks, max_racks);
CREATE INDEX idx_shelves_position ON shelves USING GIN (position);

-- Racks indexes
CREATE INDEX idx_racks_shelf ON racks(shelf_id);
CREATE INDEX idx_racks_barcode ON racks(barcode);
CREATE INDEX idx_racks_customer ON racks(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_racks_status ON racks(status);
CREATE INDEX idx_racks_capacity ON racks(shelf_id, current_documents, max_documents);
CREATE INDEX idx_racks_assignment_type ON racks(assignment_type);

-- Physical documents indexes
CREATE INDEX idx_documents_rack ON physical_documents(rack_id);
CREATE INDEX idx_documents_barcode ON physical_documents(barcode);
CREATE INDEX idx_documents_digital_doc ON physical_documents(digital_document_id);
CREATE INDEX idx_documents_customer ON physical_documents(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_documents_status ON physical_documents(status);
CREATE INDEX idx_documents_category ON physical_documents(document_category);
CREATE INDEX idx_documents_condition ON physical_documents(physical_condition);
CREATE INDEX idx_documents_priority ON physical_documents(conservation_priority);

-- Document movements indexes
CREATE INDEX idx_movements_document ON document_movements(document_id);
CREATE INDEX idx_movements_from_rack ON document_movements(from_rack_id) WHERE from_rack_id IS NOT NULL;
CREATE INDEX idx_movements_to_rack ON document_movements(to_rack_id);
CREATE INDEX idx_movements_status ON document_movements(status);
CREATE INDEX idx_movements_requested_at ON document_movements(requested_at DESC);

-- Customer assignments indexes
CREATE INDEX idx_assignments_customer ON customer_rack_assignments(customer_id);
CREATE INDEX idx_assignments_rack ON customer_rack_assignments(rack_id);
CREATE INDEX idx_assignments_status ON customer_rack_assignments(status);
CREATE INDEX idx_assignments_dates ON customer_rack_assignments(start_date, end_date);

-- ========================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shelves_updated_at BEFORE UPDATE ON shelves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_racks_updated_at BEFORE UPDATE ON racks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON physical_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON customer_rack_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SEED DATA (Optional - for testing)
-- ========================================

-- Sample Location
INSERT INTO locations (code, name, address, city, country, contact, timezone, created_by, updated_by)
VALUES (
    'LOC-DXB-001',
    'Dubai Jebel Ali',
    'Jebel Ali Industrial Area, Street 42',
    'Dubai',
    'UAE',
    '{"manager": "Ajay Kumar", "phone": "+971-4-1234567", "email": "ajay@example.com"}',
    'Asia/Dubai',
    '00000000-0000-0000-0000-000000000000', -- Replace with actual admin user ID
    '00000000-0000-0000-0000-000000000000'
);

-- Migration complete message
SELECT 'Warehouse Management System tables created successfully!' AS status;
