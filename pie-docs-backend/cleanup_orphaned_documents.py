"""
Cleanup Orphaned Digital Documents
This script removes digital document records from the database where the physical file no longer exists on disk.
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

def find_orphaned_documents(cursor):
    """Find all documents where the file_path doesn't exist on disk"""
    cursor.execute("""
        SELECT id, title, file_path, created_at
        FROM documents
        WHERE file_path IS NOT NULL
        ORDER BY created_at DESC
    """)

    documents = cursor.fetchall()
    orphaned = []
    active = []

    print(f"\nChecking {len(documents)} documents for orphaned files...")

    for doc in documents:
        file_path = doc['file_path']
        if file_path and not os.path.exists(file_path):
            orphaned.append(doc)
            print(f"  ❌ ORPHANED: {doc['id']} - {doc['title'][:50]}")
        else:
            active.append(doc)
            print(f"  ✓ ACTIVE: {doc['id']} - {doc['title'][:50]}")

    return orphaned, active

def get_foreign_key_tables(cursor):
    """Get all tables that have foreign keys referencing the documents table"""
    cursor.execute("""
        SELECT
            tc.table_name,
            kcu.column_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'documents'
        ORDER BY tc.table_name
    """)

    return cursor.fetchall()

def count_dependent_records(cursor, document_ids):
    """Count how many dependent records exist for the orphaned documents"""
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
        ('physical_documents', 'digital_document_id'),
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

def delete_orphaned_documents(cursor, document_ids, dry_run=True):
    """Delete orphaned documents and all dependent records"""
    if not document_ids:
        print("\n✓ No orphaned documents to delete!")
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
        ('physical_documents', 'digital_document_id', None),
        ('documents', 'id', None),
    ]

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Deleting orphaned documents and dependencies...")

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
                    print(f"  ✓ Deleted {deleted} records from {table_name}")
        except Exception as e:
            print(f"  ⚠️  Error with {table_name}: {str(e)}")

def main():
    """Main execution function"""
    print("=" * 80)
    print("ORPHANED DOCUMENTS CLEANUP SCRIPT")
    print("=" * 80)

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Step 1: Find orphaned documents
            print("\n[STEP 1] Finding orphaned documents...")
            orphaned, active = find_orphaned_documents(cursor)

            print(f"\n📊 SUMMARY:")
            print(f"  ✓ Active documents (files exist): {len(active)}")
            print(f"  ❌ Orphaned documents (files missing): {len(orphaned)}")

            if not orphaned:
                print("\n✨ No orphaned documents found! Database is clean.")
                return

            # Step 2: Show foreign key relationships
            print("\n[STEP 2] Checking foreign key relationships...")
            fk_tables = get_foreign_key_tables(cursor)
            print(f"  Found {len(fk_tables)} tables with foreign keys to documents:")
            for fk in fk_tables:
                print(f"    - {fk['table_name']}.{fk['column_name']}")

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
            delete_orphaned_documents(cursor, orphaned_ids, dry_run=True)

            # Step 5: Confirm deletion
            print("\n" + "=" * 80)
            print("READY TO DELETE")
            print("=" * 80)
            print(f"This will DELETE {len(orphaned)} orphaned documents and all dependent records.")
            print("\nDocuments to be deleted:")
            for doc in orphaned[:10]:  # Show first 10
                print(f"  - {doc['id']}: {doc['title'][:60]}")
            if len(orphaned) > 10:
                print(f"  ... and {len(orphaned) - 10} more")

            response = input("\n⚠️  Do you want to proceed with ACTUAL DELETION? (yes/no): ")

            if response.lower() == 'yes':
                print("\n[STEP 5] Performing ACTUAL DELETION...")
                delete_orphaned_documents(cursor, orphaned_ids, dry_run=False)
                conn.commit()
                print("\n✅ SUCCESS! All orphaned documents have been deleted.")
            else:
                print("\n❌ Deletion cancelled. No changes were made.")
                conn.rollback()

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        conn.rollback()
        raise

    finally:
        conn.close()

if __name__ == "__main__":
    main()
