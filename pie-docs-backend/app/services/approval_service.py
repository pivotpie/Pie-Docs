"""
Business logic and validation for the approval system.
Handles workflow progression, routing evaluation, escalation, and permission checks.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from app.database import get_db_cursor

logger = logging.getLogger(__name__)


class ApprovalValidationError(Exception):
    """Raised when approval validation fails"""
    pass


class ApprovalPermissionError(Exception):
    """Raised when user lacks permission for approval action"""
    pass


class ApprovalService:
    """Service class for approval business logic"""

    @staticmethod
    def validate_approval_chain(chain_id: UUID, steps: List[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
        """
        Validate approval chain configuration.
        Ensures step numbers are sequential with no gaps.

        Returns: (is_valid, error_message)
        """
        if not steps:
            return False, "Approval chain must have at least one step"

        # Sort steps by step_number
        sorted_steps = sorted(steps, key=lambda x: x['step_number'])

        # Check for sequential step numbers starting from 1
        expected_step = 1
        for step in sorted_steps:
            if step['step_number'] != expected_step:
                return False, f"Step numbers must be sequential. Expected {expected_step}, got {step['step_number']}"
            expected_step += 1

        # Validate consensus types
        valid_types = ['all', 'any', 'majority', 'weighted', 'unanimous']
        for step in sorted_steps:
            consensus_type = step.get('consensus_type')
            if consensus_type and consensus_type not in valid_types:
                return False, f"Invalid consensus type: {consensus_type}. Must be one of: {', '.join(valid_types)}"

        # Validate approver assignments
        for step in sorted_steps:
            approvers = step.get('approver_ids', []) or step.get('approvers', [])
            if not approvers or len(approvers) == 0:
                return False, f"Step {step['step_number']} must have at least one approver assigned"

        return True, None

    @staticmethod
    def evaluate_routing_conditions(document_metadata: Dict[str, Any], conditions: Dict[str, Any]) -> bool:
        """
        Evaluate routing rule conditions against document metadata.
        Supports: equals, not_equals, contains, greater_than, less_than, in, not_in

        Example conditions:
        {
            "document_type": {"equals": "contract"},
            "value": {"greater_than": 10000},
            "department": {"in": ["legal", "finance"]}
        }
        """
        try:
            for field, condition in conditions.items():
                doc_value = document_metadata.get(field)

                if 'equals' in condition:
                    if doc_value != condition['equals']:
                        return False

                elif 'not_equals' in condition:
                    if doc_value == condition['not_equals']:
                        return False

                elif 'contains' in condition:
                    if not isinstance(doc_value, str) or condition['contains'] not in doc_value:
                        return False

                elif 'greater_than' in condition:
                    if not isinstance(doc_value, (int, float)) or doc_value <= condition['greater_than']:
                        return False

                elif 'less_than' in condition:
                    if not isinstance(doc_value, (int, float)) or doc_value >= condition['less_than']:
                        return False

                elif 'in' in condition:
                    if doc_value not in condition['in']:
                        return False

                elif 'not_in' in condition:
                    if doc_value in condition['not_in']:
                        return False

                elif 'regex' in condition:
                    import re
                    if not isinstance(doc_value, str) or not re.match(condition['regex'], doc_value):
                        return False

            return True
        except Exception as e:
            logger.error(f"Error evaluating routing conditions: {e}")
            return False

    @staticmethod
    def find_matching_approval_chain(document_metadata: Dict[str, Any]) -> Optional[UUID]:
        """
        Find the best matching approval chain for a document based on routing rules.
        Returns chain_id with highest priority that matches, or None if no match.
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT id, conditions, target_chain_id, priority
                    FROM routing_rules
                    WHERE is_active = true
                    ORDER BY priority DESC
                """)

                rules = cursor.fetchall()

                for rule in rules:
                    if ApprovalService.evaluate_routing_conditions(document_metadata, rule['conditions']):
                        return rule['target_chain_id']

                return None
        except Exception as e:
            logger.error(f"Error finding matching approval chain: {e}")
            return None

    @staticmethod
    def check_step_completion(request_id: UUID, step_number: int) -> Tuple[bool, str]:
        """
        Check if a step in the approval workflow is complete.
        Returns: (is_complete, status_reason)
        """
        try:
            with get_db_cursor() as cursor:
                # Get the step configuration
                cursor.execute("""
                    SELECT acs.consensus_type, acs.approver_ids
                    FROM approval_requests ar
                    JOIN approval_chains ac ON ar.chain_id = ac.id
                    JOIN approval_chain_steps acs ON acs.chain_id = ac.id
                    WHERE ar.id = %s AND acs.step_number = %s
                """, (str(request_id), step_number))

                step = cursor.fetchone()
                if not step:
                    return False, "Step not found"

                # Get all actions for this step
                cursor.execute("""
                    SELECT user_id, action, annotations
                    FROM approval_actions
                    WHERE approval_request_id = %s AND step_number = %s
                """, (str(request_id), step_number))

                actions = cursor.fetchall()
                approvals = [a for a in actions if a['action'] == 'approve']
                rejections = [a for a in actions if a['action'] == 'reject']

                # If any rejection, step is rejected
                if rejections:
                    return True, "rejected"

                consensus_type = step['consensus_type']
                required_approvers = step['approver_ids']

                if consensus_type in ['all', 'unanimous']:
                    # All approvers must approve
                    approved_users = {str(a['user_id']) for a in approvals}
                    if set(required_approvers).issubset(approved_users):
                        return True, "approved"
                    return False, f"waiting_for_all ({len(approved_users)}/{len(required_approvers)})"

                elif consensus_type == 'any':
                    # Any single approver is sufficient
                    if approvals:
                        return True, "approved"
                    return False, "waiting_for_any"

                elif consensus_type == 'majority':
                    # More than 50% must approve
                    required_count = (len(required_approvers) // 2) + 1
                    if len(approvals) >= required_count:
                        return True, "approved"
                    return False, f"waiting_for_majority ({len(approvals)}/{required_count})"

                elif consensus_type == 'weighted':
                    # Weighted voting - for now treat as majority
                    # TODO: Implement proper weighted voting with weights stored per approver
                    required_count = (len(required_approvers) // 2) + 1
                    if len(approvals) >= required_count:
                        return True, "approved"
                    return False, f"waiting_for_weighted ({len(approvals)}/{required_count})"

                return False, f"unknown_consensus_type: {consensus_type}"

        except Exception as e:
            logger.error(f"Error checking step completion: {e}")
            return False, f"error: {str(e)}"

    @staticmethod
    def progress_workflow(request_id: UUID) -> Dict[str, Any]:
        """
        Progress the approval workflow to the next step if current step is complete.
        Returns: {"advanced": bool, "new_status": str, "message": str}
        """
        try:
            with get_db_cursor(commit=True) as cursor:
                # Get current request status
                cursor.execute("""
                    SELECT ar.*, ac.id as chain_id
                    FROM approval_requests ar
                    JOIN approval_chains ac ON ar.chain_id = ac.id
                    WHERE ar.id = %s
                """, (str(request_id),))

                request = cursor.fetchone()
                if not request:
                    return {"advanced": False, "new_status": "error", "message": "Request not found"}

                current_step = request.get('current_step', 1)

                # Check if current step is complete
                is_complete, status = ApprovalService.check_step_completion(request_id, current_step)

                if not is_complete:
                    return {"advanced": False, "new_status": request['status'], "message": f"Current step not complete: {status}"}

                if status == "rejected":
                    cursor.execute("""
                        UPDATE approval_requests
                        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (str(request_id),))
                    return {"advanced": True, "new_status": "rejected", "message": "Request rejected"}

                # Get total number of steps
                cursor.execute("""
                    SELECT MAX(step_number) as max_step
                    FROM approval_chain_steps
                    WHERE chain_id = %s
                """, (str(request['chain_id']),))

                result = cursor.fetchone()
                max_step = result['max_step'] if result else 0

                # If this is the last step, mark as approved
                if current_step >= max_step:
                    cursor.execute("""
                        UPDATE approval_requests
                        SET status = 'approved', updated_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (str(request_id),))

                    # Trigger associated action based on metadata type
                    ApprovalService._trigger_approval_action(request_id, request)

                    return {"advanced": True, "new_status": "approved", "message": "All steps complete, request approved"}

                # Move to next step
                next_step = current_step + 1
                cursor.execute("""
                    UPDATE approval_requests
                    SET current_step = %s, status = 'pending', updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (next_step, str(request_id)))

                return {"advanced": True, "new_status": "pending", "message": f"Advanced to step {next_step}"}

        except Exception as e:
            logger.error(f"Error progressing workflow: {e}")
            return {"advanced": False, "new_status": "error", "message": str(e)}

    @staticmethod
    def _trigger_approval_action(request_id: UUID, request: Dict[str, Any]) -> None:
        """
        Trigger the associated action when an approval is completed.
        For example, if approval type is 'document_checkout', perform the actual checkout.
        """
        try:
            metadata = request.get('metadata', {})
            approval_type = metadata.get('type') if isinstance(metadata, dict) else None

            if approval_type == 'document_checkout':
                logger.info(f"Triggering document checkout for approval {request_id}")
                ApprovalService._perform_document_checkout(request_id, request)
            else:
                logger.debug(f"No action trigger needed for approval type: {approval_type}")

        except Exception as e:
            logger.error(f"Error triggering approval action for {request_id}: {e}")
            # Don't raise - approval is already marked as approved, action trigger failure shouldn't block

    @staticmethod
    def _perform_document_checkout(request_id: UUID, request: Dict[str, Any]) -> None:
        """
        Perform the actual document checkout when a document_checkout approval is completed.
        """
        try:
            document_id = request.get('document_id')
            requester_id = request.get('requester_id')
            metadata = request.get('metadata', {})

            if not document_id:
                logger.error(f"Cannot perform checkout: document_id missing in request {request_id}")
                return

            # Get requester information
            with get_db_cursor() as cursor:
                # Get user info if requester_id exists
                user_name = "System User"
                user_dept = None

                if requester_id:
                    cursor.execute("""
                        SELECT username, full_name, email, department
                        FROM users
                        WHERE id = %s
                    """, (str(requester_id),))
                    user = cursor.fetchone()
                    if user:
                        user_name = user.get('full_name') or user.get('username') or user.get('email', 'Unknown User')
                        user_dept = user.get('department')

                # Check if document is already checked out
                cursor.execute("""
                    SELECT id, user_name FROM document_checkout_records
                    WHERE document_id = %s AND status = 'checked-out' AND is_active = true
                """, (str(document_id),))

                existing_checkout = cursor.fetchone()
                if existing_checkout:
                    logger.warning(f"Document {document_id} is already checked out by {existing_checkout['user_name']}")
                    return

            # Create checkout record
            with get_db_cursor(commit=True) as cursor:
                # Calculate lock expiry (7 days default)
                lock_expiry = datetime.now() + timedelta(days=7)

                # Extract reason from metadata
                reason = metadata.get('requester_note', 'Approved checkout request')
                document_name = metadata.get('document_name', 'Unknown Document')

                # Insert checkout record
                cursor.execute("""
                    INSERT INTO document_checkout_records (
                        document_id, user_id, user_name, user_department,
                        status, due_date, lock_expiry, reason, checkout_notes
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    str(document_id),
                    str(requester_id) if requester_id else None,
                    user_name,
                    user_dept,
                    'checked-out',
                    None,  # due_date
                    lock_expiry,
                    reason,
                    f"Auto-checkout via approval request {request_id}"
                ))

                checkout_record = cursor.fetchone()
                checkout_id = checkout_record['id']

                # Create document lock
                locked_by_user = str(requester_id) if requester_id else "00000000-0000-0000-0000-000000000001"

                cursor.execute("""
                    INSERT INTO document_locks (
                        document_id, checkout_record_id, locked_by,
                        lock_type, expires_at
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    str(document_id),
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
                    str(document_id),
                    'checkout',
                    locked_by_user,
                    f"Auto-checkout via approval {request_id}: {reason}",
                    None  # ip_address
                ))

                logger.info(f"Successfully checked out document {document_id} for user {user_name} via approval {request_id}")

        except Exception as e:
            logger.error(f"Error performing document checkout for approval {request_id}: {e}")
            raise

    @staticmethod
    def check_user_permission(user_id: UUID, request_id: UUID, action: str) -> Tuple[bool, Optional[str]]:
        """
        Check if user has permission to perform an action on an approval request.
        Returns: (has_permission, error_message)
        """
        try:
            user_id_str = str(user_id)

            # Admin user bypass - always has full access
            ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001"
            if user_id_str == ADMIN_USER_ID:
                logger.info(f"Admin user {ADMIN_USER_ID} bypassing permission check for action: {action}")
                return True, None

            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT assigned_to, status, requester_id
                    FROM approval_requests
                    WHERE id = %s
                """, (str(request_id),))

                request = cursor.fetchone()
                if not request:
                    return False, "Approval request not found"

                assigned_to = request['assigned_to'] or []

                # Convert all assigned UUIDs to strings for comparison
                assigned_to_str = [str(uid) for uid in assigned_to]

                # Request creator can always view
                if action == 'view' and request['requester_id'] and str(request['requester_id']) == user_id_str:
                    return True, None

                # Check if user is assigned to this request
                if user_id_str not in assigned_to_str:
                    return False, "User not assigned to this approval request"

                # Check request status
                if request['status'] in ['approved', 'rejected', 'cancelled']:
                    return False, f"Cannot {action} - request is already {request['status']}"

                # Specific action checks
                if action in ['approve', 'reject', 'request_changes']:
                    return True, None

                if action == 'escalate':
                    # Only allow escalation if not already escalated
                    if request['status'] == 'escalated':
                        return False, "Request is already escalated"
                    return True, None

                return False, f"Unknown action: {action}"

        except Exception as e:
            logger.error(f"Error checking user permission: {e}")
            return False, f"Error checking permissions: {str(e)}"

    @staticmethod
    def check_escalation_timeouts() -> List[UUID]:
        """
        Check all pending approval requests for escalation timeouts.
        Returns list of request IDs that should be escalated.
        """
        try:
            escalated_ids = []
            with get_db_cursor(commit=True) as cursor:
                # Find requests past their deadline
                cursor.execute("""
                    SELECT id, deadline, escalation_date
                    FROM approval_requests
                    WHERE status = 'pending'
                    AND deadline IS NOT NULL
                    AND deadline < CURRENT_TIMESTAMP
                    AND (escalation_date IS NULL OR escalation_date < deadline)
                """)

                overdue_requests = cursor.fetchall()

                for request in overdue_requests:
                    # Auto-escalate
                    cursor.execute("""
                        UPDATE approval_requests
                        SET status = 'escalated', escalation_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (str(request['id']),))

                    # Create escalation action record
                    cursor.execute("""
                        INSERT INTO approval_actions (approval_request_id, action, comments)
                        VALUES (%s, 'escalate', 'Automatically escalated due to timeout')
                    """, (str(request['id']),))

                    escalated_ids.append(request['id'])
                    logger.info(f"Auto-escalated approval request {request['id']} due to timeout")

                return escalated_ids

        except Exception as e:
            logger.error(f"Error checking escalation timeouts: {e}")
            return []

    @staticmethod
    def validate_bulk_action_permissions(user_id: UUID, approval_ids: List[UUID], action: str) -> Dict[str, List[UUID]]:
        """
        Validate user permissions for bulk approval actions.
        Returns: {"allowed": [ids...], "denied": [ids...]}
        """
        allowed = []
        denied = []

        for approval_id in approval_ids:
            has_permission, error = ApprovalService.check_user_permission(user_id, approval_id, action)
            if has_permission:
                allowed.append(approval_id)
            else:
                denied.append(approval_id)

        return {"allowed": allowed, "denied": denied}

    @staticmethod
    def calculate_approval_metrics(request_id: UUID) -> Dict[str, Any]:
        """
        Calculate metrics for an approval request.
        Returns: completion_percentage, time_elapsed, time_remaining, etc.
        """
        try:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT ar.*, ac.id as chain_id
                    FROM approval_requests ar
                    JOIN approval_chains ac ON ar.chain_id = ac.id
                    WHERE ar.id = %s
                """, (str(request_id),))

                request = cursor.fetchone()
                if not request:
                    return {}

                # Get total steps
                cursor.execute("""
                    SELECT COUNT(*) as total_steps
                    FROM approval_chain_steps
                    WHERE chain_id = %s
                """, (str(request['chain_id']),))

                total_steps = cursor.fetchone()['total_steps']
                current_step = request.get('current_step', 1)

                # Calculate completion percentage
                completion_pct = ((current_step - 1) / total_steps * 100) if total_steps > 0 else 0

                # Calculate time metrics
                created_at = request['created_at']
                deadline = request.get('deadline')
                now = datetime.utcnow()

                time_elapsed = (now - created_at).total_seconds()
                time_remaining = (deadline - now).total_seconds() if deadline else None

                # Get action count
                cursor.execute("""
                    SELECT COUNT(*) as action_count
                    FROM approval_actions
                    WHERE approval_request_id = %s
                """, (str(request_id),))

                action_count = cursor.fetchone()['action_count']

                return {
                    "completion_percentage": round(completion_pct, 2),
                    "current_step": current_step,
                    "total_steps": total_steps,
                    "time_elapsed_seconds": round(time_elapsed, 0),
                    "time_remaining_seconds": round(time_remaining, 0) if time_remaining else None,
                    "is_overdue": deadline and now > deadline,
                    "action_count": action_count,
                    "status": request['status']
                }

        except Exception as e:
            logger.error(f"Error calculating approval metrics: {e}")
            return {}
