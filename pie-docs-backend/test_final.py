"""Test the exact logic from the fixed endpoint"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_cursor, init_db_pool
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

        # Get table count
        cursor.execute(
            """
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_schema = 'public'
            """
        )
        table_count = cursor.fetchone()['count']

        # Get document count
        cursor.execute("SELECT COUNT(*) as count FROM documents")
        doc_count = cursor.fetchone()['count']

        # Get user count
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL")
        user_count = cursor.fetchone()['count']

        # Get workflow count
        cursor.execute("SELECT COUNT(*) as count FROM workflows")
        workflow_count = cursor.fetchone()['count']

        # Get connection stats
        cursor.execute(
            """
            SELECT count(*) as active_connections
            FROM pg_stat_activity
            WHERE state = 'active'
            """
        )
        active_conn = cursor.fetchone()['active_connections']

    # Get last backup in a separate transaction to avoid aborting main transaction
    last_backup = None
    try:
        with get_db_cursor() as cursor:
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
    except Exception as e:
        logger.warning(f"Could not fetch backup info (table may not exist): {e}")

    print(f"\n[SUCCESS] All queries completed!")
    print(f"Database size: {db_size}")
    print(f"Table count: {table_count}")
    print(f"Documents: {doc_count}")
    print(f"Users: {user_count}")
    print(f"Workflows: {workflow_count}")
    print(f"Last backup: {last_backup}")
    print(f"Active connections: {active_conn}")

except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
