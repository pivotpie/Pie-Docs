"""
Documents API Router - Comprehensive document management
Handles documents, versions, metadata, permissions, shares, and comments
"""
from fastapi import APIRouter, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List, Optional
from uuid import UUID
import logging
import os
import shutil
import json
from pathlib import Path
from datetime import datetime
from psycopg2.extras import Json

from app.database import get_db_cursor
from app.models.documents import (
    Document, DocumentCreate, DocumentUpdate, DocumentListResponse,
    DocumentVersion, DocumentVersionCreate,
    DocumentMetadata, DocumentMetadataCreate, DocumentMetadataUpdate,
    DocumentPermission, DocumentPermissionCreate,
    DocumentShare, DocumentShareCreate,
    DocumentComment, DocumentCommentCreate, DocumentCommentUpdate
)
from app.services.file_storage_service import file_storage_service
from app.services.thumbnail_service import thumbnail_service
from app.services.ocr_service import ocr_service
from app.services.document_intelligence_service import document_intelligence_service
from app.utils.file_utils import calculate_checksums, get_mime_type_from_extension, sanitize_filename

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

# Upload directory configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# ==========================================
# Main Document CRUD Operations
# ==========================================

# IMPORTANT: Specific routes must come BEFORE parametric routes ({document_id})

@router.post("/upload", response_model=Document, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    folder_id: Optional[str] = Form(None),
    author: Optional[str] = Form("System Upload"),
    auto_ocr: bool = Form(False),
    auto_classify: bool = Form(False),
    # Workflow enhancements
    document_type_id: Optional[str] = Form(None),
    barcode_id: Optional[str] = Form(None),
    rack_id: Optional[str] = Form(None),
    location_path: Optional[str] = Form(None),
    classification_confidence: Optional[str] = Form(None),
    classification_reasoning: Optional[str] = Form(None),
    embeddings: Optional[str] = Form(None),  # JSON string
    ocr_text: Optional[str] = Form(None),  # Pre-extracted OCR text
    metadata_json: Optional[str] = Form(None),  # JSON string of custom metadata
    # Pre-extracted AI features (from frontend AI Extract)
    insights_json: Optional[str] = Form(None),  # JSON array of insights
    summary_json: Optional[str] = Form(None),  # JSON object with summary data
    key_terms_json: Optional[str] = Form(None),  # JSON array of key terms
):
    """
    ENHANCED UPLOAD WORKFLOW - Step-by-step approach

    This endpoint follows a clean database architecture:
    1. Create minimal document → Get ID
    2. Save file → Update document with file details
    3. Save metadata → document_metadata table
    4. Save OCR → ocr_jobs and ocr_results tables
    5. Save embeddings → document embedding column
    6. Update document with classification and tags
    7. Link folder (digital location) → documents.folder_id
    8. Link barcode and warehouse (physical location) → physical_documents table
    9. Save pre-extracted AI features (insights, summary, key_terms) → respective tables
    10. Finalize → Set status to published

    Each step commits independently for better failure isolation.

    Note: All AI extraction (OCR, metadata, insights, summary, key_terms) should be done
    at the frontend AI Extract stage and passed as JSON parameters.
    """
    document_id = None
    storage_path = None
    thumbnail_path = None

    try:
        # Sanitize filename
        original_filename = sanitize_filename(file.filename)
        logger.info(f"\n{'='*80}")
        logger.info(f"UPLOAD STARTED: {original_filename}")
        logger.info(f"{'='*80}")

        # ========================================
        # STEP 1: Create minimal document record
        # ========================================
        logger.info(f"STEP 1/10: Creating minimal document record...")
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO documents (
                    title,
                    file_original_name,
                    author,
                    status
                )
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (
                title or original_filename,
                original_filename,
                author,
                "processing"
            ))

            result = cursor.fetchone()
            document_id = result['id'] if isinstance(result, dict) else result[0]
            logger.info(f"✓ STEP 1 COMPLETE: Document created with ID: {document_id}")

        # ========================================
        # STEP 2: Save file and update document with file metadata
        # ========================================
        logger.info(f"STEP 2/10: Saving file and processing file metadata...")

        # Save file to storage
        storage_path, file_size = file_storage_service.save_uploaded_file(file, document_id)
        full_file_path = file_storage_service.get_file_path(storage_path)
        logger.info(f"  → File saved: {storage_path} ({file_size} bytes)")

        # Calculate checksums
        try:
            md5_checksum, sha256_checksum = calculate_checksums(full_file_path)
            logger.info(f"  → Checksums: MD5={md5_checksum[:16]}..., SHA256={sha256_checksum[:16]}...")
        except Exception as e:
            logger.warning(f"  ⚠ Checksum calculation failed: {e}")
            md5_checksum = None
            sha256_checksum = None

        # Generate thumbnail
        try:
            thumbnail_output_path = file_storage_service.generate_file_path(
                document_id,
                f"{original_filename}_thumb.jpg",
                storage_type='thumbnail'
            )
            success, error = thumbnail_service.generate_from_file(full_file_path, thumbnail_output_path)
            if success:
                thumbnail_path = str(thumbnail_output_path.relative_to(UPLOAD_DIR.parent / 'uploads'))
                logger.info(f"  → Thumbnail generated: {thumbnail_path}")
            else:
                logger.warning(f"  ⚠ Thumbnail generation failed: {error}")
                thumbnail_path = None
        except Exception as e:
            logger.warning(f"  ⚠ Thumbnail generation error: {e}")
            thumbnail_path = None

        # Determine MIME type
        mime_type = file.content_type
        if not mime_type or mime_type == 'application/octet-stream':
            mime_type = get_mime_type_from_extension(Path(original_filename).suffix)

        # Update document with file metadata in separate transaction
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE documents SET
                    file_path = %s,
                    file_storage_path = %s,
                    file_storage_type = %s,
                    mime_type = %s,
                    file_size = %s,
                    checksum_md5 = %s,
                    checksum_sha256 = %s,
                    thumbnail_path = %s,
                    version = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                str(full_file_path),
                storage_path,
                "local",
                mime_type,
                file_size,
                md5_checksum,
                sha256_checksum,
                thumbnail_path,
                str(document_id)
            ))

        logger.info(f"✓ STEP 2 COMPLETE: File metadata saved to database")

        # ========================================
        # STEP 3: Save custom metadata to document_metadata table
        # ========================================
        logger.info(f"STEP 3/10: Saving custom metadata...")

        custom_metadata = {}
        if metadata_json:
            try:
                custom_metadata = json.loads(metadata_json)
                logger.info(f"  → Found {len(custom_metadata)} metadata fields")

                # Save metadata as JSONB in custom_fields column
                with get_db_cursor(commit=True) as cursor:
                    cursor.execute("""
                        INSERT INTO document_metadata (document_id, custom_fields)
                        VALUES (%s, %s)
                        ON CONFLICT (document_id)
                        DO UPDATE SET custom_fields = EXCLUDED.custom_fields, updated_at = CURRENT_TIMESTAMP
                    """, (
                        str(document_id),
                        Json(custom_metadata)
                    ))

                logger.info(f"✓ STEP 3 COMPLETE: {len(custom_metadata)} metadata fields saved")
            except Exception as e:
                logger.warning(f"  ⚠ Failed to parse/save metadata: {e}")
                logger.info(f"✓ STEP 3 COMPLETE: No metadata saved (parsing failed)")
        else:
            logger.info(f"  → No custom metadata provided")
            logger.info(f"✓ STEP 3 COMPLETE: No metadata to save")

        # ========================================
        # STEP 4: Save OCR data to ocr tables
        # ========================================
        logger.info(f"STEP 4/10: Saving OCR data...")

        if ocr_text and len(ocr_text.strip()) > 0:
            try:
                with get_db_cursor(commit=True) as cursor:
                    # Create OCR job record
                    cursor.execute("""
                        INSERT INTO ocr_jobs (document_id, language, status, progress)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id
                    """, (str(document_id), "eng", "completed", 100))

                    ocr_job_result = cursor.fetchone()
                    ocr_job_id = ocr_job_result['id'] if isinstance(ocr_job_result, dict) else ocr_job_result[0]

                    # Store OCR results
                    cursor.execute("""
                        INSERT INTO ocr_results (
                            job_id, document_id, extracted_text
                        )
                        VALUES (%s, %s, %s)
                        RETURNING id
                    """, (
                        str(ocr_job_id),
                        str(document_id),
                        ocr_text
                    ))

                    # Update document with OCR content
                    cursor.execute("""
                        UPDATE documents
                        SET ocr_text = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (ocr_text, str(document_id)))

                logger.info(f"✓ STEP 4 COMPLETE: OCR data saved ({len(ocr_text)} chars, job_id: {ocr_job_id})")
            except Exception as e:
                logger.warning(f"  ⚠ Failed to save OCR data: {e}")
                logger.info(f"✓ STEP 4 COMPLETE: OCR data not saved (error occurred)")
        else:
            logger.info(f"  → No OCR text provided")
            logger.info(f"✓ STEP 4 COMPLETE: No OCR data to save")

        # ========================================
        # STEP 5: Save embeddings
        # ========================================
        logger.info(f"STEP 5/10: Saving embeddings...")

        if embeddings:
            try:
                embeddings_list = json.loads(embeddings)
                if isinstance(embeddings_list, list) and len(embeddings_list) > 0:
                    # Convert to PostgreSQL vector format
                    embeddings_array = f"[{','.join(map(str, embeddings_list))}]"

                    with get_db_cursor(commit=True) as cursor:
                        cursor.execute("""
                            UPDATE documents
                            SET embedding = %s::vector, updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                        """, (embeddings_array, str(document_id)))

                    logger.info(f"✓ STEP 5 COMPLETE: Embeddings saved ({len(embeddings_list)} dimensions)")
                else:
                    logger.info(f"✓ STEP 5 COMPLETE: No embeddings to save (empty list)")
            except Exception as e:
                logger.warning(f"  ⚠ Failed to parse/save embeddings: {e}")
                logger.info(f"✓ STEP 5 COMPLETE: Embeddings not saved (parsing failed)")
        else:
            logger.info(f"  → No embeddings provided")
            logger.info(f"✓ STEP 5 COMPLETE: No embeddings to save")

        # ========================================
        # STEP 6: Update document with additional info
        # ========================================
        logger.info(f"STEP 6/10: Updating document with workflow details...")

        # Parse tags
        tag_list = []
        if tags:
            tag_list = [t.strip() for t in tags.split(',') if t.strip()]

        # Parse classification confidence
        conf_value = None
        if classification_confidence:
            try:
                conf_value = float(classification_confidence)
            except:
                pass

        # Update document with document type, tags, classification (no location info)
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE documents SET
                    document_type = %s,
                    document_type_id = %s,
                    tags = %s,
                    barcode_id = %s,
                    rack_id = %s,
                    classification_confidence = %s,
                    classification_reasoning = %s,
                    language = %s,
                    keywords = %s,
                    version = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                document_type or "General",
                document_type_id if document_type_id else None,
                tag_list if tag_list else [],
                barcode_id if barcode_id else None,
                rack_id if rack_id else None,
                conf_value,
                classification_reasoning,
                "en",
                tag_list if tag_list else [],  # Use tags as keywords by default
                str(document_id)
            ))

        logger.info(f"✓ STEP 6 COMPLETE: Document updated with workflow details")
        logger.info(f"  → Document Type: {document_type or 'General'}")
        logger.info(f"  → Document Type ID: {document_type_id or 'None'}")
        logger.info(f"  → Barcode ID: {barcode_id or 'None'}")
        logger.info(f"  → Rack ID: {rack_id or 'None'}")
        logger.info(f"  → Tags: {', '.join(tag_list) if tag_list else 'None'}")
        logger.info(f"  → Classification Confidence: {conf_value or 'N/A'}")

        # ========================================
        # STEP 7: Link folder (digital location)
        # ========================================
        logger.info(f"STEP 7/10: Linking folder (digital location)...")

        if folder_id:
            try:
                with get_db_cursor(commit=True) as cursor:
                    logger.info(f"  → Folder assigned - validating and linking")

                    # Validate folder exists and get folder details
                    cursor.execute("""
                        SELECT id, name, path, description
                        FROM folders
                        WHERE id = %s AND deleted_at IS NULL
                    """, (folder_id,))

                    folder_row = cursor.fetchone()

                    if folder_row:
                        folder_name = folder_row['name'] if isinstance(folder_row, dict) else folder_row[1]
                        folder_path = folder_row['path'] if isinstance(folder_row, dict) else folder_row[2]
                        folder_description = folder_row['description'] if isinstance(folder_row, dict) else (folder_row[3] if len(folder_row) > 3 else None)

                        # Update document with folder_id
                        cursor.execute("""
                            UPDATE documents
                            SET folder_id = %s, version = 1, updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                        """, (folder_id, str(document_id)))

                        logger.info(f"✓ STEP 7 COMPLETE: Folder linked successfully")
                        logger.info(f"  → Folder ID: {folder_id}")
                        logger.info(f"  → Folder Name: {folder_name}")
                        logger.info(f"  → Folder Path: {folder_path or folder_name}")
                        if folder_description:
                            logger.info(f"  → Description: {folder_description}")
                    else:
                        logger.warning(f"  ⚠ Folder {folder_id} not found or deleted")
                        logger.info(f"✓ STEP 7 COMPLETE: Folder not linked (validation failed)")

            except Exception as e:
                logger.error(f"  ✗ Failed to link folder: {e}")
                logger.info(f"✓ STEP 7 COMPLETE: Folder not linked (error occurred)")
                # Don't fail upload - previous steps already committed
        else:
            logger.info(f"  → No folder assigned - skipping digital location")
            logger.info(f"✓ STEP 7 COMPLETE: No folder to link")

        # ========================================
        # STEP 8: Link warehouse location and create physical_documents
        # ========================================
        logger.info(f"STEP 8/10: Linking warehouse location and creating physical_documents...")

        if barcode_id:
            try:
                with get_db_cursor(commit=True) as cursor:
                    logger.info(f"  → Barcode assigned - creating physical tracking record")

                    # Check if physical_documents record already exists
                    cursor.execute("""
                        SELECT id FROM physical_documents WHERE digital_document_id = %s
                    """, (str(document_id),))

                    existing = cursor.fetchone()

                    if not existing:
                        # Step 1: Ensure barcode exists in barcode_records (master table)
                        cursor.execute("""
                            SELECT id, code FROM barcode_records WHERE id = %s
                        """, (barcode_id,))

                        barcode_record = cursor.fetchone()
                        original_barcode_code = None

                        if not barcode_record:
                            # Create in barcode_records first
                            logger.info(f"  → Creating barcode in barcode_records (master table)")

                            # Get default barcode format (CODE128)
                            cursor.execute("""
                                SELECT id FROM barcode_formats WHERE standard = 'CODE128' LIMIT 1
                            """)
                            format_row = cursor.fetchone()

                            if not format_row:
                                # Create default format if it doesn't exist
                                cursor.execute("""
                                    INSERT INTO barcode_formats (name, type, standard, configuration)
                                    VALUES ('CODE128', '1D', 'CODE128', '{}')
                                    RETURNING id
                                """)
                                format_row = cursor.fetchone()

                            format_id = format_row['id'] if isinstance(format_row, dict) else format_row[0]

                            # Generate original barcode code (scanned code)
                            import hashlib
                            original_barcode_code = f"BR-{str(document_id)[:8].upper()}-{str(barcode_id)[:8].upper()}"
                            checksum = hashlib.md5(original_barcode_code.encode()).hexdigest()

                            cursor.execute("""
                                INSERT INTO barcode_records (id, code, format_id, document_id, is_active, checksum)
                                VALUES (%s, %s, %s, %s, %s, %s)
                            """, (barcode_id, original_barcode_code, format_id, str(document_id), True, checksum))
                            logger.info(f"  → Barcode record created: {original_barcode_code}")
                        else:
                            original_barcode_code = barcode_record['code'] if isinstance(barcode_record, dict) else barcode_record[1]
                            logger.info(f"  → Barcode record exists: {original_barcode_code}")

                        # Step 2: Create/update in barcodes table (assignment table) with SAME ID
                        cursor.execute("""
                            SELECT id, code FROM barcodes WHERE id = %s
                        """, (barcode_id,))

                        barcode_row = cursor.fetchone()
                        if not barcode_row:
                            # Create in barcodes table with document-specific code
                            logger.info(f"  → Creating barcode assignment for document")
                            barcode_code = f"DOC-{str(document_id)[:8].upper()}"
                            cursor.execute("""
                                INSERT INTO barcodes (id, code, format, document_id, is_active)
                                VALUES (%s, %s, %s, %s, %s)
                            """, (barcode_id, barcode_code, 'CODE128', str(document_id), True))
                            logger.info(f"  → Barcode assignment created: {barcode_code}")
                        else:
                            barcode_code = barcode_row['code'] if isinstance(barcode_row, dict) else barcode_row[1]
                            logger.info(f"  → Barcode assignment exists: {barcode_code}")
                            # Update barcodes to link document_id if not already linked
                            cursor.execute("""
                                UPDATE barcodes
                                SET document_id = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE id = %s AND document_id IS NULL
                            """, (str(document_id), barcode_id))
                            logger.info(f"  → Barcode linked to document")

                        # Resolve warehouse location (zone_id) from rack_id if provided
                        location_id = None
                        if rack_id:
                            logger.info(f"  → Resolving warehouse location from rack: {rack_id}")
                            cursor.execute("""
                                SELECT s.zone_id
                                FROM racks r
                                JOIN shelves s ON r.shelf_id = s.id
                                WHERE r.id = %s
                            """, (rack_id,))

                            zone_row = cursor.fetchone()
                            if zone_row:
                                location_id = zone_row['zone_id'] if isinstance(zone_row, dict) else zone_row[0]
                                logger.info(f"  → Warehouse location (zone) resolved: {location_id}")
                            else:
                                logger.warning(f"  ⚠ Could not resolve warehouse location from rack {rack_id}")

                        # Update rack capacity counter
                        if rack_id:
                            logger.info(f"  → Incrementing rack capacity counter...")
                            cursor.execute("""
                                UPDATE racks
                                SET current_documents = current_documents + 1
                                WHERE id = %s AND current_documents < max_documents
                                RETURNING id, current_documents, max_documents
                            """, (rack_id,))

                            rack_update = cursor.fetchone()
                            if not rack_update:
                                logger.warning(f"  ⚠ Rack may be at maximum capacity")
                                # Don't fail the upload, just log warning
                            else:
                                current = rack_update['current_documents'] if isinstance(rack_update, dict) else rack_update[1]
                                max_cap = rack_update['max_documents'] if isinstance(rack_update, dict) else rack_update[2]
                                logger.info(f"  → Rack capacity updated: {current}/{max_cap}")

                        # Update zone capacity counter (location_id is the zone_id)
                        if location_id:
                            logger.info(f"  → Incrementing zone capacity counter...")
                            cursor.execute("""
                                UPDATE zones
                                SET current_capacity = current_capacity + 1
                                WHERE id = %s
                                RETURNING id, current_capacity, max_capacity
                            """, (location_id,))

                            zone_update = cursor.fetchone()
                            if zone_update:
                                zone_current = zone_update['current_capacity'] if isinstance(zone_update, dict) else zone_update[1]
                                zone_max = zone_update['max_capacity'] if isinstance(zone_update, dict) else zone_update[2]
                                logger.info(f"  → Zone capacity updated: {zone_current}/{zone_max}")

                        # Create physical_documents record
                        # Note: document_type here refers to physical type (original/copy/etc), not classification type
                        cursor.execute("""
                            INSERT INTO physical_documents (
                                digital_document_id,
                                barcode_id,
                                barcode,
                                rack_id,
                                location_id,
                                title,
                                document_type,
                                status,
                                last_seen_at
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                            RETURNING id
                        """, (
                            str(document_id),
                            barcode_id,
                            barcode_code,
                            rack_id,
                            location_id,
                            title or file.filename,
                            'original',  # Default physical document type (not classification type)
                            'available'
                        ))

                        phys_result = cursor.fetchone()
                        physical_doc_id = phys_result['id'] if isinstance(phys_result, dict) else phys_result[0]

                        # Create movement record for initial placement
                        if rack_id:
                            logger.info(f"  → Creating movement record for initial placement...")
                            # Build location path
                            location_path_parts = []
                            if location_id:
                                location_path_parts.append(f"Zone:{location_id}")
                            if rack_id:
                                location_path_parts.append(f"Rack:{rack_id}")
                            to_location_path = " > ".join(location_path_parts) if location_path_parts else None

                            cursor.execute("""
                                INSERT INTO document_movements (
                                    document_id, from_rack_id, to_rack_id,
                                    from_location_path, to_location_path, movement_type,
                                    reason, requested_by, executed_at, status
                                )
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
                                RETURNING id
                            """, (
                                str(physical_doc_id),  # Fixed: use physical_doc_id not document_id
                                None,  # from_rack_id is NULL for initial placement
                                rack_id,  # to_rack_id
                                None,  # from_location_path is NULL
                                to_location_path,  # to_location_path
                                'initial_storage',  # movement_type - fixed to match enum
                                'Initial document upload',  # reason
                                str(physical_doc_id),  # requested_by - use physical_doc_id
                                'completed'  # status
                            ))

                            movement_result = cursor.fetchone()
                            movement_id = movement_result['id'] if isinstance(movement_result, dict) else movement_result[0]
                            logger.info(f"  → Movement record created (ID: {movement_id})")

                        logger.info(f"✓ STEP 8 COMPLETE: Physical tracking enabled")
                        logger.info(f"  → Physical Doc ID: {physical_doc_id}")
                        logger.info(f"  → Warehouse Location: {location_id or 'Not assigned'}")
                        logger.info(f"  → Status: available")
                    else:
                        existing_id = existing['id'] if isinstance(existing, dict) else existing[0]
                        logger.info(f"✓ STEP 8 COMPLETE: Physical tracking already exists (ID: {existing_id})")

            except Exception as e:
                logger.error(f"  ✗ Failed to create physical_documents: {e}")
                logger.info(f"✓ STEP 8 COMPLETE: Physical tracking not created (error occurred)")
                # Don't fail upload - previous steps already committed
        else:
            logger.info(f"  → No barcode assigned - skipping physical tracking")
            logger.info(f"✓ STEP 8 COMPLETE: No physical tracking needed")

        # ========================================
        # STEP 9: Save Pre-extracted AI Features (from Frontend)
        # ========================================
        logger.info(f"STEP 9/10: Saving pre-extracted AI features...")

        # Save insights if provided
        if insights_json:
            try:
                insights = json.loads(insights_json)
                if insights and isinstance(insights, list):
                    with get_db_cursor(commit=True) as cursor:
                        for insight in insights:
                            cursor.execute("""
                                INSERT INTO document_insights (
                                    document_id, insight_type, category, content, context,
                                    page_number, confidence, severity, model_version
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                str(document_id),
                                insight.get('insight_type'),
                                insight.get('category'),
                                insight.get('content'),
                                insight.get('context'),
                                insight.get('page_number'),
                                insight.get('confidence'),
                                insight.get('severity'),
                                insight.get('model_version')
                            ))
                    logger.info(f"  → Saved {len(insights)} insights")
            except Exception as e:
                logger.warning(f"  ⚠ Failed to save insights: {e}")

        # Save summary if provided
        if summary_json:
            try:
                summary_data = json.loads(summary_json)
                if summary_data:
                    with get_db_cursor(commit=True) as cursor:
                        cursor.execute("""
                            INSERT INTO document_summaries (
                                document_id, summary_text, key_points, word_count,
                                summary_type, model_version, generation_time_ms
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            str(document_id),
                            summary_data.get('summary_text'),
                            json.dumps(summary_data.get('key_points', [])),
                            summary_data.get('word_count'),
                            summary_data.get('summary_type', 'default'),
                            summary_data.get('model_version'),
                            summary_data.get('generation_time_ms')
                        ))
                    logger.info(f"  → Saved summary ({summary_data.get('word_count', 0)} words)")
            except Exception as e:
                logger.warning(f"  ⚠ Failed to save summary: {e}")

        # Save key terms if provided
        if key_terms_json:
            try:
                terms = json.loads(key_terms_json)
                if terms and isinstance(terms, list):
                    with get_db_cursor(commit=True) as cursor:
                        for term in terms:
                            cursor.execute("""
                                INSERT INTO document_key_terms (
                                    document_id, term, definition, context, category,
                                    importance, page_references, frequency, confidence, model_version
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                str(document_id),
                                term.get('term'),
                                term.get('definition'),
                                term.get('context'),
                                term.get('category'),
                                term.get('importance'),
                                term.get('page_references', []),
                                term.get('frequency', 1),
                                term.get('confidence'),
                                term.get('model_version')
                            ))
                    logger.info(f"  → Saved {len(terms)} key terms")
            except Exception as e:
                logger.warning(f"  ⚠ Failed to save key terms: {e}")

        if not insights_json and not summary_json and not key_terms_json:
            logger.info(f"  → No pre-extracted AI features provided")

        logger.info(f"✓ STEP 9 COMPLETE: Pre-extracted AI features saved")

        # ========================================
        # STEP 10: Finalize document with status published
        # ========================================
        logger.info(f"STEP 10/10: Finalizing document...")

        # Generate preview, download, and thumbnail URLs
        base_url = "/api/v1/documents"
        preview_url = f"{base_url}/{document_id}/preview"
        download_url = f"{base_url}/{document_id}/download"
        thumbnail_url = f"{base_url}/{document_id}/thumbnail" if thumbnail_path else None

        logger.info(f"  → Generated preview URL: {preview_url}")
        logger.info(f"  → Generated download URL: {download_url}")
        logger.info(f"  → Generated thumbnail URL: {thumbnail_url or 'None (no thumbnail)'}")

        # Update document status to 'published' and set URLs
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE documents
                SET status = %s,
                    preview_url = %s,
                    download_url = %s,
                    thumbnail_url = %s,
                    version = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, ('published', preview_url, download_url, thumbnail_url, str(document_id)))

            document = cursor.fetchone()

            # Handle None values for array fields
            doc_dict = dict(document)
            if doc_dict.get('keywords') is None:
                doc_dict['keywords'] = []
            if doc_dict.get('tags') is None:
                doc_dict['tags'] = []

        # Create initial version record
        logger.info(f"  → Creating initial version record...")
        with get_db_cursor(commit=True) as cursor:
            import hashlib
            file_hash = hashlib.sha256(f"{document_id}{storage_path}".encode()).hexdigest()

            cursor.execute("""
                INSERT INTO document_versions (
                    document_id, version_number, is_major_version, file_name,
                    file_size, file_url, file_hash, change_description, change_type
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                str(document_id),
                1,  # Initial version
                True,  # First version is major
                original_filename,
                file_size,
                download_url,
                file_hash,
                'Initial upload',
                'major'  # Fixed: use 'major' instead of 'created'
            ))

            version_result = cursor.fetchone()
            version_id = version_result['id'] if isinstance(version_result, dict) else version_result[0]
            logger.info(f"  → Version created: v1 (ID: {version_id})")

        logger.info(f"✓ STEP 10 COMPLETE: Document finalized and published!")
        logger.info(f"{'='*80}")
        logger.info(f"UPLOAD SUCCESS SUMMARY:")
        logger.info(f"  Document ID: {document_id}")
        logger.info(f"  Title: {doc_dict.get('title', 'N/A')}")
        logger.info(f"  File: {original_filename}")
        logger.info(f"  Storage Path: {storage_path}")
        logger.info(f"  File Size: {file_size} bytes")
        logger.info(f"  MIME Type: {mime_type}")
        logger.info(f"  Document Type: {doc_dict.get('document_type', 'N/A')}")
        logger.info(f"  Document Type ID: {document_type_id or 'Not assigned'}")
        logger.info(f"  Folder ID (Digital Location): {folder_id or 'Not assigned'}")
        logger.info(f"  Barcode ID: {barcode_id or 'Not assigned'}")
        logger.info(f"  Warehouse Rack ID: {rack_id or 'Not assigned'}")
        logger.info(f"  Digital Location: {'✓ Linked' if folder_id else '✗ Not assigned'}")
        logger.info(f"  Physical Tracking: {'✓ Enabled' if barcode_id else '✗ Not enabled'}")
        logger.info(f"  Tags: {', '.join(doc_dict.get('tags', [])) if doc_dict.get('tags') else 'None'}")
        logger.info(f"  Custom Metadata Fields: {len(custom_metadata)}")
        logger.info(f"  OCR Text: {'✓ ' + str(len(ocr_text)) + ' chars' if ocr_text else '✗ None'}")
        logger.info(f"  Embeddings: {'✓ Saved' if embeddings and embeddings.strip() else '✗ None'}")
        logger.info(f"  Classification Confidence: {conf_value or 'N/A'}")
        logger.info(f"  Status: {doc_dict.get('status', 'N/A')}")
        logger.info(f"  Version: {doc_dict.get('version', 'N/A')}")
        logger.info(f"  URLs:")
        logger.info(f"    - Preview: {preview_url}")
        logger.info(f"    - Download: {download_url}")
        logger.info(f"    - Thumbnail: {thumbnail_url or 'Not generated'}")
        logger.info(f"{'='*80}")

        # Note: auto_ocr and auto_classify flags are ignored in this refactored workflow.
        # OCR data should be provided via ocr_text parameter.
        # Classification should be done before upload and passed via document_type_id and classification_confidence.
        if auto_ocr or auto_classify:
            logger.info(f"NOTE: auto_ocr and auto_classify flags are no longer processed during upload.")
            logger.info(f"      Please use separate OCR and classification endpoints if needed.")

        return doc_dict

    except Exception as e:
        logger.error(f"Error uploading document: {e}")

        # Clean up on error
        if storage_path:
            try:
                file_storage_service.delete_file(storage_path)
            except:
                pass

        if thumbnail_path:
            try:
                file_storage_service.delete_file(thumbnail_path)
            except:
                pass

        if document_id:
            # Delete document record
            try:
                with get_db_cursor(commit=True) as cursor:
                    cursor.execute("DELETE FROM documents WHERE id = %s", (str(document_id),))
            except:
                pass

        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{document_id}/download")
async def download_document(document_id: UUID):
    """
    Download a document file

    Returns the actual file for download with appropriate headers
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, file_storage_path, file_original_name, mime_type, file_size
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
                """,
                (str(document_id),)
            )
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            # Check if file exists
            if not document['file_storage_path']:
                raise HTTPException(status_code=404, detail="File not found for this document")

            file_path = file_storage_service.get_file_path(document['file_storage_path'])

            if not file_path.exists():
                raise HTTPException(status_code=404, detail="Physical file not found")

            # Determine filename for download
            download_filename = document['file_original_name'] or f"{document['title']}.pdf"

            # Return file response
            from fastapi.responses import FileResponse

            return FileResponse(
                path=str(file_path),
                filename=download_filename,
                media_type=document['mime_type'] or 'application/octet-stream',
                headers={
                    'Content-Disposition': f'attachment; filename="{download_filename}"',
                    'Content-Length': str(document['file_size'] or file_path.stat().st_size),
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/{document_id}/preview")
async def preview_document(document_id: UUID):
    """
    Preview a document file (inline display in browser)

    Returns the file for inline viewing (PDFs, images)
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, file_storage_path, file_original_name, mime_type, file_size, preview_path
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
                """,
                (str(document_id),)
            )
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            # If preview exists, use it; otherwise use original file
            preview_path = document.get('preview_path')
            if preview_path and file_storage_service.file_exists(preview_path):
                file_path = file_storage_service.get_file_path(preview_path)
                mime_type = 'application/pdf'  # Previews are typically PDF
            else:
                # Use original file for preview
                if not document['file_storage_path']:
                    raise HTTPException(status_code=404, detail="File not found for this document")

                file_path = file_storage_service.get_file_path(document['file_storage_path'])
                mime_type = document['mime_type'] or 'application/octet-stream'

            if not file_path.exists():
                raise HTTPException(status_code=404, detail="Physical file not found")

            # Determine filename
            preview_filename = document['file_original_name'] or f"{document['title']}.pdf"

            # Return file response for inline viewing
            from fastapi.responses import FileResponse

            return FileResponse(
                path=str(file_path),
                filename=preview_filename,
                media_type=mime_type,
                headers={
                    'Content-Disposition': f'inline; filename="{preview_filename}"',
                    'Content-Length': str(file_path.stat().st_size),
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")


@router.options("/{document_id}/thumbnail")
async def thumbnail_options(document_id: UUID):
    """Handle CORS preflight for thumbnail endpoint"""
    from fastapi.responses import Response
    return Response(
        status_code=200,
        headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '3600'
        }
    )

@router.get("/{document_id}/thumbnail")
async def get_thumbnail(document_id: UUID):
    """
    Get document thumbnail image

    Returns the thumbnail image (JPEG format)
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, thumbnail_path
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
                """,
                (str(document_id),)
            )
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            thumbnail_path = document.get('thumbnail_path')

            if not thumbnail_path or not file_storage_service.file_exists(thumbnail_path):
                raise HTTPException(status_code=404, detail="Thumbnail not found for this document")

            file_path = file_storage_service.get_file_path(thumbnail_path)

            # Return thumbnail image
            from fastapi.responses import FileResponse

            return FileResponse(
                path=str(file_path),
                media_type='image/jpeg',
                headers={
                    'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
                    'Content-Length': str(file_path.stat().st_size),
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thumbnail for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Thumbnail retrieval failed: {str(e)}")


@router.post("/{document_id}/analyze")
async def analyze_document_intelligence(document_id: UUID):
    """
    Analyze document using AI (GPT-4) for intelligence extraction

    Performs complete document analysis:
    - Document classification (type, category, confidence)
    - Metadata extraction (key-value pairs specific to document type)
    - Summary generation
    - Entity recognition (people, organizations, dates, amounts, etc.)

    Requires OCR content to be available. Run OCR first if needed.

    Returns comprehensive analysis results with all extracted information.
    """
    if not document_intelligence_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Document Intelligence not available. Please configure OpenAI API key."
        )

    try:
        with get_db_cursor(commit=True) as cursor:
            # Get document with OCR content
            cursor.execute("""
                SELECT id, title, file_original_name, ocr_content, file_storage_path, mime_type
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
            """, (str(document_id),))

            document = cursor.fetchone()
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            doc_dict = dict(document)
            ocr_content = doc_dict.get('ocr_content')
            filename = doc_dict.get('file_original_name')

            # Check if OCR content exists
            if not ocr_content or len(ocr_content.strip()) < 50:
                raise HTTPException(
                    status_code=400,
                    detail="Document has no OCR content. Please run OCR extraction first using POST /api/v1/ocr/extract/{document_id}"
                )

            logger.info(f"Starting AI analysis for document {document_id}")

            # Perform complete analysis
            success, analysis_results, error = document_intelligence_service.analyze_document_complete(
                ocr_content,
                filename
            )

            if success and analysis_results:
                # Store analysis results in document metadata
                classification = analysis_results.get('classification', {})
                metadata_extracted = analysis_results.get('metadata', {})
                summary = analysis_results.get('summary', '')
                entities = analysis_results.get('entities', {})

                # Update document with classification results
                if classification:
                    suggested_type = classification.get('document_type')
                    suggested_tags = classification.get('suggested_tags', [])
                    category = classification.get('category')

                    cursor.execute("""
                        UPDATE documents
                        SET
                            document_type = COALESCE(document_type, %s),
                            tags = CASE
                                WHEN tags IS NULL OR array_length(tags, 1) IS NULL
                                THEN %s::text[]
                                ELSE tags
                            END,
                            keywords = COALESCE(keywords, %s::text[]),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (
                        suggested_type,
                        suggested_tags,
                        suggested_tags,  # Also set as keywords
                        str(document_id)
                    ))

                # Store complete analysis in document metadata table
                cursor.execute("""
                    INSERT INTO document_metadata (document_id, metadata_type, metadata_value)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (document_id, metadata_type)
                    DO UPDATE SET metadata_value = EXCLUDED.metadata_value, updated_at = CURRENT_TIMESTAMP
                """, (
                    str(document_id),
                    'ai_analysis',
                    Json(analysis_results)
                ))

                # Store summary separately
                if summary:
                    cursor.execute("""
                        INSERT INTO document_metadata (document_id, metadata_type, metadata_value)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (document_id, metadata_type)
                        DO UPDATE SET metadata_value = EXCLUDED.metadata_value, updated_at = CURRENT_TIMESTAMP
                    """, (
                        str(document_id),
                        'summary',
                        Json({'summary': summary})
                    ))

                # Store entities separately for easier querying
                if entities:
                    cursor.execute("""
                        INSERT INTO document_metadata (document_id, metadata_type, metadata_value)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (document_id, metadata_type)
                        DO UPDATE SET metadata_value = EXCLUDED.metadata_value, updated_at = CURRENT_TIMESTAMP
                    """, (
                        str(document_id),
                        'entities',
                        Json(entities)
                    ))

                logger.info(f"AI analysis completed for document {document_id}")

                return {
                    "document_id": str(document_id),
                    "success": True,
                    "analysis": analysis_results,
                    "message": "Document analysis completed successfully"
                }
            else:
                logger.error(f"AI analysis failed for document {document_id}: {error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Document analysis failed: {error}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    folder_id: Optional[UUID] = Query(None, description="Filter by folder"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
):
    """
    List documents with filtering, search, and pagination
    """
    try:
        offset = (page - 1) * page_size
        where_clauses = []
        params = []

        # Search functionality
        if search:
            where_clauses.append("""
                (d.title ILIKE %s OR d.content ILIKE %s OR d.ocr_text ILIKE %s OR d.author ILIKE %s)
            """)
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param, search_param])

        # Folder filter
        if folder_id:
            where_clauses.append("d.folder_id = %s")
            params.append(str(folder_id))

        # Document type filter
        if document_type:
            where_clauses.append("d.document_type = %s")
            params.append(document_type)

        # Status filter
        if status:
            where_clauses.append("d.status = %s")
            params.append(status)

        # Tags filter
        if tags:
            tag_list = [t.strip() for t in tags.split(',')]
            where_clauses.append("d.tags && %s")
            params.append(tag_list)

        # Exclude deleted documents
        where_clauses.append("d.deleted_at IS NULL")

        where_sql = " AND ".join(where_clauses) if where_clauses else "d.deleted_at IS NULL"

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM documents d WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            # Get documents with enriched data from related tables
            query = f"""
                SELECT
                    d.id, d.title, d.content, d.document_type, d.file_path, d.mime_type,
                    d.file_size, d.author, d.tags, d.folder_id, d.status, d.language,
                    d.keywords, d.ocr_text, d.ocr_confidence, d.preview_url, d.download_url,
                    d.owner_id, d.last_accessed_at, d.created_at, d.modified_at,
                    d.created_by, d.updated_by, d.deleted_at, d.barcode_id, d.rack_id,
                    -- Override version with version_number from document_versions table
                    COALESCE(dv.version_number, d.version, 1) as version,
                    -- Metadata from document_metadata table
                    COALESCE(dm.custom_fields, '{{}}'::jsonb) as metadata,
                    -- Latest version info from document_versions table
                    dv.change_description as version_description,
                    dv.change_type as version_type,
                    -- Physical location from physical_documents table
                    pd.status as physical_status,
                    pd.created_at as assignment_date,
                    -- Warehouse hierarchy from racks -> shelves -> zones -> warehouses
                    r.shelf_id as shelf_id,
                    s.zone_id as zone_id,
                    z.warehouse_id as warehouse_id,
                    wh.location_id as location_id,
                    -- Names for frontend display (no additional lookups needed)
                    f.name as folder_name,
                    br.code as barcode_code,
                    r.code as rack_name,
                    s.code as shelf_name,
                    z.name as zone_name,
                    wh.name as warehouse_name,
                    loc.name as location_name,
                    -- Generate thumbnail_url if thumbnail_path exists
                    CASE
                        WHEN d.thumbnail_path IS NOT NULL
                        THEN '/api/v1/documents/' || d.id || '/thumbnail'
                        ELSE NULL
                    END as thumbnail_url
                FROM documents d
                -- Join metadata
                LEFT JOIN document_metadata dm ON d.id = dm.document_id
                -- Join latest version (ORDER BY version_number DESC to get the latest)
                LEFT JOIN LATERAL (
                    SELECT change_description, change_type, version_number
                    FROM document_versions
                    WHERE document_id = d.id
                    ORDER BY version_number DESC
                    LIMIT 1
                ) dv ON true
                -- Join physical document info
                LEFT JOIN physical_documents pd ON d.id = pd.digital_document_id
                -- Join for names (folder, barcode)
                LEFT JOIN folders f ON d.folder_id = f.id
                LEFT JOIN barcodes b ON d.barcode_id = b.id
                LEFT JOIN barcode_records br ON b.id = br.id
                -- Join warehouse hierarchy with names
                LEFT JOIN racks r ON pd.rack_id = r.id
                LEFT JOIN shelves s ON r.shelf_id = s.id
                LEFT JOIN zones z ON s.zone_id = z.id
                LEFT JOIN warehouses wh ON z.warehouse_id = wh.id
                LEFT JOIN locations loc ON wh.location_id = loc.id
                WHERE {where_sql}
                ORDER BY d.modified_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, params + [page_size, offset])
            documents = cursor.fetchall()

            total_pages = (total + page_size - 1) // page_size

            # Convert documents and handle None values for array fields
            processed_docs = []
            for doc in documents:
                doc_dict = dict(doc)
                # Convert None to empty list for array fields
                if doc_dict.get('keywords') is None:
                    doc_dict['keywords'] = []
                if doc_dict.get('tags') is None:
                    doc_dict['tags'] = []
                # Handle metadata - if None, set to empty dict
                if doc_dict.get('metadata') is None:
                    doc_dict['metadata'] = {}
                processed_docs.append(doc_dict)

            return {
                "documents": processed_docs,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}", response_model=Document)
async def get_document(document_id: UUID):
    """
    Get a specific document by ID with enriched data from related tables
    Includes: metadata, latest version info, and physical location details
    """
    try:
        with get_db_cursor() as cursor:
            # Main query with LEFT JOINs to fetch all related data
            cursor.execute("""
                SELECT
                    d.id, d.title, d.content, d.document_type, d.file_path, d.mime_type,
                    d.file_size, d.author, d.tags, d.folder_id, d.status, d.language,
                    d.keywords, d.ocr_text, d.ocr_confidence, d.preview_url, d.download_url,
                    d.owner_id, d.last_accessed_at, d.created_at, d.modified_at,
                    d.created_by, d.updated_by, d.deleted_at, d.barcode_id, d.rack_id,
                    -- Override version with version_number from document_versions table
                    COALESCE(dv.version_number, d.version, 1) as version,
                    -- Metadata from document_metadata table
                    COALESCE(dm.custom_fields, '{}'::jsonb) as metadata,
                    -- Latest version info from document_versions table
                    dv.change_description as version_description,
                    dv.change_type as version_type,
                    -- Physical location from physical_documents table
                    pd.status as physical_status,
                    pd.created_at as assignment_date,
                    -- Warehouse hierarchy from racks -> shelves -> zones -> warehouses
                    r.shelf_id as shelf_id,
                    s.zone_id as zone_id,
                    z.warehouse_id as warehouse_id,
                    wh.location_id as location_id,
                    -- Names for frontend display (no additional lookups needed)
                    f.name as folder_name,
                    br.code as barcode_code,
                    r.code as rack_name,
                    s.code as shelf_name,
                    z.name as zone_name,
                    wh.name as warehouse_name,
                    loc.name as location_name,
                    -- Generate thumbnail_url if thumbnail_path exists
                    CASE
                        WHEN d.thumbnail_path IS NOT NULL
                        THEN '/api/v1/documents/' || d.id || '/thumbnail'
                        ELSE NULL
                    END as thumbnail_url
                FROM documents d
                -- Join metadata
                LEFT JOIN document_metadata dm ON d.id = dm.document_id
                -- Join latest version (ORDER BY version_number DESC to get the latest)
                LEFT JOIN LATERAL (
                    SELECT change_description, change_type, version_number
                    FROM document_versions
                    WHERE document_id = d.id
                    ORDER BY version_number DESC
                    LIMIT 1
                ) dv ON true
                -- Join physical document info
                LEFT JOIN physical_documents pd ON d.id = pd.digital_document_id
                -- Join for names (folder, barcode)
                LEFT JOIN folders f ON d.folder_id = f.id
                LEFT JOIN barcodes b ON d.barcode_id = b.id
                LEFT JOIN barcode_records br ON b.id = br.id
                -- Join warehouse hierarchy with names
                LEFT JOIN racks r ON pd.rack_id = r.id
                LEFT JOIN shelves s ON r.shelf_id = s.id
                LEFT JOIN zones z ON s.zone_id = z.id
                LEFT JOIN warehouses wh ON z.warehouse_id = wh.id
                LEFT JOIN locations loc ON wh.location_id = loc.id
                WHERE d.id = %s AND d.deleted_at IS NULL
            """, (str(document_id),))

            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            # Convert to dict and handle None values for array fields
            doc_dict = dict(document)
            if doc_dict.get('keywords') is None:
                doc_dict['keywords'] = []
            if doc_dict.get('tags') is None:
                doc_dict['tags'] = []

            # Handle metadata - if None, set to empty dict
            if doc_dict.get('metadata') is None:
                doc_dict['metadata'] = {}

            return doc_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Document, status_code=status.HTTP_201_CREATED)
async def create_document(doc: DocumentCreate):
    """
    Create a new document
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO documents (
                    title, content, document_type, file_path, mime_type, file_size,
                    author, metadata, tags, folder_id, status, language, keywords
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                doc.title, doc.content, doc.document_type, doc.file_path, doc.mime_type,
                doc.file_size, doc.author, doc.metadata, doc.tags,
                str(doc.folder_id) if doc.folder_id else None,
                doc.status, doc.language, doc.keywords
            ))

            document = cursor.fetchone()
            return dict(document)
    except Exception as e:
        logger.error(f"Error creating document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{document_id}", response_model=Document)
