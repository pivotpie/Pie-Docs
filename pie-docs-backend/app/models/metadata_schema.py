"""
Metadata Schema Models
Pydantic models for metadata schemas and fields
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


# ============================================
# Metadata Field Models
# ============================================

class MetadataFieldOption(BaseModel):
    """Option for dropdown/multiselect fields"""
    value: str
    label: str


class ConditionalLogic(BaseModel):
    """Conditional display logic for fields"""
    field: str
    operator: str  # equals, not_equals, contains, greater_than, less_than
    value: Any


class MetadataFieldBase(BaseModel):
    """Base model for metadata fields"""
    field_name: str = Field(..., description="Internal field name (e.g., 'invoice_number')")
    field_label: str = Field(..., description="Display label (e.g., 'Invoice Number')")
    field_type: str = Field(..., description="Field type: text, number, date, dropdown, multiselect, checkbox, textarea")

    description: Optional[str] = None
    default_value: Optional[str] = None
    placeholder: Optional[str] = None

    # Validation
    is_required: bool = False
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None  # regex pattern

    # Options for dropdown/multiselect
    options: Optional[List[MetadataFieldOption]] = None

    # Display settings
    display_order: int = 0
    display_width: str = "full"  # full, half, third, quarter
    group_name: Optional[str] = None

    # Conditional display
    conditional_logic: Optional[ConditionalLogic] = None

    # Help
    help_text: Optional[str] = None
    help_url: Optional[str] = None

    is_active: bool = True


class MetadataFieldCreate(MetadataFieldBase):
    """Model for creating a metadata field"""
    schema_id: UUID


class MetadataFieldUpdate(BaseModel):
    """Model for updating a metadata field"""
    field_label: Optional[str] = None
    field_type: Optional[str] = None
    description: Optional[str] = None
    default_value: Optional[str] = None
    placeholder: Optional[str] = None
    is_required: Optional[bool] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None
    options: Optional[List[MetadataFieldOption]] = None
    display_order: Optional[int] = None
    display_width: Optional[str] = None
    group_name: Optional[str] = None
    conditional_logic: Optional[ConditionalLogic] = None
    help_text: Optional[str] = None
    help_url: Optional[str] = None
    is_active: Optional[bool] = None


class MetadataField(MetadataFieldBase):
    """Model for metadata field response"""
    id: UUID
    schema_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Metadata Schema Models
# ============================================

class MetadataSchemaBase(BaseModel):
    """Base model for metadata schemas"""
    name: str = Field(..., description="Schema name (e.g., 'Invoice Metadata', 'Contract Metadata')")
    description: Optional[str] = None
    is_active: bool = True


class MetadataSchemaCreate(MetadataSchemaBase):
    """Model for creating a metadata schema"""
    document_type_id: UUID = Field(..., description="Document type this schema applies to")
    fields: Optional[List[MetadataFieldBase]] = Field(default=None, description="Fields to create with schema")


class MetadataSchemaUpdate(BaseModel):
    """Model for updating a metadata schema"""
    name: Optional[str] = None
    description: Optional[str] = None
    document_type_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class MetadataSchema(MetadataSchemaBase):
    """Model for metadata schema response"""
    id: UUID
    document_type_id: Optional[UUID] = None
    version: int
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    # Include fields in response
    fields: Optional[List[MetadataField]] = None

    class Config:
        from_attributes = True


class MetadataSchemaWithFields(MetadataSchema):
    """Schema with all its fields loaded"""
    fields: List[MetadataField]


# ============================================
# Document Metadata Models
# ============================================

class DocumentMetadataValue(BaseModel):
    """Individual metadata field value for a document"""
    field_name: str
    value: Any


class DocumentMetadataUpdate(BaseModel):
    """Model for updating document metadata"""
    metadata: Dict[str, Any] = Field(..., description="Metadata key-value pairs")


class DocumentMetadataValidation(BaseModel):
    """Validation result for document metadata"""
    is_valid: bool
    errors: Optional[Dict[str, List[str]]] = None
    warnings: Optional[Dict[str, List[str]]] = None
