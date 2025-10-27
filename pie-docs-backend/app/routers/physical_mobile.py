"""
Physical Documents - Mobile Scanning API Router
"""
from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import os
import uuid as uuid_lib

from app.database import get_db_cursor
from app.models.physical_documents import (
    ScanSession, ScanSessionCreate, ScannedItem, ScannedItemCreate,
    CapturedDocument, CapturedDocumentCreate, BatchSession, BatchSessionCreate,
    BatchItem, BatchItemCreate, OfflineOperation, OfflineOperationCreate,
    ScanHistoryResponse
)

router = APIRouter(prefix="/api/v1/physical/mobile", tags=["physical-mobile"])

# Upload directory for captured images
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "captured_documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ==========================================
# Scan Session Endpoints
# ==========================================

@router.post("/sessions", response_model=ScanSession)
async def start_scan_session(session: ScanSessionCreate, user_id: UUID = Query(...)):
    """Start a new scanning session"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO scan_sessions (user_id, session_type)
                VALUES (%s, %s)
                RETURNING id, user_id, session_type, started_at, ended_at,
                          scanned_count, captured_count, status
            """, (user_id, session.session_type))
            new_session = cursor.fetchone()
            return dict(new_session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start scan session: {str(e)}")


@router.get("/sessions/{session_id}", response_model=ScanSession)
async def get_scan_session(session_id: UUID):
    """Get a scan session"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, user_id, session_type, started_at, ended_at,
                       scanned_count, captured_count, status
                FROM scan_sessions
                WHERE id = %s
            """, (session_id,))
            session = cursor.fetchone()

            if not session:
                raise HTTPException(status_code=404, detail="Scan session not found")

            return dict(session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scan session: {str(e)}")


@router.patch("/sessions/{session_id}/end")
async def end_scan_session(session_id: UUID):
    """End a scan session"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE scan_sessions
                SET status = 'completed', ended_at = NOW()
                WHERE id = %s
                RETURNING id, user_id, session_type, started_at, ended_at,
                          scanned_count, captured_count, status
            """, (session_id,))
            session = cursor.fetchone()

            if not session:
                raise HTTPException(status_code=404, detail="Scan session not found")

            return dict(session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end scan session: {str(e)}")


@router.get("/sessions")
async def list_scan_sessions(
    user_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100)
):
    """List scan sessions"""
    try:
        offset = (page - 1) * page_size
        where_clause = "user_id = %s" if user_id else "1=1"
        params = [user_id] if user_id else []

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT COUNT(*) FROM scan_sessions WHERE {where_clause}
            """, params)
            total = cursor.fetchone()['count']

            cursor.execute(f"""
                SELECT id, user_id, session_type, started_at, ended_at,
                       scanned_count, captured_count, status
                FROM scan_sessions
                WHERE {where_clause}
                ORDER BY started_at DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            sessions = cursor.fetchall()

            return {
                "sessions": [dict(row) for row in sessions],
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scan sessions: {str(e)}")


# ==========================================
# Scanned Items Endpoints
# ==========================================

@router.post("/scans", response_model=ScannedItem)
async def record_scan(scan: ScannedItemCreate):
    """Record a scanned barcode"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Insert scanned item
            cursor.execute("""
                INSERT INTO scanned_items (
                    session_id, barcode, format, confidence, metadata, location_data
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, session_id, barcode, format, confidence, validated,
                          validation_result, metadata, location_data, timestamp
            """, (
                scan.session_id,
                scan.barcode,
                scan.format.value,
                scan.confidence,
                scan.metadata,
                None  # location_data will be added separately if needed
            ))
            scanned_item = cursor.fetchone()

            # Update session scanned count
            cursor.execute("""
                UPDATE scan_sessions
                SET scanned_count = scanned_count + 1
                WHERE id = %s
            """, (scan.session_id,))

            # Validate barcode
            cursor.execute("""
                SELECT br.*, bf.name as format_name,
                       pd.digital_document_id, pd.status as doc_status,
                       pa.name as asset_name, pa.asset_type
                FROM barcode_records br
                JOIN barcode_formats bf ON br.format_id = bf.id
                LEFT JOIN physical_documents pd ON br.id = pd.barcode_id
                LEFT JOIN physical_assets pa ON br.id = pa.barcode_id
                WHERE br.code = %s AND br.is_active = TRUE
            """, (scan.barcode,))
            barcode_info = cursor.fetchone()

            if barcode_info:
                validation_result = {
                    "is_valid": True,
                    "barcode_id": str(barcode_info['id']),
                    "document_id": str(barcode_info['digital_document_id']) if barcode_info['digital_document_id'] else None,
                    "asset_name": barcode_info['asset_name'],
                    "asset_type": barcode_info['asset_type']
                }

                cursor.execute("""
                    UPDATE scanned_items
                    SET validated = TRUE, validation_result = %s
                    WHERE id = %s
                """, (validation_result, scanned_item['id']))
            else:
                cursor.execute("""
                    UPDATE scanned_items
                    SET validated = FALSE, validation_result = %s
                    WHERE id = %s
                """, ({"is_valid": False, "error": "Barcode not found or inactive"}, scanned_item['id']))

            # Fetch updated item
            cursor.execute("""
                SELECT * FROM scanned_items WHERE id = %s
            """, (scanned_item['id'],))
            return dict(cursor.fetchone())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record scan: {str(e)}")


@router.get("/scans", response_model=ScanHistoryResponse)
async def list_scans(
    session_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100)
):
    """List scanned items"""
    try:
        offset = (page - 1) * page_size
        where_clause = "session_id = %s" if session_id else "1=1"
        params = [session_id] if session_id else []

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT COUNT(*) FROM scanned_items WHERE {where_clause}
            """, params)
            total = cursor.fetchone()['count']

            cursor.execute(f"""
                SELECT * FROM scanned_items
                WHERE {where_clause}
                ORDER BY timestamp DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            scans = cursor.fetchall()

            return {
                "scans": [dict(row) for row in scans],
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scans: {str(e)}")


# ==========================================
# Document Capture Endpoints
# ==========================================

@router.post("/captures")
async def capture_document(
    session_id: UUID = Query(...),
    file: UploadFile = File(...)
):
    """Capture a document image"""
    try:
        # Save uploaded file
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid_lib.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Create capture record
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO captured_documents (
                    session_id, original_image_url, processing_status
                )
                VALUES (%s, %s, 'pending')
                RETURNING id, session_id, original_image_url, enhanced_image_url,
                          document_type, metadata, pages, timestamp, location_data,
                          processing_status, ocr_text
            """, (session_id, f"/uploads/captured_documents/{unique_filename}"))
            captured_doc = cursor.fetchone()

            # Update session captured count
            cursor.execute("""
                UPDATE scan_sessions
                SET captured_count = captured_count + 1
                WHERE id = %s
            """, (session_id,))

            return dict(captured_doc)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to capture document: {str(e)}")


@router.get("/captures")
async def list_captured_documents(
    session_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100)
):
    """List captured documents"""
    try:
        offset = (page - 1) * page_size
        where_clause = "session_id = %s" if session_id else "1=1"
        params = [session_id] if session_id else []

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT COUNT(*) FROM captured_documents WHERE {where_clause}
            """, params)
            total = cursor.fetchone()['count']

            cursor.execute(f"""
                SELECT * FROM captured_documents
                WHERE {where_clause}
                ORDER BY timestamp DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            captures = cursor.fetchall()

            return {
                "captures": [dict(row) for row in captures],
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch captured documents: {str(e)}")


@router.patch("/captures/{capture_id}/process")
async def process_captured_document(capture_id: UUID):
    """Trigger processing for a captured document"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE captured_documents
                SET processing_status = 'processing'
                WHERE id = %s
                RETURNING id
            """, (capture_id,))
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Captured document not found")

            # TODO: Trigger async processing (OCR, enhancement, etc.)

            return {"message": "Processing started", "capture_id": str(capture_id)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process captured document: {str(e)}")


# ==========================================
# Batch Scanning Endpoints
# ==========================================

@router.post("/batch", response_model=BatchSession)
async def start_batch_session(batch: BatchSessionCreate, user_id: UUID = Query(...)):
    """Start a batch scanning session"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO batch_sessions (
                    user_id, batch_type, target_count, auto_advance
                )
                VALUES (%s, %s, %s, %s)
                RETURNING id, user_id, batch_type, target_count, auto_advance,
                          created_at, completed_at, status, items_count
            """, (user_id, batch.batch_type, batch.target_count, batch.auto_advance))
            new_batch = cursor.fetchone()
            return dict(new_batch)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start batch session: {str(e)}")


