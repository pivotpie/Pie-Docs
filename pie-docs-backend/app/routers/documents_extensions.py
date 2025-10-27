"""
Document API Extensions - Additional endpoints for OCR and Events
These endpoints extend the main documents router
"""
from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
import logging

from app.database import get_db_cursor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.get("/{document_id}/ocr")
async def get_document_ocr(document_id: UUID):
    """
    Get OCR results for a document

    Returns OCR text and job information from ocr_jobs and ocr_results tables
    """
    try:
        with get_db_cursor() as cursor:
            # Get OCR job and results
            cursor.execute("""
                SELECT
                    oj.id as job_id,
                    oj.language,
                    oj.status as job_status,
                    oj.progress,
                    oj.error_message,
                    oj.started_at,
                    oj.completed_at,
                    oj.created_at as job_created_at,
                    ore.id as result_id,
                    ore.extracted_text,
                    ore.overall_confidence as confidence,
                    NULL::INTEGER as page_count,
                    NULL::INTEGER as word_count,
                    ore.created_at as result_created_at
                FROM ocr_jobs oj
                LEFT JOIN ocr_results ore ON oj.id = ore.job_id
                WHERE oj.document_id = %s
                ORDER BY oj.created_at DESC
                LIMIT 1
            """, (str(document_id),))

            result = cursor.fetchone()

            if not result:
                # Return empty OCR structure if no OCR has been run
                return {
                    "document_id": str(document_id),
                    "has_ocr": False,
                    "job_status": "not_started",
                    "extracted_text": None,
                    "confidence": None,
                    "page_count": None,
                    "word_count": None
                }

            return {
                "document_id": str(document_id),
                "has_ocr": True,
                "job_id": str(result['job_id']),
                "language": result['language'],
                "job_status": result['job_status'],
                "progress": result['progress'],
                "error_message": result['error_message'],
                "started_at": result['started_at'].isoformat() if result['started_at'] else None,
                "completed_at": result['completed_at'].isoformat() if result['completed_at'] else None,
                "job_created_at": result['job_created_at'].isoformat() if result['job_created_at'] else None,
                "result_id": str(result['result_id']) if result['result_id'] else None,
                "extracted_text": result['extracted_text'],
                "confidence": result['confidence'],
                "page_count": result['page_count'],
                "word_count": result['word_count'],
                "result_created_at": result['result_created_at'].isoformat() if result.get('result_created_at') else None
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OCR for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"OCR retrieval failed: {str(e)}")


