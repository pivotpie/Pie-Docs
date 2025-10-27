"""
Check which warehouse tables already exist
"""
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

# Parse database URL
db_parts = DATABASE_URL.replace('postgresql://', '').split('@')
user_pass = db_parts[0].split(':')
host_db = db_parts[1].split('/')
host_port = host_db[0].split(':')

username = user_pass[0]
password = user_pass[1]
host = host_port[0]
port = host_port[1]
database = host_db[1]

# Connect to database
conn = psycopg2.connect(
    host=host,
    port=port,
    database=database,
    user=username,
    password=password
)
cursor = conn.cursor()

# Check for warehouse tables
warehouse_tables = ['locations', 'warehouses', 'zones', 'shelves', 'racks', 'physical_documents', 'document_movements', 'customer_rack_assignments']

print("Checking for existing warehouse tables...\n")

cursor.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY(%s)
    ORDER BY table_name
""", (warehouse_tables,))

existing = cursor.fetchall()

if existing:
    print(f"Found {len(existing)} existing warehouse tables:")
    for table in existing:
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"  - {table[0]} ({count} rows)")

    print("\nThese tables will be dropped and recreated.")
else:
    print("No existing warehouse tables found. Migration will create new tables.")

cursor.close()
conn.close()
