"""
Workflow Execution Engine
Handles the execution of workflows and their steps
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from uuid import UUID
import logging
from datetime import datetime, timedelta
import json

from app.database import get_db_cursor

logger = logging.getLogger(__name__)


# ============================================================================
# Step Handler Interface
# ============================================================================

class StepHandler(ABC):
    """Abstract base class for workflow step handlers"""

    @abstractmethod
    async def execute(
        self,
        step_data: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a workflow step

        Args:
            step_data: The workflow element data (type, position, data)
            execution_context: Current execution state and context

        Returns:
            Dict containing:
                - success: bool
                - next_step_id: str (ID of next step to execute)
                - data: Any additional data to store
                - message: str (status message)
        """
        pass

    @abstractmethod
    def can_handle(self, step_type: str) -> bool:
        """Check if this handler can handle the given step type"""
        pass


# ============================================================================
# Concrete Step Handlers
# ============================================================================

class ApprovalStepHandler(StepHandler):
    """Handler for approval workflow steps"""

    def can_handle(self, step_type: str) -> bool:
        # Handle both legacy and new types
        return step_type in ['approval', 'flow-approval']

    async def execute(
        self,
        step_data: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute an approval step by creating an approval request
        """
        try:
            workflow_id = execution_context.get('workflow_id')
            document_id = execution_context.get('document_id')
            execution_id = execution_context.get('execution_id')

            # Extract approval configuration
            config = step_data.get('data', {}).get('config', {})
            approvers = config.get('approvers', [])
            timeout_days = config.get('timeout_days', 3)
            requires_all = config.get('requires_all_approvers', False)

            if not approvers:
                logger.warning(f"Approval step has no approvers configured: {step_data.get('id')}")
                return {
                    'success': False,
                    'message': 'No approvers configured for this step',
                    'data': {}
                }

            # Create approval request
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO approval_requests
                        (document_id, workflow_id, assigned_to, requires_all_approvers,
                         deadline, request_message, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        str(document_id) if document_id else None,
                        str(workflow_id),
                        approvers,  # Array of user IDs
                        requires_all,
                        datetime.utcnow() + timedelta(days=timeout_days),
                        step_data.get('data', {}).get('title', 'Workflow Approval Required'),
                        'pending'
                    )
                )
                approval_id = cursor.fetchone()['id']

            logger.info(f"Created approval request {approval_id} for workflow execution {execution_id}")

            return {
                'success': True,
                'message': f'Approval request created: {approval_id}',
                'data': {
                    'approval_id': str(approval_id),
                    'approvers': approvers,
                    'deadline': (datetime.utcnow() + timedelta(days=timeout_days)).isoformat()
                },
                'waiting': True  # Indicates this step is waiting for external action
            }

        except Exception as e:
            logger.error(f"Error executing approval step: {e}")
            return {
                'success': False,
                'message': f'Failed to create approval request: {str(e)}',
                'data': {}
            }


class ReviewStepHandler(StepHandler):
    """Handler for review workflow steps"""

    def can_handle(self, step_type: str) -> bool:
        # Handle both legacy and new types
        return step_type in ['review', 'action-review']

    async def execute(
        self,
        step_data: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a review step by creating a task
        """
        try:
            workflow_id = execution_context.get('workflow_id')
            document_id = execution_context.get('document_id')
            execution_id = execution_context.get('execution_id')

            # Extract review configuration
            config = step_data.get('data', {}).get('config', {})
            reviewers = config.get('reviewers', [])
            deadline_days = config.get('deadline_days', 5)

            if not reviewers:
                logger.warning(f"Review step has no reviewers configured: {step_data.get('id')}")

            # Create review task
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO tasks
                        (title, description, assignee_id, document_id, workflow_id,
                         workflow_step_id, deadline, status, priority)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        step_data.get('data', {}).get('title', 'Document Review Required'),
                        step_data.get('data', {}).get('description', 'Please review this document'),
                        reviewers[0] if reviewers else None,  # Assign to first reviewer
                        str(document_id) if document_id else None,
                        str(workflow_id),
                        step_data.get('id'),
                        datetime.utcnow() + timedelta(days=deadline_days),
                        'pending',
                        config.get('priority', 'medium')
                    )
                )
                task_id = cursor.fetchone()['id']

            logger.info(f"Created review task {task_id} for workflow execution {execution_id}")

            return {
                'success': True,
                'message': f'Review task created: {task_id}',
                'data': {
                    'task_id': str(task_id),
                    'reviewers': reviewers
                },
                'waiting': True  # Waiting for task completion
            }

        except Exception as e:
            logger.error(f"Error executing review step: {e}")
            return {
                'success': False,
                'message': f'Failed to create review task: {str(e)}',
                'data': {}
            }


