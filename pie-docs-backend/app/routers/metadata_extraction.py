"""
Metadata Extraction Router
AI-powered metadata extraction using document type schemas with GPT-5-Nano Vision
Handles multi-page PDFs, vision-based OCR, and embeddings generation
"""
import logging
import tempfile
import json
import base64
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional, List, Dict, Tuple
from app.database import get_db_cursor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/metadata", tags=["Metadata Extraction"])

# Check if OpenAI is available
try:
    from openai import OpenAI
    import os
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
    OPENAI_AVAILABLE = bool(openai_client)
    if OPENAI_AVAILABLE:
        logger.info("OpenAI GPT-5-Nano available for metadata extraction")
except ImportError:
    OPENAI_AVAILABLE = False
    openai_client = None
    logger.warning("OpenAI not available - metadata extraction will fail")

# Import embedding service
try:
    from app.embedding_service import embedding_service
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    logger.warning("Embeddings service not available")

@router.post("/extract")
async def extract_metadata(
    file: UploadFile = File(...),
    document_type_id: str = Form(...),
    classification_ocr_text: Optional[str] = Form(None),
    process_all_pages: bool = Form(default=True),
    include_embeddings: bool = Form(default=True),
    include_vision_ocr: bool = Form(default=True)
):
    """
    Extract metadata from document using GPT-5-Nano Vision

    This endpoint processes ALL pages of multi-page documents and returns:
    1. Metadata fields extracted based on document type schema
    2. Formatted OCR/Vision text from ALL pages
    3. Semantic embeddings for RAG
    4. Document insights (observations, risks, compliance issues, anomalies)
    5. Document summary with key points
    6. Key terms with definitions

    Args:
        file: The document file (PDF, image, etc.)
        document_type_id: UUID of the document type
        classification_ocr_text: OCR text from classification step (page 1 only)
        process_all_pages: Process all pages of multi-page documents (default: True)
        include_embeddings: Generate semantic embeddings (default: True)
        include_vision_ocr: Extract formatted OCR text using vision (default: True)

    Returns:
        {
            "success": true,
            "extracted_fields": {...},   // Schema-based metadata fields
            "ocr_text": "...",           // Full formatted text from ALL pages
            "embeddings": [...],          // Semantic embeddings
            "insights": [...],            // Document insights
            "summary": {...},             // Document summary with key points
            "key_terms": [...],           // Key terms with definitions
            "pages_processed": 3,
            "model_version": "gpt-5-nano"
        }
    """
    temp_file = None
    try:
        logger.info("====================================")
        logger.info("🚀 Starting Full Document Metadata Extraction")
        logger.info(f"📄 File: {file.filename}")
        logger.info(f"📑 Process all pages: {process_all_pages}")
        logger.info(f"🔢 Include embeddings: {include_embeddings}")
        logger.info(f"👁️  Include vision OCR: {include_vision_ocr}")
        logger.info("====================================")

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_file = Path(tmp.name)

        logger.info(f"📂 Saved temp file: {temp_file}")

        # Get document type and its schema
        with get_db_cursor() as cursor:
            # Get document type info
            cursor.execute("""
                SELECT id, display_name, description
                FROM document_types
                WHERE id = %s
            """, (document_type_id,))

            doc_type = cursor.fetchone()
            if not doc_type:
                raise HTTPException(status_code=404, detail=f"Document type {document_type_id} not found")

            # Get metadata schema for this document type
            cursor.execute("""
                SELECT ms.id, ms.name, ms.version
                FROM metadata_schemas ms
                WHERE ms.document_type_id = %s AND ms.is_active = TRUE
                ORDER BY ms.version DESC
                LIMIT 1
            """, (document_type_id,))

            schema_row = cursor.fetchone()

            # Get metadata fields for this schema
            fields = []
            if schema_row:
                cursor.execute("""
                    SELECT field_name, field_label, field_type, description,
                           is_required, default_value
                    FROM metadata_fields
                    WHERE schema_id = %s AND is_active = TRUE
                    ORDER BY display_order, field_name
                """, (schema_row['id'],))

                field_rows = cursor.fetchall()
                fields = [dict(row) for row in field_rows]

        logger.info(f"📋 Document Type: {doc_type['display_name']}")
        logger.info(f"📊 Schema found: {bool(schema_row)}")
        logger.info(f"📝 Schema has {len(fields)} fields")

        #  ===============================================
        # STEP 1: Convert ALL pages to images (for PDFs)
        # ===============================================
        page_images = []
        pages_processed = 1

        if temp_file.suffix.lower() == '.pdf' and process_all_pages:
            logger.info("📑 Converting PDF pages to images...")
            page_images = await convert_pdf_to_images(temp_file)
            pages_processed = len(page_images)
            logger.info(f"✅ Converted {pages_processed} pages to images")
        elif temp_file.suffix.lower() in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']:
            # Single image file
            with open(temp_file, 'rb') as img_file:
                img_data = base64.b64encode(img_file.read()).decode('utf-8')
                mime_type = f"image/{temp_file.suffix[1:]}"
                page_images = [f"data:{mime_type};base64,{img_data}"]
            logger.info("✅ Single image file processed")
        else:
            logger.warning(f"⚠️ Unsupported file type: {temp_file.suffix}")

        # ===============================================
        # STEP 2: Extract metadata + OCR using GPT-5-Nano Vision
        # Send ALL pages in a single API call
        # ===============================================
        if not OPENAI_AVAILABLE or not openai_client:
            raise HTTPException(status_code=503, detail="OpenAI GPT-5-Nano not available")

        extracted_metadata, formatted_ocr_text, insights, summary, key_terms = await extract_with_vision(
            openai_client=openai_client,
            page_images=page_images,
            doc_type=doc_type,
            fields=fields,
            classification_ocr_text=classification_ocr_text,
            include_vision_ocr=include_vision_ocr
        )

        logger.info(f"✅ Metadata extraction complete")
        logger.info(f"  - Fields extracted: {len(extracted_metadata)}")
        logger.info(f"  - OCR text length: {len(formatted_ocr_text)}")
        logger.info(f"  - Insights extracted: {len(insights)}")
        logger.info(f"  - Summary extracted: {bool(summary)}")
        logger.info(f"  - Key terms extracted: {len(key_terms)}")

        # ===============================================
        # STEP 3: Generate embeddings for RAG
        # ===============================================
        embeddings = None
        if include_embeddings and EMBEDDINGS_AVAILABLE and formatted_ocr_text:
            try:
                logger.info("🔢 Generating semantic embeddings...")
                embeddings = embedding_service.generate_embedding(formatted_ocr_text)
                logger.info(f"✅ Embeddings generated: {len(embeddings)} dimensions")
            except Exception as emb_error:
                logger.error(f"❌ Embedding generation failed: {emb_error}")
                embeddings = None

        # ===============================================
        # RETURN: Complete extraction response
        # ===============================================
        logger.info("====================================")
        logger.info("✅ Full Document Extraction Complete")
        logger.info("====================================")

        return {
            "success": True,
            "document_type": doc_type['display_name'],
            "document_type_id": document_type_id,
            "extracted_fields": extracted_metadata,
            "ocr_text": formatted_ocr_text,
            "vision_text": formatted_ocr_text,  # Alias for frontend compatibility
            "formatted_text": formatted_ocr_text,  # Another alias
            "embeddings": embeddings,
            "insights": insights,  # NEW: Document insights
            "summary": summary,  # NEW: Document summary
            "key_terms": key_terms,  # NEW: Key terms
            "pages_processed": pages_processed,
            "field_count": len(extracted_metadata),
            "confidence": 0.9,
            "schema_version": schema_row['version'] if schema_row else None,
            "model_version": "gpt-5-nano"  # NEW: Model used for extraction
        }

    except Exception as e:
        logger.error(f"❌ Metadata extraction failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Metadata extraction failed: {str(e)}")

    finally:
        # Clean up temp file
        if temp_file and temp_file.exists():
            try:
                temp_file.unlink()
            except:
                pass


