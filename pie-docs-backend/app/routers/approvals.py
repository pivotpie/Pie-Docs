"""
Approvals API Router - Approval workflows with chains and requests
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from psycopg2.extras import Json

from app.database import get_db_cursor
from app.models.approvals import (
    ApprovalChain, ApprovalChainCreate, ApprovalChainUpdate,
    ApprovalChainStep, ApprovalChainStepCreate, ApprovalChainStepUpdate,
    ApprovalRequest, ApprovalRequestCreate, ApprovalRequestUpdate, ApprovalRequestListResponse,
    ApprovalAction, ApprovalActionCreate,
    ApprovalStep,
    RoutingRule, RoutingRuleCreate, RoutingRuleUpdate,
    BulkApprovalAction, BulkApprovalResult
)
from app.services.approval_service import (
    ApprovalService,
    ApprovalValidationError,
    ApprovalPermissionError
)
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/approvals", tags=["approvals"])


# ==========================================
# Approval Chains
# ==========================================

@router.get("/chains", response_model=List[ApprovalChain])
async def list_approval_chains(is_active: Optional[bool] = Query(None)):
    """
    List approval chains
    """
    try:
        with get_db_cursor() as cursor:
            if is_active is not None:
                cursor.execute(
                    "SELECT * FROM approval_chains WHERE is_active = %s ORDER BY name",
                    (is_active,)
                )
            else:
                cursor.execute("SELECT * FROM approval_chains ORDER BY name")

            chains = cursor.fetchall()
            return [dict(c) for c in chains]
    except Exception as e:
        logger.error(f"Error listing approval chains: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chains/{chain_id}", response_model=ApprovalChain)
async def get_approval_chain(chain_id: UUID):
    """
    Get approval chain details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM approval_chains WHERE id = %s", (str(chain_id),))
            chain = cursor.fetchone()

            if not chain:
                raise HTTPException(status_code=404, detail="Approval chain not found")

            return dict(chain)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting approval chain: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chains", response_model=ApprovalChain, status_code=status.HTTP_201_CREATED)
async def create_approval_chain(chain: ApprovalChainCreate):
    """
    Create a new approval chain
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO approval_chains (name, description, is_active, document_types, created_by)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
            """, (
                chain.name, chain.description, chain.is_active,
                chain.document_types,
                str(chain.created_by) if hasattr(chain, 'created_by') and chain.created_by else None
            ))

            new_chain = cursor.fetchone()
            return dict(new_chain)
    except Exception as e:
        logger.error(f"Error creating approval chain: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/chains/{chain_id}", response_model=ApprovalChain)
