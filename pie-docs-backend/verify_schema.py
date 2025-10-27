"""
Verify all approval-related tables exist and have correct schema
"""
import os
os.environ['DATABASE_URL'] = 'postgresql://piedocs:piedocs123@localhost:5434/piedocs'

from app.database import init_db_pool, get_db_cursor

# Initialize database pool
init_db_pool()

tables_to_check = [
    'approval_chains',
    'approval_chain_steps',
    'approval_requests',
    'approval_actions',
    'routing_rules'
]

print("Verifying Approval System Database Schema")
print("=" * 70)

try:
    with get_db_cursor() as cursor:
        for table_name in tables_to_check:
            print(f"\n[TABLE] {table_name}")
            print("-" * 70)

            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                ) as exists
            """, (table_name,))
            result = cursor.fetchone()
            exists = result['exists']

            if not exists:
                print(f"  [ERROR] Table does not exist!")
                continue

            # Get column information
            cursor.execute("""
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_name = %s
                ORDER BY ordinal_position
            """, (table_name,))

            columns = cursor.fetchall()

            print(f"  [OK] Table exists with {len(columns)} columns:")
            for col in columns:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                print(f"    - {col['column_name']}: {col['data_type']} {nullable}{default}")

            # Get row count
            cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
            result = cursor.fetchone()
            count = result['count']
            print(f"  [DATA] {count} rows")

        print("\n" + "=" * 70)
        print("[SUCCESS] All approval tables verified successfully!")

except Exception as e:
    print(f"\n[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