@router.post("/batch/{batch_id}/items", response_model=BatchItem)
async def add_batch_item(batch_id: UUID, item: BatchItemCreate):
    """Add an item to a batch"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO batch_items (batch_id, item_type, data, metadata)
                VALUES (%s, %s, %s, %s)
                RETURNING id, batch_id, item_type, data, metadata, timestamp, status
            """, (batch_id, item.item_type, item.data, item.metadata))
            new_item = cursor.fetchone()

            # Update batch items count
            cursor.execute("""
                UPDATE batch_sessions
                SET items_count = items_count + 1
                WHERE id = %s
            """, (batch_id,))

            return dict(new_item)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add batch item: {str(e)}")


@router.patch("/batch/{batch_id}/complete")
async def complete_batch_session(batch_id: UUID):
    """Complete a batch scanning session"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE batch_sessions
                SET status = 'completed', completed_at = NOW()
                WHERE id = %s
                RETURNING id, user_id, batch_type, target_count, auto_advance,
                          created_at, completed_at, status, items_count
            """, (batch_id,))
            batch = cursor.fetchone()

            if not batch:
                raise HTTPException(status_code=404, detail="Batch session not found")

            return dict(batch)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete batch session: {str(e)}")


@router.get("/batch/{batch_id}")
async def get_batch_session(batch_id: UUID):
    """Get batch session with items"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM batch_sessions WHERE id = %s
            """, (batch_id,))
            batch = cursor.fetchone()

            if not batch:
                raise HTTPException(status_code=404, detail="Batch session not found")

            cursor.execute("""
                SELECT * FROM batch_items
                WHERE batch_id = %s
                ORDER BY timestamp
            """, (batch_id,))
            items = cursor.fetchall()

            return {
                "batch": dict(batch),
                "items": [dict(item) for item in items]
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch batch session: {str(e)}")


# ==========================================
# Offline Operations Endpoints
# ==========================================

@router.post("/offline", response_model=OfflineOperation)
async def queue_offline_operation(operation: OfflineOperationCreate, user_id: UUID = Query(...)):
    """Queue an offline operation for later sync"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO offline_operations (
                    user_id, operation_type, payload
                )
                VALUES (%s, %s, %s)
                RETURNING id, user_id, operation_type, payload, timestamp,
                          retry_count, status, last_attempt, error
            """, (user_id, operation.operation_type, operation.payload))
            new_operation = cursor.fetchone()
            return dict(new_operation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue offline operation: {str(e)}")


@router.post("/sync")
async def sync_offline_operations(user_id: UUID = Query(...)):
    """Sync all pending offline operations for a user"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Get pending operations
            cursor.execute("""
                SELECT * FROM offline_operations
                WHERE user_id = %s AND status = 'pending'
                ORDER BY timestamp
            """, (user_id,))
            operations = cursor.fetchall()

            synced_count = 0
            failed_count = 0

            for op in operations:
                try:
                    # Process operation based on type
                    # TODO: Implement actual processing logic

                    # Mark as completed
                    cursor.execute("""
                        UPDATE offline_operations
                        SET status = 'completed', last_attempt = NOW()
                        WHERE id = %s
                    """, (op['id'],))
                    synced_count += 1

                except Exception as e:
                    # Mark as failed
                    cursor.execute("""
                        UPDATE offline_operations
                        SET status = 'failed', error = %s, retry_count = retry_count + 1,
                            last_attempt = NOW()
                        WHERE id = %s
                    """, (str(e), op['id']))
                    failed_count += 1

            return {
                "synced_count": synced_count,
                "failed_count": failed_count,
                "total_operations": len(operations)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync offline operations: {str(e)}")


@router.get("/offline/status")
async def get_offline_status(user_id: UUID = Query(...)):
    """Get offline sync status for a user"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
                    MAX(timestamp) as last_operation_time
                FROM offline_operations
                WHERE user_id = %s
            """, (user_id,))
            status = cursor.fetchone()

            return dict(status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch offline status: {str(e)}")
