"""
Document Types API Router
Handles CRUD operations for document type definitions
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.document_types import (
    DocumentType, DocumentTypeCreate, DocumentTypeUpdate,
    DocumentTypeListResponse, DocumentTypeStats
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/document-types", tags=["document-types"])


@router.get("", response_model=DocumentTypeListResponse)
async def list_document_types(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    include_system: bool = Query(True, description="Include system types"),
):
    """
    List document types with filtering and pagination
    """
    try:
        offset = (page - 1) * page_size
        where_clauses = ["deleted_at IS NULL"]
        params = []

        # Search functionality
        if search:
            where_clauses.append("(name ILIKE %s OR display_name ILIKE %s OR description ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        # Active filter
        if is_active is not None:
            where_clauses.append("is_active = %s")
            params.append(is_active)

        # System types filter
        if not include_system:
            where_clauses.append("is_system_type = FALSE")

        where_sql = " AND ".join(where_clauses)

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM document_types WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            # Get document types
            query = f"""
                SELECT
                    id, name, display_name, description, icon, color,
                    metadata_schema_id, required_fields, optional_fields,
                    default_folder_id, allowed_file_types, max_file_size_mb,
                    default_workflow_id, default_approval_chain_id, requires_approval,
                    retention_days, auto_delete_after_retention, is_active,
                    is_system_type,
                    COALESCE(restricted_to_roles, ARRAY[]::UUID[]) as restricted_to_roles,
                    document_count, last_used_at,
                    created_by, created_at, updated_by, updated_at, deleted_at
                FROM document_types
                WHERE {where_sql}
                ORDER BY is_system_type DESC, name ASC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, params + [page_size, offset])
            document_types = cursor.fetchall()

            total_pages = (total + page_size - 1) // page_size

            # Convert rows to dicts and ensure proper list conversion
            result_types = []
            for dt in document_types:
                dt_dict = dict(dt)
                # Ensure restricted_to_roles is always a list
                if isinstance(dt_dict.get('restricted_to_roles'), str):
                    # Handle string representation of array
                    if dt_dict['restricted_to_roles'] in ('{}', '', None):
                        dt_dict['restricted_to_roles'] = []
                elif dt_dict.get('restricted_to_roles') is None:
                    dt_dict['restricted_to_roles'] = []
                result_types.append(dt_dict)

            return {
                "document_types": result_types,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
    except Exception as e:
        logger.error(f"Error listing document types: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=List[DocumentTypeStats])
async def get_document_type_stats():
    """
    Get statistics for all document types
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    dt.id,
                    dt.name,
                    dt.display_name,
                    dt.document_count,
                    dt.last_used_at,
                    AVG(d.file_size / 1048576.0) as avg_file_size_mb,
                    SUM(d.file_size / 1048576.0) as total_storage_mb
                FROM document_types dt
                LEFT JOIN documents d ON d.document_type = dt.name AND d.deleted_at IS NULL
                WHERE dt.deleted_at IS NULL AND dt.is_active = TRUE
                GROUP BY dt.id, dt.name, dt.display_name, dt.document_count, dt.last_used_at
                ORDER BY dt.document_count DESC
            """)
            stats = cursor.fetchall()
            return [dict(s) for s in stats]
    except Exception as e:
        logger.error(f"Error getting document type stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_type_id}", response_model=DocumentType)
async def get_document_type(document_type_id: UUID):
    """
    Get a specific document type by ID
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM document_types WHERE id = %s AND deleted_at IS NULL",
                (str(document_type_id),)
            )
            document_type = cursor.fetchone()

            if not document_type:
                raise HTTPException(status_code=404, detail="Document type not found")

            return dict(document_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-name/{name}", response_model=DocumentType)
async def get_document_type_by_name(name: str):
    """
    Get a specific document type by name
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM document_types WHERE name = %s AND deleted_at IS NULL",
                (name,)
            )
            document_type = cursor.fetchone()

            if not document_type:
                raise HTTPException(status_code=404, detail="Document type not found")

            return dict(document_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document type by name: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=DocumentType, status_code=status.HTTP_201_CREATED)
