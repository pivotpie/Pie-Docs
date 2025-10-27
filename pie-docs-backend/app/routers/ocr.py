"""
OCR API Router - OCR processing with quality metrics and edit history
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.ocr import (
    OCRJob, OCRJobCreate, OCRJobListResponse,
    OCRResult, OCRResultCreate,
    OCRTextBlock, OCRTextBlockCreate,
    OCRQualityMetrics, OCRQualityMetricsCreate,
    OCREditHistory, OCREditHistoryCreate
)
from app.services.ocr_service import ocr_service
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])


# ==========================================
# OCR Jobs
# ==========================================

@router.post("/start", response_model=OCRJob, status_code=status.HTTP_201_CREATED)
async def start_ocr_job(job: OCRJobCreate):
    """
    Start a new OCR processing job with GPT-4 Vision

    This endpoint will:
    1. Create an OCR job in the database
    2. Fetch the document file
    3. Process it with GPT-4 Vision
    4. Store the extracted text
    5. Update the document with OCR content

    Returns the OCR job with status and results
    """
    if not ocr_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="OCR service not available. Please configure OpenAI API key."
        )

    try:
        with get_db_cursor(commit=True) as cursor:
            # Get document information
            cursor.execute("""
                SELECT id, file_storage_path, file_original_name, mime_type
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
            """, (str(job.document_id),))

            document = cursor.fetchone()
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            doc_dict = dict(document)
            file_storage_path = doc_dict.get('file_storage_path')

            if not file_storage_path:
                raise HTTPException(status_code=400, detail="Document has no file path")

            # Construct full file path
            file_path = Path("uploads") / file_storage_path

            if not file_path.exists():
                raise HTTPException(status_code=404, detail=f"Document file not found: {file_path}")

            # Check if file is OCR-compatible
            file_extension = file_path.suffix.lower()
            ocr_compatible = file_extension in ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif', '.webp']

            if not ocr_compatible:
                raise HTTPException(
                    status_code=400,
                    detail=f"File type {file_extension} is not supported for OCR"
                )

            # Create OCR job
            cursor.execute("""
                INSERT INTO ocr_jobs (document_id, language, max_retries, status, progress, created_by)
                VALUES (%s, %s, %s, 'processing', 0, %s)
                RETURNING *
            """, (
                str(job.document_id),
                job.language or 'eng',
                job.max_retries or 3,
                str(job.created_by) if hasattr(job, 'created_by') and job.created_by else None
            ))

            new_job = cursor.fetchone()
            job_dict = dict(new_job)
            ocr_job_id = job_dict['id']

            logger.info(f"Starting Vision OCR for document {job.document_id}, job {ocr_job_id}")

            # Process document with Vision OCR
            success, ocr_results, error = ocr_service.process_document(
                file_path,
                language=job.language or 'eng'
            )

            if success and ocr_results:
                # Store OCR results
                cursor.execute("""
                    INSERT INTO ocr_results (
                        job_id, document_id, extracted_text, overall_confidence
                    )
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                """, (
                    str(ocr_job_id),
                    str(job.document_id),
                    ocr_results.get('full_text', ''),
                    ocr_results.get('overall_confidence', 95.0)
                ))

                ocr_result_id = cursor.fetchone()[0]

                # Update OCR job status
                cursor.execute("""
                    UPDATE ocr_jobs
                    SET status = %s, progress = %s
                    WHERE id = %s
                    RETURNING *
                """, ("completed", 100, str(ocr_job_id)))

                updated_job = cursor.fetchone()

                # Update document with OCR content
                cursor.execute("""
                    UPDATE documents
                    SET ocr_content = %s, ocr_confidence = %s
                    WHERE id = %s
                """, (
                    ocr_results.get('full_text'),
                    ocr_results.get('overall_confidence', 95.0),
                    str(job.document_id)
                ))

                logger.info(f"Vision OCR completed for job {ocr_job_id}: {len(ocr_results.get('full_text', ''))} characters extracted")

                return dict(updated_job)
            else:
                # Update job status to failed
                cursor.execute("""
                    UPDATE ocr_jobs
                    SET status = %s, error_message = %s
                    WHERE id = %s
                    RETURNING *
                """, ("failed", error or "Unknown error", str(ocr_job_id)))

                failed_job = cursor.fetchone()
                logger.error(f"Vision OCR failed for job {ocr_job_id}: {error}")

                raise HTTPException(
                    status_code=500,
                    detail=f"OCR processing failed: {error}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in OCR job processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=OCRJob)
async def get_job_status(job_id: UUID):
    """
    Get OCR job status
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM ocr_jobs WHERE id = %s", (str(job_id),))
            job = cursor.fetchone()

            if not job:
                raise HTTPException(status_code=404, detail="OCR job not found")

            return dict(job)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OCR job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_ocr_job(job_id: UUID):
    """
    Cancel an OCR job
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE ocr_jobs
                SET status = 'failed', error_message = 'Cancelled by user'
                WHERE id = %s AND status IN ('pending', 'processing')
                RETURNING id
            """, (str(job_id),))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="OCR job not found or already completed")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling OCR job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/retry", response_model=OCRJob)