async def update_approval_chain(chain_id: UUID, chain_update: ApprovalChainUpdate):
    """
    Update approval chain
    """
    try:
        update_fields = []
        params = []

        for field, value in chain_update.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(chain_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE approval_chains
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            chain = cursor.fetchone()

            if not chain:
                raise HTTPException(status_code=404, detail="Approval chain not found")

            return dict(chain)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating approval chain: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/chains/{chain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_approval_chain(chain_id: UUID):
    """
    Delete approval chain
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM approval_chains WHERE id = %s RETURNING id", (str(chain_id),))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Approval chain not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting approval chain: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Approval Chain Steps
# ==========================================

@router.get("/chains/{chain_id}/steps", response_model=List[ApprovalChainStep])
async def list_chain_steps(chain_id: UUID):
    """
    List steps in an approval chain
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM approval_chain_steps
                WHERE chain_id = %s
                ORDER BY step_number
            """, (str(chain_id),))

            steps = cursor.fetchall()
            return [dict(s) for s in steps]
    except Exception as e:
        logger.error(f"Error listing chain steps: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chains/{chain_id}/steps", response_model=ApprovalChainStep, status_code=status.HTTP_201_CREATED)
async def create_chain_step(chain_id: UUID, step: ApprovalChainStepCreate):
    """
    Add a step to approval chain
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO approval_chain_steps (
                    chain_id, step_number, name, approver_ids, parallel_approval,
                    consensus_type, timeout_days, escalation_chain, conditions, is_optional
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(chain_id), step.step_number, step.name,
                [str(a) for a in step.approver_ids],
                step.parallel_approval, step.consensus_type, step.timeout_days,
                [str(e) for e in step.escalation_chain],
                step.conditions, step.is_optional
            ))

            new_step = cursor.fetchone()
            return dict(new_step)
    except Exception as e:
        logger.error(f"Error creating chain step: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/chains/steps/{step_id}", response_model=ApprovalChainStep)
async def update_chain_step(step_id: UUID, step_update: ApprovalChainStepUpdate):
    """
    Update chain step
    """
    try:
        update_fields = []
        params = []

        for field, value in step_update.dict(exclude_unset=True).items():
            if field == "approver_ids" or field == "escalation_chain":
                update_fields.append(f"{field} = %s")
                params.append([str(v) for v in value] if value else [])
            else:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(step_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE approval_chain_steps
                SET {", ".join(update_fields)}
                WHERE id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            step = cursor.fetchone()

            if not step:
                raise HTTPException(status_code=404, detail="Chain step not found")

            return dict(step)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating chain step: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/chains/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chain_step(step_id: UUID):
    """
    Delete chain step
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM approval_chain_steps WHERE id = %s RETURNING id", (str(step_id),))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Chain step not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chain step: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chains/{chain_id}/validate", status_code=status.HTTP_200_OK)
async def validate_approval_chain(chain_id: UUID):
    """
    Validate approval chain configuration
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM approval_chain_steps
                WHERE chain_id = %s
                ORDER BY step_number
            """, (str(chain_id),))

            steps = cursor.fetchall()
            steps_list = [dict(s) for s in steps]

            is_valid, error_msg = ApprovalService.validate_approval_chain(chain_id, steps_list)

            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)

            return {"valid": True, "message": "Approval chain is valid"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating approval chain: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Approval Requests
# ==========================================

@router.get("/requests", response_model=ApprovalRequestListResponse)
async def list_approval_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    document_id: Optional[UUID] = Query(None),
):
    """
    List approval requests
    """
    try:
        # Validate status parameter
        valid_statuses = ['pending', 'in_progress', 'approved', 'rejected', 'changes_requested', 'escalated']
        if status and status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        offset = (page - 1) * page_size
        where_clauses = []
        params = []

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if document_id:
            where_clauses.append("document_id = %s")
            params.append(str(document_id))

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) as total FROM approval_requests WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            query = f"""
                SELECT * FROM approval_requests
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query, params + [page_size, offset])
            requests = cursor.fetchall()

            total_pages = (total + page_size - 1) // page_size

            return {
                "requests": [dict(r) for r in requests],
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
    except Exception as e:
        logger.error(f"Error listing approval requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/requests/{request_id}", response_model=ApprovalRequest)
async def get_approval_request(request_id: UUID):
    """
    Get approval request details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM approval_requests WHERE id = %s", (str(request_id),))
            request = cursor.fetchone()

            if not request:
                raise HTTPException(status_code=404, detail="Approval request not found")

            return dict(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting approval request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests", response_model=ApprovalRequest, status_code=status.HTTP_201_CREATED)
async def create_approval_request(request: ApprovalRequestCreate):
    """
    Create a new approval request
    """
    try:
        logger.info(f"=== CREATE APPROVAL REQUEST START ===")
        logger.info(f"Request data: document_id={request.document_id}, chain_id={request.chain_id}, priority={request.priority}")
        logger.info(f"Metadata: {request.metadata}")
        logger.info(f"Request message: {request.request_message}")

        with get_db_cursor(commit=True) as cursor:
            # Get approvers from first step of the chain if chain_id is provided
            assigned_to = request.assigned_to if request.assigned_to else []
            total_steps = 0

            if request.chain_id and not assigned_to:
                logger.info(f"Fetching chain steps for chain_id={request.chain_id}")
                # Get chain steps
                cursor.execute("""
                    SELECT * FROM approval_chain_steps
                    WHERE chain_id = %s
                    ORDER BY step_number
                """, (str(request.chain_id),))

                steps = cursor.fetchall()
                total_steps = len(steps)
                logger.info(f"Found {total_steps} steps in approval chain")

                if not steps:
                    logger.error(f"No steps found for chain_id={request.chain_id}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Approval chain {request.chain_id} has no steps configured. Please configure the approval chain first."
                    )

                if steps:
                    # Get approvers from first step
                    first_step = steps[0]
                    assigned_to = first_step['approver_ids'] if first_step['approver_ids'] else []
                    logger.info(f"First step approvers: {assigned_to}")

                    if not assigned_to:
                        logger.error(f"No approvers in first step of chain_id={request.chain_id}")
                        raise HTTPException(
                            status_code=400,
                            detail=f"First step of approval chain has no approvers assigned. Please configure approvers for the chain."
                        )

            logger.info(f"Preparing to insert approval request with assigned_to={assigned_to}, total_steps={total_steps}")

            # Prepare metadata for JSONB insertion
            metadata_value = Json(request.metadata) if request.metadata else None
            logger.info(f"Metadata type: {type(request.metadata)}, Json-wrapped: {metadata_value}")

            cursor.execute("""
                INSERT INTO approval_requests (
                    document_id, chain_id, requester_id, request_message, priority,
                    parallel_approval_required, consensus_type, assigned_to, deadline,
                    metadata, workflow_id, requires_all_approvers, due_date, total_steps
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::uuid[], %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                str(request.document_id),
                str(request.chain_id) if request.chain_id else None,
                str(request.requester_id) if hasattr(request, 'requester_id') and request.requester_id else None,
                request.request_message, request.priority,
                request.parallel_approval_required, request.consensus_type,
                [str(a) for a in assigned_to],
                request.deadline, metadata_value,
                str(request.workflow_id) if request.workflow_id else None,
                request.requires_all_approvers, request.due_date, total_steps
            ))

            new_request = cursor.fetchone()
            logger.info(f"Successfully created approval request with ID: {new_request['id']}")
            logger.info(f"=== CREATE APPROVAL REQUEST SUCCESS ===")
            return dict(new_request)
    except HTTPException as he:
        logger.error(f"HTTP Exception in create_approval_request: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"=== CREATE APPROVAL REQUEST FAILED ===")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Full error:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create approval request: {str(e)}")


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_approval_request(request_id: UUID):
    """
    Cancel an approval request
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE approval_requests
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND status = 'pending'
                RETURNING id
            """, (str(request_id),))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Approval request not found or already completed")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling approval request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/{request_id}/approve", response_model=ApprovalAction, status_code=status.HTTP_201_CREATED)
