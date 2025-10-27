"""
Document Classification API Router
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional, List
from pathlib import Path
import tempfile
import json
import logging

from app.services.classification_service import classification_service
from app.services.ocr_service import ocr_service
from app.database import get_db_cursor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/classification", tags=["classification"])


@router.get("/status")
async def get_classification_status():
    """Check if classification service is available"""
    return {
        "available": classification_service.is_available(),
        "service": "OpenAI GPT-5 Nano Vision" if classification_service.is_available() else "Mock Mode"
    }


@router.post("/classify")
async def classify_document(
    file: UploadFile = File(...),
    use_ocr: bool = Form(default=True),
    ocr_text: Optional[str] = Form(default=None)
):
    """
    Classify an uploaded document

    Args:
        file: The document file to classify
        use_ocr: Whether to perform OCR if ocr_text not provided
        ocr_text: Pre-extracted OCR text (optional)

    Returns:
        Classification result with document type, confidence, and reasoning
    """
    temp_file = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_file = Path(tmp.name)

        # Get available document types from database
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, display_name, description, icon
                FROM document_types
                WHERE is_active = TRUE
                ORDER BY display_name
            """)
            available_types = [dict(row) for row in cursor.fetchall()]

        if not available_types:
            raise HTTPException(status_code=500, detail="No active document types found in system")

        # Extract OCR text if needed and not provided
        # NOTE: When use_ocr=true from frontend without ocr_text, we skip separate OCR extraction
        # and let the classification service handle vision + text extraction in one API call
        extracted_ocr_text = ocr_text
        # Commented out to avoid redundant OCR calls - classification service handles vision
        # if use_ocr and not ocr_text and ocr_service.is_available():
        #     logger.info("Extracting OCR text for classification...")
        #     success, ocr_result, error = ocr_service.process_document(temp_file)
        #     if success and ocr_result:
        #         extracted_ocr_text = ocr_result.get('full_text', '')
        #         logger.info(f"OCR extracted {len(extracted_ocr_text)} characters")

        # Classify document
        logger.info(f"========================================")
        logger.info(f"📄 Classifying document: {file.filename}")
        logger.info(f"📊 File size: {len(content)} bytes")
        logger.info(f"📋 Temp file: {temp_file}")
        logger.info(f"🔤 OCR text provided: {bool(extracted_ocr_text)}")
        logger.info(f"📚 Available document types: {len(available_types)}")
        logger.info(f"========================================")

        success, result, error = classification_service.classify_document(
            temp_file,
            available_types,
            extracted_ocr_text
        )

        if not success:
            # Return mock result if service fails
            result = classification_service.generate_mock_classification(temp_file, available_types)
            logger.warning(f"❌ Classification failed, using mock: {error}")

        return {
            "success": success,
            "classification": result,
            "filename": file.filename,
            "ocr_performed": bool(extracted_ocr_text),
            "ocr_text": extracted_ocr_text if extracted_ocr_text else None,
            "ocr_text_length": len(extracted_ocr_text) if extracted_ocr_text else 0,
            "error": error if not success else None
        }

    except Exception as e:
        logger.error(f"Error in classify_document endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

    finally:
        # Clean up temp file
        if temp_file and temp_file.exists():
            try:
                temp_file.unlink()
            except:
                pass


@router.post("/classify-batch")
async def classify_documents_batch(
    files: List[UploadFile] = File(...),
    use_ocr: bool = Form(default=True)
):
    """
    Classify multiple documents in batch

    Args:
        files: List of document files to classify
        use_ocr: Whether to perform OCR for classification

    Returns:
        List of classification results
    """
    temp_files = []
    try:
        # Get available document types
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, display_name, description, icon
                FROM document_types
                WHERE is_active = TRUE
                ORDER BY display_name
            """)
            available_types = [dict(row) for row in cursor.fetchall()]

        if not available_types:
            raise HTTPException(status_code=500, detail="No active document types found in system")

        # Save all files temporarily
        for file in files:
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
                content = await file.read()
                tmp.write(content)
                temp_files.append(Path(tmp.name))

        # Extract OCR texts if needed
        ocr_texts = []
        if use_ocr and ocr_service.is_available():
            for temp_file in temp_files:
                success, ocr_result, error = ocr_service.process_document(temp_file)
                if success and ocr_result:
                    ocr_texts.append(ocr_result.get('full_text', ''))
                else:
                    ocr_texts.append(None)
        else:
            ocr_texts = [None] * len(temp_files)

        # Classify all documents
        results = classification_service.classify_batch(temp_files, available_types, ocr_texts)

        # Format response
        classifications = []
        for i, (success, result, error) in enumerate(results):
            if not success:
                result = classification_service.generate_mock_classification(temp_files[i], available_types)

            classifications.append({
                "filename": files[i].filename,
                "success": success,
                "classification": result,
                "ocr_performed": bool(ocr_texts[i]),
                "error": error if not success else None
            })

        return {
            "total": len(files),
            "classifications": classifications
        }

    except Exception as e:
        logger.error(f"Error in classify_documents_batch endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Batch classification failed: {str(e)}")

    finally:
        # Clean up temp files
        for temp_file in temp_files:
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except:
                    pass


@router.post("/validate-classification")
async def validate_classification(
    document_type_id: str = Form(...),
    confidence_threshold: float = Form(default=0.7)
):
    """
    Validate a classification result

    Args:
        document_type_id: The classified document type ID
        confidence_threshold: Minimum confidence threshold (0.0 to 1.0)

    Returns:
        Validation result
    """
    try:
        # Check if document type exists and is active
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, display_name, is_active
                FROM document_types
                WHERE id = %s
            """, (document_type_id,))
            doc_type = cursor.fetchone()

        if not doc_type:
            return {
                "valid": False,
                "reason": "Document type not found",
                "requires_manual_review": True
            }

        if not doc_type['is_active']:
            return {
                "valid": False,
                "reason": "Document type is inactive",
                "requires_manual_review": True
            }

        return {
            "valid": True,
            "document_type_name": doc_type['display_name'],
            "requires_manual_review": False
        }

    except Exception as e:
        logger.error(f"Error validating classification: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
