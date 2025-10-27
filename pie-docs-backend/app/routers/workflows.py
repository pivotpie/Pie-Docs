"""
Workflow Router - API endpoints for workflow management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
import logging
from datetime import datetime
import json

from app.models.workflows import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowResponse,
    WorkflowListResponse,
    WorkflowExecutionCreate,
    WorkflowExecutionResponse,
    ValidationResponse,
    WorkflowExportResponse,
    WorkflowImportRequest,
)
from app.database import get_db_cursor
from app.middleware.auth_middleware import get_current_user
from app.services.workflow_execution import execution_engine

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/workflows",
    tags=["workflows"]
)


# ============================================================================
# Workflow CRUD Endpoints
# ============================================================================

@router.get("/", response_model=WorkflowListResponse)
async def list_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, regex="^(draft|active|archived)$"),
    current_user: dict = Depends(get_current_user)
):
    """
    List all workflows with pagination and filtering

    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - **status**: Filter by workflow status (draft, active, archived)
    """
    try:
        with get_db_cursor() as cursor:
            # Build query with optional status filter
            query = """
                SELECT id, name, description, elements, connections,
                       version, status, created_by, created_at, updated_at
                FROM workflows
                WHERE 1=1
            """
            params = []

            if status:
                query += " AND status = %s"
                params.append(status)

            query += " ORDER BY updated_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, skip])

            cursor.execute(query, params)
            workflows = cursor.fetchall()

            # Get total count
            count_query = "SELECT COUNT(*) FROM workflows WHERE 1=1"
            count_params = []
            if status:
                count_query += " AND status = %s"
                count_params.append(status)

            cursor.execute(count_query, count_params)
            total = cursor.fetchone()['count']

        return {
            "total": total,
            "workflows": [dict(row) for row in workflows]
        }
    except Exception as e:
        logger.error(f"Error listing workflows: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list workflows: {str(e)}"
        )


@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow: WorkflowCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new workflow

    - **name**: Workflow name (required)
    - **description**: Workflow description
    - **elements**: List of workflow elements (nodes)
    - **connections**: List of connections between elements
    - **status**: Workflow status (default: draft)
    """
    try:
        user_id = current_user.get('id')

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO workflows (name, description, elements, connections, status, created_by)
                VALUES (%s, %s, %s::jsonb, %s::jsonb, %s, %s)
                RETURNING id, name, description, elements, connections, version, status,
                          created_by, created_at, updated_at
                """,
                (
                    workflow.name,
                    workflow.description,
                    json.dumps(workflow.elements),
                    json.dumps(workflow.connections),
                    workflow.status,
                    user_id
                )
            )
            result = cursor.fetchone()

        logger.info(f"Created workflow {result['id']} by user {user_id}")
        return dict(result)
    except Exception as e:
        logger.error(f"Error creating workflow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create workflow: {str(e)}"
        )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific workflow by ID

    - **workflow_id**: UUID of the workflow
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, description, elements, connections, version, status,
                       created_by, created_at, updated_at
                FROM workflows
                WHERE id = %s
                """,
                (str(workflow_id),)
            )
            workflow = cursor.fetchone()

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found"
            )

        return dict(workflow)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch workflow: {str(e)}"
        )


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: UUID,
    workflow: WorkflowUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an existing workflow

    - **workflow_id**: UUID of the workflow to update
    - Only provided fields will be updated
    """
    try:
        # Check if workflow exists
        with get_db_cursor() as cursor:
            cursor.execute("SELECT id FROM workflows WHERE id = %s", (str(workflow_id),))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Workflow {workflow_id} not found"
                )

        # Build dynamic update query
        update_fields = []
        params = []

        if workflow.name is not None:
            update_fields.append("name = %s")
            params.append(workflow.name)

        if workflow.description is not None:
            update_fields.append("description = %s")
            params.append(workflow.description)

        if workflow.elements is not None:
            update_fields.append("elements = %s::jsonb")
            params.append(json.dumps(workflow.elements))

        if workflow.connections is not None:
            update_fields.append("connections = %s::jsonb")
            params.append(json.dumps(workflow.connections))

        if workflow.status is not None:
            update_fields.append("status = %s")
            params.append(workflow.status)

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        # Always update the updated_at timestamp and increment version
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_fields.append("version = version + 1")

        params.append(str(workflow_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE workflows
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, name, description, elements, connections, version, status,
                          created_by, created_at, updated_at
            """
            cursor.execute(query, params)
            result = cursor.fetchone()

        logger.info(f"Updated workflow {workflow_id}")
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update workflow: {str(e)}"
        )


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a workflow

    - **workflow_id**: UUID of the workflow to delete
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM workflows WHERE id = %s RETURNING id",
                (str(workflow_id),)
            )
            result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found"
            )

        logger.info(f"Deleted workflow {workflow_id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete workflow: {str(e)}"
        )


# ============================================================================
# Workflow Execution Endpoints
# ============================================================================