async def approve_request(request_id: UUID, action: ApprovalActionCreate):
    """
    Approve a request with permission checks and workflow progression
    """
    try:
        # Check user permission
        user_id = action.user_id if hasattr(action, 'user_id') and action.user_id else None
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        has_permission, error_msg = ApprovalService.check_user_permission(user_id, request_id, 'approve')
        if not has_permission:
            raise HTTPException(status_code=403, detail=error_msg)

        with get_db_cursor(commit=True) as cursor:
            # Get current step
            cursor.execute("""
                SELECT current_step FROM approval_requests WHERE id = %s
            """, (str(request_id),))
            request = cursor.fetchone()
            current_step = request['current_step'] if request else 1

            # Record approval action
            cursor.execute("""
                INSERT INTO approval_actions (approval_request_id, user_id, action, comments, annotations, step_number)
                VALUES (%s, %s, 'approve', %s, %s, %s)
                RETURNING *
            """, (
                str(request_id),
                str(user_id),
                action.comments, Json(action.annotations) if action.annotations else None, current_step
            ))

            new_action = cursor.fetchone()

        # Progress workflow if step is complete
        progress_result = ApprovalService.progress_workflow(request_id)
        logger.info(f"Workflow progression for {request_id}: {progress_result}")

        # Send notifications
        with get_db_cursor() as cursor:
            # Get request details for notification
            cursor.execute("""
                SELECT ar.*, d.title as document_title, u.id as requester_id
                FROM approval_requests ar
                LEFT JOIN documents d ON ar.document_id = d.id
                LEFT JOIN users u ON ar.requester_id = u.id
                WHERE ar.id = %s
            """, (str(request_id),))
            req_data = cursor.fetchone()

            if req_data:
                # Notify requester of approval
                if req_data.get('requester_id'):
                    await notification_service.notify_approval_decision(
                        user_ids=[str(req_data['requester_id'])],
                        approval_request_id=str(request_id),
                        document_title=req_data.get('document_title', 'Unknown Document'),
                        decision='approved',
                        decided_by=str(user_id),
                        comments=action.comments
                    )

                # If workflow advanced, notify new approvers
                if progress_result.get('advanced') and progress_result.get('new_status') == 'pending':
                    assigned_to = req_data.get('assigned_to', [])
                    if assigned_to:
                        await notification_service.notify_workflow_advanced(
                            user_ids=assigned_to,
                            approval_request_id=str(request_id),
                            document_title=req_data.get('document_title', 'Unknown Document'),
                            current_step=req_data.get('current_step', 1),
                            total_steps=3,  # This should come from chain data
                            new_approvers=assigned_to
                        )

        # Convert to dict and ensure annotations is never None
        action_dict = dict(new_action)
        if action_dict.get('annotations') is None:
            action_dict['annotations'] = {}
        return action_dict

    except HTTPException:
        raise
    except ApprovalPermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error approving request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/{request_id}/reject", response_model=ApprovalAction, status_code=status.HTTP_201_CREATED)
