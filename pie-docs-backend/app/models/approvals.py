"""
Approval workflow Pydantic models
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# ==========================================
# Approval Chain Models
# ==========================================

class ApprovalChainBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    document_types: List[str] = []


class ApprovalChainCreate(ApprovalChainBase):
    pass


class ApprovalChainUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    document_types: Optional[List[str]] = None


class ApprovalChain(ApprovalChainBase):
    id: UUID
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Approval Chain Step Models
# ==========================================

class ApprovalChainStepBase(BaseModel):
    chain_id: UUID
    step_number: int
    name: str
    approver_ids: List[UUID]
    parallel_approval: bool = False
    consensus_type: str = "unanimous"  # unanimous, majority, any
    timeout_days: int = 3
    escalation_chain: List[UUID] = []
    conditions: Dict[str, Any] = {}
    is_optional: bool = False


class ApprovalChainStepCreate(ApprovalChainStepBase):
    pass


class ApprovalChainStepUpdate(BaseModel):
    name: Optional[str] = None
    approver_ids: Optional[List[UUID]] = None
    parallel_approval: Optional[bool] = None
    consensus_type: Optional[str] = None
    timeout_days: Optional[int] = None
    escalation_chain: Optional[List[UUID]] = None
    conditions: Optional[Dict[str, Any]] = None
    is_optional: Optional[bool] = None


class ApprovalChainStep(ApprovalChainStepBase):
    id: UUID

    class Config:
        from_attributes = True


# ==========================================
# Approval Request Models
# ==========================================

class ApprovalRequestBase(BaseModel):
    document_id: UUID
    chain_id: Optional[UUID] = None
    request_message: Optional[str] = None
    priority: str = "medium"  # low, medium, high, urgent
    parallel_approval_required: bool = False
    consensus_type: str = "unanimous"
    assigned_to: List[UUID] = []
    deadline: Optional[datetime] = None
    metadata: Dict[str, Any] = {}
    workflow_id: Optional[UUID] = None
    requires_all_approvers: bool = False
    due_date: Optional[datetime] = None


class ApprovalRequestCreate(ApprovalRequestBase):
    pass


class ApprovalRequestUpdate(BaseModel):
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class ApprovalRequest(ApprovalRequestBase):
    id: UUID
    requester_id: Optional[UUID] = None
    current_step: int = 1
    total_steps: Optional[int] = None
    status: str = "pending"  # pending, approved, rejected, cancelled
    escalation_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApprovalRequestListResponse(BaseModel):
    requests: List[ApprovalRequest]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==========================================
# Approval Action Models
# ==========================================

class ApprovalActionBase(BaseModel):
    approval_request_id: UUID
    action: str  # approve, reject, delegate, comment
    comments: Optional[str] = None
    annotations: Dict[str, Any] = {}


class ApprovalActionCreate(BaseModel):
    user_id: UUID
    comments: Optional[str] = None
    annotations: Dict[str, Any] = {}


class ApprovalAction(ApprovalActionBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Approval Step Models
# ==========================================

class ApprovalStepBase(BaseModel):
    approval_id: UUID
    approver_id: UUID
    approver_role_id: Optional[UUID] = None
    step_order: int
    step_name: Optional[str] = None
    due_date: Optional[datetime] = None


class ApprovalStepCreate(ApprovalStepBase):
    pass


class ApprovalStep(ApprovalStepBase):
    id: UUID
    status: str = "pending"  # pending, approved, rejected, skipped
    decision: Optional[str] = None
    decision_comment: Optional[str] = None
    decided_at: Optional[datetime] = None
    notified_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# Routing Rule Models
# ==========================================

class RoutingRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    conditions: Dict[str, Any]
    target_chain_id: UUID
    priority: int = 0
    is_active: bool = True


class RoutingRuleCreate(RoutingRuleBase):
    pass


class RoutingRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    target_chain_id: Optional[UUID] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class RoutingRule(RoutingRuleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Bulk Operations Models
# ==========================================

class BulkApprovalAction(BaseModel):
    approval_ids: List[UUID]
    action: str  # approve, reject, request_changes
    comments: Optional[str] = None
    user_id: UUID


class BulkApprovalResult(BaseModel):
    succeeded: List[UUID]
    failed: List[Dict[str, Any]]
    total: int
    success_count: int
    failure_count: int