async def update_document(document_id: UUID, doc_update: DocumentUpdate):
    """
    Update a document
    """
    try:
        update_fields = []
        params = []

        for field, value in doc_update.dict(exclude_unset=True).items():
            if field == "folder_id" and value:
                update_fields.append(f"{field} = %s")
                params.append(str(value))
            else:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(document_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE documents
                SET {", ".join(update_fields)}, modified_at = CURRENT_TIMESTAMP
                WHERE id = %s AND deleted_at IS NULL
                RETURNING *
            """
            cursor.execute(query, params)
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            return dict(document)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: UUID, hard_delete: bool = Query(False)):
    """
    Delete a document (soft delete by default, hard delete if specified)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            if hard_delete:
                cursor.execute(
                    "DELETE FROM documents WHERE id = %s RETURNING id",
                    (str(document_id),)
                )
            else:
                cursor.execute(
                    "UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = %s AND deleted_at IS NULL RETURNING id",
                    (str(document_id),)
                )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/download")
async def download_document(document_id: UUID):
    """
    Download a document file
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM documents WHERE id = %s AND deleted_at IS NULL",
                (str(document_id),)
            )
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            file_path = Path(document['file_path']) if document['file_path'] else None

            if not file_path or not file_path.exists():
                raise HTTPException(status_code=404, detail="Document file not found")

            return FileResponse(
                path=str(file_path),
                filename=document['title'],
                media_type=document['mime_type'] or "application/octet-stream",
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filter-options", response_model=dict)
async def get_filter_options():
    """
    Get available filter options (document types, tags, authors)
    """
    try:
        with get_db_cursor() as cursor:
            # Get distinct document types
            cursor.execute(
                "SELECT DISTINCT document_type FROM documents WHERE document_type IS NOT NULL AND deleted_at IS NULL"
            )
            types = [row['document_type'] for row in cursor.fetchall()]

            # Get all tags with usage count
            cursor.execute(
                "SELECT name, usage_count FROM tags ORDER BY usage_count DESC LIMIT 50"
            )
            tags = [{'name': row['name'], 'count': row['usage_count']} for row in cursor.fetchall()]

            # Get distinct authors
            cursor.execute(
                "SELECT DISTINCT author FROM documents WHERE author IS NOT NULL AND deleted_at IS NULL ORDER BY author"
            )
            authors = [row['author'] for row in cursor.fetchall()]

            return {
                "types": types,
                "tags": tags,
                "authors": authors
            }
    except Exception as e:
        logger.error(f"Error getting filter options: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Versions
# ==========================================

@router.get("/{document_id}/versions", response_model=List[DocumentVersion])
async def list_document_versions(document_id: UUID):
    """
    List all versions of a document
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM document_versions
                WHERE document_id = %s
                ORDER BY version_number DESC
                """,
                (str(document_id),)
            )
            versions = cursor.fetchall()
            return [dict(v) for v in versions]
    except Exception as e:
        logger.error(f"Error listing document versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/versions", response_model=DocumentVersion, status_code=status.HTTP_201_CREATED)
async def create_document_version(document_id: UUID, version: DocumentVersionCreate):
    """
    Create a new document version
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO document_versions (
                    document_id, version_number, is_major_version, file_name,
                    file_size, file_url, file_hash, change_description, change_type,
                    metadata_snapshot, created_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(document_id), version.version_number, version.is_major_version,
                version.file_name, version.file_size, version.file_url, version.file_hash,
                version.change_description, version.change_type, version.metadata_snapshot,
                str(version.created_by) if hasattr(version, 'created_by') and version.created_by else None
            ))

            new_version = cursor.fetchone()
            return dict(new_version)
    except Exception as e:
        logger.error(f"Error creating document version: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Metadata
# ==========================================

@router.get("/{document_id}/metadata")
async def get_document_metadata(document_id: UUID):
    """
    Get document metadata - returns custom_fields JSONB
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT id, document_id, custom_fields, created_at, updated_at FROM document_metadata WHERE document_id = %s",
                (str(document_id),)
            )
            metadata = cursor.fetchone()

            if not metadata:
                raise HTTPException(status_code=404, detail="Metadata not found")

            # Return the metadata row with custom_fields JSONB
            result = dict(metadata)
            # Ensure custom_fields is properly decoded (psycopg2 should handle this automatically)
            return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{document_id}/metadata", response_model=DocumentMetadata)
async def update_document_metadata(document_id: UUID, metadata: DocumentMetadataUpdate):
    """
    Update document metadata
    """
    try:
        update_fields = []
        params = []

        for field, value in metadata.dict(exclude_unset=True).items():
            if field == "schema_id" and value:
                update_fields.append(f"{field} = %s")
                params.append(str(value))
            else:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(document_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE document_metadata
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE document_id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Metadata not found")

            return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Permissions
# ==========================================

@router.get("/{document_id}/permissions", response_model=List[DocumentPermission])
async def list_document_permissions(document_id: UUID):
    """
    List document permissions
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM document_permissions WHERE document_id = %s",
                (str(document_id),)
            )
            permissions = cursor.fetchall()
            return [dict(p) for p in permissions]
    except Exception as e:
        logger.error(f"Error listing document permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/permissions", response_model=DocumentPermission, status_code=status.HTTP_201_CREATED)
