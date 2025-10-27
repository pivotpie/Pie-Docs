"""
Workflow Models - Pydantic schemas for workflow management
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal, Dict, Any
from uuid import UUID
from datetime import datetime


# ============================================================================
# Workflow Element Models
# ============================================================================

class WorkflowElementData(BaseModel):
    """Data contained in a workflow element"""
    title: str
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class WorkflowElementPosition(BaseModel):
    """Position of an element on the canvas"""
    x: float
    y: float


class WorkflowElement(BaseModel):
    """Individual workflow element (node) - supports all workflow element types"""
    id: str
    type: str = Field(..., description="Element type (trigger-*, action-*, logic-*, flow-*, integration-*)")
    position: WorkflowElementPosition
    data: WorkflowElementData

    @validator('type')
    def validate_type(cls, v):
        """Validate that type follows naming convention"""
        # Allow legacy types for backward compatibility
        legacy_types = ['approval', 'review', 'notification', 'decision', 'timer', 'start', 'end']

        # Allow new types with category prefix
        valid_prefixes = ['trigger-', 'action-', 'logic-', 'flow-', 'integration-']

        if v in legacy_types or any(v.startswith(prefix) for prefix in valid_prefixes):
            return v

        # Log warning but allow custom types for extensibility
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Unknown workflow element type: {v}")
        return v

    class Config:
        schema_extra = {
            "example": {
                "id": "element-1",
                "type": "flow-approval",
                "position": {"x": 100, "y": 100},
                "data": {
                    "title": "Manager Approval",
                    "description": "Requires manager approval",
                    "config": {"approvers": ["user-123"], "timeout_days": 3}
                }
            }
        }


# ============================================================================
# Workflow Connection Models
# ============================================================================

class WorkflowConnection(BaseModel):
    """Connection between workflow elements"""
    id: str
    sourceId: str = Field(..., alias="sourceId")
    targetId: str = Field(..., alias="targetId")
    label: Optional[str] = None
    condition: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "id": "connection-1",
                "sourceId": "element-1",
                "targetId": "element-2",
                "label": "Approved",
                "condition": "status == 'approved'"
            }
        }


# ============================================================================
# Workflow Base Models
# ============================================================================

class WorkflowBase(BaseModel):
    """Base workflow model with common fields"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    elements: List[Dict[str, Any]] = Field(default_factory=list)
    connections: List[Dict[str, Any]] = Field(default_factory=list)
    status: Literal['draft', 'active', 'archived'] = 'draft'

    @validator('elements')
    def validate_elements(cls, v):
        """Validate that elements are properly structured"""
        if not isinstance(v, list):
            raise ValueError('Elements must be a list')
        return v

    @validator('connections')
    def validate_connections(cls, v):
        """Validate that connections are properly structured"""
        if not isinstance(v, list):
            raise ValueError('Connections must be a list')
        return v


class WorkflowCreate(WorkflowBase):
    """Schema for creating a new workflow"""
    pass


class WorkflowUpdate(BaseModel):
    """Schema for updating an existing workflow"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    elements: Optional[List[Dict[str, Any]]] = None
    connections: Optional[List[Dict[str, Any]]] = None
    status: Optional[Literal['draft', 'active', 'archived']] = None


class WorkflowResponse(WorkflowBase):
    """Schema for workflow response"""
    id: UUID
    version: int
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Document Approval Workflow",
                "description": "Standard document approval process",
                "elements": [],
                "connections": [],
                "version": 1,
                "status": "draft",
                "created_by": "550e8400-e29b-41d4-a716-446655440001",
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-15T10:30:00Z"
            }
        }


class WorkflowListResponse(BaseModel):
    """Schema for workflow list response"""
    total: int
    workflows: List[WorkflowResponse]


# ============================================================================
# Workflow Execution Models
# ============================================================================

class WorkflowExecutionBase(BaseModel):
    """Base workflow execution model"""
    workflow_id: UUID
    document_id: Optional[UUID] = None
    current_step_id: Optional[str] = None
    status: Literal['running', 'completed', 'failed', 'paused'] = 'running'
    execution_data: Dict[str, Any] = Field(default_factory=dict)


class WorkflowExecutionCreate(BaseModel):
    """Schema for creating a workflow execution"""
    document_id: Optional[UUID] = None
    initial_data: Optional[Dict[str, Any]] = None


class WorkflowExecutionResponse(WorkflowExecutionBase):
    """Schema for workflow execution response"""
    id: UUID
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    error_stack: Optional[str] = None

    class Config:
        orm_mode = True


class WorkflowExecutionUpdate(BaseModel):
    """Schema for updating workflow execution"""
    current_step_id: Optional[str] = None
    status: Optional[Literal['running', 'completed', 'failed', 'paused']] = None
    execution_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


# ============================================================================
# Workflow Validation Models
# ============================================================================

class ValidationError(BaseModel):
    """Validation error model"""
    id: str
    type: Literal['error', 'warning']
    message: str
    elementId: Optional[str] = None
    connectionId: Optional[str] = None


class ValidationResponse(BaseModel):
    """Workflow validation response"""
    is_valid: bool
    errors: List[ValidationError] = Field(default_factory=list)
    warnings: List[ValidationError] = Field(default_factory=list)


# ============================================================================
# Workflow Template Models
# ============================================================================

class WorkflowTemplateBase(BaseModel):
    """Base workflow template model"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    elements: List[Dict[str, Any]] = Field(default_factory=list)
    connections: List[Dict[str, Any]] = Field(default_factory=list)
    thumbnail_url: Optional[str] = None


class WorkflowTemplateCreate(WorkflowTemplateBase):
    """Schema for creating a workflow template"""
    pass


class WorkflowTemplateResponse(WorkflowTemplateBase):
    """Schema for workflow template response"""
    id: UUID
    is_system_template: bool = False
    usage_count: int = 0
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# ============================================================================
# Workflow Import/Export Models
# ============================================================================

class WorkflowExportResponse(BaseModel):
    """Workflow export data"""
    workflow: WorkflowResponse
    export_date: datetime
    version: str = "1.0"


class WorkflowImportRequest(BaseModel):
    """Workflow import request"""
    name: str
    description: Optional[str] = None
    elements: List[Dict[str, Any]]
    connections: List[Dict[str, Any]]
    preserve_ids: bool = False  # Whether to keep original element/connection IDs
