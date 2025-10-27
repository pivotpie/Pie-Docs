from app.database import init_db_pool, get_db_cursor, close_db_pool

init_db_pool()

with get_db_cursor() as cursor:
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
    """)

    print("Users table columns:")
    for row in cursor.fetchall():
        print(f"  {row['column_name']}: {row['data_type']}")

close_db_pool()