async def reject_request(request_id: UUID, action: ApprovalActionCreate):
    """
    Reject a request with permission checks - comments are REQUIRED
    """
    try:
        # Check user permission
        user_id = action.user_id if hasattr(action, 'user_id') and action.user_id else None
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        # Validate comments are provided for rejection
        if not action.comments or len(action.comments.strip()) == 0:
            raise HTTPException(status_code=400, detail="Comments are required when rejecting a request")

        # Validate comments length
        if len(action.comments) > 5000:
            raise HTTPException(status_code=400, detail="Comments must not exceed 5000 characters")

        has_permission, error_msg = ApprovalService.check_user_permission(user_id, request_id, 'reject')
        if not has_permission:
            raise HTTPException(status_code=403, detail=error_msg)

        with get_db_cursor(commit=True) as cursor:
            # Get current step
            cursor.execute("""
                SELECT current_step FROM approval_requests WHERE id = %s
            """, (str(request_id),))
            request = cursor.fetchone()
            current_step = request['current_step'] if request else 1

            cursor.execute("""
                INSERT INTO approval_actions (approval_request_id, user_id, action, comments, annotations, step_number)
                VALUES (%s, %s, 'reject', %s, %s, %s)
                RETURNING *
            """, (
                str(request_id),
                str(user_id),
                action.comments, Json(action.annotations) if action.annotations else None, current_step
            ))

            # Fetch the inserted action immediately
            new_action = cursor.fetchone()

            # Update request status
            cursor.execute("""
                UPDATE approval_requests
                SET status = 'rejected', updated_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (str(request_id),))

        # Send notifications (non-blocking - errors won't fail the request)
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT ar.*, d.title as document_title, u.id as requester_id
                    FROM approval_requests ar
                    LEFT JOIN documents d ON ar.document_id = d.id
                    LEFT JOIN users u ON ar.requester_id = u.id
                    WHERE ar.id = %s
                """, (str(request_id),))
                req_data = cursor.fetchone()

                if req_data and req_data.get('requester_id'):
                    await notification_service.notify_approval_decision(
                        user_ids=[str(req_data['requester_id'])],
                        approval_request_id=str(request_id),
                        document_title=req_data.get('document_title', 'Unknown Document'),
                        decision='rejected',
                        decided_by=str(user_id),
                        comments=action.comments
                    )
        except Exception as notif_error:
            logger.warning(f"Failed to send rejection notification: {notif_error}")

        # Convert to dict and ensure annotations is never None
        action_dict = dict(new_action)
        if action_dict.get('annotations') is None:
            action_dict['annotations'] = {}
        return action_dict

    except HTTPException:
        raise
    except ApprovalPermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error rejecting request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/{request_id}/delegate", status_code=status.HTTP_200_OK)