class NotificationStepHandler(StepHandler):
    """Handler for notification workflow steps"""

    def can_handle(self, step_type: str) -> bool:
        # Handle both legacy and new types
        return step_type in ['notification', 'action-notification', 'action-email']

    async def execute(
        self,
        step_data: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a notification step by sending notifications
        """
        try:
            workflow_id = execution_context.get('workflow_id')
            document_id = execution_context.get('document_id')

            # Extract notification configuration
            config = step_data.get('data', {}).get('config', {})
            recipients = config.get('recipients', [])
            notification_type = config.get('type', 'info')

            if not recipients:
                logger.warning(f"Notification step has no recipients: {step_data.get('id')}")
                return {
                    'success': True,
                    'message': 'No recipients to notify',
                    'data': {}
                }

            # Create notifications
            notification_ids = []
            with get_db_cursor(commit=True) as cursor:
                for recipient_id in recipients:
                    cursor.execute(
                        """
                        INSERT INTO notifications
                            (user_id, title, message, notification_type,
                             related_document_id, is_read)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (
                            recipient_id,
                            step_data.get('data', {}).get('title', 'Workflow Notification'),
                            step_data.get('data', {}).get('description', 'A workflow step has been completed'),
                            notification_type,
                            str(document_id) if document_id else None,
                            False
                        )
                    )
                    notification_ids.append(str(cursor.fetchone()['id']))

            logger.info(f"Created {len(notification_ids)} notifications for workflow step")

            return {
                'success': True,
                'message': f'Sent {len(notification_ids)} notifications',
                'data': {
                    'notification_ids': notification_ids,
                    'recipients': recipients
                }
            }

        except Exception as e:
            logger.error(f"Error executing notification step: {e}")
            return {
                'success': False,
                'message': f'Failed to send notifications: {str(e)}',
                'data': {}
            }