@router.post("/{workflow_id}/execute", response_model=WorkflowExecutionResponse, status_code=status.HTTP_201_CREATED)
async def execute_workflow(
    workflow_id: UUID,
    execution: WorkflowExecutionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Start workflow execution

    - **workflow_id**: UUID of the workflow to execute
    - **document_id**: Optional document ID to associate with execution
    - **initial_data**: Optional initial execution data
    """
    try:
        # Verify workflow exists and is active
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT id, status, elements FROM workflows WHERE id = %s",
                (str(workflow_id),)
            )
            workflow = cursor.fetchone()

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found"
            )

        if workflow['status'] != 'active':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Workflow must be active to execute (current status: {workflow['status']})"
            )

        # Start workflow execution using the execution engine
        execution_id = await execution_engine.start_execution(
            workflow_id=workflow_id,
            document_id=execution.document_id,
            initial_data=execution.initial_data or {}
        )

        # Fetch the created execution record
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, workflow_id, document_id, current_step_id, status,
                       execution_data, started_at, completed_at, error_message, error_stack
                FROM workflow_executions
                WHERE id = %s
                """,
                (execution_id,)
            )
            result = cursor.fetchone()

        logger.info(f"Started execution {execution_id} for workflow {workflow_id}")

        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute workflow: {str(e)}"
        )


@router.get("/{workflow_id}/executions", response_model=List[WorkflowExecutionResponse])
async def list_workflow_executions(
    workflow_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    List all executions for a workflow

    - **workflow_id**: UUID of the workflow
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, workflow_id, document_id, current_step_id, status,
                       execution_data, started_at, completed_at, error_message, error_stack
                FROM workflow_executions
                WHERE workflow_id = %s
                ORDER BY started_at DESC
                LIMIT %s OFFSET %s
                """,
                (str(workflow_id), limit, skip)
            )
            executions = cursor.fetchall()

        return [dict(row) for row in executions]
    except Exception as e:
        logger.error(f"Error listing executions for workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list workflow executions: {str(e)}"
        )


# ============================================================================
# Workflow Validation Endpoint
# ============================================================================

@router.post("/{workflow_id}/validate", response_model=ValidationResponse)
async def validate_workflow(
    workflow_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Validate a workflow structure

    - **workflow_id**: UUID of the workflow to validate
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT elements, connections FROM workflows WHERE id = %s",
                (str(workflow_id),)
            )
            workflow = cursor.fetchone()

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found"
            )

        # TODO: Implement comprehensive validation logic
        # For now, return basic validation
        errors = []
        warnings = []

        elements = workflow['elements'] or []
        connections = workflow['connections'] or []

        # Basic validations
        if not elements:
            warnings.append({
                "id": "warning-empty",
                "type": "warning",
                "message": "Workflow has no elements"
            })

        # Check for disconnected elements
        connected_ids = set()
        for conn in connections:
            connected_ids.add(conn.get('sourceId'))
            connected_ids.add(conn.get('targetId'))

        element_ids = {elem.get('id') for elem in elements}
        disconnected = element_ids - connected_ids

        if len(elements) > 1 and disconnected:
            warnings.append({
                "id": "warning-disconnected",
                "type": "warning",
                "message": f"{len(disconnected)} element(s) are not connected to the workflow"
            })

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate workflow: {str(e)}"
        )


# ============================================================================
# Workflow Export/Import Endpoints
# ============================================================================

@router.post("/{workflow_id}/export", response_model=WorkflowExportResponse)
async def export_workflow(
    workflow_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Export a workflow as JSON

    - **workflow_id**: UUID of the workflow to export
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, description, elements, connections, version, status,
                       created_by, created_at, updated_at
                FROM workflows
                WHERE id = %s
                """,
                (str(workflow_id),)
            )
            workflow = cursor.fetchone()

        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found"
            )

        return {
            "workflow": dict(workflow),
            "export_date": datetime.utcnow(),
            "version": "1.0"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting workflow {workflow_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export workflow: {str(e)}"
        )


@router.post("/import", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def import_workflow(
    workflow_data: WorkflowImportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Import a workflow from JSON

    - **name**: Workflow name
    - **description**: Workflow description
    - **elements**: Workflow elements
    - **connections**: Workflow connections
    - **preserve_ids**: Whether to preserve original element/connection IDs
    """
    try:
        user_id = current_user.get('id')

        # If not preserving IDs, we could regenerate them here
        # For now, we'll use the provided data as-is

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO workflows (name, description, elements, connections, status, created_by)
                VALUES (%s, %s, %s::jsonb, %s::jsonb, 'draft', %s)
                RETURNING id, name, description, elements, connections, version, status,
                          created_by, created_at, updated_at
                """,
                (
                    workflow_data.name,
                    workflow_data.description,
                    json.dumps(workflow_data.elements),
                    json.dumps(workflow_data.connections),
                    user_id
                )
            )
            result = cursor.fetchone()

        logger.info(f"Imported workflow {result['id']} by user {user_id}")
        return dict(result)
    except Exception as e:
        logger.error(f"Error importing workflow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import workflow: {str(e)}"
        )
