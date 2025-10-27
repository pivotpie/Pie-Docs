"""
Physical Documents - Pydantic models for barcode management, location tracking, and mobile scanning
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


# ==========================================
# Enums
# ==========================================

class BarcodeFormatType(str, Enum):
    """Barcode format types"""
    CODE128 = "CODE128"
    CODE39 = "CODE39"
    CODE93 = "CODE93"
    EAN13 = "EAN13"
    EAN8 = "EAN8"
    UPC = "UPC"
    UPCE = "UPCE"
    ITF = "ITF"
    ITF14 = "ITF14"
    MSI = "MSI"
    PHARMACODE = "pharmacode"
    CODABAR = "codabar"
    QR = "QR"
    DATAMATRIX = "DATAMATRIX"


class PhysicalDocumentStatus(str, Enum):
    """Physical document status"""
    AVAILABLE = "available"
    CHECKED_OUT = "checked_out"
    MISSING = "missing"
    DAMAGED = "damaged"
    IN_TRANSIT = "in_transit"
    ARCHIVED = "archived"


class AssetStatus(str, Enum):
    """Asset status"""
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"


class LocationType(str, Enum):
    """Storage location types"""
    BUILDING = "building"
    FLOOR = "floor"
    ROOM = "room"
    CABINET = "cabinet"
    SHELF = "shelf"
    BOX = "box"


class PrintJobStatus(str, Enum):
    """Print job status"""
    PENDING = "pending"
    PRINTING = "printing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ScanSessionStatus(str, Enum):
    """Scan session status"""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


# ==========================================
# Barcode Models
# ==========================================

class BarcodeFormatBase(BaseModel):
    """Base barcode format model"""
    name: str
    type: str  # linear or 2d
    standard: BarcodeFormatType
    configuration: Dict[str, Any] = {}


class BarcodeFormat(BarcodeFormatBase):
    """Barcode format with ID"""
    id: UUID

    class Config:
        from_attributes = True


class BarcodeRecordBase(BaseModel):
    """Base barcode record model"""
    code: str
    format_id: UUID
    document_id: Optional[UUID] = None
    asset_id: Optional[UUID] = None
    metadata: Dict[str, Any] = {}
    checksum: Optional[str] = None


class BarcodeRecordCreate(BarcodeRecordBase):
    """Create barcode record"""
    pass


class BarcodeRecord(BarcodeRecordBase):
    """Barcode record"""
    id: UUID
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BarcodeGenerationRequest(BaseModel):
    """Request to generate barcodes"""
    document_ids: List[UUID] = []
    asset_ids: List[UUID] = []
    format: BarcodeFormatType
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    quantity: int = 1


class BarcodeGenerationJob(BaseModel):
    """Barcode generation job"""
    id: UUID
    document_ids: List[UUID]
    format: BarcodeFormatType
    prefix: Optional[str]
    suffix: Optional[str]
    quantity: int
    status: str  # pending, processing, completed, failed
    progress: int = 0
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# Physical Document Models
# ==========================================

class PhysicalDocumentBase(BaseModel):
    """Base physical document model"""
    digital_document_id: UUID
    barcode_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    notes: Optional[str] = None


class PhysicalDocumentCreate(PhysicalDocumentBase):
    """Create physical document"""
    pass


class PhysicalDocumentUpdate(BaseModel):
    """Update physical document"""
    barcode_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    status: Optional[PhysicalDocumentStatus] = None
    notes: Optional[str] = None


class PhysicalDocument(PhysicalDocumentBase):
    """Physical document"""
    id: UUID
    status: PhysicalDocumentStatus = PhysicalDocumentStatus.AVAILABLE
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    checked_out_by: Optional[UUID] = None
    checked_out_at: Optional[datetime] = None
    due_back_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# Physical Asset Models
# ==========================================

class PhysicalAssetBase(BaseModel):
    """Base physical asset model"""
    name: str
    asset_type: str
    location_id: Optional[UUID] = None
    metadata: Dict[str, Any] = {}


class PhysicalAssetCreate(PhysicalAssetBase):
    """Create physical asset"""
    pass


class PhysicalAssetUpdate(BaseModel):
    """Update physical asset"""
    name: Optional[str] = None
    asset_type: Optional[str] = None
    barcode_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    status: Optional[AssetStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class PhysicalAsset(PhysicalAssetBase):
    """Physical asset"""
    id: UUID
    barcode_id: Optional[UUID] = None
    status: AssetStatus = AssetStatus.ACTIVE
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Storage Location Models
# ==========================================

class StorageLocationBase(BaseModel):
    """Base storage location model"""
    name: str
    description: Optional[str] = None
    location_type: LocationType
    parent_id: Optional[UUID] = None
    capacity: Optional[int] = None
    barcode_id: Optional[UUID] = None
    coordinates: Optional[Dict[str, Any]] = None  # For maps
    metadata: Dict[str, Any] = {}


class StorageLocationCreate(StorageLocationBase):
    """Create storage location"""
    pass


class StorageLocationUpdate(BaseModel):
    """Update storage location"""
    name: Optional[str] = None
    description: Optional[str] = None
    location_type: Optional[LocationType] = None
    parent_id: Optional[UUID] = None
    capacity: Optional[int] = None
    barcode_id: Optional[UUID] = None
    coordinates: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class StorageLocation(StorageLocationBase):
    """Storage location"""
    id: UUID
    path: str  # Full hierarchical path
    current_count: int = 0
    utilization: float = 0.0  # Percentage
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Location Movement Models
# ==========================================

class LocationMovementBase(BaseModel):
    """Base location movement model"""
    item_type: str  # document or asset
    item_id: UUID
    from_location_id: Optional[UUID] = None
    to_location_id: UUID
    notes: Optional[str] = None


class LocationMovementCreate(LocationMovementBase):
    """Create location movement"""
    pass


class LocationMovement(LocationMovementBase):
    """Location movement record"""
    id: UUID
    moved_by: UUID
    moved_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Print Template Models
# ==========================================

class PrintTemplateBase(BaseModel):
    """Base print template model"""
    name: str
    description: Optional[str] = None
    dimensions: Dict[str, Any]  # width, height, unit
    elements: List[Dict[str, Any]] = []  # Template elements


class PrintTemplateCreate(PrintTemplateBase):
    """Create print template"""
    pass


class PrintTemplate(PrintTemplateBase):
    """Print template"""
    id: UUID
    is_default: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Print Job Models
# ==========================================

class PrintJobBase(BaseModel):
    """Base print job model"""
    template_id: UUID
    barcode_ids: List[UUID]
    printer_id: Optional[UUID] = None
    copies: int = 1


class PrintJobCreate(PrintJobBase):
    """Create print job"""
    pass


class PrintJob(PrintJobBase):
    """Print job"""
    id: UUID
    status: PrintJobStatus = PrintJobStatus.PENDING
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True


# ==========================================
# Printer Models
# ==========================================

class PrinterBase(BaseModel):
    """Base printer model"""
    name: str
    printer_type: str  # label, standard
    model: str
    capabilities: List[str] = []


class PrinterCreate(PrinterBase):
    """Create printer"""
    pass


class PrinterUpdate(BaseModel):
    """Update printer"""
    name: Optional[str] = None
    printer_type: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None
    capabilities: Optional[List[str]] = None
    is_default: Optional[bool] = None


class Printer(PrinterBase):
    """Printer"""
    id: UUID
    status: str = "online"  # online, offline, error
    is_default: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Mobile Scanning Models
# ==========================================

class ScanSessionBase(BaseModel):
    """Base scan session model"""
    session_type: str = "barcode"  # barcode, document, batch


class ScanSessionCreate(ScanSessionBase):
    """Create scan session"""
    pass


class ScanSession(ScanSessionBase):
    """Scan session"""
    id: UUID
    user_id: UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    scanned_count: int = 0
    captured_count: int = 0
    status: ScanSessionStatus = ScanSessionStatus.ACTIVE

    class Config:
        from_attributes = True


class ScannedItemBase(BaseModel):
    """Base scanned item model"""
    session_id: UUID
    barcode: str
    format: BarcodeFormatType
    confidence: float
    metadata: Dict[str, Any] = {}


class ScannedItemCreate(ScannedItemBase):
    """Create scanned item"""
    pass


class ScannedItem(ScannedItemBase):
    """Scanned item"""
    id: UUID
    validated: bool = False
    validation_result: Optional[Dict[str, Any]] = None
    timestamp: datetime
    location_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class CapturedDocumentBase(BaseModel):
    """Base captured document model"""
    session_id: UUID
    document_type: Optional[str] = None
    metadata: Dict[str, Any] = {}
    pages: int = 1


class CapturedDocumentCreate(CapturedDocumentBase):
    """Create captured document"""
    original_image_path: str
    enhanced_image_path: Optional[str] = None


class CapturedDocument(CapturedDocumentBase):
    """Captured document"""
    id: UUID
    original_image_url: str
    enhanced_image_url: Optional[str] = None
    timestamp: datetime
    location_data: Optional[Dict[str, Any]] = None
    processing_status: str = "pending"  # pending, processing, completed, failed
    ocr_text: Optional[str] = None

    class Config:
        from_attributes = True


# ==========================================
# Batch Scanning Models
# ==========================================

class BatchSessionBase(BaseModel):
    """Base batch session model"""
    batch_type: str  # barcode, document
    target_count: int
    auto_advance: bool = False


class BatchSessionCreate(BatchSessionBase):
    """Create batch session"""
    pass


class BatchSession(BatchSessionBase):
    """Batch session"""
    id: UUID
    user_id: UUID
    created_at: datetime
    completed_at: Optional[datetime] = None
    status: str = "active"  # active, completed, processing, failed
    items_count: int = 0

    class Config:
        from_attributes = True


class BatchItemBase(BaseModel):
    """Base batch item model"""
    batch_id: UUID
    item_type: str  # barcode, document
    data: str
    metadata: Dict[str, Any] = {}


class BatchItemCreate(BatchItemBase):
    """Create batch item"""
    pass


class BatchItem(BatchItemBase):
    """Batch item"""
    id: UUID
    timestamp: datetime
    status: str = "pending"  # pending, completed, failed

    class Config:
        from_attributes = True


# ==========================================
# Offline Operation Models
# ==========================================

class OfflineOperationBase(BaseModel):
    """Base offline operation model"""
    operation_type: str  # upload_scan, upload_capture, validate_barcode
    payload: Dict[str, Any]


class OfflineOperationCreate(OfflineOperationBase):
    """Create offline operation"""
    pass


class OfflineOperation(OfflineOperationBase):
    """Offline operation"""
    id: UUID
    user_id: UUID
    timestamp: datetime
    retry_count: int = 0
    status: str = "pending"  # pending, processing, completed, failed
    last_attempt: Optional[datetime] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True


# ==========================================
# Response Models
# ==========================================

class BarcodeListResponse(BaseModel):
    """Barcode list response"""
    barcodes: List[BarcodeRecord]
    total: int
    page: int
    page_size: int


class PhysicalDocumentListResponse(BaseModel):
    """Physical document list response"""
    documents: List[PhysicalDocument]
    total: int
    page: int
    page_size: int


class StorageLocationListResponse(BaseModel):
    """Storage location list response"""
    locations: List[StorageLocation]
    total: int
    page: int
    page_size: int


class ScanHistoryResponse(BaseModel):
    """Scan history response"""
    scans: List[ScannedItem]
    total: int
    page: int
    page_size: int