async def create_document_type(doc_type: DocumentTypeCreate):
    """
    Create a new document type
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if name already exists
            cursor.execute(
                "SELECT id FROM document_types WHERE name = %s AND deleted_at IS NULL",
                (doc_type.name,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail=f"Document type with name '{doc_type.name}' already exists"
                )

            cursor.execute("""
                INSERT INTO document_types (
                    name, display_name, description, icon, color,
                    metadata_schema_id, required_fields, optional_fields,
                    default_folder_id, allowed_file_types, max_file_size_mb,
                    default_workflow_id, default_approval_chain_id, requires_approval,
                    retention_days, auto_delete_after_retention, is_active,
                    restricted_to_roles
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                doc_type.name, doc_type.display_name, doc_type.description,
                doc_type.icon, doc_type.color,
                str(doc_type.metadata_schema_id) if doc_type.metadata_schema_id else None,
                doc_type.required_fields, doc_type.optional_fields,
                str(doc_type.default_folder_id) if doc_type.default_folder_id else None,
                doc_type.allowed_file_types, doc_type.max_file_size_mb,
                str(doc_type.default_workflow_id) if doc_type.default_workflow_id else None,
                str(doc_type.default_approval_chain_id) if doc_type.default_approval_chain_id else None,
                doc_type.requires_approval, doc_type.retention_days,
                doc_type.auto_delete_after_retention, doc_type.is_active,
                [str(role_id) for role_id in doc_type.restricted_to_roles] if doc_type.restricted_to_roles else []
            ))

            document_type = cursor.fetchone()
            return dict(document_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating document type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{document_type_id}", response_model=DocumentType)
async def update_document_type(document_type_id: UUID, doc_type_update: DocumentTypeUpdate):
    """
    Update a document type
    """
    try:
        update_fields = []
        params = []

        for field, value in doc_type_update.dict(exclude_unset=True).items():
            if field in ["metadata_schema_id", "default_folder_id", "default_workflow_id", "default_approval_chain_id"]:
                if value:
                    update_fields.append(f"{field} = %s")
                    params.append(str(value))
                else:
                    update_fields.append(f"{field} = NULL")
            elif field == "restricted_to_roles":
                update_fields.append(f"{field} = %s")
                params.append([str(role_id) for role_id in value] if value else [])
            else:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(document_type_id))

        with get_db_cursor(commit=True) as cursor:
            # Check if it's a system type
            cursor.execute(
                "SELECT is_system_type FROM document_types WHERE id = %s AND deleted_at IS NULL",
                (str(document_type_id),)
            )
            doc_type = cursor.fetchone()
            if not doc_type:
                raise HTTPException(status_code=404, detail="Document type not found")

            if doc_type['is_system_type']:
                # Only allow certain fields to be updated for system types
                allowed_fields = ['description', 'icon', 'color', 'is_active']
                for field in update_fields:
                    field_name = field.split('=')[0].strip()
                    if field_name not in allowed_fields:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Cannot update field '{field_name}' for system document types"
                        )

            query = f"""
                UPDATE document_types
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND deleted_at IS NULL
                RETURNING *
            """
            cursor.execute(query, params)
            document_type = cursor.fetchone()

            if not document_type:
                raise HTTPException(status_code=404, detail="Document type not found")

            return dict(document_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_type(
    document_type_id: UUID,
    hard_delete: bool = Query(False, description="Permanently delete (not recommended)")
):
    """
    Delete a document type (soft delete by default)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if it's a system type
            cursor.execute(
                "SELECT is_system_type, name FROM document_types WHERE id = %s AND deleted_at IS NULL",
                (str(document_type_id),)
            )
            doc_type = cursor.fetchone()
            if not doc_type:
                raise HTTPException(status_code=404, detail="Document type not found")

            if doc_type['is_system_type']:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot delete system document types"
                )

            # Check if there are documents using this type
            cursor.execute(
                "SELECT COUNT(*) as count FROM documents WHERE document_type = %s AND deleted_at IS NULL",
                (doc_type['name'],)
            )
            doc_count = cursor.fetchone()['count']
            if doc_count > 0 and hard_delete:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot delete document type: {doc_count} documents are using this type"
                )

            if hard_delete:
                cursor.execute(
                    "DELETE FROM document_types WHERE id = %s RETURNING id",
                    (str(document_type_id),)
                )
            else:
                cursor.execute(
                    "UPDATE document_types SET deleted_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING id",
                    (str(document_type_id),)
                )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document type not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_type_id}/increment-count", response_model=DocumentType)
async def increment_document_count(document_type_id: UUID):
    """
    Increment the document count for a document type
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE document_types
                SET document_count = document_count + 1,
                    last_used_at = CURRENT_TIMESTAMP
                WHERE id = %s AND deleted_at IS NULL
                RETURNING *
            """, (str(document_type_id),))

            document_type = cursor.fetchone()
            if not document_type:
                raise HTTPException(status_code=404, detail="Document type not found")

            return dict(document_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing document count: {e}")
        raise HTTPException(status_code=500, detail=str(e))
