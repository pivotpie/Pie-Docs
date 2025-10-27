"""
Role Management API Router
Endpoints for managing roles and role permissions
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from uuid import UUID
import logging

from app.database import get_db_cursor
from app.models.user_management import (
    Role, RoleCreate, RoleUpdate, RoleWithPermissions, RoleListResponse,
    RolePermissionAssignment, SuccessResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/roles", tags=["roles"])


# ==========================================
# Role CRUD Endpoints
# ==========================================

@router.get("", response_model=RoleListResponse)
async def list_roles(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
):
    """
    List all roles with pagination and filtering
    """
    try:
        offset = (page - 1) * page_size

        # Build query
        where_clauses = []
        params = []

        if search:
            where_clauses.append("(r.name ILIKE %s OR r.display_name ILIKE %s OR r.description ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        if is_active is not None:
            where_clauses.append("r.is_active = %s")
            params.append(is_active)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM roles r WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            # Get roles with permissions
            query = f"""
                SELECT
                    r.id, r.name, r.display_name, r.description,
                    r.is_system_role, r.is_active, r.priority,
                    r.created_at, r.updated_at, r.created_by, r.updated_by,
                    COUNT(DISTINCT rp.permission_id) as permission_count,
                    COALESCE(ARRAY_AGG(DISTINCT jsonb_build_object(
                        'id', p.id,
                        'name', p.name,
                        'display_name', p.display_name,
                        'description', p.description,
                        'resource', p.resource,
                        'action', p.action,
                        'is_system_permission', p.is_system_permission,
                        'created_at', p.created_at,
                        'updated_at', p.updated_at
                    )) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::jsonb[]) as permissions
                FROM roles r
                LEFT JOIN role_permissions rp ON r.id = rp.role_id
                LEFT JOIN permissions p ON rp.permission_id = p.id
                WHERE {where_sql}
                GROUP BY r.id
                ORDER BY r.priority DESC, r.created_at DESC
                LIMIT %s OFFSET %s
            """

            cursor.execute(query, params + [page_size, offset])
            roles_data = cursor.fetchall()

            roles = [dict(role) for role in roles_data]
            total_pages = (total + page_size - 1) // page_size

            return {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "roles": roles
            }
    except Exception as e:
        logger.error(f"Error listing roles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{role_id}", response_model=RoleWithPermissions)
async def get_role(role_id: UUID):
    """
    Get a specific role by ID
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    r.id, r.name, r.display_name, r.description,
                    r.is_system_role, r.is_active, r.priority,
                    r.created_at, r.updated_at, r.created_by, r.updated_by,
                    COUNT(DISTINCT rp.permission_id) as permission_count,
                    COALESCE(ARRAY_AGG(DISTINCT jsonb_build_object(
                        'id', p.id,
                        'name', p.name,
                        'display_name', p.display_name,
                        'description', p.description,
                        'resource', p.resource,
                        'action', p.action,
                        'is_system_permission', p.is_system_permission,
                        'created_at', p.created_at,
                        'updated_at', p.updated_at
                    )) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::jsonb[]) as permissions
                FROM roles r
                LEFT JOIN role_permissions rp ON r.id = rp.role_id
                LEFT JOIN permissions p ON rp.permission_id = p.id
                WHERE r.id = %s
                GROUP BY r.id
            """, (str(role_id),))

            role_data = cursor.fetchone()

            if not role_data:
                raise HTTPException(status_code=404, detail="Role not found")

            return dict(role_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting role: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Role, status_code=201)
async def create_role(role: RoleCreate):
    """
    Create a new role
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if role name already exists
            cursor.execute("SELECT id FROM roles WHERE name = %s", (role.name,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Role name already exists")

            # Insert role
            cursor.execute("""
                INSERT INTO roles (
                    name, display_name, description, is_system_role, priority
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, name, display_name, description, is_system_role,
                          is_active, priority, created_at, updated_at,
                          created_by, updated_by
            """, (
                role.name, role.display_name, role.description,
                role.is_system_role, role.priority
            ))

            role_data = cursor.fetchone()

            # Assign permissions if provided
            if role.permission_ids:
                for permission_id in role.permission_ids:
                    cursor.execute(
                        "INSERT INTO role_permissions (role_id, permission_id) VALUES (%s, %s)",
                        (str(role_data['id']), str(permission_id))
                    )

            return dict(role_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating role: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{role_id}", response_model=Role)
async def update_role(role_id: UUID, role_update: RoleUpdate):
    """
    Update a role's information
    """
    try:
        update_fields = []
        params = []

        for field, value in role_update.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(role_id))

        with get_db_cursor(commit=True) as cursor:
            # Check if it's a system role
            cursor.execute("SELECT is_system_role FROM roles WHERE id = %s", (str(role_id),))
            role_data = cursor.fetchone()

            if not role_data:
                raise HTTPException(status_code=404, detail="Role not found")

            if role_data['is_system_role']:
                raise HTTPException(status_code=400, detail="Cannot modify system roles")

            query = f"""
                UPDATE roles
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, name, display_name, description, is_system_role,
                          is_active, priority, created_at, updated_at,
                          created_by, updated_by
            """

            cursor.execute(query, params)
            updated_role = cursor.fetchone()

            return dict(updated_role)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating role: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{role_id}", response_model=SuccessResponse)
async def delete_role(role_id: UUID):
    """
    Delete a role
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if it's a system role
            cursor.execute("SELECT is_system_role FROM roles WHERE id = %s", (str(role_id),))
            role_data = cursor.fetchone()

            if not role_data:
                raise HTTPException(status_code=404, detail="Role not found")

            if role_data['is_system_role']:
                raise HTTPException(status_code=400, detail="Cannot delete system roles")

            # Soft delete by deactivating
            cursor.execute(
                "UPDATE roles SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (str(role_id),)
            )

            return {"success": True, "message": "Role deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting role: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Role Permission Management
# ==========================================

@router.post("/{role_id}/permissions", response_model=SuccessResponse)
async def assign_permissions_to_role(role_id: UUID, assignment: RolePermissionAssignment):
    """
    Assign permissions to a role
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if role exists
            cursor.execute("SELECT id, is_system_role FROM roles WHERE id = %s", (str(role_id),))
            role_data = cursor.fetchone()

            if not role_data:
                raise HTTPException(status_code=404, detail="Role not found")

            if role_data['is_system_role']:
                raise HTTPException(status_code=400, detail="Cannot modify permissions for system roles")

            # Remove existing permissions
            cursor.execute("DELETE FROM role_permissions WHERE role_id = %s", (str(role_id),))

            # Assign new permissions
            for permission_id in assignment.permission_ids:
                cursor.execute(
                    "INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (%s, %s, %s)",
                    (str(role_id), str(permission_id), str(assignment.granted_by) if assignment.granted_by else None)
                )

            return {"success": True, "message": f"Assigned {len(assignment.permission_ids)} permissions to role"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{role_id}/permissions/{permission_id}", response_model=SuccessResponse)
async def revoke_permission_from_role(role_id: UUID, permission_id: UUID):
    """
    Revoke a permission from a role
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if it's a system role
            cursor.execute("SELECT is_system_role FROM roles WHERE id = %s", (str(role_id),))
            role_data = cursor.fetchone()

            if not role_data:
                raise HTTPException(status_code=404, detail="Role not found")

            if role_data['is_system_role']:
                raise HTTPException(status_code=400, detail="Cannot modify permissions for system roles")

            cursor.execute(
                "DELETE FROM role_permissions WHERE role_id = %s AND permission_id = %s RETURNING id",
                (str(role_id), str(permission_id))
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Role permission assignment not found")

            return {"success": True, "message": "Permission revoked from role"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking permission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{role_id}/users")
async def get_role_users(role_id: UUID):
    """
    Get all users assigned to a role
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    u.id, u.username, u.email, u.first_name, u.last_name,
                    u.is_active, u.is_verified, ur.assigned_at, ur.expires_at
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                WHERE ur.role_id = %s
                ORDER BY ur.assigned_at DESC
            """, (str(role_id),))

            users = cursor.fetchall()

            return {"role_id": str(role_id), "users": [dict(u) for u in users]}
    except Exception as e:
        logger.error(f"Error getting role users: {e}")
        raise HTTPException(status_code=500, detail=str(e))
