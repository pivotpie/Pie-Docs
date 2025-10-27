"""
Settings Router
Handles system settings management
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import json

from app.database import get_db_cursor
from app.middleware import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/settings",
    tags=["settings"]
)


# ============= Request/Response Models =============

class SettingResponse(BaseModel):
    setting_key: str
    setting_value: Any
    value_type: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_public: bool = False


class SettingsListResponse(BaseModel):
    settings: list[SettingResponse]
    total: int


class UpdateSettingRequest(BaseModel):
    setting_value: Any
    description: Optional[str] = None


class MessageResponse(BaseModel):
    message: str


# ============= Settings Endpoints =============

@router.get("", response_model=SettingsListResponse, status_code=status.HTTP_200_OK)
async def get_settings(
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all system settings or filter by category/visibility

    - Requires authentication
    - Returns list of settings
    - Can filter by category or public/private settings
    """
    try:
        query = """
            SELECT setting_key, setting_value, value_type, description, category, is_public, is_encrypted
            FROM system_settings
            WHERE 1=1
        """
        params = []

        if category:
            query += " AND category = %s"
            params.append(category)

        if is_public is not None:
            query += " AND is_public = %s"
            params.append(is_public)

        query += " ORDER BY category, setting_key"

        with get_db_cursor() as cursor:
            cursor.execute(query, params)
            settings = cursor.fetchall()

        # Parse JSON values
        settings_list = []
        for setting in settings:
            setting_dict = dict(setting)

            # Parse JSONB value
            if isinstance(setting_dict['setting_value'], str):
                try:
                    setting_dict['setting_value'] = json.loads(setting_dict['setting_value'])
                except json.JSONDecodeError:
                    pass  # Keep as string if not valid JSON

            # Don't expose encrypted values
            if setting_dict.get('is_encrypted'):
                setting_dict['setting_value'] = "***ENCRYPTED***"

            settings_list.append(SettingResponse(**setting_dict))

        return SettingsListResponse(
            settings=settings_list,
            total=len(settings_list)
        )

    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching settings"
        )


@router.get("/{setting_key}", response_model=SettingResponse, status_code=status.HTTP_200_OK)
async def get_setting(
    setting_key: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific system setting by key

    - Requires authentication
    - Returns setting details
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT setting_key, setting_value, value_type, description, category, is_public, is_encrypted
                FROM system_settings
                WHERE setting_key = %s
                """,
                (setting_key,)
            )
            setting = cursor.fetchone()

        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting '{setting_key}' not found"
            )

        setting_dict = dict(setting)

        # Parse JSONB value
        if isinstance(setting_dict['setting_value'], str):
            try:
                setting_dict['setting_value'] = json.loads(setting_dict['setting_value'])
            except json.JSONDecodeError:
                pass

        # Don't expose encrypted values
        if setting_dict.get('is_encrypted'):
            setting_dict['setting_value'] = "***ENCRYPTED***"

        return SettingResponse(**setting_dict)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching setting: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching the setting"
        )


@router.patch("/{setting_key}", response_model=SettingResponse, status_code=status.HTTP_200_OK)
async def update_setting(
    setting_key: str,
    request: UpdateSettingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a system setting

    - Requires authentication
    - Updates setting value and optionally description
    - Returns updated setting
    """
    try:
        # Check if setting exists
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT value_type, is_encrypted FROM system_settings WHERE setting_key = %s",
                (setting_key,)
            )
            existing_setting = cursor.fetchone()

        if not existing_setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting '{setting_key}' not found"
            )

        # Convert value to JSON string for JSONB storage
        value_for_db = json.dumps(request.setting_value) if not isinstance(request.setting_value, str) else request.setting_value

        # Update setting
        with get_db_cursor(commit=True) as cursor:
            update_query = """
                UPDATE system_settings
                SET setting_value = %s::jsonb,
                    description = COALESCE(%s, description),
                    updated_by = %s,
                    updated_at = NOW()
                WHERE setting_key = %s
                RETURNING setting_key, setting_value, value_type, description, category, is_public, is_encrypted
            """
            cursor.execute(
                update_query,
                (value_for_db, request.description, current_user['id'], setting_key)
            )
            updated_setting = cursor.fetchone()

        if not updated_setting:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update setting"
            )

        setting_dict = dict(updated_setting)

        # Parse JSONB value
        if isinstance(setting_dict['setting_value'], str):
            try:
                setting_dict['setting_value'] = json.loads(setting_dict['setting_value'])
            except json.JSONDecodeError:
                pass

        # Don't expose encrypted values
        if setting_dict.get('is_encrypted'):
            setting_dict['setting_value'] = "***ENCRYPTED***"

        # Log audit event
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    SELECT log_audit_event(
                        'setting_update',
                        'setting_changed',
                        %s,
                        'system_setting',
                        NULL,
                        %s
                    )
                    """,
                    (current_user['id'], f"Setting '{setting_key}' updated")
                )
        except Exception as e:
            logger.error(f"Error logging audit event: {e}")

        return SettingResponse(**setting_dict)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating setting: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the setting"
        )


@router.get("/categories/list", status_code=status.HTTP_200_OK)
async def get_setting_categories(current_user: dict = Depends(get_current_user)):
    """
    Get list of all setting categories

    - Requires authentication
    - Returns unique categories
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT category
                FROM system_settings
                WHERE category IS NOT NULL
                ORDER BY category
                """
            )
            categories = cursor.fetchall()

        return {
            "categories": [row['category'] for row in categories]
        }

    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching categories"
        )
