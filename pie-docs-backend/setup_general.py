"""Setup General document type and schema"""
import uuid
import json
from app.database import get_db_cursor

def setup():
    with get_db_cursor() as cursor:
        # Check if General exists
        cursor.execute("SELECT id FROM document_types WHERE display_name = 'General'")
        result = cursor.fetchone()

        if result:
            doc_type_id = result['id']
            print(f"General type exists: {doc_type_id}")
        else:
            doc_type_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO document_types (id, display_name, description, icon, is_system, is_active)
                VALUES (%s, 'General', 'General document type for unclassified documents', '📄', true, true)
            """, (doc_type_id,))
            print(f"Created General type: {doc_type_id}")

        # Check schema
        cursor.execute("SELECT id FROM metadata_schemas WHERE document_type_id = %s", (doc_type_id,))
        schema_result = cursor.fetchone()

        if schema_result:
            print(f"Schema exists: {schema_result['id']}")
        else:
            schema_id = str(uuid.uuid4())
            schema_def = {
                "fields": [
                    {"field_name": "title", "display_name": "Title", "field_type": "text", "required": True},
                    {"field_name": "description", "display_name": "Description", "field_type": "textarea", "required": False},
                    {"field_name": "category", "display_name": "Category", "field_type": "text", "required": False},
                    {"field_name": "documentNumber", "display_name": "Document Number", "field_type": "text", "required": False},
                    {"field_name": "documentDate", "display_name": "Date", "field_type": "date", "required": False},
                    {"field_name": "author", "display_name": "Author", "field_type": "text", "required": False},
                    {"field_name": "keywords", "display_name": "Keywords", "field_type": "tags", "required": False},
                    {"field_name": "notes", "display_name": "Notes", "field_type": "textarea", "required": False}
                ]
            }
            cursor.execute("""
                INSERT INTO metadata_schemas (id, document_type_id, schema_definition, version, is_active)
                VALUES (%s, %s, %s, 1, true)
            """, (schema_id, doc_type_id, json.dumps(schema_def)))
            print(f"Created schema: {schema_id}")

        cursor.connection.commit()
        print("Done!")

if __name__ == "__main__":
    setup()
