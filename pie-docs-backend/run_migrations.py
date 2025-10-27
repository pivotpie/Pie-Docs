"""
Database Migration Runner
Runs all SQL migration files in order
"""
import psycopg2
import os
from pathlib import Path
import sys

# Database configuration
DB_CONFIG = {
    'dbname': 'piedocs',
    'user': 'piedocs',
    'password': 'piedocs123',
    'host': 'localhost',
    'port': 5434  # pgvector container port
}

def run_migration(cursor, migration_file):
    """Run a single migration file"""
    print(f"\n{'='*60}")
    print(f"Running migration: {migration_file.name}")
    print(f"{'='*60}")

    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    try:
        cursor.execute(sql)
        print(f"[OK] Successfully executed: {migration_file.name}")
        return True
    except Exception as e:
        print(f"[ERROR] Error in {migration_file.name}:")
        print(f"  {str(e)}")
        return False

def main():
    # Get migrations directory
    migrations_dir = Path(__file__).parent / 'database' / 'migrations'

    if not migrations_dir.exists():
        print(f"Error: Migrations directory not found: {migrations_dir}")
        sys.exit(1)

    # Get migration files to run (only our new ones)
    migration_files = [
        migrations_dir / '15-document-storage-enhancements.sql',
        migrations_dir / '16-document-relationships.sql',
        migrations_dir / '17-ocr-enhancements-v2.sql',
    ]

    # Filter to only existing files
    migration_files = [f for f in migration_files if f.exists()]

    if not migration_files:
        print("No migration files found!")
        sys.exit(1)

    print(f"\nFound {len(migration_files)} migration(s) to run:")
    for mf in migration_files:
        print(f"  - {mf.name}")

    # Connect to database
    print(f"\nConnecting to database '{DB_CONFIG['dbname']}'...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False  # Use transactions
        cursor = conn.cursor()
        print("[OK] Connected successfully")
    except Exception as e:
        print(f"[ERROR] Failed to connect to database:")
        print(f"  {str(e)}")
        print("\nPlease ensure:")
        print("  1. PostgreSQL is running")
        print("  2. Database exists")
        print("  3. Credentials are correct")
        sys.exit(1)

    # Run migrations
    successful = 0
    failed = 0

    for migration_file in migration_files:
        if run_migration(cursor, migration_file):
            successful += 1
            try:
                conn.commit()
                print(f"[OK] Transaction committed for {migration_file.name}")
            except Exception as e:
                print(f"[ERROR] Failed to commit transaction: {e}")
                conn.rollback()
                failed += 1
                break
        else:
            failed += 1
            print(f"[ERROR] Rolling back transaction...")
            conn.rollback()
            break

    # Summary
    print(f"\n{'='*60}")
    print("MIGRATION SUMMARY")
    print(f"{'='*60}")
    print(f"Total migrations: {len(migration_files)}")
    print(f"[OK] Successful: {successful}")
    print(f"[ERROR] Failed: {failed}")

    # Close connection
    cursor.close()
    conn.close()

    if failed > 0:
        print("\n[WARNING] Some migrations failed. Please fix errors and try again.")
        sys.exit(1)
    else:
        print("\n[SUCCESS] All migrations completed successfully!")
        sys.exit(0)

if __name__ == '__main__':
    main()
