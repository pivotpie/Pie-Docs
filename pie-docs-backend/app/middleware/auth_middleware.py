"""
Authentication Middleware
Provides dependency for route protection and current user extraction
"""

from fastapi import Depends, HTTPException, status, Header
from typing import Optional, Dict, Any
import logging

from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user from JWT token

    Usage in route:
    @app.get("/protected")
    async def protected_route(current_user: dict = Depends(get_current_user)):
        return {"user": current_user}
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]

    # Verify token
    payload = auth_service.verify_token(token, "access")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")

    # Get full user details
    try:
        user = auth_service.get_user_by_id(user_id)
    except Exception as e:
        logger.error(f"Error fetching user details: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Optional dependency to get current user if authenticated
    Returns None if not authenticated (doesn't raise exception)

    Usage in route:
    @app.get("/public-or-private")
    async def route(current_user: Optional[dict] = Depends(get_current_user_optional)):
        if current_user:
            return {"authenticated": True, "user": current_user}
        return {"authenticated": False}
    """
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


def require_permissions(*required_permissions: str):
    """
    Dependency factory to check if user has required permissions

    Usage in route:
    @app.get("/admin")
    async def admin_route(current_user: dict = Depends(require_permissions("admin.access"))):
        return {"message": "Admin access granted"}
    """
    async def permission_checker(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
        """Check if user has required permissions"""
        # TODO: Implement actual permission checking against database
        # For now, just return the user
        # In production:
        # 1. Query user_roles table
        # 2. Query role_permissions table
        # 3. Check if user has required permissions
        # 4. Raise HTTPException if not authorized

        return current_user

    return permission_checker


def require_roles(*required_roles: str):
    """
    Dependency factory to check if user has required roles

    Usage in route:
    @app.get("/manager")
    async def manager_route(current_user: dict = Depends(require_roles("manager", "admin"))):
        return {"message": "Manager access granted"}
    """
    async def role_checker(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
        """Check if user has required roles"""
        # TODO: Implement actual role checking against database
        # For now, just return the user
        # In production:
        # 1. Query user_roles table
        # 2. Check if user has any of the required roles
        # 3. Raise HTTPException if not authorized

        return current_user

    return role_checker
