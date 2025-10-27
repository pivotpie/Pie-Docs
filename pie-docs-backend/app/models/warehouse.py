"""
Warehouse Management System Models
Physical Twin for Digital Documents Archiving System
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Literal
from uuid import UUID
from datetime import datetime


# ==========================================
# Enums and Literals
# ==========================================
WarehouseEntityStatus = Literal['active', 'inactive', 'maintenance', 'decommissioned']
BarcodeStatus = Literal['generated', 'printed', 'assigned', 'scanned', 'damaged', 'lost']
WarehouseType = Literal['standard', 'climate_controlled', 'secure', 'mixed']
ZoneType = Literal['storage', 'receiving', 'dispatch', 'processing', 'archive']
ShelfType = Literal['standard', 'heavy_duty', 'mobile', 'compact', 'archive']
RackType = Literal['box', 'folder', 'drawer', 'tray', 'bin']
AssignmentType = Literal['general', 'customer_dedicated', 'document_specific']
DocumentType = Literal['original', 'copy', 'certified_copy', 'archive']
PhysicalCondition = Literal['excellent', 'good', 'fair', 'poor', 'damaged']
ConservationPriority = Literal['low', 'medium', 'high', 'critical']
DocumentStatus = Literal['stored', 'retrieved', 'in_transit', 'missing', 'destroyed']
MovementType = Literal['initial_storage', 'relocation', 'retrieval', 'return']
MovementStatus = Literal['pending', 'in_progress', 'completed', 'cancelled', 'failed']
CustomerAssignmentType = Literal['permanent', 'temporary', 'contract']
BillingCycle = Literal['monthly', 'quarterly', 'yearly', 'one_time']
AssignmentStatus = Literal['active', 'expired', 'terminated', 'suspended']


# ==========================================
# Sub-models
# ==========================================
class Coordinates(BaseModel):
    latitude: float
    longitude: float


class ContactInfo(BaseModel):
    manager: Optional[str] = None
    supervisor: Optional[str] = None
    phone: str
    email: str


class OperationalHours(BaseModel):
    monday: Optional[Dict[str, str]] = None
    tuesday: Optional[Dict[str, str]] = None
    wednesday: Optional[Dict[str, str]] = None
    thursday: Optional[Dict[str, str]] = None
    friday: Optional[Dict[str, str]] = None
    saturday: Optional[Dict[str, str]] = None
    sunday: Optional[Dict[str, str]] = None


class EnvironmentalControl(BaseModel):
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    humidity_min: Optional[float] = None
    humidity_max: Optional[float] = None
    monitoring_enabled: bool = False


class Dimensions(BaseModel):
    width: float
    depth: float
    height: float


class Position(BaseModel):
    row: Optional[str] = None
    column: Optional[int] = None
    level: Optional[int] = None


class StorageRequirements(BaseModel):
    temperature_controlled: bool = False
    humidity_controlled: bool = False
    light_sensitive: bool = False
    special_handling: bool = False


# ==========================================
# Location Models
# ==========================================
class LocationBase(BaseModel):
    code: str
    name: str
    address: str
    city: str
    state: Optional[str] = None
    country: str
    postal_code: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    contact: ContactInfo
    timezone: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    contact: Optional[ContactInfo] = None
    timezone: Optional[str] = None
    status: Optional[WarehouseEntityStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class Location(LocationBase):
    id: UUID
    status: WarehouseEntityStatus
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID

    class Config:
        from_attributes = True


# ==========================================
# Warehouse Models
# ==========================================
class WarehouseBase(BaseModel):
    location_id: UUID
    code: str
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    warehouse_type: WarehouseType
    total_area: float
    operational_hours: Optional[OperationalHours] = None
    contact: ContactInfo
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    code: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    warehouse_type: Optional[WarehouseType] = None
    total_area: Optional[float] = None
    operational_hours: Optional[OperationalHours] = None
    contact: Optional[ContactInfo] = None
    status: Optional[WarehouseEntityStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class Warehouse(WarehouseBase):
    id: UUID
    status: WarehouseEntityStatus
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID

    class Config:
        from_attributes = True


# ==========================================
# Zone Models
# ==========================================
class ZoneBase(BaseModel):
    warehouse_id: UUID
    code: str
    barcode: str
    name: str
    description: Optional[str] = None
    zone_type: ZoneType
    area: float
    max_capacity: int
    environmental_control: Optional[EnvironmentalControl] = None
    access_level: Literal[1, 2, 3, 4, 5]
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    code: Optional[str] = None
    barcode: Optional[str] = None
    barcode_status: Optional[BarcodeStatus] = None
    name: Optional[str] = None
    description: Optional[str] = None
    zone_type: Optional[ZoneType] = None
    area: Optional[float] = None
    max_capacity: Optional[int] = None
    environmental_control: Optional[EnvironmentalControl] = None
    access_level: Optional[Literal[1, 2, 3, 4, 5]] = None
    status: Optional[WarehouseEntityStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class Zone(ZoneBase):
    id: UUID
    barcode_status: BarcodeStatus
    current_capacity: int
    status: WarehouseEntityStatus
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID

    class Config:
        from_attributes = True


# ==========================================
# Shelf Models
# ==========================================
class ShelfBase(BaseModel):
    zone_id: UUID
    code: str
    barcode: str
    name: str
    description: Optional[str] = None
    shelf_type: ShelfType
    dimensions: Dimensions
    weight_capacity: float
    max_racks: int
    position: Position
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ShelfCreate(ShelfBase):
    pass


class ShelfUpdate(BaseModel):
    code: Optional[str] = None
    barcode: Optional[str] = None
    barcode_status: Optional[BarcodeStatus] = None
    name: Optional[str] = None
    description: Optional[str] = None
    shelf_type: Optional[ShelfType] = None
    dimensions: Optional[Dimensions] = None
    weight_capacity: Optional[float] = None
    max_racks: Optional[int] = None
    position: Optional[Position] = None
    status: Optional[WarehouseEntityStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class Shelf(ShelfBase):
    id: UUID
    barcode_status: BarcodeStatus
    current_racks: int
    status: WarehouseEntityStatus
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID

    class Config:
        from_attributes = True


# ==========================================
# Rack Models
# ==========================================
class RackBase(BaseModel):
    shelf_id: UUID
    code: str
    barcode: str
    name: str
    description: Optional[str] = None
    rack_type: RackType
    dimensions: Dimensions
    weight_capacity: float
    max_documents: int
    position: str
    customer_id: Optional[UUID] = None
    assignment_type: AssignmentType
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class RackCreate(RackBase):
    pass


class RackUpdate(BaseModel):
    code: Optional[str] = None
    barcode: Optional[str] = None
    barcode_status: Optional[BarcodeStatus] = None
    name: Optional[str] = None
    description: Optional[str] = None
    rack_type: Optional[RackType] = None
    dimensions: Optional[Dimensions] = None
    weight_capacity: Optional[float] = None
    max_documents: Optional[int] = None
    position: Optional[str] = None
    customer_id: Optional[UUID] = None
    assignment_type: Optional[AssignmentType] = None
    status: Optional[WarehouseEntityStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class Rack(RackBase):
    id: UUID
    barcode_status: BarcodeStatus
    current_documents: int
    status: WarehouseEntityStatus
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID

    class Config:
        from_attributes = True


# ==========================================
# Physical Document Models
# ==========================================
class PhysicalDocumentBase(BaseModel):
    digital_document_id: UUID
    rack_id: UUID
    barcode: str
    document_type: DocumentType
    document_category: str
    title: str
    description: Optional[str] = None
    physical_condition: PhysicalCondition
    conservation_priority: ConservationPriority = 'low'
    storage_requirements: Optional[StorageRequirements] = None
    customer_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class PhysicalDocumentCreate(PhysicalDocumentBase):
    pass


class PhysicalDocumentUpdate(BaseModel):
    rack_id: Optional[UUID] = None
    barcode: Optional[str] = None
    barcode_status: Optional[BarcodeStatus] = None
    document_type: Optional[DocumentType] = None
    document_category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    physical_condition: Optional[PhysicalCondition] = None
    conservation_priority: Optional[ConservationPriority] = None
    storage_requirements: Optional[StorageRequirements] = None
    customer_id: Optional[UUID] = None
    status: Optional[DocumentStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class PhysicalDocument(PhysicalDocumentBase):
    id: UUID
    barcode_status: BarcodeStatus
    assignment_date: datetime
    assigned_by: UUID
    retrieval_count: int
    last_accessed: Optional[datetime] = None
    last_accessed_by: Optional[UUID] = None
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID

    class Config:
        from_attributes = True


# ==========================================
# Movement Models
# ==========================================
class DocumentMovementBase(BaseModel):
    document_id: UUID
    from_rack_id: Optional[UUID] = None
    to_rack_id: UUID
    movement_type: MovementType
    reason: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class DocumentMovementCreate(DocumentMovementBase):
    pass


class DocumentMovement(DocumentMovementBase):
    id: UUID
    from_location_path: Optional[str] = None
    to_location_path: str
    requested_by: UUID
    requested_at: datetime
    executed_by: Optional[UUID] = None
    executed_at: Optional[datetime] = None
    verified_by: Optional[UUID] = None
    verified_at: Optional[datetime] = None
    status: MovementStatus

    class Config:
        from_attributes = True


# ==========================================
# Customer Assignment Models
# ==========================================
class CustomerRackAssignmentBase(BaseModel):
    customer_id: UUID
    customer_name: str
    rack_id: UUID
    assignment_type: CustomerAssignmentType
    start_date: datetime
    end_date: Optional[datetime] = None
    billing_cycle: BillingCycle
    rate: Optional[float] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class CustomerRackAssignmentCreate(CustomerRackAssignmentBase):
    pass


class CustomerRackAssignment(CustomerRackAssignmentBase):
    id: UUID
    rack_code: str
    status: AssignmentStatus
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID

    class Config:
        from_attributes = True


# ==========================================
# Response Models
# ==========================================
class PaginatedResponse(BaseModel):
    data: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


class EntityCounts(BaseModel):
    locations: int
    warehouses: int
    zones: int
    shelves: int
    racks: int
    documents: int


class CapacityStats(BaseModel):
    entity_type: Literal['zone', 'shelf', 'rack']
    entity_id: UUID
    entity_name: str
    max_capacity: int
    current_capacity: int
    utilization_percentage: float
    available_capacity: int
    status: Literal['low', 'normal', 'high', 'full', 'over_capacity']