async def retry_ocr_job(job_id: UUID):
    """
    Retry a failed OCR job
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE ocr_jobs
                SET status = 'pending', retry_count = retry_count + 1, error_message = NULL
                WHERE id = %s AND status = 'failed' AND retry_count < max_retries
                RETURNING *
            """, (str(job_id),))

            job = cursor.fetchone()

            if not job:
                raise HTTPException(status_code=404, detail="Job not found or max retries exceeded")

            return dict(job)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying OCR job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}/result", response_model=OCRResult)
async def get_ocr_result(job_id: UUID):
    """
    Get OCR result for a completed job
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM ocr_results WHERE job_id = %s
            """, (str(job_id),))
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="OCR result not found")

            return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OCR result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}/preview")
async def get_ocr_preview(job_id: UUID):
    """
    Get OCR preview data
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT r.*, j.document_id, j.status as job_status
                FROM ocr_results r
                JOIN ocr_jobs j ON r.job_id = j.id
                WHERE j.id = %s
            """, (str(job_id),))
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="OCR preview not available")

            return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OCR preview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Direct OCR Extraction (No Job Creation)
# ==========================================

@router.post("/extract/{document_id}")
async def extract_text_from_document(
    document_id: UUID,
    language: str = Query("eng", description="Language code for OCR (e.g., eng, ara, fra)")
):
    """
    Direct text extraction from document using GPT-4 Vision

    This endpoint provides immediate OCR extraction without creating a job.
    Perfect for real-time text extraction needs.

    Returns:
        - full_text: Complete extracted text
        - pages: Array of page results with individual page text
        - page_count: Number of pages processed
        - overall_confidence: Average confidence score
        - total_chars: Total character count
    """
    if not ocr_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="OCR service not available. Please configure OpenAI API key."
        )

    try:
        with get_db_cursor() as cursor:
            # Get document information
            cursor.execute("""
                SELECT id, file_storage_path, file_original_name, mime_type
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
            """, (str(document_id),))

            document = cursor.fetchone()
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            doc_dict = dict(document)
            file_storage_path = doc_dict.get('file_storage_path')

            if not file_storage_path:
                raise HTTPException(status_code=400, detail="Document has no file path")

            # Construct full file path
            file_path = Path("uploads") / file_storage_path

            if not file_path.exists():
                raise HTTPException(status_code=404, detail=f"Document file not found: {file_path}")

            # Check if file is OCR-compatible
            file_extension = file_path.suffix.lower()
            ocr_compatible = file_extension in ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif', '.webp']

            if not ocr_compatible:
                raise HTTPException(
                    status_code=400,
                    detail=f"File type {file_extension} is not supported for OCR. Supported: PDF, PNG, JPG, JPEG, TIFF, BMP, GIF, WebP"
                )

            logger.info(f"Extracting text from document {document_id} using Vision OCR")

            # Process document with Vision OCR
            success, ocr_results, error = ocr_service.process_document(
                file_path,
                language=language
            )

            if success and ocr_results:
                logger.info(f"Vision OCR extraction successful: {len(ocr_results.get('full_text', ''))} characters")

                return {
                    "document_id": str(document_id),
                    "full_text": ocr_results.get('full_text'),
                    "pages": ocr_results.get('pages', []),
                    "page_count": ocr_results.get('page_count', 0),
                    "overall_confidence": ocr_results.get('overall_confidence', 0.0),
                    "total_chars": ocr_results.get('total_chars', 0),
                    "language": language,
                    "method": "GPT-4 Vision",
                    "success": True
                }
            else:
                logger.error(f"Vision OCR extraction failed for document {document_id}: {error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"OCR extraction failed: {error}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting text from document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# OCR Results
# ==========================================

@router.get("/results/{result_id}", response_model=OCRResult)
async def get_result_details(result_id: UUID):
    """
    Get OCR result details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM ocr_results WHERE id = %s", (str(result_id),))
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="OCR result not found")

            return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OCR result details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{result_id}/text-blocks", response_model=List[OCRTextBlock])
async def get_text_blocks(result_id: UUID, page_number: Optional[int] = Query(None)):
    """
    Get OCR text blocks
    """
    try:
        with get_db_cursor() as cursor:
            if page_number is not None:
                cursor.execute("""
                    SELECT * FROM ocr_text_blocks
                    WHERE ocr_result_id = %s AND page_number = %s
                    ORDER BY sequence
                """, (str(result_id), page_number))
            else:
                cursor.execute("""
                    SELECT * FROM ocr_text_blocks
                    WHERE ocr_result_id = %s
                    ORDER BY page_number, sequence
                """, (str(result_id),))

            blocks = cursor.fetchall()
            return [dict(b) for b in blocks]
    except Exception as e:
        logger.error(f"Error getting text blocks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{result_id}/quality", response_model=OCRQualityMetrics)
async def get_quality_metrics(result_id: UUID):
    """
    Get OCR quality metrics
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM ocr_quality_metrics WHERE ocr_result_id = %s
            """, (str(result_id),))
            metrics = cursor.fetchone()

            if not metrics:
                raise HTTPException(status_code=404, detail="Quality metrics not found")

            return dict(metrics)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quality metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/results/{result_id}/edit", response_model=OCREditHistory, status_code=status.HTTP_201_CREATED)
async def save_manual_edits(result_id: UUID, edit: OCREditHistoryCreate):
    """
    Save manual edits to OCR result
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO ocr_edit_history (
                    ocr_result_id, user_id, original_text, edited_text, change_summary
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(result_id),
                str(edit.user_id) if hasattr(edit, 'user_id') and edit.user_id else None,
                edit.original_text, edit.edited_text, edit.change_summary
            ))

            new_edit = cursor.fetchone()
            return dict(new_edit)
    except Exception as e:
        logger.error(f"Error saving manual edits: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{result_id}/edit-history", response_model=List[OCREditHistory])
