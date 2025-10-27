"""
Annotations API Router - Document annotations with threaded replies
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.annotations import (
    Annotation, AnnotationCreate, AnnotationUpdate, AnnotationListResponse,
    AnnotationReply, AnnotationReplyCreate, AnnotationReplyUpdate
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/annotations", tags=["annotations"])


# ==========================================
# Annotation CRUD Operations
# ==========================================

@router.get("", response_model=AnnotationListResponse)
async def list_annotations(
    document_id: Optional[UUID] = Query(None, description="Filter by document"),
    approval_id: Optional[UUID] = Query(None, description="Filter by approval"),
    annotation_type: Optional[str] = Query(None, description="Filter by type"),
):
    """
    List annotations with filters
    """
    try:
        where_clauses = ["is_deleted = FALSE"]
        params = []

        if document_id:
            where_clauses.append("document_id = %s")
            params.append(str(document_id))

        if approval_id:
            where_clauses.append("approval_id = %s")
            params.append(str(approval_id))

        if annotation_type:
            where_clauses.append("annotation_type = %s")
            params.append(annotation_type)

        where_sql = " AND ".join(where_clauses)

        with get_db_cursor() as cursor:
            query = f"""
                SELECT * FROM annotations
                WHERE {where_sql}
                ORDER BY page_number, created_at
            """
            cursor.execute(query, params)
            annotations = cursor.fetchall()

            return {
                "annotations": [dict(a) for a in annotations],
                "total": len(annotations)
            }
    except Exception as e:
        logger.error(f"Error listing annotations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{annotation_id}", response_model=Annotation)
async def get_annotation(annotation_id: UUID):
    """
    Get annotation details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM annotations WHERE id = %s AND is_deleted = FALSE",
                (str(annotation_id),)
            )
            annotation = cursor.fetchone()

            if not annotation:
                raise HTTPException(status_code=404, detail="Annotation not found")

            return dict(annotation)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting annotation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Annotation, status_code=status.HTTP_201_CREATED)
async def create_annotation(annotation: AnnotationCreate):
    """
    Create a new annotation
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO annotations (
                    document_id, approval_id, annotation_type, page_number,
                    position, color, stroke_width, content, highlighted_text,
                    author_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(annotation.document_id),
                str(annotation.approval_id) if annotation.approval_id else None,
                annotation.annotation_type, annotation.page_number,
                annotation.position, annotation.color, annotation.stroke_width,
                annotation.content, annotation.highlighted_text,
                str(annotation.author_id) if hasattr(annotation, 'author_id') and annotation.author_id else None
            ))

            new_annotation = cursor.fetchone()
            return dict(new_annotation)
    except Exception as e:
        logger.error(f"Error creating annotation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{annotation_id}", response_model=Annotation)
async def update_annotation(annotation_id: UUID, annotation_update: AnnotationUpdate):
    """
    Update an annotation
    """
    try:
        update_fields = []
        params = []

        for field, value in annotation_update.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(annotation_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE annotations
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND is_deleted = FALSE
                RETURNING *
            """
            cursor.execute(query, params)
            annotation = cursor.fetchone()

            if not annotation:
                raise HTTPException(status_code=404, detail="Annotation not found")

            return dict(annotation)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating annotation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_annotation(annotation_id: UUID):
    """
    Delete an annotation (soft delete)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE annotations SET is_deleted = TRUE WHERE id = %s AND is_deleted = FALSE RETURNING id",
                (str(annotation_id),)
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Annotation not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting annotation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Annotation Replies
# ==========================================

@router.get("/{annotation_id}/replies", response_model=List[AnnotationReply])
async def list_annotation_replies(annotation_id: UUID):
    """
    List replies to an annotation
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM annotation_replies
                WHERE annotation_id = %s
                ORDER BY created_at ASC
            """, (str(annotation_id),))

            replies = cursor.fetchall()
            return [dict(r) for r in replies]
    except Exception as e:
        logger.error(f"Error listing annotation replies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{annotation_id}/replies", response_model=AnnotationReply, status_code=status.HTTP_201_CREATED)
async def create_annotation_reply(annotation_id: UUID, reply: AnnotationReplyCreate):
    """
    Add a reply to an annotation
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Verify annotation exists
            cursor.execute(
                "SELECT id FROM annotations WHERE id = %s AND is_deleted = FALSE",
                (str(annotation_id),)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Annotation not found")

            cursor.execute("""
                INSERT INTO annotation_replies (
                    annotation_id, parent_reply_id, content, user_id
                )
                VALUES (%s, %s, %s, %s)
                RETURNING *
            """, (
                str(annotation_id),
                str(reply.parent_reply_id) if reply.parent_reply_id else None,
                reply.content,
                str(reply.user_id) if hasattr(reply, 'user_id') and reply.user_id else None
            ))

            new_reply = cursor.fetchone()
            return dict(new_reply)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating annotation reply: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/replies/{reply_id}", response_model=AnnotationReply)
async def update_annotation_reply(reply_id: UUID, reply_update: AnnotationReplyUpdate):
    """
    Update an annotation reply
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE annotation_replies
                SET content = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (reply_update.content, str(reply_id)))

            reply = cursor.fetchone()

            if not reply:
                raise HTTPException(status_code=404, detail="Reply not found")

            return dict(reply)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating annotation reply: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_annotation_reply(reply_id: UUID):
    """
    Delete an annotation reply
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM annotation_replies WHERE id = %s RETURNING id",
                (str(reply_id),)
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Reply not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting annotation reply: {e}")
        raise HTTPException(status_code=500, detail=str(e))
