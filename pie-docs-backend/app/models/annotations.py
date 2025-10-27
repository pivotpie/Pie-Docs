"""
Annotation-related Pydantic models
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# ==========================================
# Annotation Models
# ==========================================

class AnnotationBase(BaseModel):
    document_id: UUID
    approval_id: Optional[UUID] = None
    annotation_type: str  # highlight, comment, drawing, stamp
    page_number: int
    position: Dict[str, Any]  # {x, y, width, height}
    color: Optional[str] = "#FFFF00"
    stroke_width: Optional[int] = 2
    content: Optional[str] = None
    highlighted_text: Optional[str] = None


class AnnotationCreate(AnnotationBase):
    pass


class AnnotationUpdate(BaseModel):
    annotation_type: Optional[str] = None
    position: Optional[Dict[str, Any]] = None
    color: Optional[str] = None
    stroke_width: Optional[int] = None
    content: Optional[str] = None
    highlighted_text: Optional[str] = None
    is_deleted: Optional[bool] = None


class Annotation(AnnotationBase):
    id: UUID
    author_id: UUID
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnnotationListResponse(BaseModel):
    annotations: List[Annotation]
    total: int


# ==========================================
# Annotation Reply Models
# ==========================================

class AnnotationReplyBase(BaseModel):
    annotation_id: UUID
    parent_reply_id: Optional[UUID] = None
    content: str


class AnnotationReplyCreate(AnnotationReplyBase):
    pass


class AnnotationReplyUpdate(BaseModel):
    content: str


class AnnotationReply(AnnotationReplyBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
