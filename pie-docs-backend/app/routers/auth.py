"""
Authentication Router
Handles all authentication-related endpoints
"""

from fastapi import APIRouter, HTTPException, status, Header, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from app.services.auth_service import auth_service
from app.database import get_db_cursor

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["authentication"]
)


# ============= Request/Response Models =============

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict
    requires_mfa: bool = False
    mfa_session_id: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MFAVerifyRequest(BaseModel):
    session_id: str
    code: str


class MFAResendRequest(BaseModel):
    session_id: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class MessageResponse(BaseModel):
    message: str


# ============= Authentication Endpoints =============

@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(request: LoginRequest, http_request: Request):
    """
    User login endpoint

    - Authenticates user with username/password
    - Returns JWT tokens if successful
    - Returns MFA session if MFA is enabled
    """
    try:
        logger.info(f"Login attempt for user: {request.username}")
        # Authenticate user
        user = auth_service.authenticate_user(request.username, request.password)
        logger.info(f"Authentication result: {user is not None}")

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if MFA is enabled
        if user.get('mfa_enabled'):
            # Create MFA session
            mfa_session_id = auth_service.create_mfa_session(str(user['id']))

            if not mfa_session_id:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create MFA session"
                )

            return LoginResponse(
                access_token="",
                refresh_token="",
                user={"id": str(user['id']), "username": user['username']},
                requires_mfa=True,
                mfa_session_id=mfa_session_id
            )

        # Create tokens
        user_id = str(user['id'])
        token_data = {
            "sub": user_id,
            "username": user['username'],
            "email": user['email']
        }

        access_token = auth_service.create_access_token(token_data)
        refresh_token = auth_service.create_refresh_token(token_data)

        # Store tokens
        client_host = http_request.client.host if http_request.client else None
        user_agent = http_request.headers.get("user-agent")

        auth_service.store_token(user_id, access_token, "access", client_host, user_agent)
        auth_service.store_token(user_id, refresh_token, "refresh", client_host, user_agent)

        # Log audit event
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    SELECT log_audit_event(
                        'login',
                        'successful_login',
                        %s,
                        'user',
                        %s,
                        'User logged in successfully'
                    )
                    """,
                    (user_id, user_id)
                )
        except Exception as e:
            logger.error(f"Error logging audit event: {e}")

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user_id,
                "username": user['username'],
                "email": user['email'],
                "full_name": user.get('full_name')
            },
            requires_mfa=False
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )


@router.post("/logout", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def logout(authorization: Optional[str] = Header(None)):
    """
    User logout endpoint

    - Revokes/blacklists the current access token
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )

        token = authorization.split(" ")[1]

        # Verify token and get user
        payload = auth_service.verify_token(token, "access")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        user_id = payload.get("sub")

        # Blacklist token
        auth_service.blacklist_token(token, user_id)

        # Log audit event
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    SELECT log_audit_event(
                        'logout',
                        'successful_logout',
                        %s,
                        'user',
                        %s,
                        'User logged out successfully'
                    )
                    """,
                    (user_id, user_id)
                )
        except Exception as e:
            logger.error(f"Error logging audit event: {e}")

        return MessageResponse(message="Logged out successfully")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during logout"
        )


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token using refresh token

    - Accepts a valid refresh token
    - Returns new access and refresh tokens
    """
    try:
        # Verify refresh token
        payload = auth_service.verify_token(request.refresh_token, "refresh")

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )

        user_id = payload.get("sub")

        # Create new tokens
        token_data = {
            "sub": user_id,
            "username": payload.get("username"),
            "email": payload.get("email")
        }

        new_access_token = auth_service.create_access_token(token_data)
        new_refresh_token = auth_service.create_refresh_token(token_data)

        # Store new tokens
        auth_service.store_token(user_id, new_access_token, "access")
        auth_service.store_token(user_id, new_refresh_token, "refresh")

        # Blacklist old refresh token
        auth_service.blacklist_token(request.refresh_token, user_id)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during token refresh"
        )


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Get current authenticated user information

    - Requires valid access token in Authorization header
    - Returns user profile data
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )

        token = authorization.split(" ")[1]

        # Verify token
        payload = auth_service.verify_token(token, "access")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        user_id = payload.get("sub")

        # Get user details
        user = auth_service.get_user_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching user data"
        )


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def forgot_password(request: ForgotPasswordRequest):
    """
    Request password reset

    - Sends password reset email with token
    - Token valid for 1 hour
    """
    try:
        # Get user by email
        user = auth_service.get_user_by_email(request.email)

        # Always return success to prevent email enumeration
        if not user:
            logger.warning(f"Password reset requested for non-existent email: {request.email}")
            return MessageResponse(message="If the email exists, a password reset link has been sent")

        user_id = str(user['id'])

        # Create password reset token
        reset_token = auth_service.create_password_reset_token(user_id)

        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create password reset token"
            )

        # TODO: Send email with reset link
        # In production: send email with reset link containing the token
        # reset_link = f"https://your-domain.com/reset-password?token={reset_token}"
        logger.info(f"Password reset token for {request.email}: {reset_token}")

        # Log audit event
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    SELECT log_audit_event(
                        'password_reset',
                        'reset_requested',
                        %s,
                        'user',
                        %s,
                        'Password reset requested'
                    )
                    """,
                    (user_id, user_id)
                )
        except Exception as e:
            logger.error(f"Error logging audit event: {e}")

        return MessageResponse(message="If the email exists, a password reset link has been sent")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing password reset request"
        )


@router.post("/reset-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def reset_password(request: ResetPasswordRequest):
    """
    Reset password using reset token

    - Verifies reset token
    - Updates user password
    """
    try:
        # Validate password length
        if len(request.new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )

        # Reset password
        success = auth_service.reset_password(request.token, request.new_password)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        return MessageResponse(message="Password reset successfully")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resetting password"
        )


@router.post("/mfa/verify", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def verify_mfa(request: MFAVerifyRequest, http_request: Request):
    """
    Verify MFA code and complete login

    - Verifies the MFA code
    - Returns JWT tokens if successful
    """
    try:
        # Verify MFA code
        user_id = auth_service.verify_mfa_session(request.session_id, request.code)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired MFA code"
            )

        # Get user details
        user = auth_service.get_user_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Create tokens
        token_data = {
            "sub": user_id,
            "username": user['username'],
            "email": user['email']
        }

        access_token = auth_service.create_access_token(token_data)
        refresh_token = auth_service.create_refresh_token(token_data)

        # Store tokens
        client_host = http_request.client.host if http_request.client else None
        user_agent = http_request.headers.get("user-agent")

        auth_service.store_token(user_id, access_token, "access", client_host, user_agent)
        auth_service.store_token(user_id, refresh_token, "refresh", client_host, user_agent)

        # Log audit event
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    SELECT log_audit_event(
                        'mfa_verify',
                        'successful_mfa_verification',
                        %s,
                        'user',
                        %s,
                        'MFA verification successful'
                    )
                    """,
                    (user_id, user_id)
                )
        except Exception as e:
            logger.error(f"Error logging audit event: {e}")

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user_id,
                "username": user['username'],
                "email": user['email'],
                "full_name": user.get('full_name')
            },
            requires_mfa=False
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MFA verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during MFA verification"
        )


@router.post("/mfa/resend", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def resend_mfa_code(request: MFAResendRequest):
    """
    Resend MFA code

    - Generates and sends a new MFA code for the session
    """
    try:
        # Get the session details
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT user_id FROM mfa_codes
                WHERE session_id = %s AND verified = false AND expires_at > NOW()
                """,
                (request.session_id,)
            )
            result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="MFA session not found or expired"
            )

        user_id = str(result['user_id'])

        # Create new MFA session (this will generate a new code)
        new_session_id = auth_service.create_mfa_session(user_id)

        if not new_session_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to resend MFA code"
            )

        return MessageResponse(message=f"MFA code resent. New session ID: {new_session_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend MFA code error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resending MFA code"
        )
