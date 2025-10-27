"""
Script to run database migrations
"""
import psycopg2
from app.config import settings

def run_migration(migration_file):
    """Run a SQL migration file"""
    try:
        # Parse database URL
        db_url = settings.DATABASE_URL
        # postgresql://user:pass@host:port/dbname
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

        # Read and execute migration file
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()

        print(f"Running migration: {migration_file}")
        cursor.execute(sql)
        print("Migration completed successfully!")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Error running migration: {e}")
        raise

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        migration_file = sys.argv[1]
    else:
        migration_file = "database/migrations/13-document-types.sql"

    run_migration(migration_file)
