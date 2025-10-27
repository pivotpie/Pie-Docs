"""
Run warehouse print management database migration
"""
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
print(f"Connecting to database...")

# Parse database URL
# Format: postgresql://username:password@host:port/database
db_parts = DATABASE_URL.replace('postgresql://', '').split('@')
user_pass = db_parts[0].split(':')
host_db = db_parts[1].split('/')
host_port = host_db[0].split(':')

username = user_pass[0]
password = user_pass[1]
host = host_port[0]
port = host_port[1]
database = host_db[1]

print(f"Database: {database}")
print(f"Host: {host}:{port}")
print(f"User: {username}")

# Connect to database
try:
    conn = psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=username,
        password=password
    )
    conn.autocommit = True
    cursor = conn.cursor()
    print("[OK] Connected to database")

    # Drop existing table
    print("\nDropping existing warehouse_print_jobs table if exists...")
    cursor.execute("DROP TABLE IF EXISTS warehouse_print_jobs CASCADE")
    print("[OK] Table dropped")

    # Create warehouse_print_jobs table
    print("\nCreating warehouse_print_jobs table...")
    cursor.execute("""
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
        )
    """)
    print("[OK] Table created: warehouse_print_jobs")

    # Create indexes
    print("\nCreating indexes...")
    cursor.execute("CREATE INDEX idx_warehouse_print_jobs_entity_type ON warehouse_print_jobs(entity_type)")
    cursor.execute("CREATE INDEX idx_warehouse_print_jobs_status ON warehouse_print_jobs(status)")
    cursor.execute("CREATE INDEX idx_warehouse_print_jobs_printer ON warehouse_print_jobs(printer_id)")
    cursor.execute("CREATE INDEX idx_warehouse_print_jobs_created ON warehouse_print_jobs(created_at)")
    print("[OK] Indexes created")

    # Create trigger function
    print("\nCreating trigger function...")
    cursor.execute("""
        CREATE OR REPLACE FUNCTION update_warehouse_print_jobs_timestamp()
        RETURNS TRIGGER AS $BODY$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $BODY$ LANGUAGE plpgsql
    """)
    print("[OK] Trigger function created")

    # Create trigger
    print("Creating trigger...")
    cursor.execute("""
        CREATE TRIGGER trigger_warehouse_print_jobs_updated_at
        BEFORE UPDATE ON warehouse_print_jobs
        FOR EACH ROW
        EXECUTE FUNCTION update_warehouse_print_jobs_timestamp()
    """)
    print("[OK] Trigger created")

    # Verify table was created
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'warehouse_print_jobs'
    """)

    table = cursor.fetchone()
    if table:
        print(f"\n[SUCCESS] Warehouse print management migration completed successfully!")
        print(f"  - warehouse_print_jobs table created")
    else:
        print("\n[ERROR] Table was not created successfully")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"\n[ERROR] {e}")
    raise