async def create_document_permission(document_id: UUID, permission: DocumentPermissionCreate):
    """
    Grant document permission
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO document_permissions (
                    document_id, user_id, role_id, can_view, can_edit, can_delete,
                    can_share, can_download, expires_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(document_id),
                str(permission.user_id) if permission.user_id else None,
                str(permission.role_id) if permission.role_id else None,
                permission.can_view, permission.can_edit, permission.can_delete,
                permission.can_share, permission.can_download, permission.expires_at
            ))

            new_permission = cursor.fetchone()
            return dict(new_permission)
    except Exception as e:
        logger.error(f"Error creating document permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_permission(document_id: UUID, permission_id: UUID):
    """
    Revoke document permission
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM document_permissions WHERE id = %s AND document_id = %s RETURNING id",
                (str(permission_id), str(document_id))
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Permission not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Shares
# ==========================================

@router.get("/{document_id}/shares", response_model=List[DocumentShare])
async def list_document_shares(document_id: UUID):
    """
    List document shares
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM document_shares WHERE document_id = %s AND is_active = TRUE",
                (str(document_id),)
            )
            shares = cursor.fetchall()
            return [dict(s) for s in shares]
    except Exception as e:
        logger.error(f"Error listing document shares: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/shares", response_model=DocumentShare, status_code=status.HTTP_201_CREATED)
async def create_document_share(document_id: UUID, share: DocumentShareCreate):
    """
    Create a share link for document
    """
    import secrets
    import bcrypt

    try:
        # Generate share token
        share_token = secrets.token_urlsafe(32)

        # Hash password if provided
        password_hash = None
        if share.password:
            password_hash = bcrypt.hashpw(share.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO document_shares (
                    document_id, share_token, share_type, can_view, can_download,
                    can_edit, requires_password, password_hash, allowed_emails,
                    max_access_count, expires_at, shared_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(document_id), share_token, share.share_type, share.can_view,
                share.can_download, share.can_edit, share.requires_password,
                password_hash, share.allowed_emails, share.max_access_count,
                share.expires_at, str(share.shared_by) if hasattr(share, 'shared_by') and share.shared_by else None
            ))

            new_share = cursor.fetchone()
            return dict(new_share)
    except Exception as e:
        logger.error(f"Error creating document share: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_document_share(document_id: UUID, share_id: UUID):
    """
    Revoke a document share
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE document_shares
                SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP
                WHERE id = %s AND document_id = %s
                RETURNING id
            """, (str(share_id), str(document_id)))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Share not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking document share: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Comments
# ==========================================

@router.get("/{document_id}/comments", response_model=List[DocumentComment])
async def list_document_comments(document_id: UUID):
    """
    List document comments
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM document_comments
                WHERE document_id = %s
                ORDER BY created_at ASC
                """,
                (str(document_id),)
            )
            comments = cursor.fetchall()
            return [dict(c) for c in comments]
    except Exception as e:
        logger.error(f"Error listing document comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/comments", response_model=DocumentComment, status_code=status.HTTP_201_CREATED)
async def create_document_comment(document_id: UUID, comment: DocumentCommentCreate):
    """
    Add a comment to a document
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO document_comments (
                    document_id, content, page_number, position,
                    parent_comment_id, user_id, mentions
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(document_id), comment.content, comment.page_number,
                comment.position,
                str(comment.parent_comment_id) if comment.parent_comment_id else None,
                str(comment.user_id) if hasattr(comment, 'user_id') and comment.user_id else None,
                [str(m) for m in comment.mentions] if comment.mentions else []
            ))

            new_comment = cursor.fetchone()
            return dict(new_comment)
    except Exception as e:
        logger.error(f"Error creating document comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/comments/{comment_id}", response_model=DocumentComment)
