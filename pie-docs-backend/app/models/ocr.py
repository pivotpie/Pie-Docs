"""
OCR-related Pydantic models
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal


# ==========================================
# OCR Job Models
# ==========================================

class OCRJobBase(BaseModel):
    document_id: UUID
    language: str = "auto"
    max_retries: int = 3


class OCRJobCreate(OCRJobBase):
    pass


class OCRJob(OCRJobBase):
    id: UUID
    status: str  # pending, processing, completed, failed
    progress: int = 0
    detected_language: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    processing_duration: Optional[int] = None  # seconds
    retry_count: int = 0
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OCRJobListResponse(BaseModel):
    jobs: List[OCRJob]
    total: int
    page: int
    page_size: int


# ==========================================
# OCR Result Models
# ==========================================

class OCRResultBase(BaseModel):
    job_id: UUID
    document_id: UUID
    extracted_text: str
    formatted_text: Optional[str] = None
    language: Optional[str] = None
    overall_confidence: Optional[Decimal] = None
    processing_time: Optional[int] = None


class OCRResultCreate(OCRResultBase):
    pass


class OCRResult(OCRResultBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# OCR Text Block Models
# ==========================================

class OCRTextBlockBase(BaseModel):
    ocr_result_id: UUID
    text: str
    page_number: int
    sequence: int
    confidence: Optional[Decimal] = None
    bounding_box: Optional[Dict[str, Any]] = None  # {x, y, width, height}
    block_type: Optional[str] = None  # paragraph, line, word


class OCRTextBlockCreate(OCRTextBlockBase):
    pass


class OCRTextBlock(OCRTextBlockBase):
    id: UUID

    class Config:
        from_attributes = True


# ==========================================
# OCR Quality Metrics Models
# ==========================================

class OCRQualityMetricsBase(BaseModel):
    ocr_result_id: UUID
    text_coverage: Optional[Decimal] = None
    layout_preservation: Optional[Decimal] = None
    quality_rating: Optional[str] = None  # excellent, good, fair, poor
    issues: List[str] = []
    recommendations: List[str] = []


class OCRQualityMetricsCreate(OCRQualityMetricsBase):
    pass


class OCRQualityMetrics(OCRQualityMetricsBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# OCR Edit History Models
# ==========================================

class OCREditHistoryBase(BaseModel):
    ocr_result_id: UUID
    original_text: str
    edited_text: str
    change_summary: Optional[str] = None


class OCREditHistoryCreate(OCREditHistoryBase):
    pass


class OCREditHistory(OCREditHistoryBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
