from app.database import get_db_cursor

with get_db_cursor() as cursor:
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%document%'
        ORDER BY table_name
    """)
    tables = cursor.fetchall()

    print("Document-related tables:")
    print("-" * 50)
    for table in tables:
        print(f"  • {table['table_name']}")

    # Check if documents table has required columns
    if tables:
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'documents'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        print("\nDocuments table columns:")
        print("-" * 50)
        for col in columns:
            print(f"  • {col['column_name']}: {col['data_type']}")
