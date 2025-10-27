"""
Document-related Pydantic models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# ==========================================
# Document Models
# ==========================================

class DocumentBase(BaseModel):
    title: str
    content: Optional[str] = None
    document_type: Optional[str] = None
    file_path: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    author: Optional[str] = None
    metadata: Dict[str, Any] = {}
    tags: List[str] = []
    folder_id: Optional[UUID] = None
    status: str = "published"
    language: str = "en"
    keywords: List[str] = []


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    document_type: Optional[str] = None
    file_path: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    author: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    folder_id: Optional[UUID] = None
    status: Optional[str] = None
    language: Optional[str] = None
    keywords: Optional[List[str]] = None


class Document(DocumentBase):
    id: UUID
    ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    download_url: Optional[str] = None
    owner_id: Optional[UUID] = None
    version: int = 1
    version_description: Optional[str] = None  # From document_versions
    version_type: Optional[str] = None  # From document_versions
    rack_id: Optional[UUID] = None  # From physical_documents
    barcode_id: Optional[UUID] = None  # From physical_documents (already in documents table, but enriched from physical_documents)
    physical_status: Optional[str] = None  # From physical_documents.status
    assignment_date: Optional[datetime] = None  # From physical_documents.created_at
    # Warehouse hierarchy fields
    shelf_id: Optional[UUID] = None  # From racks.shelf_id
    zone_id: Optional[UUID] = None  # From shelves.zone_id
    warehouse_id: Optional[UUID] = None  # From zones.warehouse_id
    location_id: Optional[UUID] = None  # From warehouses.location_id
    # Name fields for frontend display
    folder_name: Optional[str] = None  # From folders.name
    barcode_code: Optional[str] = None  # From barcodes.code
    rack_name: Optional[str] = None  # From racks.code or name
    shelf_name: Optional[str] = None  # From shelves.code or name
    zone_name: Optional[str] = None  # From zones.name
    warehouse_name: Optional[str] = None  # From warehouses.name
    location_name: Optional[str] = None  # From locations.name or address
    last_accessed_at: Optional[datetime] = None
    created_at: datetime
    modified_at: datetime
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        """Custom ORM conversion to handle null arrays"""
        data = dict(obj)
        # Convert None to empty list for array fields
        if data.get('keywords') is None:
            data['keywords'] = []
        if data.get('tags') is None:
            data['tags'] = []
        return cls(**data)


class DocumentListResponse(BaseModel):
    documents: List[Document]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==========================================
# Document Version Models
# ==========================================

class DocumentVersionBase(BaseModel):
    document_id: UUID
    version_number: int
    is_major_version: bool = False
    file_name: str
    file_size: Optional[int] = None
    file_url: str
    file_hash: Optional[str] = None
    change_description: Optional[str] = None
    change_type: Optional[str] = None
    metadata_snapshot: Optional[Dict[str, Any]] = None


class DocumentVersionCreate(DocumentVersionBase):
    pass


class DocumentVersion(DocumentVersionBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Document Metadata Models
# ==========================================

class DocumentMetadataBase(BaseModel):
    document_id: UUID
    custom_fields: Dict[str, Any] = {}
    schema_id: Optional[UUID] = None
    keywords: List[str] = []
    categories: List[str] = []


class DocumentMetadataCreate(DocumentMetadataBase):
    pass


class DocumentMetadataUpdate(BaseModel):
    custom_fields: Optional[Dict[str, Any]] = None
    schema_id: Optional[UUID] = None
    keywords: Optional[List[str]] = None
    categories: Optional[List[str]] = None


class DocumentMetadata(DocumentMetadataBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Document Permission Models
# ==========================================

class DocumentPermissionBase(BaseModel):
    document_id: UUID
    user_id: Optional[UUID] = None
    role_id: Optional[UUID] = None
    can_view: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_share: bool = False
    can_download: bool = False
    expires_at: Optional[datetime] = None


class DocumentPermissionCreate(DocumentPermissionBase):
    pass


class DocumentPermission(DocumentPermissionBase):
    id: UUID
    granted_by: Optional[UUID] = None
    granted_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Document Share Models
# ==========================================

class DocumentShareBase(BaseModel):
    document_id: UUID
    share_type: str  # public, password, email
    can_view: bool = True
    can_download: bool = False
    can_edit: bool = False
    requires_password: bool = False
    password_hash: Optional[str] = None
    allowed_emails: List[str] = []
    max_access_count: Optional[int] = None
    expires_at: Optional[datetime] = None


class DocumentShareCreate(DocumentShareBase):
    password: Optional[str] = None  # Plain text password, will be hashed


class DocumentShare(BaseModel):
    id: UUID
    document_id: UUID
    share_token: str
    share_type: str
    can_view: bool
    can_download: bool
    can_edit: bool
    requires_password: bool
    allowed_emails: List[str]
    max_access_count: Optional[int]
    current_access_count: int
    expires_at: Optional[datetime]
    shared_by: UUID
    shared_at: datetime
    is_active: bool
    revoked_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==========================================
# Document Comment Models
# ==========================================

class DocumentCommentBase(BaseModel):
    document_id: UUID
    content: str
    page_number: Optional[int] = None
    position: Optional[Dict[str, Any]] = None
    parent_comment_id: Optional[UUID] = None
    mentions: List[UUID] = []


class DocumentCommentCreate(DocumentCommentBase):
    pass


class DocumentCommentUpdate(BaseModel):
    content: Optional[str] = None
    is_resolved: Optional[bool] = None


class DocumentComment(DocumentCommentBase):
    id: UUID
    user_id: UUID
    is_resolved: bool = False
    resolved_by: Optional[UUID] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Document Access Log Models
# ==========================================

class DocumentAccessLog(BaseModel):
    id: UUID
    document_id: UUID
    user_id: UUID
    access_type: str
    duration_seconds: Optional[int]
    session_id: Optional[UUID]
    referrer: Optional[str]
    accessed_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Folder Models
# ==========================================

class FolderBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    folder_type: str = "regular"  # regular, smart
    smart_criteria: Optional[Dict[str, Any]] = None
    auto_refresh: bool = False
    color: Optional[str] = None
    icon: Optional[str] = None


class FolderCreate(FolderBase):
    pass


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    folder_type: Optional[str] = None
    smart_criteria: Optional[Dict[str, Any]] = None
    auto_refresh: Optional[bool] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class Folder(FolderBase):
    id: UUID
    path: str
    document_count: int = 0
    total_size: int = 0
    permissions: Dict[str, Any] = {}
    owner_id: Optional[UUID]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]
    last_refreshed_at: Optional[datetime]

    class Config:
        from_attributes = True


class FolderListResponse(BaseModel):
    folders: List[Folder]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==========================================
# Tag Models
# ==========================================

class TagBase(BaseModel):
    name: str
    color: Optional[str] = None


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class Tag(TagBase):
    id: UUID
    usage_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Cabinet Models
# ==========================================

class CabinetBase(BaseModel):
    label: str
    description: Optional[str] = None
    mayan_cabinet_id: Optional[int] = None
    permissions: Dict[str, Any] = {}


class CabinetCreate(CabinetBase):
    pass


class CabinetUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None


class Cabinet(CabinetBase):
    id: UUID
    document_count: int = 0
    created_at: datetime
    updated_at: datetime
    edited_at: datetime

    class Config:
        from_attributes = True


class CabinetListResponse(BaseModel):
    cabinets: List[Cabinet]
    total: int
    page: int
    page_size: int
    total_pages: int