class DecisionStepHandler(StepHandler):
    """Handler for decision workflow steps"""

    def can_handle(self, step_type: str) -> bool:
        # Handle both legacy and new types
        return step_type in ['decision', 'logic-if', 'logic-switch', 'logic-filter']

    async def execute(
        self,
        step_data: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a decision step by evaluating conditions
        """
        try:
            # Extract decision configuration
            config = step_data.get('data', {}).get('config', {})
            condition = config.get('condition', '')
            execution_data = execution_context.get('execution_data', {})

            # Simple condition evaluation (can be enhanced with expression parser)
            # For now, check if a key exists in execution data
            result = self._evaluate_condition(condition, execution_data)

            logger.info(f"Decision step evaluated: {condition} = {result}")

            return {
                'success': True,
                'message': f'Condition evaluated: {result}',
                'data': {
                    'condition': condition,
                    'result': result
                },
                'decision_result': result  # Can be used for routing
            }

        except Exception as e:
            logger.error(f"Error executing decision step: {e}")
            return {
                'success': False,
                'message': f'Failed to evaluate decision: {str(e)}',
                'data': {}
            }

    def _evaluate_condition(self, condition: str, data: Dict[str, Any]) -> bool:
        """
        Simple condition evaluator
        TODO: Implement proper expression parser for complex conditions
        """
        if not condition:
            return True

        # Simple key existence check
        if condition.startswith('has:'):
            key = condition.replace('has:', '').strip()
            return key in data

        # Simple equality check
        if '==' in condition:
            key, value = condition.split('==')
            key = key.strip()
            value = value.strip().strip('"\'')
            return str(data.get(key)) == value

        # Default to True if we can't evaluate
        logger.warning(f"Could not evaluate condition: {condition}")
        return True


class TimerStepHandler(StepHandler):
    """Handler for timer workflow steps"""

    def can_handle(self, step_type: str) -> bool:
        # Handle both legacy and new types
        return step_type in ['timer', 'flow-delay', 'flow-timer']

    async def execute(
        self,
        step_data: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a timer step by scheduling a delay
        """
        try:
            # Extract timer configuration
            config = step_data.get('data', {}).get('config', {})
            delay_hours = config.get('delay_hours', 0)
            delay_minutes = config.get('delay_minutes', 0)
            delay_days = config.get('delay_days', 0)

            total_delay = timedelta(
                days=delay_days,
                hours=delay_hours,
                minutes=delay_minutes
            )

            resume_at = datetime.utcnow() + total_delay

            logger.info(f"Timer step scheduled to resume at {resume_at}")

            return {
                'success': True,
                'message': f'Delay scheduled for {total_delay}',
                'data': {
                    'resume_at': resume_at.isoformat(),
                    'delay': str(total_delay)
                },
                'waiting': True,  # Waiting for timer
                'resume_at': resume_at
            }

        except Exception as e:
            logger.error(f"Error executing timer step: {e}")
            return {
                'success': False,
                'message': f'Failed to schedule timer: {str(e)}',
                'data': {}
            }


# ============================================================================
# Workflow Execution Engine
# ============================================================================

class WorkflowExecutionEngine:
    """Main workflow execution engine"""

    def __init__(self):
        """Initialize the execution engine with step handlers"""
        self.handlers: List[StepHandler] = [
            ApprovalStepHandler(),
            ReviewStepHandler(),
            NotificationStepHandler(),
            DecisionStepHandler(),
            TimerStepHandler()
        ]
        logger.info("Workflow execution engine initialized")

    def get_handler(self, step_type: str) -> Optional[StepHandler]:
        """Get the appropriate handler for a step type"""
        for handler in self.handlers:
            if handler.can_handle(step_type):
                return handler
        return None

    async def start_execution(
        self,
        workflow_id: UUID,
        document_id: Optional[UUID] = None,
        initial_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Start a new workflow execution

        Returns:
            execution_id: UUID of the created execution
        """
        try:
            # Fetch workflow
            with get_db_cursor() as cursor:
                cursor.execute(
                    "SELECT id, name, elements, connections FROM workflows WHERE id = %s",
                    (str(workflow_id),)
                )
                workflow = cursor.fetchone()

            if not workflow:
                raise ValueError(f"Workflow {workflow_id} not found")

            elements = workflow['elements'] or []
            if not elements:
                raise ValueError("Workflow has no elements to execute")

            # Create execution record
            execution_data = initial_data or {}

            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO workflow_executions
                        (workflow_id, document_id, status, execution_data, started_at)
                    VALUES (%s, %s, %s, %s::jsonb, CURRENT_TIMESTAMP)
                    RETURNING id
                    """,
                    (
                        str(workflow_id),
                        str(document_id) if document_id else None,
                        'running',
                        json.dumps(execution_data)
                    )
                )
                execution_id = str(cursor.fetchone()['id'])

            logger.info(f"Started workflow execution {execution_id}")

            # Find the first step (element with no incoming connections)
            first_step = self._find_first_step(elements, workflow['connections'] or [])

            if first_step:
                # Execute the first step
                await self.execute_next_step(execution_id, first_step['id'])
            else:
                logger.warning(f"No starting step found for workflow {workflow_id}")

            return execution_id

        except Exception as e:
            logger.error(f"Error starting workflow execution: {e}")
            raise

    def _find_first_step(
        self,
        elements: List[Dict[str, Any]],
        connections: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Find the first step (element with no incoming connections)"""
        # Support both 'targetId' and 'target' formats
        target_ids = {conn.get('targetId') or conn.get('target') for conn in connections}

        for element in elements:
            if element['id'] not in target_ids:
                return element

        # If all elements have incoming connections, return the first one
        return elements[0] if elements else None

    async def execute_next_step(self, execution_id: str, step_id: str) -> Dict[str, Any]:
        """Execute the next step in a workflow"""
        try:
            # Fetch execution and workflow
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT we.*, w.elements, w.connections
                    FROM workflow_executions we
                    JOIN workflows w ON w.id = we.workflow_id
                    WHERE we.id = %s
                    """,
                    (execution_id,)
                )
                execution = cursor.fetchone()

            if not execution:
                raise ValueError(f"Execution {execution_id} not found")

            # Find the step element
            elements = execution['elements'] or []
            step_element = next((e for e in elements if e['id'] == step_id), None)

            if not step_element:
                raise ValueError(f"Step {step_id} not found in workflow")

            # Update current step
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    "UPDATE workflow_executions SET current_step_id = %s WHERE id = %s",
                    (step_id, execution_id)
                )

            # Get handler and execute
            handler = self.get_handler(step_element['type'])
            if not handler:
                raise ValueError(f"No handler for step type: {step_element['type']}")

            execution_context = {
                'execution_id': execution_id,
                'workflow_id': str(execution['workflow_id']),
                'document_id': str(execution['document_id']) if execution['document_id'] else None,
                'execution_data': execution['execution_data'] or {}
            }

            result = await handler.execute(step_element, execution_context)

            # Update execution with result
            updated_data = {**execution_context['execution_data'], **result.get('data', {})}

            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    UPDATE workflow_executions
                    SET execution_data = %s::jsonb
                    WHERE id = %s
                    """,
                    (json.dumps(updated_data), execution_id)
                )

            # If step is not waiting, move to next step
            if not result.get('waiting'):
                next_step = self._find_next_step(
                    step_id,
                    execution['connections'] or [],
                    result.get('decision_result')
                )

                if next_step:
                    # Continue to next step
                    await self.execute_next_step(execution_id, next_step)
                else:
                    # Workflow complete
                    await self.complete_execution(execution_id, 'completed')

            return result

        except Exception as e:
            logger.error(f"Error executing step: {e}")
            await self.complete_execution(execution_id, 'failed', str(e))
            raise

    def _find_next_step(
        self,
        current_step_id: str,
        connections: List[Dict[str, Any]],
        decision_result: Optional[bool] = None
    ) -> Optional[str]:
        """Find the next step to execute"""
        # Find outgoing connections from current step
        # Support both 'sourceId'/'source' and 'targetId'/'target' formats
        outgoing = [c for c in connections if (c.get('sourceId') or c.get('source')) == current_step_id]

        if not outgoing:
            return None

        # If there's a decision result, filter by condition
        if decision_result is not None:
            # TODO: Implement condition matching
            pass

        # Return the first outgoing connection's target
        return outgoing[0].get('targetId') or outgoing[0].get('target') if outgoing else None

    async def complete_execution(
        self,
        execution_id: str,
        status: str,
        error_message: Optional[str] = None
    ):
        """Mark an execution as complete"""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    UPDATE workflow_executions
                    SET status = %s,
                        completed_at = CURRENT_TIMESTAMP,
                        error_message = %s
                    WHERE id = %s
                    """,
                    (status, error_message, execution_id)
                )

            logger.info(f"Execution {execution_id} completed with status: {status}")

        except Exception as e:
            logger.error(f"Error completing execution: {e}")


# Global instance
execution_engine = WorkflowExecutionEngine()
