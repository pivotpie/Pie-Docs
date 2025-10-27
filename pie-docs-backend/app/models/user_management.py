"""
User Management Models
Pydantic models for User, Role, and Permission management API
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID


# ==========================================
# Permission Models
# ==========================================

class PermissionBase(BaseModel):
    name: str = Field(..., description="Unique permission name (e.g., 'users.view')")
    display_name: str = Field(..., description="Human-readable permission name")
    description: Optional[str] = Field(None, description="Permission description")
    resource: str = Field(..., description="Resource this permission applies to")
    action: str = Field(..., description="Action allowed by this permission")


class PermissionCreate(PermissionBase):
    is_system_permission: bool = Field(False, description="Whether this is a system permission")


class PermissionUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None


class Permission(PermissionBase):
    id: UUID
    is_system_permission: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Role Models
# ==========================================

class RoleBase(BaseModel):
    name: str = Field(..., description="Unique role name")
    display_name: str = Field(..., description="Human-readable role name")
    description: Optional[str] = Field(None, description="Role description")
    priority: int = Field(500, description="Role priority (higher = more important)")


class RoleCreate(RoleBase):
    is_system_role: bool = Field(False, description="Whether this is a system role")
    permission_ids: List[UUID] = Field([], description="List of permission IDs to assign")


class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class Role(RoleBase):
    id: UUID
    is_system_role: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class RoleWithPermissions(Role):
    permissions: List[Permission] = []
    permission_count: int = 0


class RolePermissionAssignment(BaseModel):
    role_id: UUID
    permission_ids: List[UUID]
    granted_by: Optional[UUID] = None


# ==========================================
# User Models
# ==========================================

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=255, description="Unique username")
    email: EmailStr = Field(..., description="User email address")
    first_name: Optional[str] = Field(None, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=50)

    @validator('username')
    def username_alphanumeric(cls, v):
        assert v.replace('_', '').replace('-', '').isalnum(), 'Username must be alphanumeric (with _ or -)'
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    is_active: bool = Field(True, description="Whether user is active")
    is_verified: bool = Field(False, description="Whether user email is verified")
    role_ids: List[UUID] = Field([], description="List of role IDs to assign")

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v


class User(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_superuser: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class UserWithRoles(User):
    roles: List[Role] = []
    role_names: List[str] = []


class UserWithPermissions(UserWithRoles):
    permissions: List[Permission] = []


class UserRoleAssignment(BaseModel):
    user_id: UUID
    role_ids: List[UUID]
    assigned_by: Optional[UUID] = None
    expires_at: Optional[datetime] = None


# ==========================================
# Authentication Models
# ==========================================

class UserLogin(BaseModel):
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: User


class TokenData(BaseModel):
    user_id: UUID
    username: str
    email: str
    roles: List[str] = []
    permissions: List[str] = []


# ==========================================
# Session Models
# ==========================================

class UserSession(BaseModel):
    id: UUID
    user_id: UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool
    created_at: datetime
    expires_at: datetime
    last_activity: datetime

    class Config:
        from_attributes = True


# ==========================================
# Audit Log Models
# ==========================================

class AuditLogEntry(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    resource_type: str
    resource_id: Optional[UUID] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogCreate(BaseModel):
    user_id: Optional[UUID] = None
    action: str
    resource_type: str
    resource_id: Optional[UUID] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


# ==========================================
# Response Models
# ==========================================

class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[Any]


class UserListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    users: List[UserWithRoles]


class RoleListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    roles: List[RoleWithPermissions]


class PermissionListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    permissions: List[Permission]


class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None
