-- Warehouse Print Management Tables
-- Tables for warehouse label printing jobs

-- Drop existing table if it exists
DROP TABLE IF EXISTS warehouse_print_jobs CASCADE;

-- Warehouse Print Jobs Table
CREATE TABLE warehouse_print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('zone', 'shelf', 'rack', 'document')),
    entity_ids UUID[] NOT NULL,
    printer_id UUID REFERENCES printers(id) ON DELETE SET NULL,
    copies INTEGER NOT NULL DEFAULT 1 CHECK (copies >= 1 AND copies <= 10),
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'printing', 'completed', 'failed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_warehouse_print_jobs_entity_type ON warehouse_print_jobs(entity_type);
CREATE INDEX idx_warehouse_print_jobs_status ON warehouse_print_jobs(status);
CREATE INDEX idx_warehouse_print_jobs_printer ON warehouse_print_jobs(printer_id);
CREATE INDEX idx_warehouse_print_jobs_created ON warehouse_print_jobs(created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_warehouse_print_jobs_timestamp()
RETURNS TRIGGER AS $BODY$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_warehouse_print_jobs_updated_at
BEFORE UPDATE ON warehouse_print_jobs
FOR EACH ROW
EXECUTE FUNCTION update_warehouse_print_jobs_timestamp();

-- Comments
COMMENT ON TABLE warehouse_print_jobs IS 'Print jobs for warehouse entity labels (zones, shelves, racks, documents)';
COMMENT ON COLUMN warehouse_print_jobs.entity_type IS 'Type of entity being printed: zone, shelf, rack, document';
COMMENT ON COLUMN warehouse_print_jobs.entity_ids IS 'Array of entity UUIDs to print labels for';
COMMENT ON COLUMN warehouse_print_jobs.copies IS 'Number of copies to print for each label';
COMMENT ON COLUMN warehouse_print_jobs.status IS 'Job status: queued, printing, completed, failed, cancelled';
