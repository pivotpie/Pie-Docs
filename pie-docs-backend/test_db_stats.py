"""Quick test to see database stats endpoint error"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_cursor, init_db_pool

# Initialize pool
init_db_pool()

try:
    with get_db_cursor() as cursor:
        # Get database size
        cursor.execute(
            """
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
            """
        )
        db_size = cursor.fetchone()['size']
        print(f"[OK] Database size: {db_size}")

        # Get table count
        cursor.execute(
            """
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_schema = 'public'
            """
        )
        table_count = cursor.fetchone()['count']
        print(f"[OK] Table count: {table_count}")

        # Get document count
        cursor.execute("SELECT COUNT(*) as count FROM documents")
        doc_count = cursor.fetchone()['count']
        print(f"[OK] Document count: {doc_count}")

        # Get user count
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL")
        user_count = cursor.fetchone()['count']
        print(f"[OK] User count: {user_count}")

        # Get workflow count
        cursor.execute("SELECT COUNT(*) as count FROM workflows")
        workflow_count = cursor.fetchone()['count']
        print(f"[OK] Workflow count: {workflow_count}")

        # Get last backup (handle missing table gracefully)
        last_backup = None
        try:
            cursor.execute(
                """
                SELECT completed_at
                FROM database_backups
                WHERE backup_status = 'completed'
                ORDER BY completed_at DESC
                LIMIT 1
                """
            )
            last_backup_row = cursor.fetchone()
            last_backup = str(last_backup_row['completed_at']) if last_backup_row else None
            print(f"[OK] Last backup: {last_backup}")
        except Exception as e:
            print(f"[WARN] Could not fetch backup info (table may not exist): {e}")

        # Get connection stats
        cursor.execute(
            """
            SELECT count(*) as active_connections
            FROM pg_stat_activity
            WHERE state = 'active'
            """
        )
        active_conn = cursor.fetchone()['active_connections']
        print(f"[OK] Active connections: {active_conn}")

        print("\n[SUCCESS] All queries successful!")

except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
