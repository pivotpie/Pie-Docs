"""
Tags API Router - Tag management
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import List
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.documents import Tag, TagCreate, TagUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tags", tags=["tags"])


@router.get("", response_model=List[Tag])
async def list_tags(
    limit: int = Query(100, ge=1, le=500),
    search: str = Query(None, description="Search tags by name"),
):
    """
    List all tags with optional search
    """
    try:
        with get_db_cursor() as cursor:
            if search:
                cursor.execute("""
                    SELECT * FROM tags
                    WHERE name ILIKE %s
                    ORDER BY usage_count DESC, name ASC
                    LIMIT %s
                """, (f"%{search}%", limit))
            else:
                cursor.execute("""
                    SELECT * FROM tags
                    ORDER BY usage_count DESC, name ASC
                    LIMIT %s
                """, (limit,))

            tags = cursor.fetchall()
            return [dict(t) for t in tags]
    except Exception as e:
        logger.error(f"Error listing tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/popular", response_model=List[Tag])
async def get_popular_tags(limit: int = Query(20, ge=1, le=100)):
    """
    Get most popular tags
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM tags
                WHERE usage_count > 0
                ORDER BY usage_count DESC
                LIMIT %s
            """, (limit,))

            tags = cursor.fetchall()
            return [dict(t) for t in tags]
    except Exception as e:
        logger.error(f"Error getting popular tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Tag, status_code=status.HTTP_201_CREATED)
async def create_tag(tag: TagCreate):
    """
    Create a new tag
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if tag already exists
            cursor.execute("SELECT id FROM tags WHERE name = %s", (tag.name,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Tag already exists")

            cursor.execute("""
                INSERT INTO tags (name, color)
                VALUES (%s, %s)
                RETURNING *
            """, (tag.name, tag.color))

            new_tag = cursor.fetchone()
            return dict(new_tag)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{tag_id}", response_model=Tag)
async def update_tag(tag_id: UUID, tag_update: TagUpdate):
    """
    Update a tag
    """
    try:
        update_fields = []
        params = []

        for field, value in tag_update.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(tag_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE tags
                SET {", ".join(update_fields)}
                WHERE id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            tag = cursor.fetchone()

            if not tag:
                raise HTTPException(status_code=404, detail="Tag not found")

            return dict(tag)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(tag_id: UUID):
    """
    Delete a tag
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM tags WHERE id = %s RETURNING id", (str(tag_id),))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Tag not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))
