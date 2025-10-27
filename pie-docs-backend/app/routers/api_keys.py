"""
API Keys Router
Handles API key management for programmatic access
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import secrets
import hashlib

from app.database import get_db_cursor
from app.middleware import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/api-keys",
    tags=["api-keys"]
)


# ============= Request/Response Models =============

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    permissions: List[str] = []
    is_active: bool
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    usage_count: int
    created_at: datetime


class CreateApiKeyRequest(BaseModel):
    name: str
    permissions: List[str] = []
    expires_in_days: Optional[int] = None
    rate_limit: int = 1000


class CreateApiKeyResponse(BaseModel):
    api_key: ApiKeyResponse
    api_key_secret: str  # Only returned once!


class ApiKeyListResponse(BaseModel):
    api_keys: List[ApiKeyResponse]
    total: int


# ============= API Key Management Endpoints =============

@router.get("", response_model=ApiKeyListResponse)
async def list_api_keys(current_user: dict = Depends(get_current_user)):
    """
    List all API keys for current user

    - Requires authentication
    - Returns list of user's API keys (without secrets)
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, key_prefix, permissions, is_active,
                       expires_at, last_used_at, usage_count, created_at
                FROM api_keys
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (current_user['id'],)
            )
            keys = cursor.fetchall()

        api_keys = [ApiKeyResponse(**dict(key)) for key in keys]

        return ApiKeyListResponse(
            api_keys=api_keys,
            total=len(api_keys)
        )

    except Exception as e:
        logger.error(f"Error listing API keys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing API keys"
        )


@router.post("", response_model=CreateApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request: CreateApiKeyRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new API key

    - Requires authentication
    - Returns the API key with secret (ONLY SHOWN ONCE!)
    """
    try:
        # Generate a secure random API key
        api_key_secret = f"pk_{''.join(secrets.token_urlsafe(32))}"
        key_prefix = api_key_secret[:12] + "..."

        # Hash the key for storage
        key_hash = hashlib.sha256(api_key_secret.encode()).hexdigest()

        # Calculate expiration if provided
        expires_at = None
        if request.expires_in_days:
            expires_at = datetime.now() + timedelta(days=request.expires_in_days)

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO api_keys (
                    user_id, name, key_prefix, key_hash, permissions,
                    rate_limit, expires_at, created_by
                )
                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                RETURNING id, name, key_prefix, permissions, is_active,
                          expires_at, last_used_at, usage_count, created_at
                """,
                (
                    current_user['id'],
                    request.name,
                    key_prefix,
                    key_hash,
                    request.permissions,
                    request.rate_limit,
                    expires_at,
                    current_user['id']
                )
            )
            new_key = cursor.fetchone()

        return CreateApiKeyResponse(
            api_key=ApiKeyResponse(**dict(new_key)),
            api_key_secret=api_key_secret
        )

    except Exception as e:
        logger.error(f"Error creating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating API key"
        )


@router.delete("/{key_id}", status_code=status.HTTP_200_OK)
async def revoke_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Revoke (delete) an API key

    - Requires authentication
    - Can only revoke own keys
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check ownership and delete
            cursor.execute(
                """
                DELETE FROM api_keys
                WHERE id = %s AND user_id = %s
                RETURNING id
                """,
                (key_id, current_user['id'])
            )
            deleted = cursor.fetchone()

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found or access denied"
            )

        return {"message": "API key revoked successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error revoking API key"
        )


@router.patch("/{key_id}/toggle", response_model=ApiKeyResponse)
async def toggle_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Toggle API key active status

    - Requires authentication
    - Can only toggle own keys
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                UPDATE api_keys
                SET is_active = NOT is_active, updated_at = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING id, name, key_prefix, permissions, is_active,
                          expires_at, last_used_at, usage_count, created_at
                """,
                (key_id, current_user['id'])
            )
            updated_key = cursor.fetchone()

        if not updated_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found or access denied"
            )

        return ApiKeyResponse(**dict(updated_key))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error toggling API key"
        )
