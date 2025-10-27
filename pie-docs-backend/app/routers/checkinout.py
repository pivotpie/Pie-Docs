"""
Check-in/Check-out API Router
Comprehensive document checkout and locking system
"""
from fastapi import APIRouter, HTTPException, status, Query, Request
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import logging

from app.database import get_db_cursor
from app.models.checkinout import (
    CheckoutRecord, CheckoutRecordCreate, CheckoutRecordUpdate, CheckoutRecordListResponse,
    DocumentLock, DocumentLockCreate,
    CheckoutNotification, CheckoutNotificationCreate,
    CheckoutAudit, CheckoutAuditCreate,
    CheckoutRequest, CheckinRequest, ExtendCheckoutRequest, ForceCheckinRequest,
    CheckoutStatusResponse, CheckoutAnalytics
)
from app.services.workflow_execution import WorkflowExecutionEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/checkinout", tags=["check-in-out"])


# ==========================================
# Checkout Operations
# ==========================================

@router.post("/checkout", response_model=CheckoutRecord, status_code=status.HTTP_201_CREATED)
async def checkout_document(request: CheckoutRequest, req: Request, user_id: Optional[UUID] = None):
    """
    Check out a document for editing (creates lock)
    """
    try:
        # Check if document is already checked out
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, user_name FROM document_checkout_records
                WHERE document_id = %s AND status = 'checked-out' AND is_active = true
            """, (str(request.document_id),))

            existing_checkout = cursor.fetchone()
            if existing_checkout:
                raise HTTPException(
                    status_code=409,
                    detail=f"Document is already checked out by {existing_checkout['user_name']}"
                )

        # Get user information (simplified - in production get from auth)
        user_name = "Current User"  # TODO: Get from authenticated user
        user_dept = "Engineering"  # TODO: Get from user profile

        # Create checkout record
        with get_db_cursor(commit=True) as cursor:
            # Calculate lock expiry
            lock_expiry = request.due_date if request.due_date else datetime.now() + timedelta(days=7)

            # Insert checkout record
            cursor.execute("""
                INSERT INTO document_checkout_records (
                    document_id, user_id, user_name, user_department,
                    status, due_date, lock_expiry, reason, checkout_notes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(request.document_id),
                str(user_id) if user_id else None,
                user_name,
                user_dept,
                'checked-out',
                request.due_date,
                lock_expiry,
                request.reason,
                request.checkout_notes
            ))

            checkout_record = cursor.fetchone()
            checkout_id = checkout_record['id']

            # Create document lock
            # Use admin user ID as fallback if no user_id provided
            locked_by_user = str(user_id) if user_id else "00000000-0000-0000-0000-000000000001"

            cursor.execute("""
                INSERT INTO document_locks (
                    document_id, checkout_record_id, locked_by,
                    lock_type, expires_at
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(request.document_id),
                str(checkout_id),
                locked_by_user,
                'exclusive',
                lock_expiry
            ))

            # Log audit trail
            cursor.execute("""
                INSERT INTO document_checkout_audit (
                    checkout_record_id, document_id, action_type,
                    performed_by, reason, ip_address
                )
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                str(checkout_id),
                str(request.document_id),
                'checkout',
                str(user_id) if user_id else None,
                request.reason,
                req.client.host if req.client else None
            ))

        # Trigger the checkout approval workflow
        try:
            # Get the "Document Checkout Approval Workflow"
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT id FROM workflows
                    WHERE name = 'Document Checkout Approval Workflow'
                    AND status = 'active'
                    LIMIT 1
                """)
                workflow = cursor.fetchone()

                if workflow:
                    workflow_engine = WorkflowExecutionEngine()
                    execution_id = await workflow_engine.start_execution(
                        workflow_id=workflow['id'],
                        document_id=request.document_id,
                        initial_data={
                            'checkout_id': str(checkout_id),
                            'checkout_user': user_name,
                            'checkout_reason': request.reason,
                            'checkout_date': checkout_record['checkout_date'].isoformat()
                        }
                    )
                    logger.info(f"Started workflow execution {execution_id} for checkout {checkout_id}")
                else:
                    logger.warning("Checkout approval workflow not found or not active")
        except Exception as e:
            logger.error(f"Error triggering checkout workflow: {e}")
            # Don't fail the checkout if workflow fails

        return dict(checkout_record)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking out document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/checkin", response_model=CheckoutRecord)
async def checkin_document(request: CheckinRequest, req: Request, user_id: Optional[UUID] = None):
    """
    Check in a document (releases lock)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Update checkout record
            cursor.execute("""
                UPDATE document_checkout_records
                SET status = 'checked-in',
                    checkin_date = CURRENT_TIMESTAMP,
                    checkin_notes = %s,
                    version_at_checkin = %s,
                    is_active = false
                WHERE id = %s AND status = 'checked-out'
                RETURNING *
            """, (
                request.checkin_notes,
                request.version_number,
                str(request.checkout_record_id)
            ))

            checkout_record = cursor.fetchone()
            if not checkout_record:
                raise HTTPException(status_code=404, detail="Checkout record not found or already checked in")

            # Release document lock
            cursor.execute("""
                UPDATE document_locks
                SET is_active = false, released_at = CURRENT_TIMESTAMP
                WHERE checkout_record_id = %s AND is_active = true
            """, (str(request.checkout_record_id),))

            # Log audit trail
            cursor.execute("""
                INSERT INTO document_checkout_audit (
                    checkout_record_id, document_id, action_type,
                    performed_by, ip_address
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                str(request.checkout_record_id),
                str(checkout_record['document_id']),
                'checkin',
                str(user_id) if user_id else None,
                req.client.host if req.client else None
            ))

            return dict(checkout_record)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking in document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extend", response_model=CheckoutRecord)
async def extend_checkout(request: ExtendCheckoutRequest, req: Request, user_id: Optional[UUID] = None):
    """
    Extend checkout due date
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE document_checkout_records
                SET due_date = %s,
                    lock_expiry = %s,
                    is_overdue = false
                WHERE id = %s AND status = 'checked-out'
                RETURNING *
            """, (
                request.new_due_date,
                request.new_due_date,
                str(request.checkout_record_id)
            ))

            checkout_record = cursor.fetchone()
            if not checkout_record:
                raise HTTPException(status_code=404, detail="Checkout record not found")

            # Update lock expiry
            cursor.execute("""
                UPDATE document_locks
                SET expires_at = %s
                WHERE checkout_record_id = %s AND is_active = true
            """, (request.new_due_date, str(request.checkout_record_id)))

            # Log audit trail
            cursor.execute("""
                INSERT INTO document_checkout_audit (
                    checkout_record_id, document_id, action_type,
                    performed_by, reason, action_details
                )
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                str(request.checkout_record_id),
                str(checkout_record['document_id']),
                'extend',
                str(user_id) if user_id else None,
                request.reason,
                {'new_due_date': str(request.new_due_date)}
            ))

            return dict(checkout_record)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extending checkout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/force-checkin", response_model=CheckoutRecord)
