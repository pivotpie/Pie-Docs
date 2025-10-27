-- Physical Documents System Migration
-- Creates all tables for barcode management, location tracking, and mobile scanning

-- ==========================================
-- Barcode Format Table
-- ==========================================
CREATE TABLE IF NOT EXISTS barcode_formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('linear', '2d')),
    standard VARCHAR(50) NOT NULL,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- Barcode Records Table (without FK constraints initially)
-- ==========================================
CREATE TABLE IF NOT EXISTS barcode_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) NOT NULL UNIQUE,
    format_id UUID NOT NULL REFERENCES barcode_formats(id) ON DELETE CASCADE,
    document_id UUID,
    asset_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    checksum VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barcode_records_code ON barcode_records(code);
CREATE INDEX IF NOT EXISTS idx_barcode_records_document_id ON barcode_records(document_id);
CREATE INDEX IF NOT EXISTS idx_barcode_records_asset_id ON barcode_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_barcode_records_format_id ON barcode_records(format_id);

-- ==========================================
-- Barcode Generation Jobs Table
-- ==========================================
CREATE TABLE IF NOT EXISTS barcode_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_ids UUID[] DEFAULT '{}',
    format VARCHAR(50) NOT NULL,
    prefix VARCHAR(50),
    suffix VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_barcode_jobs_status ON barcode_generation_jobs(status);

-- ==========================================
-- Storage Locations Table
-- ==========================================
CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('building', 'floor', 'room', 'cabinet', 'shelf', 'box')),
    parent_id UUID REFERENCES storage_locations(id) ON DELETE CASCADE,
    path TEXT DEFAULT '/',
    capacity INTEGER,
    current_count INTEGER DEFAULT 0,
    utilization DECIMAL(5,2) DEFAULT 0.00,
    barcode_id UUID REFERENCES barcode_records(id) ON DELETE SET NULL,
    coordinates JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_locations_parent_id ON storage_locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_type ON storage_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_storage_locations_path ON storage_locations(path);

-- ==========================================
-- Physical Assets Table
-- ==========================================
CREATE TABLE IF NOT EXISTS physical_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    barcode_id UUID REFERENCES barcode_records(id) ON DELETE SET NULL,
    location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_assets_barcode_id ON physical_assets(barcode_id);
CREATE INDEX IF NOT EXISTS idx_physical_assets_location_id ON physical_assets(location_id);
CREATE INDEX IF NOT EXISTS idx_physical_assets_status ON physical_assets(status);

-- ==========================================
-- Physical Documents Table
-- ==========================================
CREATE TABLE IF NOT EXISTS physical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digital_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    barcode_id UUID REFERENCES barcode_records(id) ON DELETE SET NULL,
    location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'missing', 'damaged', 'in_transit', 'archived')),
    last_seen_at TIMESTAMP,
    notes TEXT,
    checked_out_by UUID REFERENCES users(id) ON DELETE SET NULL,
    checked_out_at TIMESTAMP,
    due_back_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_documents_digital_id ON physical_documents(digital_document_id);
CREATE INDEX IF NOT EXISTS idx_physical_documents_barcode_id ON physical_documents(barcode_id);
CREATE INDEX IF NOT EXISTS idx_physical_documents_location_id ON physical_documents(location_id);
CREATE INDEX IF NOT EXISTS idx_physical_documents_status ON physical_documents(status);

-- ==========================================
-- Location Movements Table
-- ==========================================
CREATE TABLE IF NOT EXISTS location_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('document', 'asset')),
    item_id UUID NOT NULL,
    from_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
    to_location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
    moved_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    moved_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_location_movements_item ON location_movements(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_location_movements_from ON location_movements(from_location_id);
CREATE INDEX IF NOT EXISTS idx_location_movements_to ON location_movements(to_location_id);
CREATE INDEX IF NOT EXISTS idx_location_movements_date ON location_movements(moved_at);

-- ==========================================
-- Print Templates Table
-- ==========================================
CREATE TABLE IF NOT EXISTS print_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dimensions JSONB NOT NULL,
    elements JSONB DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_templates_default ON print_templates(is_default);

-- ==========================================
-- Printers Table
-- ==========================================
CREATE TABLE IF NOT EXISTS printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    printer_type VARCHAR(20) NOT NULL CHECK (printer_type IN ('label', 'standard')),
    model VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'error')),
    capabilities TEXT[] DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printers_status ON printers(status);
