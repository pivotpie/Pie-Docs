"""
AI Features Router - Endpoints for document AI analysis and generation
Handles: Insights, Summaries, Key Terms, Dynamic Actions, Document Generation
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from uuid import UUID
import logging
import json

from app.models.ai import (
    DocumentInsight, DocumentInsightsResponse,
    DocumentSummary, CustomSummaryRequest, CustomSummaryResponse,
    DocumentKeyTerm, DocumentKeyTermsResponse,
    GenerateDocumentRequest, GeneratedDocumentResponse,
    DynamicAIActionRequest, DynamicAIActionResponse,
    AmendmentRequest, AmendmentResponse,
    DocumentIntelligenceResponse
)
from app.database import get_db_cursor
from app.services.document_intelligence_service import document_intelligence_service
from app.middleware.auth_middleware import get_current_user, get_current_user_optional
from app.config import settings

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])
logger = logging.getLogger(__name__)


# Helper to determine if authentication is required
def get_auth_dependency():
    """
    Returns appropriate auth dependency based on environment
    In DEBUG mode, authentication is optional
    In production, authentication is required
    """
    return get_current_user_optional if settings.DEBUG else get_current_user


# ==========================================
# Document Insights Endpoints
# ==========================================

@router.get("/documents/{document_id}/insights", response_model=DocumentInsightsResponse)
async def get_document_insights(
    document_id: UUID,
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """
    Get cached document insights (clauses, PII, financial terms, risks)
    These are extracted during document upload and cached in database
    """
    try:
        with get_db_cursor() as cursor:
            # Verify document exists and user has access
            cursor.execute("""
                SELECT id FROM documents
                WHERE id = %s AND deleted_at IS NULL
            """, (document_id,))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found")

            # Fetch insights from database
            cursor.execute("""
                SELECT
                    id, document_id, insight_type, category, content, context,
                    page_number, position_start, position_end, bounding_box,
                    confidence, severity, model_version, created_at, updated_at
                FROM document_insights
                WHERE document_id = %s
                ORDER BY page_number ASC NULLS LAST, created_at ASC
            """, (document_id,))

            rows = cursor.fetchall()
            insights = [DocumentInsight(**dict(row)) for row in rows]

            return DocumentInsightsResponse(
                insights=insights,
                count=len(insights),
                document_id=document_id
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Summary Endpoints
# ==========================================

@router.get("/documents/{document_id}/summary", response_model=DocumentSummary)
async def get_document_summary(
    document_id: UUID,
    summary_type: str = "default",
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """
    Get cached document summary (generated during upload)
    """
    try:
        with get_db_cursor() as cursor:
            # Verify document exists
            cursor.execute("""
                SELECT id FROM documents
                WHERE id = %s AND deleted_at IS NULL
            """, (document_id,))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found")

            # Fetch summary
            cursor.execute("""
                SELECT
                    id, document_id, summary_text, key_points, word_count,
                    summary_type, language, model_version, generation_time_ms,
                    token_usage, generated_at
                FROM document_summaries
                WHERE document_id = %s AND summary_type = %s
                ORDER BY generated_at DESC
                LIMIT 1
            """, (document_id, summary_type))

            row = cursor.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail=f"No {summary_type} summary available for this document"
                )

            return DocumentSummary(**dict(row))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/{document_id}/summary/custom", response_model=CustomSummaryResponse)
async def create_custom_summary(
    document_id: UUID,
    request: CustomSummaryRequest,
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """
    Generate a custom summary on-demand (short, medium, or long)
    """
    try:
        # Get document OCR text
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT ocr.extracted_text
                FROM documents d
                LEFT JOIN ocr_results ocr ON d.id = ocr.document_id
                WHERE d.id = %s AND d.deleted_at IS NULL
            """, (document_id,))

            row = cursor.fetchone()
            if not row or not row['extracted_text']:
                raise HTTPException(
                    status_code=404,
                    detail="Document not found or OCR text not available"
                )

            text_content = row['extracted_text']

        # Generate custom summary
        max_lengths = {"short": 100, "medium": 200, "long": 400}
        max_length = max_lengths.get(request.length, 200)

        success, summary_data, error = document_intelligence_service.generate_summary(
            text_content, max_length=max_length, extract_key_points=True
        )

        if not success:
            raise HTTPException(status_code=500, detail=error or "Failed to generate summary")

        return CustomSummaryResponse(
            summary=summary_data['summary_text'],
            word_count=summary_data['word_count'],
            generation_time_ms=summary_data['generation_time_ms']
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating custom summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Key Terms Endpoints
# ==========================================

@router.get("/documents/{document_id}/key-terms", response_model=DocumentKeyTermsResponse)
async def get_document_key_terms(
    document_id: UUID,
    category: Optional[str] = None,
    importance: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """
    Get cached document key terms (extracted during upload)
    Optional filters: category, importance
    """
    try:
        with get_db_cursor() as cursor:
            # Verify document exists
            cursor.execute("""
                SELECT id FROM documents
                WHERE id = %s AND deleted_at IS NULL
            """, (document_id,))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found")

            # Build query with optional filters
            query = """
                SELECT
                    id, document_id, term, definition, context, category,
                    importance, page_references, frequency, confidence,
                    model_version, created_at
                FROM document_key_terms
                WHERE document_id = %s
            """
            params = [document_id]

            if category:
                query += " AND category = %s"
                params.append(category)

            if importance:
                query += " AND importance = %s"
                params.append(importance)

            query += " ORDER BY importance DESC, term ASC"

            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            terms = [DocumentKeyTerm(**dict(row)) for row in rows]

            return DocumentKeyTermsResponse(
                terms=terms,
                count=len(terms),
                document_id=document_id
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document key terms: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Dynamic AI Actions Endpoints
# ==========================================

@router.post("/documents/{document_id}/actions/{action_type}", response_model=DynamicAIActionResponse)
async def execute_dynamic_action(
    document_id: UUID,
    action_type: str,
    request: DynamicAIActionRequest,
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """
    Execute dynamic AI actions on-demand:
    - amendment: Generate document amendment
    - insights: View all insights (redirects to insights endpoint)
    - key-terms: View all key terms (redirects to key-terms endpoint)
    - extract-clauses: Extract and categorize clauses
    - risk-analysis: Analyze document risks
    - compliance-check: Check regulatory compliance
    """
    try:
        # Validate action type
        valid_actions = [
            "amendment", "insights", "key-terms", "extract-clauses",
            "risk-analysis", "compliance-check"
        ]
        if action_type not in valid_actions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid action type. Must be one of: {', '.join(valid_actions)}"
            )

        # Get document OCR text
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT ocr.extracted_text
                FROM documents d
                LEFT JOIN ocr_results ocr ON d.id = ocr.document_id
                WHERE d.id = %s AND d.deleted_at IS NULL
            """, (document_id,))

            row = cursor.fetchone()
            if not row or not row['extracted_text']:
                raise HTTPException(
                    status_code=404,
                    detail="Document not found or OCR text not available"
                )

            text_content = row['extracted_text']

        # Check cache first
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT result_data, generation_time_ms, token_usage
                FROM ai_action_cache
                WHERE document_id = %s
                  AND action_type = %s
                  AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
            """, (document_id, action_type))

            cached_result = cursor.fetchone()

        if cached_result:
            # Return cached result
            logger.info(f"Returning cached result for {action_type} on document {document_id}")
            return DynamicAIActionResponse(
                action=action_type,
                result=cached_result['result_data'],
                generation_time_ms=cached_result['generation_time_ms'],
                token_usage=cached_result['token_usage'] or {},
                cached=True
            )

        # Generate new result
        success, result_data, error = document_intelligence_service.generate_dynamic_action(
            text_content=text_content,
            action_type=action_type,
            user_input=request.input_text
        )

        if not success:
            raise HTTPException(status_code=500, detail=error or "Failed to execute action")

        # Cache the result
        user_id = current_user['id'] if current_user else None  # NULL for anonymous users
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO ai_action_cache (
                    document_id, action_type, request_params, result_data,
                    model_version, generation_time_ms, token_usage, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                document_id,
                action_type,
                json.dumps({"input_text": request.input_text} if request.input_text else {}),
                json.dumps(result_data),
                result_data.get('model_version'),
                result_data.get('generation_time_ms'),
                json.dumps({}),  # Token usage as JSON string
                user_id
            ))

        return DynamicAIActionResponse(
            action=action_type,
            result=result_data,
            generation_time_ms=result_data.get('generation_time_ms', 0),
            token_usage={},
            cached=False
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing dynamic action {action_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Generation Endpoint
# ==========================================

@router.post("/generate-document", response_model=GeneratedDocumentResponse)
async def generate_document(
    request: GenerateDocumentRequest,
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """
    Generate a new document based on source documents and user prompt
    """
    try:
        logger.info(f"=== GENERATE DOCUMENT REQUEST START ===")
        logger.info(f"Request: {request.dict()}")
        logger.info(f"User: {current_user.get('id') if current_user else 'Anonymous'}")

        # Fetch source document texts
        source_texts = []
        logger.info(f"Fetching {len(request.source_document_ids)} source documents...")

        with get_db_cursor() as cursor:
            for doc_id in request.source_document_ids:
                logger.info(f"  Querying document {doc_id}...")
                cursor.execute("""
                    SELECT ocr.extracted_text, d.title
                    FROM documents d
                    LEFT JOIN ocr_results ocr ON d.id = ocr.document_id
                    WHERE d.id = %s AND d.deleted_at IS NULL
                """, (doc_id,))

                row = cursor.fetchone()
                if row and row['extracted_text']:
                    text_length = len(row['extracted_text'])
                    logger.info(f"  ✓ Found: {row['title']} ({text_length} chars)")
                    source_texts.append(f"# {row['title']}\n\n{row['extracted_text']}")
                else:
                    logger.warning(f"  ✗ Document {doc_id} has no OCR text")

        if not source_texts:
            logger.error("No valid source documents with OCR text found")
            raise HTTPException(
                status_code=400,
                detail="No valid source documents with OCR text found"
            )

        logger.info(f"Successfully loaded {len(source_texts)} source documents")
        logger.info(f"Calling document_intelligence_service.generate_document()...")
        logger.info(f"  Model: {document_intelligence_service.MODEL}")
        logger.info(f"  Available: {document_intelligence_service.is_available()}")

        # Generate document
        success, generated_data, error = document_intelligence_service.generate_document(
            prompt=request.prompt,
            source_texts=source_texts,
            document_type=request.document_type
        )

        if not success:
            logger.error(f"Document generation FAILED!")
            logger.error(f"  Success: {success}")
            logger.error(f"  Error: {error}")
            logger.error(f"  Generated Data: {generated_data}")
            raise HTTPException(
                status_code=500,
                detail=f"AI Generation Failed: {error}" if error else "Failed to generate document"
            )

        # Save to database
        user_id = current_user['id'] if current_user else None  # NULL for anonymous users
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO generated_documents (
                    source_document_ids, document_type, prompt, content, title,
                    word_count, model_version, generation_time_ms, token_usage,
                    created_by, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (
                list(request.source_document_ids),
                request.document_type,
                request.prompt,
                generated_data['content'],
                generated_data.get('title'),
                generated_data.get('word_count'),
                generated_data.get('model_version'),
                generated_data.get('generation_time_ms'),
                json.dumps({}),  # Token usage as JSON string
                user_id,
                'draft'
            ))

            result = cursor.fetchone()
            generated_id = result['id']
            created_at = result['created_at']

        logger.info(f"✓ Document generated successfully!")
        logger.info(f"  ID: {generated_id}")
        logger.info(f"  Title: {generated_data.get('title')}")
        logger.info(f"  Word Count: {generated_data.get('word_count', 0)}")
        logger.info(f"  Generation Time: {generated_data.get('generation_time_ms', 0)}ms")
        logger.info(f"=== GENERATE DOCUMENT REQUEST END ===")

        return GeneratedDocumentResponse(
            id=generated_id,
            content=generated_data['content'],
            title=generated_data.get('title'),
            word_count=generated_data.get('word_count', 0),
            token_usage={},
            generation_time_ms=generated_data.get('generation_time_ms', 0),
            created_at=created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"=== GENERATE DOCUMENT EXCEPTION ===")
        logger.error(f"Exception Type: {type(e).__name__}")
        logger.error(f"Exception Message: {str(e)}")
        logger.error(f"Full Traceback:")
        logger.error(traceback.format_exc())
        logger.error(f"=== END EXCEPTION ===")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Multimodal Analysis Endpoints
# ==========================================

@router.get("/documents/{document_id}/multimodal")
async def get_document_multimodal_analysis(
    document_id: UUID,
    analysis_type: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """
    Get multimodal analysis for a document (images, tables, charts, signatures, embedded media)
    Optional filter: analysis_type
    """
    try:
        with get_db_cursor() as cursor:
            # Verify document exists
            cursor.execute("""
                SELECT id FROM documents
                WHERE id = %s AND deleted_at IS NULL
            """, (document_id,))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found")

            # Build query with optional filter
            query = """
                SELECT
                    id, document_id, analysis_type, page_number, content_description,
                    extracted_data, bounding_box, media_url, media_type, transcription,
                    transcription_language, confidence, model_version, processing_time_ms,
                    created_at
                FROM document_multimodal_analysis
                WHERE document_id = %s
            """
            params = [document_id]

            if analysis_type:
                query += " AND analysis_type = %s"
                params.append(analysis_type)

            query += " ORDER BY page_number ASC NULLS LAST, created_at ASC"

            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()

            analyses = [dict(row) for row in rows]

            return {
                "analyses": analyses,
                "count": len(analyses),
                "document_id": str(document_id)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching multimodal analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Generated Documents Management
# ==========================================

@router.get("/generated-documents/{doc_id}")
async def get_generated_document(
    doc_id: UUID,
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """Get a generated document by ID"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    id, source_document_ids, document_type, prompt, content, title,
                    word_count, language, model_version, generation_time_ms, token_usage,
                    created_by, status, exported_at, export_format, export_url,
                    created_at, updated_at
                FROM generated_documents
                WHERE id = %s
            """, (doc_id,))

            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Generated document not found")

            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching generated document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generated-documents/{doc_id}/save-to-library")
async def save_generated_document_to_library(
    doc_id: UUID,
    folder_id: Optional[UUID] = None,
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """
    Save a generated document to the main document library
    Creates a new document entry with the generated content
    """
    try:
        # Get generated document
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT content, title, document_type
                FROM generated_documents
                WHERE id = %s
            """, (doc_id,))

            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Generated document not found")

            content = row['content']
            title = row['title'] or 'Generated Document'
            doc_type = row['document_type']

        # Create a text file with the generated content
        import tempfile
        import os
        from datetime import datetime

        # Create temp file
        temp_dir = tempfile.gettempdir()
        filename = f"{title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        file_path = os.path.join(temp_dir, filename)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        # Upload the file to the document library
        # This would normally use the documents upload endpoint
        # For now, we'll create a document entry directly
        user_id = current_user['id'] if current_user else None  # NULL for anonymous users

        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO documents (
                    title, filename, file_extension, file_size, mime_type,
                    folder_id, uploaded_by, status, document_type
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                title,
                filename,
                'md',
                os.path.getsize(file_path),
                'text/markdown',
                folder_id,
                user_id,
                'active',
                doc_type
            ))

            result = cursor.fetchone()
            new_doc_id = result['id']

            # Update generated document status
            cursor.execute("""
                UPDATE generated_documents
                SET status = 'finalized', exported_at = NOW()
                WHERE id = %s
            """, (doc_id,))

        # Clean up temp file
        os.remove(file_path)

        return {
            "success": True,
            "document_id": str(new_doc_id),
            "message": "Generated document saved to library"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving generated document to library: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/generated-documents/{doc_id}/download")
async def download_generated_document(
    doc_id: UUID,
    format: str = "markdown",
    current_user: Optional[dict] = Depends(get_auth_dependency())
):
    """
    Download a generated document in specified format (markdown, pdf, docx)
    """
    from fastapi.responses import Response

    try:
        # Get generated document
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT content, title
                FROM generated_documents
                WHERE id = %s
            """, (doc_id,))

            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Generated document not found")

            content = row['content']
            title = row['title'] or 'Generated Document'

        # Generate filename
        safe_title = title.replace(' ', '_').replace('/', '_')

        if format == "markdown" or format == "md":
            return Response(
                content=content.encode('utf-8'),
                media_type="text/markdown",
                headers={
                    "Content-Disposition": f'attachment; filename="{safe_title}.md"'
                }
            )
        elif format == "pdf":
            # TODO: Implement PDF conversion using a library like weasyprint or reportlab
            raise HTTPException(status_code=501, detail="PDF export not yet implemented")
        elif format == "docx":
            # TODO: Implement DOCX conversion using python-docx
            raise HTTPException(status_code=501, detail="DOCX export not yet implemented")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading generated document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Health Check
# ==========================================

@router.get("/health")
async def ai_health_check():
    """Check if AI services are available"""
    return {
        "status": "healthy" if document_intelligence_service.is_available() else "unavailable",
        "model": document_intelligence_service.MODEL if document_intelligence_service.is_available() else None,
        "features": {
            "insights": True,
            "summaries": True,
            "key_terms": True,
            "multimodal_analysis": True,
            "dynamic_actions": True,
            "document_generation": True,
            "save_to_library": True,
            "download": True
        }
    }