async def get_edit_history(result_id: UUID):
    """
    Get OCR edit history
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM ocr_edit_history
                WHERE ocr_result_id = %s
                ORDER BY created_at DESC
            """, (str(result_id),))

            history = cursor.fetchall()
            return [dict(h) for h in history]
    except Exception as e:
        logger.error(f"Error getting edit history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# OCR Utilities
# ==========================================

@router.post("/detect-type")
async def detect_document_type(document_url: str):
    """
    Detect if document is OCR-compatible
    """
    # In real implementation, this would analyze the document
    return {
        "isOCRCompatible": True,
        "documentType": "pdf",
        "pageCount": 0
    }


@router.post("/detect-language")
async def detect_language(document_url: str):
    """
    Detect document language
    """
    # In real implementation, this would detect language
    return {
        "language": "en",
        "confidence": 0.95
    }


@router.post("/optimize-image")
async def optimize_image(image_url: str, settings: dict):
    """
    Optimize image for OCR processing
    """
    # In real implementation, this would optimize the image
    return {
        "optimizedImageUrl": image_url,
        "improvements": ["deskewed", "enhanced_contrast", "noise_reduced"]
    }


@router.get("/stats")
async def get_processing_stats():
    """
    Get OCR processing statistics
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    COUNT(*) as total_jobs,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
                    COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as active_jobs,
                    AVG(processing_duration) FILTER (WHERE status = 'completed') as avg_duration
                FROM ocr_jobs
            """)

            stats = cursor.fetchone()

            return {
                "totalJobsProcessed": int(stats['total_jobs']) if stats['total_jobs'] else 0,
                "averageProcessingTime": float(stats['avg_duration']) if stats['avg_duration'] else 0,
                "successRate": (float(stats['completed_jobs']) / float(stats['total_jobs']) * 100) if stats['total_jobs'] and stats['total_jobs'] > 0 else 0,
                "currentQueueLength": int(stats['active_jobs']) if stats['active_jobs'] else 0
            }
    except Exception as e:
        logger.error(f"Error getting processing stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}")
