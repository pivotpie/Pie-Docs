"""
Apply workflow enhancements migration to add barcode and location columns
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_cursor, init_db_pool

def apply_migration():
    """Apply workflow enhancements migration"""

    migration_file = os.path.join(
        os.path.dirname(__file__),
        'database',
        'migrations',
        '20-documents-workflow-enhancements.sql'
    )

    with open(migration_file, 'r') as f:
        migration_sql = f.read()

    print("Applying workflow enhancements migration...")

    with get_db_cursor(commit=True) as cursor:
        cursor.execute(migration_sql)
        print("Migration applied successfully!")

        # Verify columns were added
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'documents'
            AND column_name IN ('barcode_id', 'rack_id', 'classification_confidence', 'classification_reasoning')
            ORDER BY column_name
        """)

        columns = cursor.fetchall()
        print("\nAdded columns:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']}")

if __name__ == "__main__":
    try:
        print("Initializing database connection...")
        init_db_pool()
        apply_migration()
        print("\n[SUCCESS] Migration completed!")
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