async def delegate_request(request_id: UUID, new_approver_id: UUID):
    """
    Delegate approval to another user
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE approval_requests
                SET assigned_to = ARRAY[%s]::uuid[], updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND status = 'pending'
                RETURNING id
            """, (str(new_approver_id), str(request_id)))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Approval request not found")

            return {"success": True, "message": "Request delegated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error delegating request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/requests/{request_id}/history", response_model=List[ApprovalAction])
async def get_request_history(request_id: UUID):
    """
    Get approval request action history
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM approval_actions
                WHERE approval_request_id = %s
                ORDER BY created_at ASC
            """, (str(request_id),))

            actions = cursor.fetchall()
            # Ensure annotations is never None for any action
            result = []
            for action in actions:
                action_dict = dict(action)
                if action_dict.get('annotations') is None:
                    action_dict['annotations'] = {}
                result.append(action_dict)
            return result
    except Exception as e:
        logger.error(f"Error getting request history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/{request_id}/request-changes", response_model=ApprovalAction, status_code=status.HTTP_201_CREATED)
async def request_changes(request_id: UUID, action: ApprovalActionCreate):
    """
    Request changes on an approval request with permission checks - comments are REQUIRED
    """
    try:
        # Check user permission
        user_id = action.user_id if hasattr(action, 'user_id') and action.user_id else None
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        # Validate comments are provided for requesting changes
        if not action.comments or len(action.comments.strip()) == 0:
            raise HTTPException(status_code=400, detail="Comments are required when requesting changes")

        # Validate comments length
        if len(action.comments) > 5000:
            raise HTTPException(status_code=400, detail="Comments must not exceed 5000 characters")

        has_permission, error_msg = ApprovalService.check_user_permission(user_id, request_id, 'request_changes')
        if not has_permission:
            raise HTTPException(status_code=403, detail=error_msg)

        with get_db_cursor(commit=True) as cursor:
            # Get current step
            cursor.execute("""
                SELECT current_step FROM approval_requests WHERE id = %s
            """, (str(request_id),))
            request = cursor.fetchone()
            current_step = request['current_step'] if request else 1

            cursor.execute("""
                INSERT INTO approval_actions (approval_request_id, user_id, action, comments, annotations, step_number)
                VALUES (%s, %s, 'request_changes', %s, %s, %s)
                RETURNING *
            """, (
                str(request_id),
                str(user_id),
                action.comments, Json(action.annotations) if action.annotations else None, current_step
            ))

            # Fetch the inserted action immediately
            new_action = cursor.fetchone()

            # Update request status
            cursor.execute("""
                UPDATE approval_requests
                SET status = 'changes_requested', updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (str(request_id),))

        # Send notifications
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT ar.*, d.title as document_title, u.id as requester_id
                FROM approval_requests ar
                LEFT JOIN documents d ON ar.document_id = d.id
                LEFT JOIN users u ON ar.requester_id = u.id
                WHERE ar.id = %s
            """, (str(request_id),))
            req_data = cursor.fetchone()

            if req_data and req_data.get('requester_id'):
                await notification_service.notify_changes_requested(
                    user_ids=[str(req_data['requester_id'])],
                    approval_request_id=str(request_id),
                    document_title=req_data.get('document_title', 'Unknown Document'),
                    requested_by=str(user_id),
                    comments=action.comments or 'No comments provided'
                )

        # Convert to dict and ensure annotations is never None
        action_dict = dict(new_action)
        if action_dict.get('annotations') is None:
            action_dict['annotations'] = {}
        return action_dict

    except HTTPException:
        raise
    except ApprovalPermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error requesting changes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/{request_id}/escalate", response_model=ApprovalAction, status_code=status.HTTP_201_CREATED)
