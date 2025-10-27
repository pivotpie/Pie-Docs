"""
Folders API Router - Folder management with hierarchy and smart folders
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.documents import (
    Folder, FolderCreate, FolderUpdate, FolderListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/folders", tags=["folders"])


# ==========================================
# Folder CRUD Operations
# ==========================================

@router.get("", response_model=FolderListResponse)
async def list_folders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    parent_id: Optional[UUID] = Query(None, description="Filter by parent folder"),
    folder_type: Optional[str] = Query(None, description="Filter by type (regular, smart)"),
):
    """
    List folders with pagination and filtering
    """
    try:
        offset = (page - 1) * page_size
        where_clauses = ["deleted_at IS NULL"]
        params = []

        if parent_id:
            where_clauses.append("parent_id = %s")
            params.append(str(parent_id))

        if folder_type:
            where_clauses.append("folder_type = %s")
            params.append(folder_type)

        where_sql = " AND ".join(where_clauses)

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM folders WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            # Get folders
            query = f"""
                SELECT * FROM folders
                WHERE {where_sql}
                ORDER BY name ASC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, params + [page_size, offset])
            folders = cursor.fetchall()

            total_pages = (total + page_size - 1) // page_size

            return {
                "folders": [dict(f) for f in folders],
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
    except Exception as e:
        logger.error(f"Error listing folders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{folder_id}", response_model=Folder)
async def get_folder(folder_id: UUID):
    """
    Get folder details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM folders WHERE id = %s AND deleted_at IS NULL",
                (str(folder_id),)
            )
            folder = cursor.fetchone()

            if not folder:
                raise HTTPException(status_code=404, detail="Folder not found")

            return dict(folder)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Folder, status_code=status.HTTP_201_CREATED)
async def create_folder(folder: FolderCreate):
    """
    Create a new folder
    """
    try:
        # Build path based on parent
        path = "/"
        if folder.parent_id:
            with get_db_cursor() as cursor:
                cursor.execute(
                    "SELECT path FROM folders WHERE id = %s AND deleted_at IS NULL",
                    (str(folder.parent_id),)
                )
                parent = cursor.fetchone()
                if not parent:
                    raise HTTPException(status_code=404, detail="Parent folder not found")
                path = f"{parent['path']}{folder.name}/"

        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO folders (
                    name, description, parent_id, folder_type, smart_criteria,
                    auto_refresh, color, icon, path
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                folder.name, folder.description,
                str(folder.parent_id) if folder.parent_id else None,
                folder.folder_type, folder.smart_criteria,
                folder.auto_refresh, folder.color, folder.icon, path
            ))

            new_folder = cursor.fetchone()
            return dict(new_folder)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{folder_id}", response_model=Folder)
async def update_folder(folder_id: UUID, folder_update: FolderUpdate):
    """
    Update folder
    """
    try:
        update_fields = []
        params = []

        for field, value in folder_update.dict(exclude_unset=True).items():
            if field == "parent_id" and value:
                update_fields.append(f"{field} = %s")
                params.append(str(value))
            else:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(folder_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE folders
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND deleted_at IS NULL
                RETURNING *
            """
            cursor.execute(query, params)
            folder = cursor.fetchone()

            if not folder:
                raise HTTPException(status_code=404, detail="Folder not found")

            return dict(folder)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(folder_id: UUID):
    """
    Delete folder (soft delete)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE folders SET deleted_at = CURRENT_TIMESTAMP WHERE id = %s AND deleted_at IS NULL RETURNING id",
                (str(folder_id),)
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Folder not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Folder Contents & Management
# ==========================================

@router.get("/{folder_id}/documents")
async def list_folder_documents(
    folder_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List documents in a folder
    """
    try:
        offset = (page - 1) * page_size

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(
                "SELECT COUNT(*) as total FROM documents WHERE folder_id = %s AND deleted_at IS NULL",
                (str(folder_id),)
            )
            total = cursor.fetchone()['total']

            # Get documents
            cursor.execute("""
                SELECT * FROM documents
                WHERE folder_id = %s AND deleted_at IS NULL
                ORDER BY modified_at DESC
                LIMIT %s OFFSET %s
            """, (str(folder_id), page_size, offset))

            documents = cursor.fetchall()

            return {
                "documents": [dict(d) for d in documents],
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        logger.error(f"Error listing folder documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{folder_id}/documents", status_code=status.HTTP_200_OK)
async def add_document_to_folder(folder_id: UUID, document_id: UUID):
    """
    Add document to folder
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Verify folder exists
            cursor.execute(
                "SELECT id FROM folders WHERE id = %s AND deleted_at IS NULL",
                (str(folder_id),)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Folder not found")

            # Update document
            cursor.execute(
                "UPDATE documents SET folder_id = %s WHERE id = %s AND deleted_at IS NULL RETURNING id",
                (str(folder_id), str(document_id))
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found")

            return {"success": True, "message": "Document added to folder"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding document to folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{folder_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document_from_folder(folder_id: UUID, document_id: UUID):
    """
    Remove document from folder
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE documents SET folder_id = NULL WHERE id = %s AND folder_id = %s RETURNING id",
                (str(document_id), str(folder_id))
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found in folder")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing document from folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{folder_id}/tree")
async def get_folder_tree(folder_id: UUID):
    """
    Get folder hierarchy tree
    """
    try:
        with get_db_cursor() as cursor:
            # Recursive query to get folder tree
            cursor.execute("""
                WITH RECURSIVE folder_tree AS (
                    SELECT id, name, parent_id, path, 0 as level
                    FROM folders
                    WHERE id = %s AND deleted_at IS NULL

                    UNION ALL

                    SELECT f.id, f.name, f.parent_id, f.path, ft.level + 1
                    FROM folders f
                    INNER JOIN folder_tree ft ON f.parent_id = ft.id
                    WHERE f.deleted_at IS NULL
                )
                SELECT * FROM folder_tree ORDER BY level, name
            """, (str(folder_id),))

            tree = cursor.fetchall()
            return {"tree": [dict(t) for t in tree]}
    except Exception as e:
        logger.error(f"Error getting folder tree: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Smart Folders
# ==========================================

@router.post("/smart", response_model=Folder, status_code=status.HTTP_201_CREATED)
async def create_smart_folder(folder: FolderCreate):
    """
    Create a smart folder with criteria
    """
    if folder.folder_type != "smart":
        raise HTTPException(status_code=400, detail="Folder type must be 'smart'")

    if not folder.smart_criteria:
        raise HTTPException(status_code=400, detail="Smart criteria required for smart folders")

    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO folders (
                    name, description, parent_id, folder_type, smart_criteria,
                    auto_refresh, color, icon, path
                )
                VALUES (%s, %s, %s, 'smart', %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                folder.name, folder.description,
                str(folder.parent_id) if folder.parent_id else None,
                folder.smart_criteria, folder.auto_refresh,
                folder.color, folder.icon, f"/{folder.name}/"
            ))

            new_folder = cursor.fetchone()
            return dict(new_folder)
    except Exception as e:
        logger.error(f"Error creating smart folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{folder_id}/refresh", status_code=status.HTTP_200_OK)
async def refresh_smart_folder(folder_id: UUID):
    """
    Refresh smart folder contents based on criteria
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Get smart folder
            cursor.execute(
                "SELECT * FROM folders WHERE id = %s AND folder_type = 'smart' AND deleted_at IS NULL",
                (str(folder_id),)
            )
            folder = cursor.fetchone()

            if not folder:
                raise HTTPException(status_code=404, detail="Smart folder not found")

            # Update last refreshed timestamp
            cursor.execute(
                "UPDATE folders SET last_refreshed_at = CURRENT_TIMESTAMP WHERE id = %s",
                (str(folder_id),)
            )

            # In a real implementation, you would execute the smart_criteria
            # to dynamically populate the folder contents

            return {
                "success": True,
                "message": "Smart folder refreshed",
                "refreshed_at": "CURRENT_TIMESTAMP"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing smart folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))
