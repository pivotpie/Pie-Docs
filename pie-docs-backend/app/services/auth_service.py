"""
Authentication Service
Handles JWT tokens, password hashing, MFA, and user authentication
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
import secrets
import hashlib
import pyotp
import logging

from app.config import settings
from app.database import get_db_cursor

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service for user management"""

    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS

    # ============= Password Hashing =============

    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            password_bytes = plain_password.encode('utf-8')
            hashed_bytes = hashed_password.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False

    # ============= JWT Token Management =============

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)

        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

        return encoded_jwt

    def create_refresh_token(self, data: dict) -> str:
        """Create a JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

        return encoded_jwt

    def verify_token(self, token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """
        Verify and decode a JWT token
        Returns payload if valid, None if invalid
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Verify token type
            if payload.get("type") != token_type:
                logger.warning(f"Invalid token type. Expected {token_type}, got {payload.get('type')}")
                return None

            # Check if token is blacklisted
            token_hash = self._hash_token(token)
            if self._is_token_blacklisted(token_hash):
                logger.warning("Token is blacklisted")
                return None

            return payload

        except JWTError as e:
            logger.error(f"JWT verification error: {e}")
            return None

    def _hash_token(self, token: str) -> str:
        """Create a hash of the token for storage"""
        return hashlib.sha256(token.encode()).hexdigest()

    def _is_token_blacklisted(self, token_hash: str) -> bool:
        """Check if a token is blacklisted/revoked"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT revoked FROM auth_tokens
                    WHERE token_hash = %s AND expires_at > NOW()
                    """,
                    (token_hash,)
                )
                result = cursor.fetchone()
                return result and result['revoked']
        except Exception as e:
            logger.error(f"Error checking token blacklist: {e}")
            return False

    def blacklist_token(self, token: str, user_id: str) -> bool:
        """Blacklist/revoke a token"""
        try:
            token_hash = self._hash_token(token)
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    UPDATE auth_tokens
                    SET revoked = true, revoked_at = NOW()
                    WHERE token_hash = %s AND user_id = %s
                    """,
                    (token_hash, user_id)
                )
            return True
        except Exception as e:
            logger.error(f"Error blacklisting token: {e}")
            return False

    def store_token(self, user_id: str, token: str, token_type: str,
                    ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> bool:
        """Store token in database"""
        try:
            token_hash = self._hash_token(token)
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            expires_at = datetime.fromtimestamp(payload['exp'])

            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO auth_tokens (user_id, token_hash, token_type, expires_at, ip_address, user_agent)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (token_hash) DO UPDATE
                    SET ip_address = EXCLUDED.ip_address,
                        user_agent = EXCLUDED.user_agent
                    """,
                    (user_id, token_hash, token_type, expires_at, ip_address, user_agent)
                )
            return True
        except Exception as e:
            logger.error(f"Error storing token: {e}")
            return False

    # ============= User Authentication =============

    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate a user by username and password
        Returns user data if successful, None if failed
        """
        try:
            with get_db_cursor() as cursor:
                # Get user by username or email
                cursor.execute(
                    """
                    SELECT id, username, email, password_hash, is_active,
                           failed_login_attempts, locked_until, mfa_enabled
                    FROM users
                    WHERE (username = %s OR email = %s) AND deleted_at IS NULL
                    """,
                    (username, username)
                )
                user = cursor.fetchone()

            if not user:
                logger.warning(f"User not found: {username}")
                return None

            # Check if account is locked
            if user['locked_until'] and user['locked_until'] > datetime.utcnow():
                logger.warning(f"Account locked: {username}")
                return None

            # Check if user is active
            if not user['is_active']:
                logger.warning(f"Inactive user: {username}")
                return None

            # Verify password
            if not self.verify_password(password, user['password_hash']):
                self._handle_failed_login(user['id'])
                logger.warning(f"Invalid password for user: {username}")
                return None

            # Reset failed login attempts on successful login
            self._reset_failed_login_attempts(user['id'])

            # Update last login
            self._update_last_login(user['id'])

            return dict(user)

        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None

    def _handle_failed_login(self, user_id: str):
        """Handle failed login attempt"""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    UPDATE users
                    SET failed_login_attempts = failed_login_attempts + 1,
                        locked_until = CASE
                            WHEN failed_login_attempts + 1 >= %s
                            THEN NOW() + INTERVAL '%s minutes'
                            ELSE locked_until
                        END
                    WHERE id = %s
                    """,
                    (settings.MAX_LOGIN_ATTEMPTS, settings.ACCOUNT_LOCKOUT_MINUTES, user_id)
                )
        except Exception as e:
            logger.error(f"Error handling failed login: {e}")

    def _reset_failed_login_attempts(self, user_id: str):
        """Reset failed login attempts"""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    UPDATE users
                    SET failed_login_attempts = 0, locked_until = NULL
                    WHERE id = %s
                    """,
                    (user_id,)
                )
        except Exception as e:
            logger.error(f"Error resetting failed login attempts: {e}")

    def _update_last_login(self, user_id: str):
        """Update last login timestamp"""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    UPDATE users
                    SET last_login = NOW()
                    WHERE id = %s
                    """,
                    (user_id,)
                )
        except Exception as e:
            logger.error(f"Error updating last login: {e}")

    # ============= Multi-Factor Authentication (MFA) =============

    def generate_mfa_secret(self) -> str:
        """Generate a new MFA secret"""
        return pyotp.random_base32()

    def verify_mfa_code(self, secret: str, code: str) -> bool:
        """Verify a MFA code"""
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)

    def create_mfa_session(self, user_id: str) -> str:
        """Create a MFA verification session"""
        try:
            session_id = secrets.token_urlsafe(32)
            code = str(secrets.randbelow(1000000)).zfill(6)  # 6-digit code
            code_hash = self.hash_password(code)

            expires_at = datetime.utcnow() + timedelta(minutes=settings.MFA_CODE_EXPIRE_MINUTES)

            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO mfa_codes (user_id, code_hash, session_id, expires_at)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (user_id, code_hash, session_id, expires_at)
                )

            # In production, send this code via email/SMS
            logger.info(f"MFA code for user {user_id}: {code}")

            return session_id

        except Exception as e:
            logger.error(f"Error creating MFA session: {e}")
            return None

    def verify_mfa_session(self, session_id: str, code: str) -> Optional[str]:
        """
        Verify MFA code for a session
        Returns user_id if successful
        """
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    SELECT user_id, code_hash, expires_at, attempts, verified
                    FROM mfa_codes
                    WHERE session_id = %s AND verified = false
                    """,
                    (session_id,)
                )
                mfa_session = cursor.fetchone()

            if not mfa_session:
                logger.warning(f"MFA session not found: {session_id}")
                return None

            # Check if expired
            if mfa_session['expires_at'] < datetime.utcnow():
                logger.warning(f"MFA session expired: {session_id}")
                return None

            # Check attempts limit
            if mfa_session['attempts'] >= 3:
                logger.warning(f"MFA max attempts exceeded: {session_id}")
                return None

            # Verify code
            if not self.verify_password(code, mfa_session['code_hash']):
                # Increment attempts
                with get_db_cursor(commit=True) as cursor:
                    cursor.execute(
                        """
                        UPDATE mfa_codes
                        SET attempts = attempts + 1
                        WHERE session_id = %s
                        """,
                        (session_id,)
                    )
                logger.warning(f"Invalid MFA code for session: {session_id}")
                return None

            # Mark as verified
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    UPDATE mfa_codes
                    SET verified = true, verified_at = NOW()
                    WHERE session_id = %s
                    """,
                    (session_id,)
                )

            return mfa_session['user_id']

        except Exception as e:
            logger.error(f"Error verifying MFA session: {e}")
            return None

    # ============= Password Reset =============

    def create_password_reset_token(self, user_id: str) -> Optional[str]:
        """Create a password reset token"""
        try:
            token = secrets.token_urlsafe(32)
            token_hash = self._hash_token(token)
            expires_at = datetime.utcnow() + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                    VALUES (%s, %s, %s)
                    """,
                    (user_id, token_hash, expires_at)
                )

            return token

        except Exception as e:
            logger.error(f"Error creating password reset token: {e}")
            return None

    def verify_password_reset_token(self, token: str) -> Optional[str]:
        """
        Verify password reset token
        Returns user_id if valid
        """
        try:
            token_hash = self._hash_token(token)

            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT user_id, expires_at, used
                    FROM password_reset_tokens
                    WHERE token_hash = %s AND used = false
                    """,
                    (token_hash,)
                )
                reset_token = cursor.fetchone()

            if not reset_token:
                logger.warning("Password reset token not found")
                return None

            # Check if expired
            if reset_token['expires_at'] < datetime.utcnow():
                logger.warning("Password reset token expired")
                return None

            return reset_token['user_id']

        except Exception as e:
            logger.error(f"Error verifying password reset token: {e}")
            return None

    def reset_password(self, token: str, new_password: str) -> bool:
        """Reset user password using reset token"""
        try:
            user_id = self.verify_password_reset_token(token)
            if not user_id:
                return False

            token_hash = self._hash_token(token)
            password_hash = self.hash_password(new_password)

            with get_db_cursor(commit=True) as cursor:
                # Update password
                cursor.execute(
                    """
                    UPDATE users
                    SET password_hash = %s, password_changed_at = NOW()
                    WHERE id = %s
                    """,
                    (password_hash, user_id)
                )

                # Mark token as used
                cursor.execute(
                    """
                    UPDATE password_reset_tokens
                    SET used = true, used_at = NOW()
                    WHERE token_hash = %s
                    """,
                    (token_hash,)
                )

            logger.info(f"Password reset successful for user: {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error resetting password: {e}")
            return False

    # ============= User Management =============

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, username, email, full_name, is_active,
                           created_at, last_login, mfa_enabled
                    FROM users
                    WHERE id = %s AND deleted_at IS NULL
                    """,
                    (user_id,)
                )
                user = cursor.fetchone()

            return dict(user) if user else None

        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, username, email, full_name, is_active
                    FROM users
                    WHERE email = %s AND deleted_at IS NULL
                    """,
                    (email,)
                )
                user = cursor.fetchone()

            return dict(user) if user else None

        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None


# Global auth service instance
auth_service = AuthService()