@router.get("/{document_id}/events")
async def get_document_events(document_id: UUID, page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100)):
    """
    Get audit trail events for a document

    Returns document lifecycle events like creation, updates, moves, version changes, etc.
    """
    logger.info(f"[EVENTS] Starting get_document_events for document_id={document_id}, page={page}, page_size={page_size}")
    try:
        with get_db_cursor() as cursor:
            offset = (page - 1) * page_size

            # Extended event tracking: 7 event types across multiple tables
            # 1. document_created, 2. version_created, 3. comment_added
            # 4. checkout events, 5. OCR processing, 6. approval workflow, 7. tag additions
            logger.info(f"[EVENTS] Executing query with 7 event types...")
            cursor.execute("""
                WITH document_events AS (
                    -- Document creation
                    SELECT
                        d.id::text as event_id,
                        'document_created' as event_type,
                        'Document created' as description,
                        d.author::text as performed_by,
                        d.created_at as event_time,
                        NULL::text as details
                    FROM documents d
                    WHERE d.id = %s

                    UNION ALL

                    -- Version changes
                    SELECT
                        dv.id::text as event_id,
                        'version_created' as event_type,
                        'New version ' || dv.version_number || ' created' as description,
                        dv.created_by::text as performed_by,
                        dv.created_at as event_time,
                        dv.change_description::text as details
                    FROM document_versions dv
                    WHERE dv.document_id = %s

                    UNION ALL

                    -- Comments added
                    SELECT
                        dc.id::text as event_id,
                        'comment_added' as event_type,
                        'Comment added' as description,
                        COALESCE(dc.user_id::text, 'Unknown') as performed_by,
                        dc.created_at as event_time,
                        dc.content::text as details
                    FROM document_comments dc
                    WHERE dc.document_id = %s

                    UNION ALL

                    -- Check-in/Check-out audit events
                    SELECT
                        dca.id::text as event_id,
                        'checkout_' || dca.action_type as event_type,
                        'Document ' || dca.action_type as description,
                        COALESCE(dca.performed_by::text, 'Unknown') as performed_by,
                        dca.performed_at as event_time,
                        dca.reason::text as details
                    FROM document_checkout_audit dca
                    WHERE dca.document_id = %s

                    UNION ALL

                    -- OCR processing events
                    SELECT
                        oj.id::text as event_id,
                        'ocr_' || oj.status as event_type,
                        'OCR processing ' || oj.status as description,
                        'OCR System' as performed_by,
                        oj.created_at as event_time,
                        oj.error_message::text as details
                    FROM ocr_jobs oj
                    WHERE oj.document_id = %s

                    UNION ALL

                    -- Approval workflow actions
                    SELECT
                        aa.id::text as event_id,
                        'approval_' || aa.action as event_type,
                        'Approval ' || aa.action as description,
                        COALESCE(aa.user_id::text, 'Unknown') as performed_by,
                        aa.created_at as event_time,
                        aa.comments::text as details
                    FROM approval_actions aa
                    JOIN approval_requests ar ON aa.approval_request_id = ar.id
                    WHERE ar.document_id = %s

                    UNION ALL

                    -- Tag additions
                    SELECT
                        dt.tag_id::text as event_id,
                        'tag_added' as event_type,
                        'Tag "' || t.name || '" added' as description,
                        COALESCE(dt.added_by::text, 'System') as performed_by,
                        dt.added_at as event_time,
                        NULL::text as details
                    FROM document_tags dt
                    JOIN tags t ON dt.tag_id = t.id
                    WHERE dt.document_id = %s
                )
                SELECT * FROM document_events
                ORDER BY event_time DESC
                LIMIT %s OFFSET %s
            """, (str(document_id), str(document_id), str(document_id), str(document_id), str(document_id), str(document_id), str(document_id), page_size, offset))

            logger.info(f"[EVENTS] Query executed successfully")

            events = cursor.fetchall()
            logger.info(f"Fetched {len(events)} events for document {document_id}")

            # Test converting each event
            converted_events = []
            event_index = -1
            try:
                for event_index, event in enumerate(events):
                    logger.info(f"Processing event {event_index}: {type(event)}, keys: {event.keys() if hasattr(event, 'keys') else 'no keys'}")
                    converted_events.append(dict(event))
                logger.info(f"Successfully converted all {len(converted_events)} events")
            except Exception as conv_error:
                logger.error(f"Error converting event at index {event_index}: {conv_error}")
                raise

            # Get total count with same CTE structure
            logger.info(f"[EVENTS] Getting total count...")
            cursor.execute("""
                WITH document_events AS (
                    -- Document creation
                    SELECT d.id as event_id, d.created_at as event_time
                    FROM documents d
                    WHERE d.id = %s

                    UNION ALL

                    -- Version changes
                    SELECT dv.id as event_id, dv.created_at as event_time
                    FROM document_versions dv
                    WHERE dv.document_id = %s

                    UNION ALL

                    -- Comments
                    SELECT dc.id as event_id, dc.created_at as event_time
                    FROM document_comments dc
                    WHERE dc.document_id = %s

                    UNION ALL

                    -- Checkout audit
                    SELECT dca.id as event_id, dca.performed_at as event_time
                    FROM document_checkout_audit dca
                    WHERE dca.document_id = %s

                    UNION ALL

                    -- OCR jobs
                    SELECT oj.id as event_id, oj.created_at as event_time
                    FROM ocr_jobs oj
                    WHERE oj.document_id = %s

                    UNION ALL

                    -- Approval actions
                    SELECT aa.id as event_id, aa.created_at as event_time
                    FROM approval_actions aa
                    JOIN approval_requests ar ON aa.approval_request_id = ar.id
                    WHERE ar.document_id = %s

                    UNION ALL

                    -- Tags
                    SELECT dt.tag_id as event_id, dt.added_at as event_time
                    FROM document_tags dt
                    WHERE dt.document_id = %s
                )
                SELECT COUNT(*) as total FROM document_events
            """, (str(document_id), str(document_id), str(document_id), str(document_id), str(document_id), str(document_id), str(document_id)))

            logger.info(f"[EVENTS] About to fetch total count result...")

            total_result = cursor.fetchone()
            total = total_result['total'] if total_result else 0

            return {
                "document_id": str(document_id),
                "events": converted_events,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size if total > 0 else 0
            }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error getting events for document {document_id}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Events retrieval failed: {str(e)}")