CREATE INDEX IF NOT EXISTS idx_printers_default ON printers(is_default);

-- ==========================================
-- Print Jobs Table
-- ==========================================
CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES print_templates(id) ON DELETE CASCADE,
    barcode_ids UUID[] NOT NULL,
    printer_id UUID REFERENCES printers(id) ON DELETE SET NULL,
    copies INTEGER DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_template_id ON print_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer_id ON print_jobs(printer_id);

-- ==========================================
-- Scan Sessions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS scan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(20) DEFAULT 'barcode' CHECK (session_type IN ('barcode', 'document', 'batch')),
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    scanned_count INTEGER DEFAULT 0,
    captured_count INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_scan_sessions_user_id ON scan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_status ON scan_sessions(status);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_started_at ON scan_sessions(started_at);

-- ==========================================
-- Scanned Items Table
-- ==========================================
CREATE TABLE IF NOT EXISTS scanned_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
    barcode VARCHAR(255) NOT NULL,
    format VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    validated BOOLEAN DEFAULT FALSE,
    validation_result JSONB,
    metadata JSONB DEFAULT '{}',
    location_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scanned_items_session_id ON scanned_items(session_id);
CREATE INDEX IF NOT EXISTS idx_scanned_items_barcode ON scanned_items(barcode);
CREATE INDEX IF NOT EXISTS idx_scanned_items_timestamp ON scanned_items(timestamp);

-- ==========================================
-- Captured Documents Table
-- ==========================================
CREATE TABLE IF NOT EXISTS captured_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
    original_image_url TEXT NOT NULL,
    enhanced_image_url TEXT,
    document_type VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    pages INTEGER DEFAULT 1,
    timestamp TIMESTAMP DEFAULT NOW(),
    location_data JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    ocr_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_captured_documents_session_id ON captured_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_captured_documents_status ON captured_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_captured_documents_timestamp ON captured_documents(timestamp);

-- ==========================================
-- Batch Sessions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS batch_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_type VARCHAR(20) NOT NULL CHECK (batch_type IN ('barcode', 'document')),
    target_count INTEGER NOT NULL,
    auto_advance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'processing', 'failed')),
    items_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_batch_sessions_user_id ON batch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_sessions_status ON batch_sessions(status);

-- ==========================================
-- Batch Items Table
-- ==========================================
CREATE TABLE IF NOT EXISTS batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batch_sessions(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('barcode', 'document')),
    data TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ON batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_status ON batch_items(status);

-- ==========================================
-- Offline Operations Table
-- ==========================================
CREATE TABLE IF NOT EXISTS offline_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    retry_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    last_attempt TIMESTAMP,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_offline_operations_user_id ON offline_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_operations_status ON offline_operations(status);
CREATE INDEX IF NOT EXISTS idx_offline_operations_timestamp ON offline_operations(timestamp);

-- ==========================================
-- Add Foreign Key Constraints for barcode_records
-- ==========================================
DO $$
BEGIN
    -- Add FK for asset_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'barcode_records_asset_id_fkey'
    ) THEN
        ALTER TABLE barcode_records
        ADD CONSTRAINT barcode_records_asset_id_fkey
        FOREIGN KEY (asset_id) REFERENCES physical_assets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ==========================================
-- Insert Default Barcode Formats
-- ==========================================
INSERT INTO barcode_formats (name, type, standard, configuration) VALUES
    ('Code 128', 'linear', 'CODE128', '{"height": 50, "displayValue": true, "width": 2}'),
    ('Code 39', 'linear', 'CODE39', '{"height": 50, "displayValue": true, "width": 2}'),
    ('Code 93', 'linear', 'CODE93', '{"height": 50, "displayValue": true, "width": 2}'),
    ('EAN-13', 'linear', 'EAN13', '{"height": 50, "displayValue": true, "width": 2}'),
    ('EAN-8', 'linear', 'EAN8', '{"height": 50, "displayValue": true, "width": 2}'),
    ('UPC-A', 'linear', 'UPC', '{"height": 50, "displayValue": true, "width": 2}'),
    ('UPC-E', 'linear', 'UPCE', '{"height": 50, "displayValue": true, "width": 2}'),
    ('ITF', 'linear', 'ITF', '{"height": 50, "displayValue": true, "width": 2}'),
    ('ITF-14', 'linear', 'ITF14', '{"height": 50, "displayValue": true, "width": 2}'),
    ('MSI Plessey', 'linear', 'MSI', '{"height": 50, "displayValue": true, "width": 2}'),
    ('Pharmacode', 'linear', 'pharmacode', '{"height": 50, "displayValue": true, "width": 2}'),
    ('Codabar', 'linear', 'codabar', '{"height": 50, "displayValue": true, "width": 2}'),
    ('QR Code', '2d', 'QR', '{"width": 256, "height": 256, "errorCorrectionLevel": "M"}'),
    ('Data Matrix', '2d', 'DATAMATRIX', '{"width": 128, "height": 128}')
