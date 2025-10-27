"""Test user preferences table"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_cursor, init_db_pool

init_db_pool()

try:
    with get_db_cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'user_preferences'
            )
        """)
        exists = cursor.fetchone()['exists']

        if exists:
            print("[OK] user_preferences table exists")

            # Try to query it
            cursor.execute("SELECT COUNT(*) as count FROM user_preferences")
            count = cursor.fetchone()['count']
            print(f"[OK] Found {count} user preferences records")
        else:
            print("[ERROR] user_preferences table does NOT exist")

except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