async def update_document_comment(comment_id: UUID, comment_update: DocumentCommentUpdate):
    """
    Update a document comment
    """
    try:
        update_fields = []
        params = []

        for field, value in comment_update.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(comment_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE document_comments
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            comment = cursor.fetchone()

            if not comment:
                raise HTTPException(status_code=404, detail="Comment not found")

            return dict(comment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_comment(comment_id: UUID):
    """
    Delete a document comment
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM document_comments WHERE id = %s RETURNING id",
                (str(comment_id),)
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Comment not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comments/{comment_id}/resolve", response_model=DocumentComment)
async def resolve_document_comment(comment_id: UUID, resolved_by: UUID):
    """
    Mark a comment as resolved
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE document_comments
                SET is_resolved = TRUE, resolved_by = %s, resolved_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (str(resolved_by), str(comment_id)))

            comment = cursor.fetchone()

            if not comment:
                raise HTTPException(status_code=404, detail="Comment not found")

            return dict(comment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving document comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/download")
async def download_document(document_id: UUID):
    """
    Download a document file

    Returns the actual file for download with appropriate headers
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, file_storage_path, file_original_name, mime_type, file_size
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
                """,
                (str(document_id),)
            )
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            # Check if file exists
            if not document['file_storage_path']:
                raise HTTPException(status_code=404, detail="File not found for this document")

            file_path = file_storage_service.get_file_path(document['file_storage_path'])

            if not file_path.exists():
                raise HTTPException(status_code=404, detail="Physical file not found")

            # Determine filename for download
            download_filename = document['file_original_name'] or f"{document['title']}.pdf"

            # Return file response
            from fastapi.responses import FileResponse

            return FileResponse(
                path=str(file_path),
                filename=download_filename,
                media_type=document['mime_type'] or 'application/octet-stream',
                headers={
                    'Content-Disposition': f'attachment; filename="{download_filename}"',
                    'Content-Length': str(document['file_size'] or file_path.stat().st_size),
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/{document_id}/preview")
async def preview_document(document_id: UUID):
    """
    Preview a document file (inline display in browser)

    Returns the file for inline viewing (PDFs, images)
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, file_storage_path, file_original_name, mime_type, file_size, preview_path
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
                """,
                (str(document_id),)
            )
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            # If preview exists, use it; otherwise use original file
            preview_path = document.get('preview_path')
            if preview_path and file_storage_service.file_exists(preview_path):
                file_path = file_storage_service.get_file_path(preview_path)
                mime_type = 'application/pdf'  # Previews are typically PDF
            else:
                # Use original file for preview
                if not document['file_storage_path']:
                    raise HTTPException(status_code=404, detail="File not found for this document")

                file_path = file_storage_service.get_file_path(document['file_storage_path'])
                mime_type = document['mime_type'] or 'application/octet-stream'

            if not file_path.exists():
                raise HTTPException(status_code=404, detail="Physical file not found")

            # Determine filename
            preview_filename = document['file_original_name'] or f"{document['title']}.pdf"

            # Return file response for inline viewing
            from fastapi.responses import FileResponse

            return FileResponse(
                path=str(file_path),
                filename=preview_filename,
                media_type=mime_type,
                headers={
                    'Content-Disposition': f'inline; filename="{preview_filename}"',
                    'Content-Length': str(file_path.stat().st_size),
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")


@router.options("/{document_id}/thumbnail")
async def thumbnail_options(document_id: UUID):
    """Handle CORS preflight for thumbnail endpoint"""
    from fastapi.responses import Response
    return Response(
        status_code=200,
        headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '3600'
        }
    )

@router.get("/{document_id}/thumbnail")
async def get_thumbnail(document_id: UUID):
    """
    Get document thumbnail image

    Returns the thumbnail image (JPEG format)
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, thumbnail_path
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
                """,
                (str(document_id),)
            )
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            thumbnail_path = document.get('thumbnail_path')

            if not thumbnail_path or not file_storage_service.file_exists(thumbnail_path):
                raise HTTPException(status_code=404, detail="Thumbnail not found for this document")

            file_path = file_storage_service.get_file_path(thumbnail_path)

            # Return thumbnail image
            from fastapi.responses import FileResponse

            return FileResponse(
                path=str(file_path),
                media_type='image/jpeg',
                headers={
                    'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
                    'Content-Length': str(file_path.stat().st_size),
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thumbnail for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Thumbnail retrieval failed: {str(e)}")


@router.post("/{document_id}/analyze")
async def analyze_document_intelligence(document_id: UUID):
    """
    Analyze document using AI (GPT-4) for intelligence extraction

    Performs complete document analysis:
    - Document classification (type, category, confidence)
    - Metadata extraction (key-value pairs specific to document type)
    - Summary generation
    - Entity recognition (people, organizations, dates, amounts, etc.)

    Requires OCR content to be available. Run OCR first if needed.

    Returns comprehensive analysis results with all extracted information.
    """
    if not document_intelligence_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Document Intelligence not available. Please configure OpenAI API key."
        )

    try:
        with get_db_cursor(commit=True) as cursor:
            # Get document with OCR content
            cursor.execute("""
                SELECT id, title, file_original_name, ocr_content, file_storage_path, mime_type
                FROM documents
                WHERE id = %s AND deleted_at IS NULL
            """, (str(document_id),))

            document = cursor.fetchone()
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            doc_dict = dict(document)
            ocr_content = doc_dict.get('ocr_content')
            filename = doc_dict.get('file_original_name')

            # Check if OCR content exists
            if not ocr_content or len(ocr_content.strip()) < 50:
                raise HTTPException(
                    status_code=400,
                    detail="Document has no OCR content. Please run OCR extraction first using POST /api/v1/ocr/extract/{document_id}"
                )

            logger.info(f"Starting AI analysis for document {document_id}")

            # Perform complete analysis
            success, analysis_results, error = document_intelligence_service.analyze_document_complete(
                ocr_content,
                filename
            )

            if success and analysis_results:
                # Store analysis results in document metadata
                classification = analysis_results.get('classification', {})
                metadata_extracted = analysis_results.get('metadata', {})
                summary = analysis_results.get('summary', '')
                entities = analysis_results.get('entities', {})

                # Update document with classification results
                if classification:
                    suggested_type = classification.get('document_type')
                    suggested_tags = classification.get('suggested_tags', [])
                    category = classification.get('category')

                    cursor.execute("""
                        UPDATE documents
                        SET
                            document_type = COALESCE(document_type, %s),
                            tags = CASE
                                WHEN tags IS NULL OR array_length(tags, 1) IS NULL
                                THEN %s::text[]
                                ELSE tags
                            END,
                            keywords = COALESCE(keywords, %s::text[]),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (
                        suggested_type,
                        suggested_tags,
                        suggested_tags,  # Also set as keywords
                        str(document_id)
                    ))

                # Store complete analysis in document metadata table
                cursor.execute("""
                    INSERT INTO document_metadata (document_id, metadata_type, metadata_value)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (document_id, metadata_type)
                    DO UPDATE SET metadata_value = EXCLUDED.metadata_value, updated_at = CURRENT_TIMESTAMP
                """, (
                    str(document_id),
                    'ai_analysis',
                    Json(analysis_results)
                ))

                # Store summary separately
                if summary:
                    cursor.execute("""
                        INSERT INTO document_metadata (document_id, metadata_type, metadata_value)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (document_id, metadata_type)
                        DO UPDATE SET metadata_value = EXCLUDED.metadata_value, updated_at = CURRENT_TIMESTAMP
                    """, (
                        str(document_id),
                        'summary',
                        Json({'summary': summary})
                    ))

                # Store entities separately for easier querying
                if entities:
                    cursor.execute("""
                        INSERT INTO document_metadata (document_id, metadata_type, metadata_value)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (document_id, metadata_type)
                        DO UPDATE SET metadata_value = EXCLUDED.metadata_value, updated_at = CURRENT_TIMESTAMP
                    """, (
                        str(document_id),
                        'entities',
                        Json(entities)
                    ))

                logger.info(f"AI analysis completed for document {document_id}")

                return {
                    "document_id": str(document_id),
                    "success": True,
                    "analysis": analysis_results,
                    "message": "Document analysis completed successfully"
                }
            else:
                logger.error(f"AI analysis failed for document {document_id}: {error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Document analysis failed: {error}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    folder_id: Optional[UUID] = Query(None, description="Filter by folder"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
):
    """
    List documents with filtering, search, and pagination
    """
    try:
        offset = (page - 1) * page_size
        where_clauses = []
        params = []

        # Search functionality
        if search:
            where_clauses.append("""
                (d.title ILIKE %s OR d.content ILIKE %s OR d.ocr_text ILIKE %s OR d.author ILIKE %s)
            """)
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param, search_param])

        # Folder filter
        if folder_id:
            where_clauses.append("d.folder_id = %s")
            params.append(str(folder_id))

        # Document type filter
        if document_type:
            where_clauses.append("d.document_type = %s")
            params.append(document_type)

        # Status filter
        if status:
            where_clauses.append("d.status = %s")
            params.append(status)

        # Tags filter
        if tags:
            tag_list = [t.strip() for t in tags.split(',')]
            where_clauses.append("d.tags && %s")
            params.append(tag_list)

        # Exclude deleted documents
        where_clauses.append("d.deleted_at IS NULL")

        where_sql = " AND ".join(where_clauses) if where_clauses else "d.deleted_at IS NULL"

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM documents d WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            # Get documents with enriched data from related tables
            query = f"""
                SELECT
                    d.id, d.title, d.content, d.document_type, d.file_path, d.mime_type,
                    d.file_size, d.author, d.tags, d.folder_id, d.status, d.language,
                    d.keywords, d.ocr_text, d.ocr_confidence, d.preview_url, d.download_url,
                    d.owner_id, d.last_accessed_at, d.created_at, d.modified_at,
                    d.created_by, d.updated_by, d.deleted_at, d.barcode_id, d.rack_id,
                    -- Override version with version_number from document_versions table
                    COALESCE(dv.version_number, d.version, 1) as version,
                    -- Metadata from document_metadata table
                    COALESCE(dm.custom_fields, '{{}}'::jsonb) as metadata,
                    -- Latest version info from document_versions table
                    dv.change_description as version_description,
                    dv.change_type as version_type,
                    -- Physical location from physical_documents table
                    pd.status as physical_status,
                    pd.created_at as assignment_date,
                    -- Warehouse hierarchy from racks -> shelves -> zones -> warehouses
                    r.shelf_id as shelf_id,
                    s.zone_id as zone_id,
                    z.warehouse_id as warehouse_id,
                    wh.location_id as location_id,
                    -- Names for frontend display (no additional lookups needed)
                    f.name as folder_name,
                    br.code as barcode_code,
                    r.code as rack_name,
                    s.code as shelf_name,
                    z.name as zone_name,
                    wh.name as warehouse_name,
                    loc.name as location_name,
                    -- Generate thumbnail_url if thumbnail_path exists
                    CASE
                        WHEN d.thumbnail_path IS NOT NULL
                        THEN '/api/v1/documents/' || d.id || '/thumbnail'
                        ELSE NULL
                    END as thumbnail_url
                FROM documents d
                -- Join metadata
                LEFT JOIN document_metadata dm ON d.id = dm.document_id
                -- Join latest version (ORDER BY version_number DESC to get the latest)
                LEFT JOIN LATERAL (
                    SELECT change_description, change_type, version_number
                    FROM document_versions
                    WHERE document_id = d.id
                    ORDER BY version_number DESC
                    LIMIT 1
                ) dv ON true
                -- Join physical document info
                LEFT JOIN physical_documents pd ON d.id = pd.digital_document_id
                -- Join for names (folder, barcode)
                LEFT JOIN folders f ON d.folder_id = f.id
                LEFT JOIN barcodes b ON d.barcode_id = b.id
                LEFT JOIN barcode_records br ON b.id = br.id
                -- Join warehouse hierarchy with names
                LEFT JOIN racks r ON pd.rack_id = r.id
                LEFT JOIN shelves s ON r.shelf_id = s.id
                LEFT JOIN zones z ON s.zone_id = z.id
                LEFT JOIN warehouses wh ON z.warehouse_id = wh.id
                LEFT JOIN locations loc ON wh.location_id = loc.id
                WHERE {where_sql}
                ORDER BY d.modified_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, params + [page_size, offset])
            documents = cursor.fetchall()

            total_pages = (total + page_size - 1) // page_size

            # Convert documents and handle None values for array fields
            processed_docs = []
            for doc in documents:
                doc_dict = dict(doc)
                # Convert None to empty list for array fields
                if doc_dict.get('keywords') is None:
                    doc_dict['keywords'] = []
                if doc_dict.get('tags') is None:
                    doc_dict['tags'] = []
                # Handle metadata - if None, set to empty dict
                if doc_dict.get('metadata') is None:
                    doc_dict['metadata'] = {}
                processed_docs.append(doc_dict)

            return {
                "documents": processed_docs,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}", response_model=Document)
async def get_document(document_id: UUID):
    """
    Get a specific document by ID with enriched data from related tables
    Includes: metadata, latest version info, and physical location details
    """
    try:
        with get_db_cursor() as cursor:
            # Main query with LEFT JOINs to fetch all related data
            cursor.execute("""
                SELECT
                    d.id, d.title, d.content, d.document_type, d.file_path, d.mime_type,
                    d.file_size, d.author, d.tags, d.folder_id, d.status, d.language,
                    d.keywords, d.ocr_text, d.ocr_confidence, d.preview_url, d.download_url,
                    d.owner_id, d.last_accessed_at, d.created_at, d.modified_at,
                    d.created_by, d.updated_by, d.deleted_at, d.barcode_id, d.rack_id,
                    -- Override version with version_number from document_versions table
                    COALESCE(dv.version_number, d.version, 1) as version,
                    -- Metadata from document_metadata table
                    COALESCE(dm.custom_fields, '{}'::jsonb) as metadata,
                    -- Latest version info from document_versions table
                    dv.change_description as version_description,
                    dv.change_type as version_type,
                    -- Physical location from physical_documents table
                    pd.status as physical_status,
                    pd.created_at as assignment_date,
                    -- Warehouse hierarchy from racks -> shelves -> zones -> warehouses
                    r.shelf_id as shelf_id,
                    s.zone_id as zone_id,
                    z.warehouse_id as warehouse_id,
                    wh.location_id as location_id,
                    -- Names for frontend display (no additional lookups needed)
                    f.name as folder_name,
                    br.code as barcode_code,
                    r.code as rack_name,
                    s.code as shelf_name,
                    z.name as zone_name,
                    wh.name as warehouse_name,
                    loc.name as location_name,
                    -- Generate thumbnail_url if thumbnail_path exists
                    CASE
                        WHEN d.thumbnail_path IS NOT NULL
                        THEN '/api/v1/documents/' || d.id || '/thumbnail'
                        ELSE NULL
                    END as thumbnail_url
                FROM documents d
                -- Join metadata
                LEFT JOIN document_metadata dm ON d.id = dm.document_id
                -- Join latest version (ORDER BY version_number DESC to get the latest)
                LEFT JOIN LATERAL (
                    SELECT change_description, change_type, version_number
                    FROM document_versions
                    WHERE document_id = d.id
                    ORDER BY version_number DESC
                    LIMIT 1
                ) dv ON true
                -- Join physical document info
                LEFT JOIN physical_documents pd ON d.id = pd.digital_document_id
                -- Join for names (folder, barcode)
                LEFT JOIN folders f ON d.folder_id = f.id
                LEFT JOIN barcodes b ON d.barcode_id = b.id
                LEFT JOIN barcode_records br ON b.id = br.id
                -- Join warehouse hierarchy with names
                LEFT JOIN racks r ON pd.rack_id = r.id
                LEFT JOIN shelves s ON r.shelf_id = s.id
                LEFT JOIN zones z ON s.zone_id = z.id
                LEFT JOIN warehouses wh ON z.warehouse_id = wh.id
                LEFT JOIN locations loc ON wh.location_id = loc.id
                WHERE d.id = %s AND d.deleted_at IS NULL
            """, (str(document_id),))

            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            # Convert to dict and handle None values for array fields
            doc_dict = dict(document)
            if doc_dict.get('keywords') is None:
                doc_dict['keywords'] = []
            if doc_dict.get('tags') is None:
                doc_dict['tags'] = []

            # Handle metadata - if None, set to empty dict
            if doc_dict.get('metadata') is None:
                doc_dict['metadata'] = {}

            return doc_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Document, status_code=status.HTTP_201_CREATED)
async def create_document(doc: DocumentCreate):
    """
    Create a new document
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO documents (
                    title, content, document_type, file_path, mime_type, file_size,
                    author, metadata, tags, folder_id, status, language, keywords
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                doc.title, doc.content, doc.document_type, doc.file_path, doc.mime_type,
                doc.file_size, doc.author, doc.metadata, doc.tags,
                str(doc.folder_id) if doc.folder_id else None,
                doc.status, doc.language, doc.keywords
            ))

            document = cursor.fetchone()
            return dict(document)
    except Exception as e:
        logger.error(f"Error creating document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{document_id}", response_model=Document)
async def update_document(document_id: UUID, doc_update: DocumentUpdate):
    """
    Update a document
    """
    try:
        update_fields = []
        params = []

        for field, value in doc_update.dict(exclude_unset=True).items():
            if field == "folder_id" and value:
                update_fields.append(f"{field} = %s")
                params.append(str(value))
            else:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(document_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE documents
                SET {", ".join(update_fields)}, modified_at = CURRENT_TIMESTAMP
                WHERE id = %s AND deleted_at IS NULL
                RETURNING *
            """
            cursor.execute(query, params)
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            return dict(document)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: UUID, hard_delete: bool = Query(False)):
    """
    Delete a document (soft delete by default, hard delete if specified)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            if hard_delete:
                cursor.execute(
                    "DELETE FROM documents WHERE id = %s RETURNING id",
                    (str(document_id),)
                )
            else:
                cursor.execute(
                    "UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = %s AND deleted_at IS NULL RETURNING id",
                    (str(document_id),)
                )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Document not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/download")
async def download_document(document_id: UUID):
    """
    Download a document file
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM documents WHERE id = %s AND deleted_at IS NULL",
                (str(document_id),)
            )
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            file_path = Path(document['file_path']) if document['file_path'] else None

            if not file_path or not file_path.exists():
                raise HTTPException(status_code=404, detail="Document file not found")

            return FileResponse(
                path=str(file_path),
                filename=document['title'],
                media_type=document['mime_type'] or "application/octet-stream",
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filter-options", response_model=dict)
async def get_filter_options():
    """
    Get available filter options (document types, tags, authors)
    """
    try:
        with get_db_cursor() as cursor:
            # Get distinct document types
            cursor.execute(
                "SELECT DISTINCT document_type FROM documents WHERE document_type IS NOT NULL AND deleted_at IS NULL"
            )
            types = [row['document_type'] for row in cursor.fetchall()]

            # Get all tags with usage count
            cursor.execute(
                "SELECT name, usage_count FROM tags ORDER BY usage_count DESC LIMIT 50"
            )
            tags = [{'name': row['name'], 'count': row['usage_count']} for row in cursor.fetchall()]

            # Get distinct authors
            cursor.execute(
                "SELECT DISTINCT author FROM documents WHERE author IS NOT NULL AND deleted_at IS NULL ORDER BY author"
            )
            authors = [row['author'] for row in cursor.fetchall()]

            return {
                "types": types,
                "tags": tags,
                "authors": authors
            }
    except Exception as e:
        logger.error(f"Error getting filter options: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Versions
# ==========================================

@router.get("/{document_id}/versions", response_model=List[DocumentVersion])
async def list_document_versions(document_id: UUID):
    """
    List all versions of a document
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM document_versions
                WHERE document_id = %s
                ORDER BY version_number DESC
                """,
                (str(document_id),)
            )
            versions = cursor.fetchall()
            return [dict(v) for v in versions]
    except Exception as e:
        logger.error(f"Error listing document versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/versions", response_model=DocumentVersion, status_code=status.HTTP_201_CREATED)
async def create_document_version(document_id: UUID, version: DocumentVersionCreate):
    """
    Create a new document version
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO document_versions (
                    document_id, version_number, is_major_version, file_name,
                    file_size, file_url, file_hash, change_description, change_type,
                    metadata_snapshot, created_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(document_id), version.version_number, version.is_major_version,
                version.file_name, version.file_size, version.file_url, version.file_hash,
                version.change_description, version.change_type, version.metadata_snapshot,
                str(version.created_by) if hasattr(version, 'created_by') and version.created_by else None
            ))

            new_version = cursor.fetchone()
            return dict(new_version)
    except Exception as e:
        logger.error(f"Error creating document version: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Metadata
# ==========================================

@router.get("/{document_id}/metadata")
async def get_document_metadata(document_id: UUID):
    """
    Get document metadata - returns custom_fields JSONB
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT id, document_id, custom_fields, created_at, updated_at FROM document_metadata WHERE document_id = %s",
                (str(document_id),)
            )
            metadata = cursor.fetchone()

            if not metadata:
                raise HTTPException(status_code=404, detail="Metadata not found")

            # Return the metadata row with custom_fields JSONB
            result = dict(metadata)
            # Ensure custom_fields is properly decoded (psycopg2 should handle this automatically)
            return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{document_id}/metadata", response_model=DocumentMetadata)
