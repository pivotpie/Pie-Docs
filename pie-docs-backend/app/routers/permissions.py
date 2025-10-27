"""
Permission Management API Router
Endpoints for managing permissions
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.user_management import (
    Permission, PermissionCreate, PermissionUpdate, PermissionListResponse,
    SuccessResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/permissions", tags=["permissions"])


# ==========================================
# Permission CRUD Endpoints
# ==========================================

@router.get("", response_model=PermissionListResponse)
async def list_permissions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    resource: Optional[str] = Query(None, description="Filter by resource"),
    action: Optional[str] = Query(None, description="Filter by action"),
):
    """
    List all permissions with pagination and filtering
    """
    try:
        offset = (page - 1) * page_size

        # Build query
        where_clauses = []
        params = []

        if search:
            where_clauses.append("(name ILIKE %s OR display_name ILIKE %s OR description ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        if resource:
            where_clauses.append("resource = %s")
            params.append(resource)

        if action:
            where_clauses.append("action = %s")
            params.append(action)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM permissions WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            # Get permissions
            query = f"""
                SELECT
                    id, name, display_name, description, resource, action,
                    is_system_permission, created_at, updated_at
                FROM permissions
                WHERE {where_sql}
                ORDER BY resource, action, name
                LIMIT %s OFFSET %s
            """

            cursor.execute(query, params + [page_size, offset])
            permissions_data = cursor.fetchall()

            permissions = [dict(permission) for permission in permissions_data]
            total_pages = (total + page_size - 1) // page_size

            return {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "permissions": permissions
            }
    except Exception as e:
        logger.error(f"Error listing permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resources")
async def list_resources():
    """
    Get a list of all unique resources
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT resource
                FROM permissions
                ORDER BY resource
            """)

            resources = [row['resource'] for row in cursor.fetchall()]

            return {"resources": resources}
    except Exception as e:
        logger.error(f"Error listing resources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/actions")
async def list_actions():
    """
    Get a list of all unique actions
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT action
                FROM permissions
                ORDER BY action
            """)

            actions = [row['action'] for row in cursor.fetchall()]

            return {"actions": actions}
    except Exception as e:
        logger.error(f"Error listing actions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{permission_id}", response_model=Permission)
async def get_permission(permission_id: UUID):
    """
    Get a specific permission by ID
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    id, name, display_name, description, resource, action,
                    is_system_permission, created_at, updated_at
                FROM permissions
                WHERE id = %s
            """, (str(permission_id),))

            permission_data = cursor.fetchone()

            if not permission_data:
                raise HTTPException(status_code=404, detail="Permission not found")

            return dict(permission_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Permission, status_code=201)
async def create_permission(permission: PermissionCreate):
    """
    Create a new permission
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if permission name already exists
            cursor.execute("SELECT id FROM permissions WHERE name = %s", (permission.name,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Permission name already exists")

            # Insert permission
            cursor.execute("""
                INSERT INTO permissions (
                    name, display_name, description, resource, action, is_system_permission
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, name, display_name, description, resource, action,
                          is_system_permission, created_at, updated_at
            """, (
                permission.name, permission.display_name, permission.description,
                permission.resource, permission.action, permission.is_system_permission
            ))

            permission_data = cursor.fetchone()

            return dict(permission_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{permission_id}", response_model=Permission)
async def update_permission(permission_id: UUID, permission_update: PermissionUpdate):
    """
    Update a permission's information
    """
    try:
        update_fields = []
        params = []

        for field, value in permission_update.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(permission_id))

        with get_db_cursor(commit=True) as cursor:
            # Check if it's a system permission
            cursor.execute("SELECT is_system_permission FROM permissions WHERE id = %s", (str(permission_id),))
            permission_data = cursor.fetchone()

            if not permission_data:
                raise HTTPException(status_code=404, detail="Permission not found")

            if permission_data['is_system_permission']:
                raise HTTPException(status_code=400, detail="Cannot modify system permissions")

            query = f"""
                UPDATE permissions
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, name, display_name, description, resource, action,
                          is_system_permission, created_at, updated_at
            """

            cursor.execute(query, params)
            updated_permission = cursor.fetchone()

            return dict(updated_permission)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{permission_id}", response_model=SuccessResponse)
async def delete_permission(permission_id: UUID):
    """
    Delete a permission
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if it's a system permission
            cursor.execute("SELECT is_system_permission FROM permissions WHERE id = %s", (str(permission_id),))
            permission_data = cursor.fetchone()

            if not permission_data:
                raise HTTPException(status_code=404, detail="Permission not found")

            if permission_data['is_system_permission']:
                raise HTTPException(status_code=400, detail="Cannot delete system permissions")

            # Delete permission
            cursor.execute("DELETE FROM permissions WHERE id = %s", (str(permission_id),))

            return {"success": True, "message": "Permission deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{permission_id}/roles")
async def get_permission_roles(permission_id: UUID):
    """
    Get all roles that have this permission
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    r.id, r.name, r.display_name, r.description,
                    r.is_system_role, r.is_active, r.priority,
                    rp.granted_at
                FROM roles r
                JOIN role_permissions rp ON r.id = rp.role_id
                WHERE rp.permission_id = %s
                ORDER BY r.priority DESC
            """, (str(permission_id),))

            roles = cursor.fetchall()

            return {"permission_id": str(permission_id), "roles": [dict(r) for r in roles]}
    except Exception as e:
        logger.error(f"Error getting permission roles: {e}")
        raise HTTPException(status_code=500, detail=str(e))
