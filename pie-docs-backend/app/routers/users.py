"""
User Management API Router
Endpoints for managing users
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional
from uuid import UUID
import bcrypt
import logging

from app.database import get_db_cursor
from app.models.user_management import (
    User, UserCreate, UserUpdate, UserWithRoles, UserListResponse,
    UserRoleAssignment, SuccessResponse, UserPasswordUpdate
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/users", tags=["users"])


# Helper functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


# ==========================================
# User CRUD Endpoints
# ==========================================

@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by username, email, or name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    role_id: Optional[UUID] = Query(None, description="Filter by role"),
):
    """
    List all users with pagination and filtering
    """
    try:
        offset = (page - 1) * page_size

        # Build query
        where_clauses = []
        params = []

        if search:
            where_clauses.append("""
                (u.username ILIKE %s OR u.email ILIKE %s OR
                 u.first_name ILIKE %s OR u.last_name ILIKE %s)
            """)
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param, search_param])

        if is_active is not None:
            where_clauses.append("u.is_active = %s")
            params.append(is_active)

        if role_id:
            where_clauses.append("EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = %s)")
            params.append(str(role_id))

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM users u WHERE {where_sql}", params)
            total = cursor.fetchone()['total']

            # Get users with roles
            query = f"""
                SELECT
                    u.id, u.username, u.email, u.first_name, u.last_name,
                    u.avatar_url, u.is_active, u.is_verified,
                    u.is_superuser, u.last_login, u.created_at, u.updated_at,
                    COALESCE(ARRAY_AGG(DISTINCT r.id) FILTER (WHERE r.id IS NOT NULL), ARRAY[]::uuid[]) as role_ids,
                    COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as role_names,
                    COALESCE(ARRAY_AGG(DISTINCT r.display_name) FILTER (WHERE r.display_name IS NOT NULL), ARRAY[]::text[]) as role_display_names
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                WHERE {where_sql}
                GROUP BY u.id
                ORDER BY u.created_at DESC
                LIMIT %s OFFSET %s
            """

            cursor.execute(query, params + [page_size, offset])
            users_data = cursor.fetchall()

            # Format users with roles
            users = []
            for user_data in users_data:
                user_dict = dict(user_data)
                role_ids = user_dict.pop('role_ids', [])
                role_names = user_dict.pop('role_names', [])
                role_display_names = user_dict.pop('role_display_names', [])

                # Build roles list
                roles = []
                for i, role_id in enumerate(role_ids):
                    if role_id:  # Check if role_id is not None
                        roles.append({
                            'id': role_id,
                            'name': role_names[i] if i < len(role_names) else '',
                            'display_name': role_display_names[i] if i < len(role_display_names) else '',
                        })

                user_dict['roles'] = roles
                user_dict['role_names'] = [r['name'] for r in roles]
                users.append(user_dict)

            total_pages = (total + page_size - 1) // page_size

            return {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "users": users
            }
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}", response_model=UserWithRoles)
async def get_user(user_id: UUID):
    """
    Get a specific user by ID
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    u.id, u.username, u.email, u.first_name, u.last_name,
                    u.avatar_url, u.is_active, u.is_verified,
                    u.is_superuser, u.last_login, u.created_at, u.updated_at,
                    COALESCE(ARRAY_AGG(DISTINCT jsonb_build_object(
                        'id', r.id,
                        'name', r.name,
                        'display_name', r.display_name,
                        'description', r.description,
                        'is_system_role', r.is_system_role,
                        'is_active', r.is_active,
                        'priority', r.priority,
                        'created_at', r.created_at,
                        'updated_at', r.updated_at
                    )) FILTER (WHERE r.id IS NOT NULL), '[]'::jsonb[]) as roles,
                    COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as role_names
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                WHERE u.id = %s
                GROUP BY u.id
            """, (str(user_id),))

            user_data = cursor.fetchone()

            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")

            return dict(user_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=User, status_code=201)
async def create_user(user: UserCreate, request: Request):
    """
    Create a new user
    """
    try:
        # Hash password
        password_hash = hash_password(user.password)

        with get_db_cursor(commit=True) as cursor:
            # Check if username or email already exists
            cursor.execute(
                "SELECT id FROM users WHERE username = %s OR email = %s",
                (user.username, user.email)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Username or email already exists")

            # Insert user
            cursor.execute("""
                INSERT INTO users (
                    username, email, password_hash, first_name, last_name,
                    is_active, is_verified
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, username, email, first_name, last_name,
                          avatar_url, is_active, is_verified,
                          is_superuser, last_login, created_at, updated_at
            """, (
                user.username, user.email, password_hash, user.first_name,
                user.last_name, user.is_active, user.is_verified
            ))

            user_data = cursor.fetchone()

            # Assign roles if provided
            if user.role_ids:
                for role_id in user.role_ids:
                    cursor.execute(
                        "INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s)",
                        (str(user_data['id']), str(role_id))
                    )

            return dict(user_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{user_id}", response_model=User)
async def update_user(user_id: UUID, user_update: UserUpdate):
    """
    Update a user's information
    """
    try:
        update_fields = []
        params = []

        for field, value in user_update.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(str(user_id))

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE users
                SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, username, email, first_name, last_name,
                          avatar_url, is_active, is_verified,
                          is_superuser, last_login, created_at, updated_at
            """

            cursor.execute(query, params)
            user_data = cursor.fetchone()

            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")

            return dict(user_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}", response_model=SuccessResponse)
async def delete_user(user_id: UUID):
    """
    Delete a user (soft delete by deactivating)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING id",
                (str(user_id),)
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="User not found")

            return {"success": True, "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# User Role Management
# ==========================================

@router.post("/{user_id}/roles", response_model=SuccessResponse)
async def assign_roles_to_user(user_id: UUID, assignment: UserRoleAssignment):
    """
    Assign roles to a user
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE id = %s", (str(user_id),))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="User not found")

            # Remove existing roles
            cursor.execute("DELETE FROM user_roles WHERE user_id = %s", (str(user_id),))

            # Assign new roles
            for role_id in assignment.role_ids:
                cursor.execute(
                    "INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at) VALUES (%s, %s, %s, %s)",
                    (str(user_id), str(role_id), str(assignment.assigned_by) if assignment.assigned_by else None, assignment.expires_at)
                )

            return {"success": True, "message": f"Assigned {len(assignment.role_ids)} roles to user"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning roles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}/roles/{role_id}", response_model=SuccessResponse)
async def revoke_role_from_user(user_id: UUID, role_id: UUID):
    """
    Revoke a role from a user
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM user_roles WHERE user_id = %s AND role_id = %s RETURNING id",
                (str(user_id), str(role_id))
            )

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="User role assignment not found")

            return {"success": True, "message": "Role revoked from user"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking role: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Password Management
# ==========================================

@router.post("/{user_id}/password", response_model=SuccessResponse)
async def update_user_password(user_id: UUID, password_update: UserPasswordUpdate):
    """
    Update a user's password
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Get current password hash
            cursor.execute("SELECT password_hash FROM users WHERE id = %s", (str(user_id),))
            user_data = cursor.fetchone()

            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")

            # Verify current password
            if not verify_password(password_update.current_password, user_data['password_hash']):
                raise HTTPException(status_code=400, detail="Current password is incorrect")

            # Hash new password
            new_password_hash = hash_password(password_update.new_password)

            # Update password
            cursor.execute(
                "UPDATE users SET password_hash = %s, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (new_password_hash, str(user_id))
            )

            return {"success": True, "message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating password: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/permissions")
async def get_user_permissions(user_id: UUID):
    """
    Get all permissions for a user (via their roles)
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT
                    p.id, p.name, p.display_name, p.description,
                    p.resource, p.action
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE u.id = %s AND u.is_active = TRUE
                ORDER BY p.resource, p.action
            """, (str(user_id),))

            permissions = cursor.fetchall()

            return {"user_id": str(user_id), "permissions": [dict(p) for p in permissions]}
    except Exception as e:
        logger.error(f"Error getting user permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
