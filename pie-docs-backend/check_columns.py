import psycopg2
from app.config import settings

conn = psycopg2.connect(settings.DATABASE_URL)
cur = conn.cursor()

tables = ['users', 'folders', 'system_settings', 'documents']
for table in tables:
    cur.execute(f"""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '{table}'
        AND (column_name LIKE '%updated%' OR column_name LIKE '%modified%')
    """)
    rows = cur.fetchall()
    columns = [r[0] for r in rows]
    print(f"{table}: {columns}")

cur.close()
conn.close()