async def update_document_metadata(document_id: UUID, metadata: DocumentMetadataUpdate):
    """
    Update document metadata
    """
    try:
        update_fields = []
        params = []

        for field, value in metadata.dict(exclude_unset=True).items():
            if field == "schema_id" and value:
                update_fields.append(f"{field} = %s")
                params.append(str(value))
            else:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(document_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE document_metadata
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE document_id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Metadata not found")

            return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Permissions
# ==========================================

@router.get("/{document_id}/permissions", response_model=List[DocumentPermission])
async def list_document_permissions(document_id: UUID):
    """
    List document permissions
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM document_permissions WHERE document_id = %s",
                (str(document_id),)
            )
            permissions = cursor.fetchall()
            return [dict(p) for p in permissions]
    except Exception as e:
        logger.error(f"Error listing document permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/permissions", response_model=DocumentPermission, status_code=status.HTTP_201_CREATED)
async def create_document_permission(document_id: UUID, permission: DocumentPermissionCreate):
    """
    Grant document permission
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO document_permissions (
                    document_id, user_id, role_id, can_view, can_edit, can_delete,
                    can_share, can_download, expires_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(document_id),
                str(permission.user_id) if permission.user_id else None,
                str(permission.role_id) if permission.role_id else None,
                permission.can_view, permission.can_edit, permission.can_delete,
                permission.can_share, permission.can_download, permission.expires_at
            ))

            new_permission = cursor.fetchone()
            return dict(new_permission)
    except Exception as e:
        logger.error(f"Error creating document permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_permission(document_id: UUID, permission_id: UUID):
    """
    Revoke document permission
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM document_permissions WHERE id = %s AND document_id = %s RETURNING id",
                (str(permission_id), str(document_id))
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Permission not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Shares
# ==========================================

@router.get("/{document_id}/shares", response_model=List[DocumentShare])
async def list_document_shares(document_id: UUID):
    """
    List document shares
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM document_shares WHERE document_id = %s AND is_active = TRUE",
                (str(document_id),)
            )
            shares = cursor.fetchall()
            return [dict(s) for s in shares]
    except Exception as e:
        logger.error(f"Error listing document shares: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/shares", response_model=DocumentShare, status_code=status.HTTP_201_CREATED)