ON CONFLICT DO NOTHING;

-- ==========================================
-- Insert Default Print Template
-- ==========================================
INSERT INTO print_templates (name, description, dimensions, elements, is_default) VALUES
    ('Standard Label 50x25mm', 'Default label template for standard barcodes',
     '{"width": 50, "height": 25, "unit": "mm"}',
     '[
        {"id": "barcode", "type": "barcode", "position": {"x": 5, "y": 5}, "size": {"width": 40, "height": 15}},
        {"id": "text", "type": "text", "position": {"x": 5, "y": 22}, "size": {"width": 40, "height": 3}, "properties": {"fontSize": 8}}
     ]',
     true)
ON CONFLICT DO NOTHING;

-- ==========================================
-- Create update timestamp triggers
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_barcode_records_updated_at ON barcode_records;
CREATE TRIGGER update_barcode_records_updated_at BEFORE UPDATE ON barcode_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_storage_locations_updated_at ON storage_locations;
CREATE TRIGGER update_storage_locations_updated_at BEFORE UPDATE ON storage_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_physical_assets_updated_at ON physical_assets;
CREATE TRIGGER update_physical_assets_updated_at BEFORE UPDATE ON physical_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_physical_documents_updated_at ON physical_documents;
CREATE TRIGGER update_physical_documents_updated_at BEFORE UPDATE ON physical_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_print_templates_updated_at ON print_templates;
CREATE TRIGGER update_print_templates_updated_at BEFORE UPDATE ON print_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_printers_updated_at ON printers;
CREATE TRIGGER update_printers_updated_at BEFORE UPDATE ON printers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_barcode_formats_updated_at ON barcode_formats;
CREATE TRIGGER update_barcode_formats_updated_at BEFORE UPDATE ON barcode_formats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Create function to update location utilization
-- ==========================================
CREATE OR REPLACE FUNCTION update_location_utilization()
RETURNS TRIGGER AS $$
DECLARE
    loc_id UUID;
BEGIN
    -- Handle INSERT/UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        loc_id := NEW.location_id;
    -- Handle DELETE
    ELSIF TG_OP = 'DELETE' THEN
        loc_id := OLD.location_id;
    END IF;

    -- Update location utilization if location exists
    IF loc_id IS NOT NULL THEN
        UPDATE storage_locations
        SET current_count = (
            SELECT COUNT(*)
            FROM physical_documents
            WHERE location_id = loc_id
        ) + (
            SELECT COUNT(*)
            FROM physical_assets
            WHERE location_id = loc_id
        ),
        utilization = CASE
            WHEN capacity > 0 THEN (
                ((SELECT COUNT(*) FROM physical_documents WHERE location_id = loc_id) +
                 (SELECT COUNT(*) FROM physical_assets WHERE location_id = loc_id))::DECIMAL
                / capacity::DECIMAL * 100
            )
            ELSE 0
        END
        WHERE id = loc_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_physical_documents_utilization ON physical_documents;
CREATE TRIGGER update_physical_documents_utilization
AFTER INSERT OR UPDATE OR DELETE ON physical_documents
FOR EACH ROW EXECUTE FUNCTION update_location_utilization();

DROP TRIGGER IF EXISTS update_physical_assets_utilization ON physical_assets;
CREATE TRIGGER update_physical_assets_utilization
AFTER INSERT OR UPDATE OR DELETE ON physical_assets
FOR EACH ROW EXECUTE FUNCTION update_location_utilization();
