"""
Document Types Models
Pydantic models for document type management
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime


class DocumentTypeBase(BaseModel):
    """Base document type model"""
    name: str = Field(..., max_length=255, description="Unique name identifier")
    display_name: str = Field(..., max_length=255, description="Display name")
    description: Optional[str] = Field(None, description="Type description")
    icon: Optional[str] = Field(None, max_length=100, description="Icon emoji or identifier")
    color: Optional[str] = Field("#6366f1", max_length=20, description="Color code")


class DocumentTypeCreate(DocumentTypeBase):
    """Create document type model"""
    metadata_schema_id: Optional[UUID] = None
    required_fields: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    optional_fields: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    default_folder_id: Optional[UUID] = None
    allowed_file_types: Optional[List[str]] = Field(
        default_factory=lambda: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png']
    )
    max_file_size_mb: Optional[int] = Field(50, ge=1, le=1000)
    default_workflow_id: Optional[UUID] = None
    default_approval_chain_id: Optional[UUID] = None
    requires_approval: Optional[bool] = False
    retention_days: Optional[int] = None
    auto_delete_after_retention: Optional[bool] = False
    is_active: Optional[bool] = True
    restricted_to_roles: Optional[List[UUID]] = Field(default_factory=list)


class DocumentTypeUpdate(BaseModel):
    """Update document type model"""
    display_name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=20)
    metadata_schema_id: Optional[UUID] = None
    required_fields: Optional[List[Dict[str, Any]]] = None
    optional_fields: Optional[List[Dict[str, Any]]] = None
    default_folder_id: Optional[UUID] = None
    allowed_file_types: Optional[List[str]] = None
    max_file_size_mb: Optional[int] = Field(None, ge=1, le=1000)
    default_workflow_id: Optional[UUID] = None
    default_approval_chain_id: Optional[UUID] = None
    requires_approval: Optional[bool] = None
    retention_days: Optional[int] = None
    auto_delete_after_retention: Optional[bool] = None
    is_active: Optional[bool] = None
    restricted_to_roles: Optional[List[UUID]] = None


class DocumentType(DocumentTypeBase):
    """Document type model (response)"""
    id: UUID
    metadata_schema_id: Optional[UUID] = None
    required_fields: List[Dict[str, Any]] = Field(default_factory=list)
    optional_fields: List[Dict[str, Any]] = Field(default_factory=list)
    default_folder_id: Optional[UUID] = None
    allowed_file_types: List[str] = Field(
        default_factory=lambda: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png']
    )
    max_file_size_mb: int = 50
    default_workflow_id: Optional[UUID] = None
    default_approval_chain_id: Optional[UUID] = None
    requires_approval: bool = False
    retention_days: Optional[int] = None
    auto_delete_after_retention: bool = False
    is_active: bool = True
    is_system_type: bool = False
    restricted_to_roles: List[UUID] = Field(default_factory=list)
    document_count: int = 0
    last_used_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_by: Optional[UUID] = None
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentTypeListResponse(BaseModel):
    """Document types list response"""
    document_types: List[DocumentType]
    total: int
    page: int
    page_size: int
    total_pages: int


class DocumentTypeStats(BaseModel):
    """Document type statistics"""
    id: UUID
    name: str
    display_name: str
    document_count: int
    last_used_at: Optional[datetime] = None
    avg_file_size_mb: Optional[float] = None
    total_storage_mb: Optional[float] = None
