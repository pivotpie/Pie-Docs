"""
Audit Logs Router
Handles audit log querying and viewing
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.database import get_db_cursor
from app.middleware import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/audit-logs",
    tags=["audit"]
)


# ============= Request/Response Models =============

class AuditLogResponse(BaseModel):
    id: str
    event_type: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    action: str
    description: Optional[str] = None
    metadata: Optional[dict] = {}
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    success: bool = True
    error_message: Optional[str] = None
    created_at: datetime


class AuditLogsListResponse(BaseModel):
    audit_logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============= Audit Logs Endpoints =============

@router.get("", response_model=AuditLogsListResponse, status_code=status.HTTP_200_OK)
async def get_audit_logs(
    event_type: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[str] = None,
    success: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Get audit logs with optional filters

    - Requires authentication
    - Supports filtering by event type, resource type, user, success status, and date range
    - Supports pagination
    """
    try:
        # Build query
        query = """
            SELECT id, event_type, resource_type, resource_id, user_id,
                   ip_address, user_agent, action, description, metadata,
                   old_values, new_values, success, error_message, created_at
            FROM audit_logs
            WHERE 1=1
        """
        params = []

        if event_type:
            query += " AND event_type = %s"
            params.append(event_type)

        if resource_type:
            query += " AND resource_type = %s"
            params.append(resource_type)

        if user_id:
            query += " AND user_id = %s"
            params.append(user_id)

        if success is not None:
            query += " AND success = %s"
            params.append(success)

        if start_date:
            query += " AND created_at >= %s"
            params.append(start_date)

        if end_date:
            query += " AND created_at <= %s"
            params.append(end_date)

        # Get total count
        count_query = f"SELECT COUNT(*) FROM ({query}) AS filtered_logs"
        with get_db_cursor() as cursor:
            cursor.execute(count_query, params)
            total = cursor.fetchone()['count']

        # Add ordering and pagination
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([page_size, (page - 1) * page_size])

        # Execute main query
        with get_db_cursor() as cursor:
            cursor.execute(query, params)
            audit_logs = cursor.fetchall()

        # Calculate total pages
        total_pages = (total + page_size - 1) // page_size

        return AuditLogsListResponse(
            audit_logs=[AuditLogResponse(**dict(log)) for log in audit_logs],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching audit logs"
        )


@router.get("/{resource_type}/{resource_id}", response_model=AuditLogsListResponse, status_code=status.HTTP_200_OK)
async def get_resource_audit_logs(
    resource_type: str,
    resource_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Get audit logs for a specific resource

    - Requires authentication
    - Returns all audit logs related to a specific resource
    - Supports pagination
    """
    try:
        # Count total logs for this resource
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) FROM audit_logs
                WHERE resource_type = %s AND resource_id = %s
                """,
                (resource_type, resource_id)
            )
            total = cursor.fetchone()['count']

        # Get logs
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, event_type, resource_type, resource_id, user_id,
                       ip_address, user_agent, action, description, metadata,
                       old_values, new_values, success, error_message, created_at
                FROM audit_logs
                WHERE resource_type = %s AND resource_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                (resource_type, resource_id, page_size, (page - 1) * page_size)
            )
            audit_logs = cursor.fetchall()

        # Calculate total pages
        total_pages = (total + page_size - 1) // page_size

        return AuditLogsListResponse(
            audit_logs=[AuditLogResponse(**dict(log)) for log in audit_logs],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"Error fetching resource audit logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching resource audit logs"
        )


@router.get("/events/types", status_code=status.HTTP_200_OK)
async def get_event_types(current_user: dict = Depends(get_current_user)):
    """
    Get list of all event types in audit logs

    - Requires authentication
    - Returns unique event types
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT event_type
                FROM audit_logs
                ORDER BY event_type
                """
            )
            event_types = cursor.fetchall()

        return {
            "event_types": [row['event_type'] for row in event_types]
        }

    except Exception as e:
        logger.error(f"Error fetching event types: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching event types"
        )


@router.get("/resources/types", status_code=status.HTTP_200_OK)
async def get_resource_types(current_user: dict = Depends(get_current_user)):
    """
    Get list of all resource types in audit logs

    - Requires authentication
    - Returns unique resource types
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT resource_type
                FROM audit_logs
                WHERE resource_type IS NOT NULL
                ORDER BY resource_type
                """
            )
            resource_types = cursor.fetchall()

        return {
            "resource_types": [row['resource_type'] for row in resource_types]
        }

    except Exception as e:
        logger.error(f"Error fetching resource types: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching resource types"
        )
