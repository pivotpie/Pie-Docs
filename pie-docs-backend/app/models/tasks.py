"""
Task-related Pydantic models
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal


# ==========================================
# Task Models
# ==========================================

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pending"  # pending, in_progress, completed, cancelled
    priority: str = "medium"  # low, medium, high, urgent
    document_id: Optional[UUID] = None
    workflow_id: Optional[UUID] = None
    workflow_step_id: Optional[UUID] = None
    estimated_hours: Optional[Decimal] = None
    deadline: Optional[datetime] = None
    tags: List[str] = []


class TaskCreate(TaskBase):
    assignee_id: Optional[UUID] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[UUID] = None
    estimated_hours: Optional[Decimal] = None
    actual_hours: Optional[Decimal] = None
    deadline: Optional[datetime] = None
    tags: Optional[List[str]] = None


class Task(TaskBase):
    id: UUID
    assignee_id: Optional[UUID]
    assigned_by_id: Optional[UUID]
    actual_hours: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    tasks: List[Task]
    total: int
    page: int
    page_size: int


# ==========================================
# Task Comment Models
# ==========================================

class TaskCommentBase(BaseModel):
    task_id: UUID
    content: str
    is_system_message: bool = False


class TaskCommentCreate(TaskCommentBase):
    pass


class TaskComment(TaskCommentBase):
    id: UUID
    author_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Task Attachment Models
# ==========================================

class TaskAttachmentBase(BaseModel):
    task_id: UUID
    name: str
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None


class TaskAttachmentCreate(TaskAttachmentBase):
    pass


class TaskAttachment(TaskAttachmentBase):
    id: UUID
    uploaded_by: UUID
    uploaded_at: datetime

    class Config:
        from_attributes = True
