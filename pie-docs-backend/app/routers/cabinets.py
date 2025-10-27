"""
Cabinets API Router - Cabinet management (Mayan EDMS integration)

⚠️ DEPRECATED/INACTIVE MODULE ⚠️
Status: INACTIVE - Hidden from Swagger UI
Replaced By: app/routers/folders.py
See: pie-docs-backend/config/inactive-modules.yaml

This module is maintained for backward compatibility only.
DO NOT add new features to this module.
For new development, use the folders system instead.

Migration Path:
- Cabinets → Folders with hierarchical structure
- Cabinet documents → Documents organized in folders
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import List
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.documents import Cabinet, CabinetCreate, CabinetUpdate, CabinetListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/cabinets", tags=["cabinets"])


@router.get("", response_model=CabinetListResponse)
async def list_cabinets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List all cabinets
    """
    try:
        offset = (page - 1) * page_size

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute("SELECT COUNT(*) as total FROM cabinets")
            total = cursor.fetchone()['total']

            # Get cabinets
            cursor.execute("""
                SELECT * FROM cabinets
                ORDER BY label ASC
                LIMIT %s OFFSET %s
            """, (page_size, offset))

            cabinets = cursor.fetchall()
            total_pages = (total + page_size - 1) // page_size

            return {
                "cabinets": [dict(c) for c in cabinets],
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
    except Exception as e:
        logger.error(f"Error listing cabinets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cabinet_id}", response_model=Cabinet)
async def get_cabinet(cabinet_id: UUID):
    """
    Get cabinet details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM cabinets WHERE id = %s", (str(cabinet_id),))
            cabinet = cursor.fetchone()

            if not cabinet:
                raise HTTPException(status_code=404, detail="Cabinet not found")

            return dict(cabinet)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cabinet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Cabinet, status_code=status.HTTP_201_CREATED)
async def create_cabinet(cabinet: CabinetCreate):
    """
    Create a new cabinet
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO cabinets (label, description, mayan_cabinet_id, permissions)
                VALUES (%s, %s, %s, %s)
                RETURNING *
            """, (cabinet.label, cabinet.description, cabinet.mayan_cabinet_id, cabinet.permissions))

            new_cabinet = cursor.fetchone()
            return dict(new_cabinet)
    except Exception as e:
        logger.error(f"Error creating cabinet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{cabinet_id}", response_model=Cabinet)
async def update_cabinet(cabinet_id: UUID, cabinet_update: CabinetUpdate):
    """
    Update cabinet
    """
    try:
        update_fields = []
        params = []

        for field, value in cabinet_update.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(cabinet_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE cabinets
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            cabinet = cursor.fetchone()

            if not cabinet:
                raise HTTPException(status_code=404, detail="Cabinet not found")

            return dict(cabinet)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating cabinet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{cabinet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cabinet(cabinet_id: UUID):
    """
    Delete cabinet
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM cabinets WHERE id = %s RETURNING id", (str(cabinet_id),))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Cabinet not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting cabinet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cabinet_id}/documents")
async def list_cabinet_documents(
    cabinet_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List documents in a cabinet
    """
    try:
        offset = (page - 1) * page_size

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute("""
                SELECT COUNT(*) as total
                FROM cabinet_documents cd
                JOIN documents d ON cd.document_id = d.id
                WHERE cd.cabinet_id = %s AND d.deleted_at IS NULL
            """, (str(cabinet_id),))
            total = cursor.fetchone()['total']

            # Get documents
            cursor.execute("""
                SELECT d.*
                FROM cabinet_documents cd
                JOIN documents d ON cd.document_id = d.id
                WHERE cd.cabinet_id = %s AND d.deleted_at IS NULL
                ORDER BY cd.created_at DESC
                LIMIT %s OFFSET %s
            """, (str(cabinet_id), page_size, offset))

            documents = cursor.fetchall()

            return {
                "documents": [dict(d) for d in documents],
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        logger.error(f"Error listing cabinet documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{cabinet_id}/documents", status_code=status.HTTP_200_OK)
async def add_document_to_cabinet(cabinet_id: UUID, document_id: UUID):
    """
    Add document to cabinet
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Verify cabinet exists
            cursor.execute("SELECT id FROM cabinets WHERE id = %s", (str(cabinet_id),))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Cabinet not found")

            # Verify document exists
            cursor.execute("SELECT id FROM documents WHERE id = %s AND deleted_at IS NULL", (str(document_id),))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found")

            # Check if already added
            cursor.execute(
                "SELECT id FROM cabinet_documents WHERE cabinet_id = %s AND document_id = %s",
                (str(cabinet_id), str(document_id))
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Document already in cabinet")

            # Add to cabinet
            cursor.execute("""
                INSERT INTO cabinet_documents (cabinet_id, document_id)
                VALUES (%s, %s)
            """, (str(cabinet_id), str(document_id)))

            return {"success": True, "message": "Document added to cabinet"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding document to cabinet: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{cabinet_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document_from_cabinet(cabinet_id: UUID, document_id: UUID):
    """
    Remove document from cabinet
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM cabinet_documents WHERE cabinet_id = %s AND document_id = %s RETURNING id",
                (str(cabinet_id), str(document_id))
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found in cabinet")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing document from cabinet: {e}")
        raise HTTPException(status_code=500, detail=str(e))
