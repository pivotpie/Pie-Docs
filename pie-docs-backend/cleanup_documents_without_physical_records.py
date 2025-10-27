"""
Cleanup Digital Documents Without Physical Document Records
This script removes digital document records that don't have corresponding physical_documents entries.
It handles all foreign key constraints by deleting dependent records first.
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from uuid import UUID

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

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG)

def find_documents_without_physical_records(cursor):
    """Find all digital documents that don't have physical_documents entries"""
    cursor.execute("""
        SELECT d.id, d.title, d.file_path, d.created_at
        FROM documents d
        LEFT JOIN physical_documents pd ON d.id = pd.digital_document_id
        WHERE pd.id IS NULL
        ORDER BY d.created_at DESC
    """)

    orphaned = cursor.fetchall()

    print(f"\nFound {len(orphaned)} documents without physical_documents records:")
    for doc in orphaned:
        file_exists = "FILE EXISTS" if doc['file_path'] and os.path.exists(doc['file_path']) else "NO FILE"
        print(f"  [{file_exists}] {doc['id']} - {doc['title'][:60]}")

    return orphaned

def find_documents_with_physical_records(cursor):
    """Find all digital documents that DO have physical_documents entries"""
    cursor.execute("""
        SELECT d.id, d.title, d.file_path, pd.id as physical_id
        FROM documents d
        INNER JOIN physical_documents pd ON d.id = pd.digital_document_id
        ORDER BY d.created_at DESC
    """)

    active = cursor.fetchall()

    print(f"\nFound {len(active)} documents WITH physical_documents records (these will be KEPT):")
    for doc in active:
        print(f"  ✓ {doc['id']} - {doc['title'][:60]}")

    return active

def count_dependent_records(cursor, document_ids):
    """Count how many dependent records exist for the documents"""
    if not document_ids:
        return {}

    id_list = ','.join([f"'{doc_id}'" for doc_id in document_ids])

    tables_to_check = [
        ('approval_requests', 'document_id'),
        ('document_shares', 'document_id'),
        ('document_versions', 'document_id'),
        ('document_metadata', 'document_id'),
        ('ocr_results', 'document_id'),
        ('workflow_instances', 'document_id'),
        ('audit_logs', 'resource_id'),
    ]

    counts = {}
    for table_name, column_name in tables_to_check:
        try:
            cursor.execute(f"""
                SELECT COUNT(*) as count
                FROM {table_name}
                WHERE {column_name} IN ({id_list})
            """)
            result = cursor.fetchone()
            count = result['count'] if result else 0
            if count > 0:
                counts[table_name] = count
        except Exception as e:
            print(f"  ⚠️  Could not check {table_name}: {str(e)}")

    return counts

def delete_documents(cursor, document_ids, dry_run=True):
    """Delete documents and all dependent records"""
    if not document_ids:
        print("\n✓ No documents to delete!")
        return

    id_list = ','.join([f"'{doc_id}'" for doc_id in document_ids])

    # Define deletion order (child tables first, then parent)
    deletion_order = [
        ('audit_logs', 'resource_id', "resource_type = 'document'"),
        ('workflow_instances', 'document_id', None),
        ('document_shares', 'document_id', None),
        ('document_versions', 'document_id', None),
        ('approval_requests', 'document_id', None),
        ('ocr_results', 'document_id', None),
        ('document_metadata', 'document_id', None),
        ('documents', 'id', None),
    ]

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Deleting documents and dependencies...")

    total_deleted = 0
    for table_name, column_name, extra_where in deletion_order:
        where_clause = f"{column_name} IN ({id_list})"
        if extra_where:
            where_clause += f" AND {extra_where}"

        try:
            # First count
            cursor.execute(f"SELECT COUNT(*) as count FROM {table_name} WHERE {where_clause}")
            count = cursor.fetchone()['count']

            if count > 0:
                if dry_run:
                    print(f"  [DRY RUN] Would delete {count} records from {table_name}")
                else:
                    cursor.execute(f"DELETE FROM {table_name} WHERE {where_clause}")
                    deleted = cursor.rowcount
                    total_deleted += deleted
                    print(f"  ✓ Deleted {deleted} records from {table_name}")
        except Exception as e:
            print(f"  ⚠️  Error with {table_name}: {str(e)}")

    return total_deleted

def main():
    """Main execution function"""
    print("=" * 80)
    print("CLEANUP: DIGITAL DOCUMENTS WITHOUT PHYSICAL RECORDS")
    print("=" * 80)

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Step 1: Find documents with physical records (KEEP these)
            print("\n[STEP 1] Finding documents WITH physical_documents records (will be KEPT)...")
            active = find_documents_with_physical_records(cursor)

            # Step 2: Find documents without physical records (DELETE these)
            print("\n[STEP 2] Finding documents WITHOUT physical_documents records (will be DELETED)...")
            orphaned = find_documents_without_physical_records(cursor)

            print(f"\n📊 SUMMARY:")
            print(f"  ✓ Documents WITH physical records (KEEP): {len(active)}")
            print(f"  ❌ Documents WITHOUT physical records (DELETE): {len(orphaned)}")

            if not orphaned:
                print("\n✨ No documents to delete! All digital documents have physical records.")
                return

            # Step 3: Count dependent records
            print("\n[STEP 3] Counting dependent records...")
            orphaned_ids = [doc['id'] for doc in orphaned]
            dependent_counts = count_dependent_records(cursor, orphaned_ids)

            if dependent_counts:
                print(f"  Found dependent records in {len(dependent_counts)} tables:")
                for table, count in dependent_counts.items():
                    print(f"    - {table}: {count} records")
            else:
                print("  No dependent records found.")

            # Step 4: DRY RUN
            print("\n[STEP 4] Performing DRY RUN...")
            delete_documents(cursor, orphaned_ids, dry_run=True)

            # Step 5: Confirm deletion
            print("\n" + "=" * 80)
            print("READY TO DELETE")
            print("=" * 80)
            print(f"This will DELETE {len(orphaned)} documents WITHOUT physical records.")
            print(f"Documents WITH physical records ({len(active)}) will be KEPT.\n")

            print("Documents to be deleted:")
            for doc in orphaned[:20]:  # Show first 20
                file_status = "FILE EXISTS" if doc['file_path'] and os.path.exists(doc['file_path']) else "NO FILE"
                print(f"  [{file_status}] {doc['id']}: {doc['title'][:60]}")
            if len(orphaned) > 20:
                print(f"  ... and {len(orphaned) - 20} more")

            response = input("\n⚠️  Do you want to proceed with ACTUAL DELETION? (yes/no): ")

            if response.lower() == 'yes':
                print("\n[STEP 5] Performing ACTUAL DELETION...")
                total = delete_documents(cursor, orphaned_ids, dry_run=False)
                conn.commit()
                print(f"\n✅ SUCCESS! Deleted {total} total records across all tables.")
                print(f"   Removed {len(orphaned)} digital documents without physical records.")
                print(f"   Kept {len(active)} digital documents with physical records.")
            else:
                print("\n❌ Deletion cancelled. No changes were made.")
                conn.rollback()

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise

    finally:
        conn.close()

if __name__ == "__main__":
    main()
