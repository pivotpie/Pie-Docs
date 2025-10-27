"""
Metadata Schemas Router
API endpoints for managing metadata schemas and fields
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from uuid import UUID
import json
from app.database import get_db_cursor
from app.models.metadata_schema import (
    MetadataSchema,
    MetadataSchemaCreate,
    MetadataSchemaUpdate,
    MetadataSchemaWithFields,
    MetadataField,
    MetadataFieldCreate,
    MetadataFieldUpdate,
    DocumentMetadataUpdate,
    DocumentMetadataValidation
)

router = APIRouter(prefix="/api/v1/metadata-schemas", tags=["Metadata Schemas"])


# ============================================
# Metadata Schemas Endpoints
# ============================================

@router.post("/", response_model=MetadataSchemaWithFields, status_code=201)
async def create_metadata_schema(schema: MetadataSchemaCreate):
    """
    Create a new metadata schema with optional fields

    Flow: Document Type → Metadata Schema → Metadata Fields
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Create the schema
            cursor.execute(
                """
                INSERT INTO metadata_schemas
                (name, description, document_type_id, is_active, created_by)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    schema.name,
                    schema.description,
                    schema.document_type_id,
                    schema.is_active if schema.is_active is not None else True,
                    None  # TODO: Get from auth context
                )
            )
            schema_row = cursor.fetchone()
            schema_id = schema_row['id']
            created_fields = []

            # Create fields if provided
            if schema.fields:
                for field_data in schema.fields:
                    options_json = json.dumps([opt.dict() for opt in field_data.options]) if field_data.options else None
                    conditional_logic_json = json.dumps(field_data.conditional_logic.dict()) if field_data.conditional_logic else None

                    cursor.execute(
                        """
                        INSERT INTO metadata_fields
                        (schema_id, field_name, field_label, field_type, description,
                         default_value, placeholder, is_required, min_length, max_length,
                         min_value, max_value, pattern, options, display_order,
                         display_width, group_name, conditional_logic, help_text,
                         help_url, is_active)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                                %s, %s::jsonb, %s, %s, %s, %s::jsonb, %s, %s, %s)
                        RETURNING *
                        """,
                        (
                            schema_id,
                            field_data.field_name,
                            field_data.field_label,
                            field_data.field_type,
                            field_data.description,
                            field_data.default_value,
                            field_data.placeholder,
                            field_data.is_required,
                            field_data.min_length,
                            field_data.max_length,
                            field_data.min_value,
                            field_data.max_value,
                            field_data.pattern,
                            options_json,
                            field_data.display_order,
                            field_data.display_width,
                            field_data.group_name,
                            conditional_logic_json,
                            field_data.help_text,
                            field_data.help_url,
                            field_data.is_active if field_data.is_active is not None else True
                        )
                    )
                    field_row = cursor.fetchone()
                    created_fields.append(MetadataField(**dict(field_row)))

            return MetadataSchemaWithFields(
                **dict(schema_row),
                fields=created_fields
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[MetadataSchema])
async def list_metadata_schemas(
    document_type_id: Optional[UUID] = Query(None, description="Filter by document type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    include_fields: bool = Query(False, description="Include fields in response")
):
    """List all metadata schemas with optional filtering"""
    try:
        with get_db_cursor() as cursor:
            query = "SELECT * FROM metadata_schemas WHERE 1=1"
            params = []

            if document_type_id:
                query += " AND document_type_id = %s"
                params.append(document_type_id)

            if is_active is not None:
                query += " AND is_active = %s"
                params.append(is_active)

            query += " ORDER BY created_at DESC"

            cursor.execute(query, params)
            rows = cursor.fetchall()
            schemas = []

            for row in rows:
                schema_dict = dict(row)

                # Load fields if requested
                if include_fields:
                    cursor.execute(
                        """
                        SELECT * FROM metadata_fields
                        WHERE schema_id = %s AND is_active = true
                        ORDER BY display_order, field_name
                        """,
                        (row['id'],)
                    )
                    field_rows = cursor.fetchall()
                    schema_dict['fields'] = [MetadataField(**dict(fr)) for fr in field_rows]
                else:
                    schema_dict['fields'] = None

                schemas.append(MetadataSchema(**schema_dict))

            return schemas
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{schema_id}", response_model=MetadataSchemaWithFields)
async def get_metadata_schema(schema_id: UUID):
    """Get a specific metadata schema with all its fields"""
    try:
        with get_db_cursor() as cursor:
            # Get schema
            cursor.execute(
                "SELECT * FROM metadata_schemas WHERE id = %s",
                (schema_id,)
            )
            schema_row = cursor.fetchone()

            if not schema_row:
                raise HTTPException(status_code=404, detail="Metadata schema not found")

            # Get fields
            cursor.execute(
                """
                SELECT * FROM metadata_fields
                WHERE schema_id = %s AND is_active = true
                ORDER BY display_order, field_name
                """,
                (schema_id,)
            )
            field_rows = cursor.fetchall()

            return MetadataSchemaWithFields(
                **dict(schema_row),
                fields=[MetadataField(**dict(fr)) for fr in field_rows]
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document-type/{document_type_id}", response_model=MetadataSchemaWithFields)
async def get_schema_by_document_type(document_type_id: UUID):
    """Get the active metadata schema for a document type"""
    try:
        with get_db_cursor() as cursor:
            # Get active schema for document type
            cursor.execute(
                """
                SELECT * FROM metadata_schemas
                WHERE document_type_id = %s AND is_active = true
                ORDER BY version DESC
                LIMIT 1
                """,
                (document_type_id,)
            )
            schema_row = cursor.fetchone()

            if not schema_row:
                raise HTTPException(
                    status_code=404,
                    detail=f"No active metadata schema found for document type {document_type_id}"
                )

            # Get fields
            cursor.execute(
                """
                SELECT * FROM metadata_fields
                WHERE schema_id = %s AND is_active = true
                ORDER BY display_order, field_name
                """,
                (schema_row['id'],)
            )
            field_rows = cursor.fetchall()

            return MetadataSchemaWithFields(
                **dict(schema_row),
                fields=[MetadataField(**dict(fr)) for fr in field_rows]
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{schema_id}", response_model=MetadataSchema)
async def update_metadata_schema(
    schema_id: UUID,
    schema_update: MetadataSchemaUpdate
):
    """Update a metadata schema"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Build update query dynamically
            update_fields = []
            params = []

            if schema_update.name is not None:
                update_fields.append("name = %s")
                params.append(schema_update.name)

            if schema_update.description is not None:
                update_fields.append("description = %s")
                params.append(schema_update.description)

            if schema_update.document_type_id is not None:
                update_fields.append("document_type_id = %s")
                params.append(schema_update.document_type_id)

            if schema_update.is_active is not None:
                update_fields.append("is_active = %s")
                params.append(schema_update.is_active)

            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            params.append(schema_id)
            query = f"""
                UPDATE metadata_schemas
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            """

            cursor.execute(query, params)
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Metadata schema not found")

            return MetadataSchema(**dict(row), fields=None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{schema_id}", status_code=204)
async def delete_metadata_schema(schema_id: UUID):
    """Delete a metadata schema (soft delete by setting is_active=false)"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE metadata_schemas SET is_active = false WHERE id = %s",
                (schema_id,)
            )

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Metadata schema not found")

            return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Metadata Fields Endpoints
# ============================================

@router.post("/{schema_id}/fields", response_model=MetadataField, status_code=201)
async def create_metadata_field(
    schema_id: UUID,
    field: MetadataFieldCreate
):
    """Add a new field to a metadata schema"""
    # Ensure schema_id matches
    if field.schema_id != schema_id:
        raise HTTPException(status_code=400, detail="Schema ID mismatch")

    try:
        with get_db_cursor(commit=True) as cursor:
            # Verify schema exists
            cursor.execute(
                "SELECT EXISTS(SELECT 1 FROM metadata_schemas WHERE id = %s)",
                (schema_id,)
            )
            result = cursor.fetchone()
            if not result or not result['exists']:
                raise HTTPException(status_code=404, detail="Metadata schema not found")

            # Create field
            options_json = json.dumps([opt.dict() for opt in field.options]) if field.options else None
            conditional_logic_json = json.dumps(field.conditional_logic.dict()) if field.conditional_logic else None

            cursor.execute(
                """
                INSERT INTO metadata_fields
                (schema_id, field_name, field_label, field_type, description,
                 default_value, placeholder, is_required, min_length, max_length,
                 min_value, max_value, pattern, options, display_order,
                 display_width, group_name, conditional_logic, help_text,
                 help_url, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s::jsonb, %s, %s, %s, %s::jsonb, %s, %s, %s)
                RETURNING *
                """,
                (
                    field.schema_id,
                    field.field_name,
                    field.field_label,
                    field.field_type,
                    field.description,
                    field.default_value,
                    field.placeholder,
                    field.is_required,
                    field.min_length,
                    field.max_length,
                    field.min_value,
                    field.max_value,
                    field.pattern,
                    options_json,
                    field.display_order,
                    field.display_width,
                    field.group_name,
                    conditional_logic_json,
                    field.help_text,
                    field.help_url,
                    field.is_active if field.is_active is not None else True
                )
            )
            row = cursor.fetchone()

            return MetadataField(**dict(row))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{schema_id}/fields", response_model=List[MetadataField])
async def list_metadata_fields(
    schema_id: UUID,
    include_inactive: bool = Query(False, description="Include inactive fields")
):
    """List all fields for a metadata schema"""
    try:
        with get_db_cursor() as cursor:
            query = """
                SELECT * FROM metadata_fields
                WHERE schema_id = %s
            """
            params = [schema_id]

            if not include_inactive:
                query += " AND is_active = true"

            query += " ORDER BY display_order, field_name"

            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [MetadataField(**dict(row)) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/fields/{field_id}", response_model=MetadataField)
async def update_metadata_field(
    field_id: UUID,
    field_update: MetadataFieldUpdate
):
    """Update a metadata field"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Build update query dynamically
            update_fields = []
            params = []

            update_map = {
                'field_label': field_update.field_label,
                'field_type': field_update.field_type,
                'description': field_update.description,
                'default_value': field_update.default_value,
                'placeholder': field_update.placeholder,
                'is_required': field_update.is_required,
                'min_length': field_update.min_length,
                'max_length': field_update.max_length,
                'min_value': field_update.min_value,
                'max_value': field_update.max_value,
                'pattern': field_update.pattern,
                'display_order': field_update.display_order,
                'display_width': field_update.display_width,
                'group_name': field_update.group_name,
                'help_text': field_update.help_text,
                'help_url': field_update.help_url,
                'is_active': field_update.is_active
            }

            for field_name, value in update_map.items():
                if value is not None:
                    update_fields.append(f"{field_name} = %s")
                    params.append(value)

            # Handle special cases for JSONB fields
            if field_update.options is not None:
                update_fields.append("options = %s::jsonb")
                params.append(json.dumps([opt.dict() for opt in field_update.options]))

            if field_update.conditional_logic is not None:
                update_fields.append("conditional_logic = %s::jsonb")
                params.append(json.dumps(field_update.conditional_logic.dict()))

            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            params.append(field_id)
            query = f"""
                UPDATE metadata_fields
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            """

            cursor.execute(query, params)
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Metadata field not found")

            return MetadataField(**dict(row))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/fields/{field_id}", status_code=204)
async def delete_metadata_field(field_id: UUID):
    """Delete a metadata field (soft delete)"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE metadata_fields SET is_active = false WHERE id = %s",
                (field_id,)
            )

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Metadata field not found")

            return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Document Metadata Endpoints
# ============================================

@router.put("/documents/{document_id}/metadata", response_model=dict)
async def update_document_metadata(
    document_id: UUID,
    metadata_update: DocumentMetadataUpdate
):
    """Update metadata for a document"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Update document metadata JSONB field
            cursor.execute(
                """
                UPDATE documents
                SET metadata = %s::jsonb
                WHERE id = %s
                RETURNING metadata
                """,
                (json.dumps(metadata_update.metadata), document_id)
            )
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Document not found")

            return {"metadata": row['metadata']}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/{document_id}/metadata/validate", response_model=DocumentMetadataValidation)
async def validate_document_metadata(document_id: UUID):
    """Validate document metadata against its schema"""
    try:
        with get_db_cursor() as cursor:
            # Get document with its type and metadata
            cursor.execute(
                """
                SELECT d.id, d.document_type, d.metadata, dt.id as doc_type_id
                FROM documents d
                LEFT JOIN document_types dt ON d.document_type = dt.name
                WHERE d.id = %s
                """,
                (document_id,)
            )
            doc_row = cursor.fetchone()

            if not doc_row:
                raise HTTPException(status_code=404, detail="Document not found")

            if not doc_row['doc_type_id']:
                return DocumentMetadataValidation(
                    is_valid=True,
                    warnings={"general": ["No document type assigned, validation skipped"]}
                )

            # Get schema for document type
            cursor.execute(
                """
                SELECT id FROM metadata_schemas
                WHERE document_type_id = %s AND is_active = true
                ORDER BY version DESC
                LIMIT 1
                """,
                (doc_row['doc_type_id'],)
            )
            schema_row = cursor.fetchone()

            if not schema_row:
                return DocumentMetadataValidation(
                    is_valid=True,
                    warnings={"general": ["No metadata schema defined for this document type"]}
                )

            # Get fields
            cursor.execute(
                """
                SELECT * FROM metadata_fields
                WHERE schema_id = %s AND is_active = true
                """,
                (schema_row['id'],)
            )
            field_rows = cursor.fetchall()

            # Validate
            errors = {}
            warnings = {}
            metadata = doc_row['metadata'] or {}

            for field_row in field_rows:
                field_name = field_row['field_name']
                field_value = metadata.get(field_name)

                # Required field check
                if field_row['is_required'] and not field_value:
                    errors.setdefault(field_name, []).append("This field is required")

                # Type-specific validation
                if field_value:
                    # String length validation
                    if field_row['min_length'] and len(str(field_value)) < field_row['min_length']:
                        errors.setdefault(field_name, []).append(
                            f"Minimum length is {field_row['min_length']}"
                        )

                    if field_row['max_length'] and len(str(field_value)) > field_row['max_length']:
                        errors.setdefault(field_name, []).append(
                            f"Maximum length is {field_row['max_length']}"
                        )

            return DocumentMetadataValidation(
                is_valid=len(errors) == 0,
                errors=errors if errors else None,
                warnings=warnings if warnings else None
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
