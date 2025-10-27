"""
Tasks API Router - Task management with comments and attachments
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.tasks import (
    Task, TaskCreate, TaskUpdate, TaskListResponse,
    TaskComment, TaskCommentCreate,
    TaskAttachment, TaskAttachmentCreate
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


# ==========================================
# Task CRUD Operations
# ==========================================

@router.get("", response_model=TaskListResponse)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
):
    """
    List tasks with filters
    """
    try:
        offset = (page - 1) * page_size
        where_clauses = []
        params = []

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if priority:
            where_clauses.append("priority = %s")
            params.append(priority)

        if assignee_id:
            where_clauses.append("assignee_id = %s")
            params.append(str(assignee_id))

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) as total FROM tasks WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            query = f"""
                SELECT * FROM tasks
                WHERE {where_sql}
                ORDER BY
                    CASE priority
                        WHEN 'urgent' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END,
                    deadline ASC NULLS LAST,
                    created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, params + [page_size, offset])
            tasks = cursor.fetchall()

            return {
                "tasks": [dict(t) for t in tasks],
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: UUID):
    """
    Get task details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (str(task_id),))
            task = cursor.fetchone()

            if not task:
                raise HTTPException(status_code=404, detail="Task not found")

            return dict(task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(task: TaskCreate):
    """
    Create a new task
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO tasks (
                    title, description, status, priority, document_id, workflow_id,
                    workflow_step_id, estimated_hours, deadline, tags, assignee_id, assigned_by_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                task.title, task.description, task.status, task.priority,
                str(task.document_id) if task.document_id else None,
                str(task.workflow_id) if task.workflow_id else None,
                str(task.workflow_step_id) if task.workflow_step_id else None,
                task.estimated_hours, task.deadline, task.tags,
                str(task.assignee_id) if task.assignee_id else None,
                str(task.assigned_by_id) if hasattr(task, 'assigned_by_id') and task.assigned_by_id else None
            ))

            new_task = cursor.fetchone()
            return dict(new_task)
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{task_id}", response_model=Task)
async def update_task(task_id: UUID, task_update: TaskUpdate):
    """
    Update a task
    """
    try:
        update_fields = []
        params = []

        for field, value in task_update.dict(exclude_unset=True).items():
            if field in ["assignee_id", "document_id", "workflow_id", "workflow_step_id"] and value:
                update_fields.append(f"{field} = %s")
                params.append(str(value))
            else:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(task_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE tasks
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            task = cursor.fetchone()

            if not task:
                raise HTTPException(status_code=404, detail="Task not found")

            return dict(task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: UUID):
    """
    Delete a task
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM tasks WHERE id = %s RETURNING id", (str(task_id),))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Task not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/assign", response_model=Task)
async def assign_task(task_id: UUID, assignee_id: UUID, assigned_by_id: Optional[UUID] = None):
    """
    Assign task to a user
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE tasks
                SET assignee_id = %s, assigned_by_id = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (str(assignee_id), str(assigned_by_id) if assigned_by_id else None, str(task_id)))

            task = cursor.fetchone()

            if not task:
                raise HTTPException(status_code=404, detail="Task not found")

            return dict(task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/complete", response_model=Task)
async def complete_task(task_id: UUID, actual_hours: Optional[float] = None):
    """
    Mark task as completed
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE tasks
                SET status = 'completed', actual_hours = %s, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (actual_hours, str(task_id)))

            task = cursor.fetchone()

            if not task:
                raise HTTPException(status_code=404, detail="Task not found")

            return dict(task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Task Comments
# ==========================================

@router.get("/{task_id}/comments", response_model=List[TaskComment])
async def list_task_comments(task_id: UUID):
    """
    List task comments
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM task_comments
                WHERE task_id = %s
                ORDER BY created_at ASC
            """, (str(task_id),))

            comments = cursor.fetchall()
            return [dict(c) for c in comments]
    except Exception as e:
        logger.error(f"Error listing task comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/comments", response_model=TaskComment, status_code=status.HTTP_201_CREATED)
async def create_task_comment(task_id: UUID, comment: TaskCommentCreate):
    """
    Add a comment to a task
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO task_comments (task_id, content, is_system_message, author_id)
                VALUES (%s, %s, %s, %s)
                RETURNING *
            """, (
                str(task_id), comment.content, comment.is_system_message,
                str(comment.author_id) if hasattr(comment, 'author_id') and comment.author_id else None
            ))

            new_comment = cursor.fetchone()
            return dict(new_comment)
    except Exception as e:
        logger.error(f"Error creating task comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Task Attachments
# ==========================================

@router.get("/{task_id}/attachments", response_model=List[TaskAttachment])
async def list_task_attachments(task_id: UUID):
    """
    List task attachments
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM task_attachments
                WHERE task_id = %s
                ORDER BY uploaded_at DESC
            """, (str(task_id),))

            attachments = cursor.fetchall()
            return [dict(a) for a in attachments]
    except Exception as e:
        logger.error(f"Error listing task attachments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/attachments", response_model=TaskAttachment, status_code=status.HTTP_201_CREATED)
async def add_task_attachment(task_id: UUID, attachment: TaskAttachmentCreate):
    """
    Add an attachment to a task
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO task_attachments (
                    task_id, name, file_url, file_type, file_size, uploaded_by
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(task_id), attachment.name, attachment.file_url,
                attachment.file_type, attachment.file_size,
                str(attachment.uploaded_by) if hasattr(attachment, 'uploaded_by') and attachment.uploaded_by else None
            ))

            new_attachment = cursor.fetchone()
            return dict(new_attachment)
    except Exception as e:
        logger.error(f"Error adding task attachment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_attachment(attachment_id: UUID):
    """
    Delete a task attachment
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM task_attachments WHERE id = %s RETURNING id",
                (str(attachment_id),)
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Attachment not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task attachment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
