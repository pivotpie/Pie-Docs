"""
Fix duplicate barcode formats and add unique constraint
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_cursor, init_db_pool

def fix_barcode_duplicates():
    """Remove duplicate barcode formats and add unique constraint"""

    with get_db_cursor(commit=True) as cursor:
        print("Creating temp table with unique formats...")
        cursor.execute("""
            CREATE TEMP TABLE unique_formats AS
            SELECT DISTINCT ON (standard) *
            FROM barcode_formats
            ORDER BY standard, created_at ASC
        """)

        print("Updating foreign key references...")
        cursor.execute("""
            UPDATE barcode_records br
            SET format_id = uf.id
            FROM barcode_formats bf
            JOIN unique_formats uf ON bf.standard = uf.standard
            WHERE br.format_id = bf.id
              AND bf.id != uf.id
        """)

        print("Deleting duplicate formats...")
        cursor.execute("""
            DELETE FROM barcode_formats
            WHERE id NOT IN (SELECT id FROM unique_formats)
        """)
        deleted = cursor.rowcount
        print(f"Deleted {deleted} duplicate formats")

        # Check if constraint already exists
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM pg_constraint
            WHERE conname = 'barcode_formats_standard_unique'
        """)
        exists = cursor.fetchone()['count'] > 0

        if not exists:
            print("Adding unique constraint on standard field...")
            cursor.execute("""
                ALTER TABLE barcode_formats
                ADD CONSTRAINT barcode_formats_standard_unique UNIQUE (standard)
            """)
            print("Unique constraint added successfully!")
        else:
            print("Unique constraint already exists, skipping...")

        print("Cleaning up temp table...")
        cursor.execute("DROP TABLE IF EXISTS unique_formats")

        # Verify results
        cursor.execute("SELECT COUNT(*) as count FROM barcode_formats")
        total = cursor.fetchone()['count']
        print(f"\nFinal count: {total} unique barcode formats")

        cursor.execute("""
            SELECT name, type, standard
            FROM barcode_formats
            ORDER BY type, name
        """)
        formats = cursor.fetchall()
        print("\nRemaining formats:")
        for fmt in formats:
            print(f"  - {fmt['name']} ({fmt['type']}, {fmt['standard']})")

if __name__ == "__main__":
    try:
        print("Initializing database connection pool...")
        init_db_pool()
        fix_barcode_duplicates()
        print("\n[SUCCESS] Migration completed successfully!")
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
