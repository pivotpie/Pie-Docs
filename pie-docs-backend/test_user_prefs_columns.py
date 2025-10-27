"""Test user preferences columns"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db_cursor, init_db_pool

init_db_pool()

try:
    with get_db_cursor() as cursor:
        # Get table columns
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'user_preferences'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()

        print("User preferences table columns:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']}")

        # Try the actual query from the endpoint
        print("\nTesting the actual query...")
        cursor.execute("""
            SELECT id, user_id, theme, language, timezone, date_format, time_format,
                   notifications_email, notifications_inapp, notifications_push,
                   default_document_view, sidebar_collapsed, email_digest_frequency
            FROM user_preferences
            LIMIT 1
        """)
        result = cursor.fetchone()
        if result:
            print(f"[OK] Query successful, found record: {dict(result)}")
        else:
            print("[INFO] No records found")

except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
