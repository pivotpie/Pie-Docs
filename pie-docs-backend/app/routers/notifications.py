"""
Notifications API Router - User notification management
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import Optional
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.notifications import (
    Notification, NotificationCreate, NotificationListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    user_id: UUID,
    is_read: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """
    List user notifications
    """
    try:
        where_clauses = ["user_id = %s"]
        params = [str(user_id)]

        if is_read is not None:
            where_clauses.append("is_read = %s")
            params.append(is_read)

        # Exclude expired notifications
        where_clauses.append("(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)")

        where_sql = " AND ".join(where_clauses)

        with get_db_cursor() as cursor:
            # Get total and unread count
            cursor.execute(
                f"SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_read = FALSE) as unread FROM notifications WHERE {where_sql}",
                params
            )
            counts = cursor.fetchone()

            # Get notifications
            query = f"""
                SELECT * FROM notifications
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT %s
            """
            cursor.execute(query, params + [limit])
            notifications = cursor.fetchall()

            return {
                "notifications": [dict(n) for n in notifications],
                "total": counts['total'],
                "unread_count": counts['unread']
            }
    except Exception as e:
        logger.error(f"Error listing notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{notification_id}", response_model=Notification)
async def get_notification(notification_id: UUID):
    """
    Get notification details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM notifications WHERE id = %s",
                (str(notification_id),)
            )
            notification = cursor.fetchone()

            if not notification:
                raise HTTPException(status_code=404, detail="Notification not found")

            return dict(notification)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{notification_id}/read", response_model=Notification)
async def mark_notification_read(notification_id: UUID):
    """
    Mark notification as read
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE notifications
                SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (str(notification_id),))

            notification = cursor.fetchone()

            if not notification:
                raise HTTPException(status_code=404, detail="Notification not found")

            return dict(notification)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(user_id: UUID):
    """
    Mark all user notifications as read
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE notifications
                SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND is_read = FALSE
                RETURNING id
            """, (str(user_id),))

            updated_count = len(cursor.fetchall())

            return {
                "success": True,
                "message": f"Marked {updated_count} notifications as read"
            }
    except Exception as e:
        logger.error(f"Error marking all notifications read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(notification_id: UUID):
    """
    Delete a notification
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM notifications WHERE id = %s RETURNING id",
                (str(notification_id),)
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Notification not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-count")
async def get_unread_count(user_id: UUID):
    """
    Get count of unread notifications
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) as count FROM notifications
                WHERE user_id = %s AND is_read = FALSE
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            """, (str(user_id),))

            result = cursor.fetchone()

            return {"unread_count": result['count']}
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail=str(e))
