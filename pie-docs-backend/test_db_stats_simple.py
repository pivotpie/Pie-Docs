"""Quick test to isolate the failing query"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_cursor, init_db_pool

# Initialize pool
init_db_pool()

try:
    with get_db_cursor() as cursor:
        print("Testing each query separately...")

        # Test workflows table
        print("\n1. Testing workflows count...")
        try:
            cursor.execute("SELECT COUNT(*) as count FROM workflows")
            workflow_count = cursor.fetchone()['count']
            print(f"   [OK] Workflow count: {workflow_count}")
        except Exception as e:
            print(f"   [ERROR] Workflows query failed: {e}")

        # Test database_backups with error handling
        print("\n2. Testing database_backups (with error handling)...")
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
            print(f"   [OK] Last backup: {last_backup}")
        except Exception as e:
            print(f"   [WARN] Backup table doesn't exist (expected): {type(e).__name__}")

        # Test active connections
        print("\n3. Testing active connections...")
        try:
            cursor.execute(
                """
                SELECT count(*) as active_connections
                FROM pg_stat_activity
                WHERE state = 'active'
                """
            )
            active_conn = cursor.fetchone()['active_connections']
            print(f"   [OK] Active connections: {active_conn}")
        except Exception as e:
            print(f"   [ERROR] Connection stats failed: {e}")

        print("\n[SUCCESS] Test completed!")

except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
