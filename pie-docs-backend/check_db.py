"""
Script to check database table
"""
import psycopg2
from app.config import settings

def check_table():
    """Check if document_types table exists and has data"""
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
        cursor = conn.cursor()

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'document_types'
            );
        """)
        exists = cursor.fetchone()[0]
        print(f"Table 'document_types' exists: {exists}")

        if exists:
            # Get count
            cursor.execute("SELECT COUNT(*) FROM document_types;")
            count = cursor.fetchone()[0]
            print(f"Number of rows: {count}")

            # Get sample data
            cursor.execute("SELECT * FROM document_types LIMIT 5;")
            rows = cursor.fetchall()
            print(f"\nSample data (first 5 rows):")
            for row in rows:
                print(row)

            # Get column names
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'document_types'
                ORDER BY ordinal_position;
            """)
            columns = cursor.fetchall()
            print(f"\nColumns:")
            for col in columns:
                print(f"  {col[0]}: {col[1]}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_table()