async def escalate_request(request_id: UUID, action: ApprovalActionCreate):
    """
    Manually escalate an approval request with permission checks
    """
    try:
        # Check user permission
        user_id = action.user_id if hasattr(action, 'user_id') and action.user_id else None
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        has_permission, error_msg = ApprovalService.check_user_permission(user_id, request_id, 'escalate')
        if not has_permission:
            raise HTTPException(status_code=403, detail=error_msg)

        with get_db_cursor(commit=True) as cursor:
            # Get current step
            cursor.execute("""
                SELECT current_step FROM approval_requests WHERE id = %s
            """, (str(request_id),))
            request = cursor.fetchone()
            current_step = request['current_step'] if request else 1

            cursor.execute("""
                INSERT INTO approval_actions (approval_request_id, user_id, action, comments, annotations, step_number)
                VALUES (%s, %s, 'escalate', %s, %s, %s)
                RETURNING *
            """, (
                str(request_id),
                str(user_id),
                action.comments, Json(action.annotations) if action.annotations else None, current_step
            ))

            # Fetch the inserted action immediately
            new_action = cursor.fetchone()

            # Update request status
            cursor.execute("""
                UPDATE approval_requests
                SET status = 'escalated', updated_at = CURRENT_TIMESTAMP, escalation_date = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (str(request_id),))

        # Send notifications
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT ar.*, d.title as document_title, u.id as requester_id
                FROM approval_requests ar
                LEFT JOIN documents d ON ar.document_id = d.id
                LEFT JOIN users u ON ar.requester_id = u.id
                WHERE ar.id = %s
            """, (str(request_id),))
            req_data = cursor.fetchone()

            if req_data:
                # Notify assigned approvers of escalation
                assigned_to = req_data.get('assigned_to', [])
                if assigned_to:
                    await notification_service.notify_escalation(
                        user_ids=assigned_to,
                        approval_request_id=str(request_id),
                        document_title=req_data.get('document_title', 'Unknown Document'),
                        reason=action.comments or 'Manual escalation',
                        escalated_by=str(user_id)
                    )

        # Convert to dict and ensure annotations is never None
        action_dict = dict(new_action)
        if action_dict.get('annotations') is None:
            action_dict['annotations'] = {}
        return action_dict

    except HTTPException:
        raise
    except ApprovalPermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error escalating request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/pending")
