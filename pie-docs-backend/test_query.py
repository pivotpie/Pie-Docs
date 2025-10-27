from app.database import get_db_cursor
from psycopg2.extras import register_uuid

# Register UUID globally
register_uuid()

with get_db_cursor() as cur:
    cur.execute('SELECT id, name, restricted_to_roles FROM document_types LIMIT 1')
    row = cur.fetchone()
    print(f"Row: {row}")
    print(f"Type of restricted_to_roles: {type(row['restricted_to_roles'])}")
    print(f"Value of restricted_to_roles: {row['restricted_to_roles']}")