async def create_document_share(document_id: UUID, share: DocumentShareCreate):
    """
    Create a share link for document
    """
    import secrets
    import bcrypt

    try:
        # Generate share token
        share_token = secrets.token_urlsafe(32)

        # Hash password if provided
        password_hash = None
        if share.password:
            password_hash = bcrypt.hashpw(share.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO document_shares (
                    document_id, share_token, share_type, can_view, can_download,
                    can_edit, requires_password, password_hash, allowed_emails,
                    max_access_count, expires_at, shared_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(document_id), share_token, share.share_type, share.can_view,
                share.can_download, share.can_edit, share.requires_password,
                password_hash, share.allowed_emails, share.max_access_count,
                share.expires_at, str(share.shared_by) if hasattr(share, 'shared_by') and share.shared_by else None
            ))

            new_share = cursor.fetchone()
            return dict(new_share)
    except Exception as e:
        logger.error(f"Error creating document share: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_document_share(document_id: UUID, share_id: UUID):
    """
    Revoke a document share
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE document_shares
                SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP
                WHERE id = %s AND document_id = %s
                RETURNING id
            """, (str(share_id), str(document_id)))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Share not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking document share: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Document Comments
# ==========================================

@router.get("/{document_id}/comments", response_model=List[DocumentComment])
async def list_document_comments(document_id: UUID):
    """
    List document comments
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM document_comments
                WHERE document_id = %s
                ORDER BY created_at ASC
                """,
                (str(document_id),)
            )
            comments = cursor.fetchall()
            return [dict(c) for c in comments]
    except Exception as e:
        logger.error(f"Error listing document comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/comments", response_model=DocumentComment, status_code=status.HTTP_201_CREATED)