# ===============================================
# Helper Functions
# ===============================================

async def convert_pdf_to_images(pdf_path: Path) -> List[str]:
    """
    Convert ALL pages of PDF to base64-encoded JPEG images (compressed)

    Returns:
        List of base64 image data URLs (one per page)
    """
    try:
        import fitz  # PyMuPDF
        from PIL import Image
        import io

        pdf_document = fitz.open(pdf_path)
        page_images = []

        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]

            # Render page to image with moderate zoom
            zoom = 1.5  # Balanced quality/size
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)

            # Convert to PIL Image for better compression
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))

            # Resize if too large (max 2048px on longest side)
            max_size = 2048
            if max(img.width, img.height) > max_size:
                ratio = max_size / max(img.width, img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                logger.info(f"  - Resized page {page_num + 1} to {new_size}")

            # Save as JPEG with compression
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG', quality=85, optimize=True)
            compressed_data = img_byte_arr.getvalue()

            # Convert to base64
            img_base64 = base64.b64encode(compressed_data).decode('utf-8')
            data_url = f"data:image/jpeg;base64,{img_base64}"
            page_images.append(data_url)

            logger.info(f"  - Converted page {page_num + 1}/{len(pdf_document)} ({len(compressed_data)} bytes)")

        pdf_document.close()
        return page_images

    except ImportError:
        logger.error("PyMuPDF (fitz) not installed - cannot convert PDF to images")
        raise HTTPException(
            status_code=503,
            detail="PDF processing not available - PyMuPDF not installed"
        )
    except Exception as e:
        logger.error(f"PDF conversion failed: {e}")
        raise


async def extract_with_vision(
    openai_client,
    page_images: List[str],
    doc_type: Dict,
    fields: List[Dict],
    classification_ocr_text: Optional[str],
    include_vision_ocr: bool
) -> Tuple[Dict, str, List[Dict], Dict, List[Dict]]:
    """
    Extract metadata, OCR text, insights, summary, and key terms using GPT-5-Nano Vision

    Sends ALL page images in a single API call for:
    1. Metadata field extraction
    2. Formatted OCR text from all pages
    3. Document insights (observations, risks, compliance issues)
    4. Document summary with key points
    5. Key terms with definitions

    Args:
        openai_client: OpenAI client instance
        page_images: List of base64 image data URLs
        doc_type: Document type dictionary
        fields: Schema fields to extract
        classification_ocr_text: OCR from classification (page 1 only)
        include_vision_ocr: Whether to extract formatted OCR text

    Returns:
        Tuple of (extracted_metadata_dict, formatted_ocr_text, insights_list, summary_dict, key_terms_list)
    """
    try:
        # Build prompt for metadata extraction + OCR
        field_descriptions = []
        for field in fields:
            field_name = field.get('field_name', field.get('name', ''))
            field_label = field.get('field_label', field.get('display_name', field_name))
            field_type = field.get('field_type', 'text')
            description = field.get('description', '')
            required = field.get('is_required', field.get('required', False))

            field_desc = f"- {field_name} ({field_label}): {field_type}"
            if description:
                field_desc += f" - {description}"
            if required:
                field_desc += " [REQUIRED]"

            field_descriptions.append(field_desc)

        # Build concise extraction prompt to reduce reasoning tokens
        if fields:
            field_list = chr(10).join([f"  - {fd}" for fd in field_descriptions])
            extraction_prompt = f"""Extract data from this {doc_type['display_name']} document.

FIELDS TO EXTRACT:
{field_list}

ALSO EXTRACT:
1. All visible text from all pages
2. Key insights (important observations, risks, compliance issues, anomalies)
3. Document summary with key points
4. Important terms with definitions

Return JSON:
{{
  "metadata": {{"field_name": "value"}},
  "formatted_text": "all text from document",
  "insights": [
    {{
      "insight_type": "observation|risk|compliance|anomaly",
      "category": "financial|legal|operational|compliance|risk",
      "content": "the insight description",
      "context": "surrounding context from document",
      "page_number": 1,
      "confidence": 0.9,
      "severity": "low|medium|high|critical"
    }}
  ],
  "summary": {{
    "summary_text": "2-3 sentence overview",
    "key_points": ["point 1", "point 2", "point 3"],
    "word_count": 50,
    "summary_type": "default"
  }},
  "key_terms": [
    {{
      "term": "technical or legal term",
      "definition": "clear definition in context",
      "context": "usage context from document",
      "category": "technical|legal|financial|domain-specific",
      "importance": 0.8,
      "page_references": [1, 3],
      "frequency": 3,
      "confidence": 0.9
    }}
  ]
}}

Rules: dates as YYYY-MM-DD, numbers as numeric, missing as null, JSON only."""
        else:
            extraction_prompt = f"""Extract all visible text from this {doc_type['display_name']} document.

ALSO EXTRACT:
1. Key insights (important observations, risks, compliance issues, anomalies)
2. Document summary with key points
3. Important terms with definitions

Return JSON:
{{
  "metadata": {{}},
  "formatted_text": "all text from document",
  "insights": [
    {{
      "insight_type": "observation|risk|compliance|anomaly",
      "category": "financial|legal|operational|compliance|risk",
      "content": "the insight description",
      "context": "surrounding context from document",
      "page_number": 1,
      "confidence": 0.9,
      "severity": "low|medium|high|critical"
    }}
  ],
  "summary": {{
    "summary_text": "2-3 sentence overview",
    "key_points": ["point 1", "point 2", "point 3"],
    "word_count": 50,
    "summary_type": "default"
  }},
  "key_terms": [
    {{
      "term": "technical or legal term",
      "definition": "clear definition in context",
      "context": "usage context from document",
      "category": "technical|legal|financial|domain-specific",
      "importance": 0.8,
      "page_references": [1, 3],
      "frequency": 3,
      "confidence": 0.9
    }}
  ]
}}

JSON only, no markdown."""

        # Build messages with all page images
        messages = [
            {
                "role": "system",
                "content": "You are a document processing expert. Extract structured metadata and formatted text from documents with high accuracy."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": extraction_prompt}
                ]
            }
        ]

        # Add all page images to the content
        for idx, img_data_url in enumerate(page_images):
            messages[1]["content"].append({
                "type": "image_url",
                "image_url": {"url": img_data_url}
            })
            logger.info(f"  - Added page {idx + 1} to vision request")

        logger.info(f"🚀 Sending {len(page_images)} pages to GPT-5-Nano Vision...")

        # Call GPT-5-Nano Vision with retry logic
        # NOTE: GPT-5-Nano only supports default temperature (1)
        result_text = None
        max_retries = 3

        for attempt in range(max_retries):
            try:
                logger.info(f"🔄 Vision API attempt {attempt + 1}/{max_retries}")

                response = openai_client.chat.completions.create(
                    model="gpt-5-nano",
                    messages=messages,
                    max_completion_tokens=8000,  # Increased: reasoning uses ~4000, output needs ~2000-4000
                    timeout=60  # Longer timeout for vision with multiple pages
                )

                # Robust response validation
                if not response.choices or len(response.choices) == 0:
                    logger.warning(f"⚠️ No choices in response (attempt {attempt + 1})")
                    raise ValueError("No choices in API response")

                content = response.choices[0].message.content

                if not content:
                    logger.warning(f"⚠️ Content is None (attempt {attempt + 1})")
                    logger.warning(f"   Response: {response}")
                    raise ValueError("Response content is None")

                if not content.strip():
                    logger.warning(f"⚠️ Content is empty (attempt {attempt + 1})")
                    raise ValueError("Response content is empty")

                result_text = content.strip()
                logger.info(f"✅ Vision API responded (attempt {attempt + 1}, {len(result_text)} chars)")
                break  # Success!

            except Exception as e:
                logger.error(f"❌ Vision API call failed (attempt {attempt + 1}): {e}")

                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.info(f"⏳ Waiting {wait_time}s before retry...")
                    import time
                    time.sleep(wait_time)
                else:
                    logger.error("❌ All vision API attempts failed")
                    result_text = None

        if not result_text:
            logger.error("❌ Failed to get valid response from vision API")
            return {}, ""  # Return empty extraction

        logger.info(f"📝 Received response from GPT-5-Nano ({len(result_text)} chars)")

        # Remove markdown code blocks if present
        if result_text.startswith('```'):
            result_text = result_text.split('```')[1]
            if result_text.startswith('json'):
                result_text = result_text[4:]
            result_text = result_text.strip()

        # Parse JSON response
        result_data = json.loads(result_text)

        extracted_metadata = result_data.get('metadata', {})
        formatted_ocr_text = result_data.get('formatted_text', '')
        insights = result_data.get('insights', [])
        summary = result_data.get('summary', {})
        key_terms = result_data.get('key_terms', [])

        # Add model_version to insights, summary, and key_terms
        model_version = "gpt-5-nano"

        # Add model_version to each insight
        for insight in insights:
            if 'model_version' not in insight:
                insight['model_version'] = model_version

        # Add model_version to summary
        if summary and 'model_version' not in summary:
            summary['model_version'] = model_version

        # Add model_version to each key term
        for term in key_terms:
            if 'model_version' not in term:
                term['model_version'] = model_version

        logger.info(f"📊 Parsed extraction results:")
        logger.info(f"  - Metadata fields: {len(extracted_metadata)}")
        logger.info(f"  - OCR text length: {len(formatted_ocr_text)}")
        logger.info(f"  - Insights extracted: {len(insights)}")
        logger.info(f"  - Summary extracted: {bool(summary)}")
        logger.info(f"  - Key terms extracted: {len(key_terms)}")

        return extracted_metadata, formatted_ocr_text, insights, summary, key_terms

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse GPT-5-Nano response as JSON: {e}")
        logger.error(f"Raw response: {result_text[:500]}")
        # Return empty extraction
        return {}, classification_ocr_text or "", [], {}, []
    except Exception as e:
        logger.error(f"Vision extraction failed: {e}")
        import traceback
        traceback.print_exc()
        raise


@router.get("/schema/{document_type_id}")
async def get_extraction_schema(document_type_id: str):
    """
    Get the metadata extraction schema for a document type

    Returns the schema fields that will be extracted for this document type
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT dt.display_name, dt.description,
                       ms.id as schema_id, ms.schema_definition
                FROM document_types dt
                LEFT JOIN metadata_schemas ms ON ms.document_type_id = dt.id AND ms.is_active = TRUE
                WHERE dt.id = %s
            """, (document_type_id,))

            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Document type not found")

            schema_def = result['schema_definition']
            if schema_def and isinstance(schema_def, str):
                schema_def = json.loads(schema_def)

            return {
                "document_type": result['display_name'],
                "description": result['description'],
                "schema_id": result['schema_id'],
                "fields": schema_def.get('fields', []) if schema_def else [],
                "has_schema": bool(result['schema_id'])
            }

    except Exception as e:
        logger.error(f"Failed to get schema: {e}")
        raise HTTPException(status_code=500, detail=str(e))
