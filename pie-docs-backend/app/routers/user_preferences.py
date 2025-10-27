"""
User Preferences Router
Handles user-specific preferences and settings
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from app.database import get_db_cursor
from app.middleware import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/user-preferences",
    tags=["user-preferences"]
)


# ============= Request/Response Models =============

class UserPreferencesResponse(BaseModel):
    id: str
    user_id: str
    theme: str = "dark"
    language: str = "en"
    timezone: str = "UTC"
    date_format: str = "MM/DD/YYYY"
    time_format: str = "12h"
    notifications_email: bool = True
    notifications_inapp: bool = True
    notifications_push: bool = False
    default_document_view: str = "grid"
    sidebar_collapsed: bool = False
    email_digest_frequency: str = "daily"


class UpdateUserPreferencesRequest(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    notifications_email: Optional[bool] = None
    notifications_inapp: Optional[bool] = None
    notifications_push: Optional[bool] = None
    default_document_view: Optional[str] = None
    sidebar_collapsed: Optional[bool] = None
    email_digest_frequency: Optional[str] = None


# ============= User Preferences Endpoints =============

@router.get("", response_model=UserPreferencesResponse)
async def get_user_preferences(current_user: dict = Depends(get_current_user)):
    """
    Get current user's preferences

    - Requires authentication
    - Returns user preferences, creates default if not exists
    """
    try:
        with get_db_cursor() as cursor:
            # Try to get existing preferences
            cursor.execute(
                """
                SELECT id, user_id, theme, language, timezone, date_format, time_format,
                       notifications_email, notifications_inapp, notifications_push,
                       default_document_view, sidebar_collapsed, email_digest_frequency
                FROM user_preferences
                WHERE user_id = %s
                """,
                (current_user['id'],)
            )
            preferences = cursor.fetchone()

        # If no preferences exist, create default ones
        if not preferences:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO user_preferences (user_id)
                    VALUES (%s)
                    RETURNING id, user_id, theme, language, timezone, date_format, time_format,
                              notifications_email, notifications_inapp, notifications_push,
                              default_document_view, sidebar_collapsed, email_digest_frequency
                    """,
                    (current_user['id'],)
                )
                preferences = cursor.fetchone()

        return UserPreferencesResponse(**dict(preferences))

    except Exception as e:
        logger.error(f"Error fetching user preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching user preferences"
        )


@router.patch("", response_model=UserPreferencesResponse)
async def update_user_preferences(
    request: UpdateUserPreferencesRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user's preferences

    - Requires authentication
    - Updates only provided fields
    - Returns updated preferences
    """
    try:
        # Build dynamic update query
        update_fields = []
        params = []

        for field, value in request.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                params.append(value)

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        params.append(current_user['id'])

        with get_db_cursor(commit=True) as cursor:
            query = f"""
                UPDATE user_preferences
                SET {', '.join(update_fields)}, updated_at = NOW()
                WHERE user_id = %s
                RETURNING id, user_id, theme, language, timezone, date_format, time_format,
                          notifications_email, notifications_inapp, notifications_push,
                          default_document_view, sidebar_collapsed, email_digest_frequency
            """
            cursor.execute(query, params)
            updated_preferences = cursor.fetchone()

        if not updated_preferences:
            # If preferences don't exist, create them with provided values
            with get_db_cursor(commit=True) as cursor:
                insert_fields = ['user_id'] + list(request.dict(exclude_unset=True).keys())
                insert_values = [current_user['id']] + [v for v in request.dict(exclude_unset=True).values()]
                placeholders = ', '.join(['%s'] * len(insert_values))

                cursor.execute(
                    f"""
                    INSERT INTO user_preferences ({', '.join(insert_fields)})
                    VALUES ({placeholders})
                    RETURNING id, user_id, theme, language, timezone, date_format, time_format,
                              notifications_email, notifications_inapp, notifications_push,
                              default_document_view, sidebar_collapsed, email_digest_frequency
                    """,
                    insert_values
                )
                updated_preferences = cursor.fetchone()

        return UserPreferencesResponse(**dict(updated_preferences))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user preferences"
        )
