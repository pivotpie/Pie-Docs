"""
Check-in/Check-out Pydantic models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# ==========================================
# Checkout Record Models
# ==========================================

class CheckoutRecordBase(BaseModel):
    document_id: UUID
    user_name: str
    user_department: Optional[str] = None
    due_date: Optional[datetime] = None
    reason: Optional[str] = None
    checkout_notes: Optional[str] = None


class CheckoutRecordCreate(CheckoutRecordBase):
    user_id: Optional[UUID] = None
    version_at_checkout: Optional[str] = None


class CheckoutRecordUpdate(BaseModel):
    checkin_notes: Optional[str] = None
    version_at_checkin: Optional[str] = None


class CheckoutRecord(CheckoutRecordBase):
    id: UUID
    user_id: Optional[UUID] = None
    status: str  # checked-out, checked-in, expired, force-checkin
    checkout_date: datetime
    checkin_date: Optional[datetime] = None
    lock_expiry: Optional[datetime] = None
    version_at_checkout: Optional[str] = None
    version_at_checkin: Optional[str] = None
    checkin_notes: Optional[str] = None
    document_snapshot: Optional[Dict[str, Any]] = None
    is_overdue: bool = False
    is_active: bool = True
    was_forced: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CheckoutRecordListResponse(BaseModel):
    records: List[CheckoutRecord]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==========================================
# Document Lock Models
# ==========================================

class DocumentLockBase(BaseModel):
    document_id: UUID
    lock_type: str = 'exclusive'  # exclusive, shared, read-only
    lock_reason: Optional[str] = None
    expires_at: Optional[datetime] = None


class DocumentLockCreate(DocumentLockBase):
    locked_by: UUID
    checkout_record_id: Optional[UUID] = None
    session_id: Optional[UUID] = None


class DocumentLock(DocumentLockBase):
    id: UUID
    checkout_record_id: Optional[UUID] = None
    locked_by: UUID
    locked_at: datetime
    released_at: Optional[datetime] = None
    is_active: bool = True
    session_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Checkout Notification Models
# ==========================================

class CheckoutNotificationBase(BaseModel):
    checkout_record_id: UUID
    notification_type: str  # reminder, overdue, forced-checkin
    scheduled_for: datetime
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CheckoutNotificationCreate(CheckoutNotificationBase):
    pass


class CheckoutNotification(CheckoutNotificationBase):
    id: UUID
    notification_status: str = 'pending'  # pending, sent, failed
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Checkout Audit Models
# ==========================================

class CheckoutAuditBase(BaseModel):
    document_id: UUID
    action_type: str  # checkout, checkin, extend, force-checkin, expire
    action_details: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None


class CheckoutAuditCreate(CheckoutAuditBase):
    checkout_record_id: Optional[UUID] = None
    performed_by: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class CheckoutAudit(CheckoutAuditBase):
    id: UUID
    checkout_record_id: Optional[UUID] = None
    performed_by: Optional[UUID] = None
    performed_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Request/Response Models
# ==========================================

class CheckoutRequest(BaseModel):
    document_id: UUID
    reason: Optional[str] = None
    due_date: Optional[datetime] = None
    checkout_notes: Optional[str] = None


class CheckinRequest(BaseModel):
    checkout_record_id: UUID
    checkin_notes: Optional[str] = None
    version_number: Optional[str] = None


class ExtendCheckoutRequest(BaseModel):
    checkout_record_id: UUID
    new_due_date: datetime
    reason: Optional[str] = None


class ForceCheckinRequest(BaseModel):
    checkout_record_id: UUID
    reason: str
    admin_override: bool = False


class CheckoutStatusResponse(BaseModel):
    is_checked_out: bool
    checked_out_by: Optional[str] = None
    checkout_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    is_overdue: bool = False
    can_force_checkin: bool = False
    lock_info: Optional[DocumentLock] = None


class CheckoutAnalytics(BaseModel):
    total_active_checkouts: int
    total_overdue: int
    total_checked_in_today: int
    avg_checkout_duration_hours: float
    checkouts_by_department: Dict[str, int]
    most_checked_out_documents: List[Dict[str, Any]]
    overdue_checkouts: List[CheckoutRecord]
