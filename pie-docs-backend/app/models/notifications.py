"""
Notification Pydantic models
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ==========================================
# Notification Models
# ==========================================

class NotificationBase(BaseModel):
    title: str
    message: Optional[str] = None
    notification_type: Optional[str] = None  # info, warning, error, success
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    related_document_id: Optional[UUID] = None
    related_task_id: Optional[UUID] = None
    related_approval_id: Optional[UUID] = None
    expires_at: Optional[datetime] = None


class NotificationCreate(NotificationBase):
    user_id: UUID


class Notification(NotificationBase):
    id: UUID
    user_id: UUID
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[Notification]
    total: int
    unread_count: int
