"""
Run API Keys Migration
"""
import psycopg2
from pathlib import Path

DB_CONFIG = {
    'dbname': 'piedocs',
    'user': 'piedocs',
    'password': 'piedocs123',
    'host': 'localhost',
    'port': 5434
}

def main():
    migration_file = Path(__file__).parent / 'database' / 'migrations' / '20-api-keys.sql'

    print(f"Running migration: {migration_file.name}")

    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        print("[OK] API Keys migration successful!")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        raise

if __name__ == '__main__':
    main()
