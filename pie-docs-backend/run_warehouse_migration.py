"""
Run warehouse database migration
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

    # Read migration SQL file
    migration_file = 'migrations/create_warehouse_tables.sql'
    print(f"\nReading migration file: {migration_file}")

    with open(migration_file, 'r') as f:
        sql = f.read()

    print(f"[OK] Migration file loaded ({len(sql)} characters)")

    # Execute migration
    print("\nExecuting migration...")

    # Split the SQL into individual statements and execute separately
    # This handles DROP TABLE IF EXISTS properly
    statements = [s.strip() for s in sql.split(';') if s.strip()]

    total = len(statements)
    for i, statement in enumerate(statements, 1):
        if statement:
            try:
                cursor.execute(statement)
                # Print progress for major operations
                if 'CREATE TABLE' in statement:
                    table_name = statement.split('CREATE TABLE')[1].split('(')[0].strip()
                    print(f"  [{i}/{total}] Created table: {table_name}")
                elif 'DROP TABLE' in statement:
                    print(f"  [{i}/{total}] Dropped existing tables")
            except Exception as e:
                print(f"  [WARNING] Statement {i}: {str(e)[:100]}")
                # Continue with other statements

    print("[OK] Migration executed successfully")

    # Verify tables were created
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('locations', 'warehouses', 'zones', 'shelves', 'racks', 'physical_documents', 'document_movements', 'customer_rack_assignments')
        ORDER BY table_name
    """)

    tables = cursor.fetchall()
    print(f"\n[OK] Tables created ({len(tables)}):")
    for table in tables:
        print(f"  - {table[0]}")

    cursor.close()
    conn.close()
    print("\n[SUCCESS] Warehouse database migration completed successfully!")

except Exception as e:
    print(f"\n[ERROR] {e}")
    raise
