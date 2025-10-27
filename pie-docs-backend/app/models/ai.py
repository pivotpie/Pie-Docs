"""
AI-related Pydantic models for API validation
Includes: Insights, Summaries, Key Terms, Multimodal Analysis, Generated Documents
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal


# ==========================================
# Document Insight Models
# ==========================================

class DocumentInsightBase(BaseModel):
    document_id: UUID
    insight_type: str  # clause, pii, financial, reference, date, risk
    category: str
    content: str
    context: Optional[str] = None
    page_number: Optional[int] = None
    position_start: Optional[int] = None
    position_end: Optional[int] = None
    bounding_box: Optional[Dict[str, Any]] = None
    confidence: Optional[Decimal] = None
    severity: Optional[str] = None  # low, medium, high, critical
    model_version: Optional[str] = None


class DocumentInsightCreate(DocumentInsightBase):
    pass


class DocumentInsight(DocumentInsightBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentInsightsResponse(BaseModel):
    insights: List[DocumentInsight]
    count: int
    document_id: UUID


# ==========================================
# Document Summary Models
# ==========================================

class DocumentSummaryBase(BaseModel):
    document_id: UUID
    summary_text: str
    key_points: Optional[List[str]] = None
    word_count: Optional[int] = None
    summary_type: str = "default"  # default, short, medium, long
    language: str = "en"
    model_version: Optional[str] = None
    generation_time_ms: Optional[int] = None
    token_usage: Optional[Dict[str, int]] = None


class DocumentSummaryCreate(DocumentSummaryBase):
    pass


class DocumentSummary(DocumentSummaryBase):
    id: UUID
    generated_at: datetime

    class Config:
        from_attributes = True


class CustomSummaryRequest(BaseModel):
    length: str = Field(..., pattern="^(short|medium|long)$")


class CustomSummaryResponse(BaseModel):
    summary: str
    word_count: int
    generation_time_ms: int


# ==========================================
# Document Key Term Models
# ==========================================

class DocumentKeyTermBase(BaseModel):
    document_id: UUID
    term: str
    definition: Optional[str] = None
    context: Optional[str] = None
    category: Optional[str] = None  # legal, financial, technical, date, party, other
    importance: Optional[str] = None  # critical, important, reference
    page_references: Optional[List[int]] = None
    frequency: int = 1
    confidence: Optional[Decimal] = None
    model_version: Optional[str] = None


class DocumentKeyTermCreate(DocumentKeyTermBase):
    pass


class DocumentKeyTerm(DocumentKeyTermBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentKeyTermsResponse(BaseModel):
    terms: List[DocumentKeyTerm]
    count: int
    document_id: UUID


# ==========================================
# Multimodal Analysis Models
# ==========================================

class DocumentMultimodalAnalysisBase(BaseModel):
    document_id: UUID
    analysis_type: str  # image, table, chart, signature, logo, embedded_audio, embedded_video
    page_number: Optional[int] = None
    content_description: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    bounding_box: Optional[Dict[str, Any]] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    transcription: Optional[str] = None
    transcription_language: Optional[str] = None
    confidence: Optional[Decimal] = None
    model_version: Optional[str] = None
    processing_time_ms: Optional[int] = None


class DocumentMultimodalAnalysisCreate(DocumentMultimodalAnalysisBase):
    pass


class DocumentMultimodalAnalysis(DocumentMultimodalAnalysisBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentMultimodalAnalysisResponse(BaseModel):
    analyses: List[DocumentMultimodalAnalysis]
    count: int
    document_id: UUID


# ==========================================
# Generated Document Models
# ==========================================

class GeneratedDocumentBase(BaseModel):
    source_document_ids: List[UUID]
    document_type: str
    prompt: str
    content: str
    title: Optional[str] = None
    word_count: Optional[int] = None
    language: str = "en"
    model_version: Optional[str] = None
    generation_time_ms: Optional[int] = None
    token_usage: Optional[Dict[str, int]] = None


class GeneratedDocumentCreate(GeneratedDocumentBase):
    pass


class GenerateDocumentRequest(BaseModel):
    prompt: str = Field(..., min_length=10)
    source_document_ids: List[UUID] = Field(..., min_items=1)
    document_type: str = "Generated Document"


class GeneratedDocument(GeneratedDocumentBase):
    id: UUID
    created_by: Optional[UUID]
    status: str = "draft"
    exported_at: Optional[datetime] = None
    export_format: Optional[str] = None
    export_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GeneratedDocumentResponse(BaseModel):
    id: UUID
    content: str
    title: Optional[str]
    word_count: int
    token_usage: Dict[str, int]
    generation_time_ms: int
    created_at: datetime


class GeneratedDocumentListResponse(BaseModel):
    documents: List[GeneratedDocument]
    total: int
    page: int
    page_size: int


# ==========================================
# AI Action Cache Models
# ==========================================

class AIActionCacheBase(BaseModel):
    document_id: UUID
    action_type: str  # amendment, risk-analysis, compliance-check, etc.
    request_params: Optional[Dict[str, Any]] = None
    result_data: Dict[str, Any]
    model_version: Optional[str] = None
    generation_time_ms: Optional[int] = None
    token_usage: Optional[Dict[str, int]] = None


class AIActionCacheCreate(AIActionCacheBase):
    pass


class AIActionCache(AIActionCacheBase):
    id: UUID
    created_by: Optional[UUID]
    created_at: datetime
    expires_at: datetime
    access_count: int = 0
    last_accessed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==========================================
# Dynamic AI Action Request/Response Models
# ==========================================

class DynamicAIActionRequest(BaseModel):
    action: str = Field(..., pattern="^(amendment|insights|key-terms|extract-clauses|risk-analysis|compliance-check)$")
    input_text: Optional[str] = None  # Required for actions like amendment


class DynamicAIActionResponse(BaseModel):
    action: str
    result: Dict[str, Any]  # Structured JSON response from GPT-5
    generation_time_ms: int
    token_usage: Dict[str, int]
    cached: bool = False


class AmendmentRequest(BaseModel):
    changes: str = Field(..., min_length=10)


class AmendmentResponse(BaseModel):
    amendment: str
    sections: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    generation_time_ms: int


# ==========================================
# Batch Processing Models
# ==========================================

class BatchAIProcessingRequest(BaseModel):
    document_ids: List[UUID] = Field(..., min_items=1, max_items=100)
    extract_insights: bool = True
    extract_summaries: bool = True
    extract_key_terms: bool = True
    analyze_multimodal: bool = True


class BatchAIProcessingResponse(BaseModel):
    job_id: UUID
    status: str
    total_documents: int
    processed_documents: int = 0
    failed_documents: int = 0
    started_at: datetime
    estimated_completion: Optional[datetime] = None


# ==========================================
# Document Intelligence Complete Analysis
# ==========================================

class DocumentIntelligenceResponse(BaseModel):
    """Complete AI analysis of a document (all features combined)"""
    document_id: UUID
    insights: List[DocumentInsight]
    summary: Optional[DocumentSummary]
    key_terms: List[DocumentKeyTerm]
    multimodal_analyses: List[DocumentMultimodalAnalysis]
    processing_time_ms: int
    model_version: str