async def create_document_comment(document_id: UUID, comment: DocumentCommentCreate):
    """
    Add a comment to a document
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO document_comments (
                    document_id, content, page_number, position,
                    parent_comment_id, user_id, mentions
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(document_id), comment.content, comment.page_number,
                comment.position,
                str(comment.parent_comment_id) if comment.parent_comment_id else None,
                str(comment.user_id) if hasattr(comment, 'user_id') and comment.user_id else None,
                [str(m) for m in comment.mentions] if comment.mentions else []
            ))

            new_comment = cursor.fetchone()
            return dict(new_comment)
    except Exception as e:
        logger.error(f"Error creating document comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/comments/{comment_id}", response_model=DocumentComment)
async def update_document_comment(comment_id: UUID, comment_update: DocumentCommentUpdate):
    """
    Update a document comment
    """
    try:
        update_fields = []
        params = []

        for field, value in comment_update.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(comment_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE document_comments
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            comment = cursor.fetchone()

            if not comment:
                raise HTTPException(status_code=404, detail="Comment not found")

            return dict(comment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_comment(comment_id: UUID):
    """
    Delete a document comment
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM document_comments WHERE id = %s RETURNING id",
                (str(comment_id),)
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Comment not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comments/{comment_id}/resolve", response_model=DocumentComment)
async def resolve_document_comment(comment_id: UUID, resolved_by: UUID):
    """
    Mark a comment as resolved
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE document_comments
                SET is_resolved = TRUE, resolved_by = %s, resolved_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (str(resolved_by), str(comment_id)))

            comment = cursor.fetchone()

            if not comment:
                raise HTTPException(status_code=404, detail="Comment not found")

            return dict(comment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving document comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Barcode Lookup
# ==========================================

@router.get("/barcode/{barcode_code}")
async def get_document_by_barcode(barcode_code: str):
    """
    Look up a document by its barcode code from the barcodes table
    """
    try:
        with get_db_cursor() as cursor:
            # Query barcodes table and join with documents
            cursor.execute("""
                SELECT
                    b.id as barcode_id,
                    b.code as barcode_code,
                    b.format as barcode_format,
                    b.is_active as barcode_active,
                    b.created_at as barcode_created_at,
                    d.id as document_id,
                    d.title,
                    d.file_path,
                    d.file_size,
                    d.mime_type,
                    d.status,
                    d.folder_id,
                    d.created_at as document_created_at,
                    pd.id as physical_document_id,
                    pd.rack_id,
                    pd.location_id,
                    pd.status as physical_status
                FROM barcodes b
                LEFT JOIN documents d ON b.document_id = d.id
                LEFT JOIN physical_documents pd ON pd.digital_document_id = d.id
                WHERE b.code = %s AND b.is_active = TRUE
            """, (barcode_code,))

            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Barcode not found or inactive")

            return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error looking up barcode: {e}")
        raise HTTPException(status_code=500, detail=str(e))