async def get_document_ocr_results(document_id: UUID):
    """
    Get OCR results for a specific document

    Returns the most recent completed OCR job and results for the document,
    or the document's stored OCR content if available.
    """
    try:
        with get_db_cursor() as cursor:
            # First, get document with its OCR content
            cursor.execute("""
                SELECT id, title, ocr_content, ocr_confidence, file_storage_path
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
            """, (str(document_id),))

            document = cursor.fetchone()
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            doc_dict = dict(document)

            # Try to get the most recent completed OCR job
            cursor.execute("""
                SELECT j.id as job_id, j.status, j.language, j.created_at,
                       r.id as result_id, r.extracted_text as full_text, r.overall_confidence as total_confidence
                FROM ocr_jobs j
                LEFT JOIN ocr_results r ON r.job_id = j.id
                WHERE j.document_id = %s
                ORDER BY j.created_at DESC
                LIMIT 1
            """, (str(document_id),))

            ocr_job = cursor.fetchone()

            if ocr_job:
                # Return OCR job results
                ocr_dict = dict(ocr_job)
                return {
                    "document_id": str(document_id),
                    "has_ocr_results": True,
                    "job_id": str(ocr_dict.get('job_id')),
                    "status": ocr_dict.get('status'),
                    "extractedText": ocr_dict.get('full_text') or doc_dict.get('ocr_content'),
                    "pageCount": 0,  # page_count not stored in ocr_results table
                    "confidence": {
                        "overall": ocr_dict.get('total_confidence') or doc_dict.get('ocr_confidence', 0)
                    },
                    "language": ocr_dict.get('language', 'eng'),
                    "created_at": str(ocr_dict.get('created_at'))
                }
            elif doc_dict.get('ocr_content'):
                # Return stored OCR content from document
                return {
                    "document_id": str(document_id),
                    "has_ocr_results": True,
                    "job_id": None,
                    "status": "completed",
                    "extractedText": doc_dict.get('ocr_content'),
                    "pageCount": 0,  # Unknown
                    "confidence": {
                        "overall": doc_dict.get('ocr_confidence', 0)
                    },
                    "language": "unknown"
                }
            else:
                # No OCR results available
                return {
                    "document_id": str(document_id),
                    "has_ocr_results": False,
                    "message": "No OCR results available for this document. Start an OCR job to extract text."
                }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OCR results for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
