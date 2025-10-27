"""
Pydantic models for document signatures.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime


class SignatureBase(BaseModel):
    """Base signature model"""
    document_id: UUID
    signature_data: str  # Base64 encoded PNG image
    signature_type: str = Field(..., pattern="^(draw|upload)$")  # 'draw' or 'upload'
    metadata: Optional[Dict[str, Any]] = None


class SignatureCreate(SignatureBase):
    """Model for creating a new signature"""
    pass


class SignatureUpdate(BaseModel):
    """Model for updating a signature"""
    signature_data: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class SignatureResponse(SignatureBase):
    """Model for signature response"""
    id: UUID
    created_by: UUID
    created_by_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SignatureListResponse(BaseModel):
    """Response model for list of signatures"""
    signatures: list[SignatureResponse]
    total: int
