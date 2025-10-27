"""
Notification service for approval system.
Handles real-time notifications, email notifications, and in-app alerts.
"""
import logging
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from psycopg2.extras import Json
from app.services.websocket_manager import connection_manager
from app.database import get_db_cursor

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing approval notifications"""

    @staticmethod
    async def notify_approval_required(
        user_ids: List[str],
        approval_request_id: str,
        document_title: str,
        priority: str,
        deadline: Optional[str] = None
    ):
        """Notify users that their approval is required"""
        notification = {
            "type": "approval_required",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "approval_request_id": approval_request_id,
                "document_title": document_title,
                "priority": priority,
                "deadline": deadline,
                "action_required": True
            }
        }

        # Send real-time notification
        await connection_manager.send_to_multiple_users(notification, user_ids)

        # Store notification in database
        NotificationService._store_notifications(user_ids, notification)

        logger.info(f"Sent approval_required notification to {len(user_ids)} users for request {approval_request_id}")

    @staticmethod
    async def notify_approval_decision(
        user_ids: List[str],
        approval_request_id: str,
        document_title: str,
        decision: str,
        decided_by: str,
        comments: Optional[str] = None
    ):
        """Notify users of an approval decision"""
        notification = {
            "type": "approval_decision",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "approval_request_id": approval_request_id,
                "document_title": document_title,
                "decision": decision,
                "decided_by": decided_by,
                "comments": comments,
                "action_required": False
            }
        }

        await connection_manager.send_to_multiple_users(notification, user_ids)
        NotificationService._store_notifications(user_ids, notification)

        logger.info(f"Sent approval_decision notification to {len(user_ids)} users")

    @staticmethod
    async def notify_escalation(
        user_ids: List[str],
        approval_request_id: str,
        document_title: str,
        reason: str,
        escalated_by: Optional[str] = None
    ):
        """Notify users of an approval escalation"""
        notification = {
            "type": "approval_escalated",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "approval_request_id": approval_request_id,
                "document_title": document_title,
                "reason": reason,
                "escalated_by": escalated_by,
                "action_required": True,
                "priority": "high"
            }
        }

        await connection_manager.send_to_multiple_users(notification, user_ids)
        NotificationService._store_notifications(user_ids, notification)

        logger.info(f"Sent escalation notification to {len(user_ids)} users")

    @staticmethod
    async def notify_changes_requested(
        user_ids: List[str],
        approval_request_id: str,
        document_title: str,
        requested_by: str,
        comments: str
    ):
        """Notify users that changes have been requested"""
        notification = {
            "type": "changes_requested",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "approval_request_id": approval_request_id,
                "document_title": document_title,
                "requested_by": requested_by,
                "comments": comments,
                "action_required": True
            }
        }

        await connection_manager.send_to_multiple_users(notification, user_ids)
        NotificationService._store_notifications(user_ids, notification)

        logger.info(f"Sent changes_requested notification to {len(user_ids)} users")

    @staticmethod
    async def notify_deadline_approaching(
        user_ids: List[str],
        approval_request_id: str,
        document_title: str,
        deadline: str,
        hours_remaining: int
    ):
        """Notify users of approaching deadline"""
        notification = {
            "type": "deadline_approaching",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "approval_request_id": approval_request_id,
                "document_title": document_title,
                "deadline": deadline,
                "hours_remaining": hours_remaining,
                "action_required": True,
                "priority": "high" if hours_remaining < 24 else "medium"
            }
        }

        await connection_manager.send_to_multiple_users(notification, user_ids)
        NotificationService._store_notifications(user_ids, notification)

        logger.info(f"Sent deadline_approaching notification to {len(user_ids)} users")

    @staticmethod
    async def notify_workflow_advanced(
        user_ids: List[str],
        approval_request_id: str,
        document_title: str,
        current_step: int,
        total_steps: int,
        new_approvers: List[str]
    ):
        """Notify users that workflow has advanced to next step"""
        notification = {
            "type": "workflow_advanced",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "approval_request_id": approval_request_id,
                "document_title": document_title,
                "current_step": current_step,
                "total_steps": total_steps,
                "new_approvers": new_approvers,
                "action_required": False
            }
        }

        await connection_manager.send_to_multiple_users(notification, user_ids)
        NotificationService._store_notifications(user_ids, notification)

        logger.info(f"Sent workflow_advanced notification to {len(user_ids)} users")

    @staticmethod
    async def notify_bulk_action_completed(
        user_id: str,
        action: str,
        succeeded_count: int,
        failed_count: int,
        total_count: int
    ):
        """Notify user of bulk action completion"""
        notification = {
            "type": "bulk_action_completed",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "action": action,
                "succeeded_count": succeeded_count,
                "failed_count": failed_count,
                "total_count": total_count,
                "success_rate": round((succeeded_count / total_count) * 100, 2) if total_count > 0 else 0,
                "action_required": False
            }
        }

        await connection_manager.send_personal_message(notification, user_id)
        NotificationService._store_notifications([user_id], notification)

        logger.info(f"Sent bulk_action_completed notification to user {user_id}")

    @staticmethod
    async def notify_request_assigned(
        user_ids: List[str],
        approval_request_id: str,
        document_title: str,
        assigned_by: str,
        step_name: str
    ):
        """Notify users they've been assigned to an approval"""
        notification = {
            "type": "approval_assigned",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "approval_request_id": approval_request_id,
                "document_title": document_title,
                "assigned_by": assigned_by,
                "step_name": step_name,
                "action_required": True
            }
        }

        await connection_manager.send_to_multiple_users(notification, user_ids)
        NotificationService._store_notifications(user_ids, notification)

        logger.info(f"Sent approval_assigned notification to {len(user_ids)} users")

    @staticmethod
    def _store_notifications(user_ids: List[str], notification: Dict[str, Any]):
        """Store notifications in database for later retrieval"""
        try:
            with get_db_cursor(commit=True) as cursor:
                # Check if notifications table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'notifications'
                    )
                """)
                table_exists = cursor.fetchone()[0]

                if not table_exists:
                    # Create notifications table if it doesn't exist
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS notifications (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            user_id UUID NOT NULL,
                            type VARCHAR(100) NOT NULL,
                            data JSONB NOT NULL,
                            read BOOLEAN DEFAULT false,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
                    """)
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)
                    """)
                    logger.info("Created notifications table")

                # Insert notification for each user
                for user_id in user_ids:
                    cursor.execute("""
                        INSERT INTO notifications (user_id, type, data)
                        VALUES (%s, %s, %s)
                    """, (user_id, notification["type"], Json(notification)))

        except Exception as e:
            logger.error(f"Error storing notifications: {e}")

    @staticmethod
    async def get_user_notifications(user_id: str, unread_only: bool = False, limit: int = 50):
        """Get notifications for a user"""
        try:
            with get_db_cursor() as cursor:
                query = """
                    SELECT * FROM notifications
                    WHERE user_id = %s
                """
                params = [user_id]

                if unread_only:
                    query += " AND read = false"

                query += " ORDER BY created_at DESC LIMIT %s"
                params.append(limit)

                cursor.execute(query, params)
                notifications = cursor.fetchall()
                return [dict(n) for n in notifications]
        except Exception as e:
            logger.error(f"Error getting user notifications: {e}")
            return []

    @staticmethod
    async def mark_notification_read(notification_id: str, user_id: str):
        """Mark a notification as read"""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute("""
                    UPDATE notifications
                    SET read = true
                    WHERE id = %s AND user_id = %s
                """, (notification_id, user_id))
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")

    @staticmethod
    async def mark_all_read(user_id: str):
        """Mark all notifications as read for a user"""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute("""
                    UPDATE notifications
                    SET read = true
                    WHERE user_id = %s AND read = false
                """, (user_id,))
        except Exception as e:
            logger.error(f"Error marking all notifications as read: {e}")


# Singleton instance
notification_service = NotificationService()