async def get_user_pending_approvals(user_id: UUID):
    """
    Get all pending approval requests assigned to a user with enriched data
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    ar.*,
                    d.title as document_title,
                    d.document_type,
                    u.full_name as requester_name,
                    u.email as requester_email
                FROM approval_requests ar
                LEFT JOIN documents d ON ar.document_id = d.id
                LEFT JOIN users u ON ar.requester_id = u.id
                WHERE ar.status = 'pending' AND %s = ANY(ar.assigned_to)
                ORDER BY
                    CASE ar.priority
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END,
                    ar.deadline ASC NULLS LAST,
                    ar.created_at ASC
            """, (str(user_id),))

            requests = cursor.fetchall()

            # Transform to frontend-expected format
            enriched_requests = []
            for r in requests:
                enriched = {
                    "id": str(r['id']),
                    "documentId": str(r['document_id']),
                    "documentTitle": r['document_title'] or "Untitled Document",
                    "documentType": r['document_type'] or "unknown",
                    "documentUrl": f"/documents/{r['document_id']}",
                    "requester": {
                        "id": str(r['requester_id']) if r['requester_id'] else None,
                        "name": r['requester_name'] or "Unknown User",
                        "email": r['requester_email'] or "unknown@piedocs.com"
                    },
                    "currentStep": r['current_step'],
                    "totalSteps": r['total_steps'],
                    "chainId": str(r['chain_id']) if r['chain_id'] else None,
                    "priority": r['priority'],
                    "deadline": r['deadline'].isoformat() if r['deadline'] else None,
                    "escalationDate": r['escalation_date'].isoformat() if r.get('escalation_date') else None,
                    "status": r['status'],
                    "assignedTo": [str(uid) for uid in r['assigned_to']] if r['assigned_to'] else [],
                    "parallelApprovalRequired": r['parallel_approval_required'],
                    "consensusType": r['consensus_type'],
                    "metadata": r['metadata'] or {},
                    "createdAt": r['created_at'].isoformat() if r['created_at'] else None,
                    "updatedAt": r['updated_at'].isoformat() if r['updated_at'] else None
                }
                enriched_requests.append(enriched)

            return enriched_requests
    except Exception as e:
        logger.error(f"Error getting user pending approvals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/requests/{request_id}/metrics")
async def get_approval_metrics(request_id: UUID):
    """
    Get detailed metrics for an approval request
    """
    try:
        metrics = ApprovalService.calculate_approval_metrics(request_id)
        if not metrics:
            raise HTTPException(status_code=404, detail="Approval request not found")
        return metrics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting approval metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/auto-route")
async def auto_route_request(document_metadata: Dict[str, Any]):
    """
    Find matching approval chain for a document based on routing rules
    """
    try:
        chain_id = ApprovalService.find_matching_approval_chain(document_metadata)

        if chain_id:
            with get_db_cursor() as cursor:
                cursor.execute("SELECT * FROM approval_chains WHERE id = %s", (str(chain_id),))
                chain = cursor.fetchone()
                return {
                    "matched": True,
                    "chain_id": str(chain_id),
                    "chain": dict(chain) if chain else None
                }
        else:
            return {
                "matched": False,
                "chain_id": None,
                "chain": None,
                "message": "No matching routing rule found"
            }
    except Exception as e:
        logger.error(f"Error auto-routing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escalation/check-timeouts")
async def check_escalation_timeouts():
    """
    Check and escalate requests that have passed their deadline
    """
    try:
        escalated_ids = ApprovalService.check_escalation_timeouts()
        return {
            "escalated_count": len(escalated_ids),
            "escalated_requests": [str(id) for id in escalated_ids]
        }
    except Exception as e:
        logger.error(f"Error checking escalation timeouts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Routing Rules
# ==========================================

@router.get("/routing-rules", response_model=List[RoutingRule])
async def list_routing_rules(is_active: Optional[bool] = Query(None)):
    """
    List routing rules
    """
    try:
        with get_db_cursor() as cursor:
            if is_active is not None:
                cursor.execute(
                    "SELECT * FROM routing_rules WHERE is_active = %s ORDER BY priority DESC, name",
                    (is_active,)
                )
            else:
                cursor.execute("SELECT * FROM routing_rules ORDER BY priority DESC, name")

            rules = cursor.fetchall()
            return [dict(r) for r in rules]
    except Exception as e:
        logger.error(f"Error listing routing rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/routing-rules/{rule_id}", response_model=RoutingRule)
async def get_routing_rule(rule_id: UUID):
    """
    Get routing rule details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM routing_rules WHERE id = %s", (str(rule_id),))
            rule = cursor.fetchone()

            if not rule:
                raise HTTPException(status_code=404, detail="Routing rule not found")

            return dict(rule)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting routing rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/routing-rules", response_model=RoutingRule, status_code=status.HTTP_201_CREATED)
async def create_routing_rule(rule: RoutingRuleCreate):
    """
    Create a new routing rule
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO routing_rules (name, description, conditions, target_chain_id, priority, is_active)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                rule.name, rule.description, rule.conditions,
                str(rule.target_chain_id), rule.priority, rule.is_active
            ))

            new_rule = cursor.fetchone()
            return dict(new_rule)
    except Exception as e:
        logger.error(f"Error creating routing rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/routing-rules/{rule_id}", response_model=RoutingRule)