async def force_checkin(request: ForceCheckinRequest, req: Request, user_id: Optional[UUID] = None):
    """
    Force check-in a document (admin override)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE document_checkout_records
                SET status = 'force-checkin',
                    checkin_date = CURRENT_TIMESTAMP,
                    was_forced = true,
                    is_active = false
                WHERE id = %s AND status = 'checked-out'
                RETURNING *
            """, (str(request.checkout_record_id),))

            checkout_record = cursor.fetchone()
            if not checkout_record:
                raise HTTPException(status_code=404, detail="Checkout record not found")

            # Release lock
            cursor.execute("""
                UPDATE document_locks
                SET is_active = false, released_at = CURRENT_TIMESTAMP
                WHERE checkout_record_id = %s AND is_active = true
            """, (str(request.checkout_record_id),))

            # Log audit trail
            cursor.execute("""
                INSERT INTO document_checkout_audit (
                    checkout_record_id, document_id, action_type,
                    performed_by, reason, action_details
                )
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                str(request.checkout_record_id),
                str(checkout_record['document_id']),
                'force-checkin',
                str(user_id) if user_id else None,
                request.reason,
                {'admin_override': request.admin_override}
            ))

            return dict(checkout_record)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error forcing checkin: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Query Operations
# ==========================================

@router.get("/document/{document_id}/status", response_model=CheckoutStatusResponse)
async def get_checkout_status(document_id: UUID):
    """
    Get checkout status for a specific document
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM document_checkout_records
                WHERE document_id = %s AND status = 'checked-out' AND is_active = true
            """, (str(document_id),))

            checkout = cursor.fetchone()

            if not checkout:
                return CheckoutStatusResponse(
                    is_checked_out=False,
                    can_force_checkin=False
                )

            # Get lock info
            cursor.execute("""
                SELECT * FROM document_locks
                WHERE checkout_record_id = %s AND is_active = true
            """, (str(checkout['id']),))

            lock = cursor.fetchone()

            return CheckoutStatusResponse(
                is_checked_out=True,
                checked_out_by=checkout['user_name'],
                checkout_date=checkout['checkout_date'],
                due_date=checkout['due_date'],
                is_overdue=checkout['is_overdue'],
                can_force_checkin=True,  # TODO: Check user permissions
                lock_info=dict(lock) if lock else None
            )

    except Exception as e:
        logger.error(f"Error getting checkout status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/records", response_model=CheckoutRecordListResponse)
async def list_checkout_records(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    department: Optional[str] = Query(None, description="Filter by department"),
    overdue_only: bool = Query(False, description="Show only overdue checkouts"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    List all checkout records with filtering
    """
    try:
        offset = (page - 1) * page_size
        where_clauses = []
        params = []

        if status_filter:
            where_clauses.append("status = %s")
            params.append(status_filter)

        if department:
            where_clauses.append("user_department = %s")
            params.append(department)

        if overdue_only:
            where_clauses.append("is_overdue = true")

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM document_checkout_records WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            # Get records
            cursor.execute(f"""
                SELECT * FROM document_checkout_records
                WHERE {where_sql}
                ORDER BY checkout_date DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])

            records = cursor.fetchall()
            total_pages = (total + page_size - 1) // page_size

            return CheckoutRecordListResponse(
                records=[dict(r) for r in records],
                total=total,
                page=page,
                page_size=page_size,
                total_pages=total_pages
            )

    except Exception as e:
        logger.error(f"Error listing checkout records: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics", response_model=CheckoutAnalytics)
async def get_checkout_analytics():
    """
    Get checkout analytics and statistics
    """
    try:
        with get_db_cursor() as cursor:
            # Active checkouts
            cursor.execute("SELECT COUNT(*) as count FROM document_checkout_records WHERE status = 'checked-out'")
            active_count = cursor.fetchone()['count']

            # Overdue checkouts
            cursor.execute("SELECT COUNT(*) as count FROM document_checkout_records WHERE is_overdue = true")
            overdue_count = cursor.fetchone()['count']

            # Checked in today
            cursor.execute("""
                SELECT COUNT(*) as count FROM document_checkout_records
                WHERE checkin_date::date = CURRENT_DATE
            """)
            checkin_today = cursor.fetchone()['count']

            # Average duration
            cursor.execute("""
                SELECT AVG(EXTRACT(EPOCH FROM (checkin_date - checkout_date))/3600) as avg_hours
                FROM document_checkout_records
                WHERE checkin_date IS NOT NULL
            """)
            avg_duration = cursor.fetchone()['avg_hours'] or 0

            # By department
            cursor.execute("""
                SELECT user_department, COUNT(*) as count
                FROM document_checkout_records
                WHERE status = 'checked-out'
                GROUP BY user_department
            """)
            dept_counts = {row['user_department']: row['count'] for row in cursor.fetchall()}

            # Most checked out documents
            cursor.execute("""
                SELECT d.id, d.title, COUNT(*) as checkout_count
                FROM document_checkout_records cr
                JOIN documents d ON d.id = cr.document_id
                GROUP BY d.id, d.title
                ORDER BY checkout_count DESC
                LIMIT 10
            """)
            most_checked_out = [dict(row) for row in cursor.fetchall()]

            # Overdue records
            cursor.execute("""
                SELECT * FROM document_checkout_records
                WHERE is_overdue = true
                ORDER BY due_date
                LIMIT 10
            """)
            overdue_records = [dict(row) for row in cursor.fetchall()]

            return CheckoutAnalytics(
                total_active_checkouts=active_count,
                total_overdue=overdue_count,
                total_checked_in_today=checkin_today,
                avg_checkout_duration_hours=float(avg_duration),
                checkouts_by_department=dept_counts,
                most_checked_out_documents=most_checked_out,
                overdue_checkouts=overdue_records
            )

    except Exception as e:
        logger.error(f"Error getting checkout analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/{document_id}", response_model=List[CheckoutAudit])
async def get_checkout_audit_trail(document_id: UUID):
    """
    Get complete audit trail for a document's checkout history
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM document_checkout_audit
                WHERE document_id = %s
                ORDER BY performed_at DESC
            """, (str(document_id),))

            audit_records = cursor.fetchall()
            return [dict(r) for r in audit_records]

    except Exception as e:
        logger.error(f"Error getting checkout audit trail: {e}")
        raise HTTPException(status_code=500, detail=str(e))
