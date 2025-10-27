"""
Fix array data in database - convert empty string arrays to NULL
"""
import psycopg2
from app.config import settings

def fix_arrays():
    """Fix array fields that are empty strings"""
    try:
        # Parse database URL
        db_url = settings.DATABASE_URL
        db_url = db_url.replace('postgresql://', '')
        user_pass, host_port_db = db_url.split('@')
        user, password = user_pass.split(':')
        host_port, dbname = host_port_db.split('/')
        host, port = host_port.split(':')

        # Connect to database
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=dbname,
            user=user,
            password=password
        )
        conn.autocommit = True
        cursor = conn.cursor()

        print("Fixing document_types table...")
        cursor.execute("""
            UPDATE document_types
            SET restricted_to_roles = NULL
            WHERE restricted_to_roles::text = '{}'
        """)
        print(f"Updated {cursor.rowcount} rows in document_types")

        cursor.close()
        conn.close()
        print("Done!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_arrays()
