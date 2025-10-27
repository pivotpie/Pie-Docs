"""
Auto-cleanup Digital Documents Without Physical Document Records
Automatically deletes digital documents that don't have physical_documents entries.
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'port': 5434,
    'database': 'piedocs',
    'user': 'piedocs',
    'password': 'piedocs123'
}

def main():
    """Main execution function"""
    print("=" * 80)
    print("AUTO-CLEANUP: DIGITAL DOCUMENTS WITHOUT PHYSICAL RECORDS")
    print("=" * 80)

    conn = psycopg2.connect(**DB_CONFIG)

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Find documents without physical records
            print("\n[STEP 1] Finding documents WITHOUT physical_documents records...")
            cursor.execute("""
                SELECT d.id, d.title, d.file_path
                FROM documents d
                LEFT JOIN physical_documents pd ON d.id = pd.digital_document_id
                WHERE pd.id IS NULL
                ORDER BY d.created_at DESC
            """)
            orphaned = cursor.fetchall()

            # Find documents with physical records
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM documents d
                INNER JOIN physical_documents pd ON d.id = pd.digital_document_id
            """)
            active_count = cursor.fetchone()['count']

            print(f"\n📊 SUMMARY:")
            print(f"  ✓ Documents WITH physical records (KEEPING): {active_count}")
            print(f"  ❌ Documents WITHOUT physical records (DELETING): {len(orphaned)}")

            if not orphaned:
                print("\n✨ No documents to delete!")
                return

            print(f"\nDocuments to be deleted:")
            for doc in orphaned:
                file_status = "FILE EXISTS" if doc['file_path'] and os.path.exists(doc['file_path']) else "NO FILE"
                print(f"  [{file_status}] {doc['id']}: {doc['title'][:60]}")

            orphaned_ids = [str(doc['id']) for doc in orphaned]

            # Delete in correct order
            print(f"\n[STEP 2] Deleting {len(orphaned)} documents and all dependencies...")

            deletion_steps = [
                ("approval_requests", "document_id", None),
                ("document_shares", "document_id", None),
                ("document_versions", "document_id", None),
                ("document_metadata", "document_id", None),
                ("ocr_results", "document_id", None),
                ("audit_logs", "resource_id", "resource_type = 'document'"),
                ("documents", "id", None),
            ]

            total_deleted = 0
            for table_name, column_name, extra_where in deletion_steps:
                try:
                    where_clause = f"{column_name} = ANY(%s::uuid[])"
                    if extra_where:
                        where_clause += f" AND {extra_where}"

                    # Count first
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE {where_clause}", (orphaned_ids,))
                    count = cursor.fetchone()['count']

                    if count > 0:
                        # Delete
                        cursor.execute(f"DELETE FROM {table_name} WHERE {where_clause}", (orphaned_ids,))
                        deleted = cursor.rowcount
                        total_deleted += deleted
                        print(f"  ✓ Deleted {deleted:4d} records from {table_name}")
                except psycopg2.Error as e:
                    if "does not exist" in str(e):
                        print(f"  ⚠️  Table {table_name} does not exist (skipping)")
                    else:
                        print(f"  ⚠️  Error with {table_name}: {str(e)}")

            # Commit the transaction
            conn.commit()

            print(f"\n✅ SUCCESS!")
            print(f"   Total records deleted: {total_deleted}")
            print(f"   Removed {len(orphaned)} digital documents without physical records")
            print(f"   Kept {active_count} digital documents with physical records")

            # Verify
            print(f"\n[STEP 3] Verifying cleanup...")
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM documents d
                LEFT JOIN physical_documents pd ON d.id = pd.digital_document_id
                WHERE pd.id IS NULL
            """)
            remaining = cursor.fetchone()['count']

            if remaining == 0:
                print("  ✓ All orphaned documents successfully removed!")
            else:
                print(f"  ⚠️  Warning: {remaining} orphaned documents still remain")

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise

    finally:
        conn.close()

if __name__ == "__main__":
    # Safety check
    if len(sys.argv) > 1 and sys.argv[1] == "--confirm":
        main()
    else:
        print("=" * 80)
        print("SAFETY CHECK")
        print("=" * 80)
        print("\nThis script will PERMANENTLY DELETE digital documents that don't have")
        print("physical_documents table entries.")
        print("\nTo proceed, run:")
        print("  python cleanup_orphaned_auto.py --confirm")
        print("\n" + "=" * 80)