async def update_routing_rule(rule_id: UUID, rule_update: RoutingRuleUpdate):
    """
    Update routing rule
    """
    try:
        update_fields = []
        params = []

        for field, value in rule_update.dict(exclude_unset=True).items():
            if field == "target_chain_id":
                update_fields.append(f"{field} = %s")
                params.append(str(value))
            else:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(rule_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE routing_rules
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """
            cursor.execute(query, params)
            rule = cursor.fetchone()

            if not rule:
                raise HTTPException(status_code=404, detail="Routing rule not found")

            return dict(rule)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating routing rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/routing-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_routing_rule(rule_id: UUID):
    """
    Delete routing rule
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM routing_rules WHERE id = %s RETURNING id", (str(rule_id),))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Routing rule not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting routing rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Bulk Operations
# ==========================================

@router.post("/requests/bulk-action", response_model=BulkApprovalResult)
async def bulk_approval_action(bulk_action: BulkApprovalAction):
    """
    Perform bulk approval actions with permission validation
    """
    # Validate input
    if not bulk_action.approval_ids or len(bulk_action.approval_ids) == 0:
        raise HTTPException(status_code=400, detail="No approval IDs provided")

    if bulk_action.action not in ['approve', 'reject', 'request_changes']:
        raise HTTPException(status_code=400, detail="Invalid action type")

    succeeded = []
    failed = []

    try:
        # Validate permissions for all requests first
        permissions = ApprovalService.validate_bulk_action_permissions(
            bulk_action.user_id,
            bulk_action.approval_ids,
            bulk_action.action
        )

        # Add denied requests to failed list
        for denied_id in permissions['denied']:
            failed.append({
                "id": str(denied_id),
                "error": "Permission denied or request not eligible"
            })

        # Process allowed requests
        with get_db_cursor(commit=True) as cursor:
            for approval_id in permissions['allowed']:
                try:
                    # Get current step
                    cursor.execute("""
                        SELECT current_step FROM approval_requests WHERE id = %s
                    """, (str(approval_id),))
                    request = cursor.fetchone()
                    current_step = request['current_step'] if request else 1

                    # Insert action
                    cursor.execute("""
                        INSERT INTO approval_actions (approval_request_id, user_id, action, comments, annotations, step_number)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        str(approval_id),
                        str(bulk_action.user_id),
                        bulk_action.action,
                        bulk_action.comments,
                        Json({}),
                        current_step
                    ))

                    # Update request status based on action
                    new_status = {
                        'approve': 'pending',  # Will be updated by workflow progression
                        'reject': 'rejected',
                        'request_changes': 'changes_requested'
                    }.get(bulk_action.action, 'pending')

                    cursor.execute("""
                        UPDATE approval_requests
                        SET status = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (new_status, str(approval_id)))

                    succeeded.append(approval_id)

                    # Progress workflow for approve actions
                    if bulk_action.action == 'approve':
                        progress_result = ApprovalService.progress_workflow(approval_id)
                        logger.info(f"Bulk workflow progression for {approval_id}: {progress_result}")

                except Exception as item_error:
                    failed.append({
                        "id": str(approval_id),
                        "error": str(item_error)
                    })
                    logger.error(f"Error processing approval {approval_id}: {item_error}")

        return BulkApprovalResult(
            succeeded=succeeded,
            failed=failed,
            total=len(bulk_action.approval_ids),
            success_count=len(succeeded),
            failure_count=len(failed)
        )
    except Exception as e:
        logger.error(f"Error performing bulk approval action: {e}")
        raise HTTPException(status_code=500, detail=str(e))
