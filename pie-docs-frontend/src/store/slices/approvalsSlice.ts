import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { generateAuditLogChecksum, createAuditChainChecksum } from '@/utils/crypto';
import { approvalsApi } from '@/services/api/approvalsService';

export interface ApprovalRequest {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  documentUrl: string;
  requester: {
    id: string;
    name: string;
    email: string;
  };
  currentStep: number;
  totalSteps: number;
  chainId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline: Date | null;
  escalationDate: Date | null;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'changes_requested' | 'escalated';
  assignedTo: string[];
  parallelApprovalRequired: boolean;
  consensusType: 'unanimous' | 'majority' | 'weighted' | 'any';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalAction {
  id: string;
  approvalId: string;
  userId: string;
  userName: string;
  action: 'approve' | 'reject' | 'request_changes' | 'escalate';
  comments: string;
  annotations: DocumentAnnotation[];
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DocumentAnnotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  type: 'comment' | 'highlight' | 'redaction';
}

export interface ApprovalChain {
  id: string;
  name: string;
  description: string;
  steps: ApprovalStep[];
  isActive: boolean;
  documentTypes: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalStep {
  id: string;
  stepNumber: number;
  name: string;
  approvers: string[];
  parallelApproval: boolean;
  consensusType: 'unanimous' | 'majority' | 'weighted' | 'any';
  timeoutDays: number;
  escalationChain: string[];
  conditions: RoutingCondition[];
  isOptional: boolean;
}

export interface RoutingRule {
  id: string;
  name: string;
  description: string;
  conditions: RoutingCondition[];
  targetChainId: string;
  priority: number;
  isActive: boolean;
}

export interface RoutingCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ParallelApprovalStatus {
  totalRequired: number;
  approved: number;
  rejected: number;
  changesRequested: number;
  pending: string[];
  completed: string[];
  consensusReached: boolean;
  finalDecision: 'approved' | 'rejected' | 'changes_requested' | null;
}

export interface EscalationRule {
  id: string;
  name: string;
  documentTypes: string[];
  timeoutDays: number;
  escalationChain: string[];
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  isActive: boolean;
}

export interface EscalationChain {
  id: string;
  name: string;
  escalators: string[];
  finalApprover: string;
  autoApproveAfterDays: number | null;
}

export interface NotificationConfig {
  email: {
    approvalRequired: boolean;
    escalation: boolean;
    decision: boolean;
    reminder: boolean;
  };
  inApp: {
    approvalRequired: boolean;
    escalation: boolean;
    decision: boolean;
    reminder: boolean;
  };
  mobile: {
    approvalRequired: boolean;
    escalation: boolean;
    decision: boolean;
    reminder: boolean;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  documentId: string;
  approvalId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  checksum: string;
  chainChecksum: string; // For audit trail immutability
}

export interface AuditFilters {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  userId: string | null;
  action: string | null;
  documentId: string | null;
  approvalId: string | null;
}

export interface ApprovalState {
  activeApprovals: {
    pending: ApprovalRequest[];
    inProgress: ApprovalRequest[];
    completed: ApprovalRequest[];
    escalated: ApprovalRequest[];
  };
  approvalChains: ApprovalChain[];
  routingRules: RoutingRule[];
  currentDocument: {
    selectedRequestId: string | null;  // Changed from documentId to be more accurate
    approvalHistory: ApprovalAction[];
    currentStep: ApprovalStep | null;
    parallelApprovals: ParallelApprovalStatus;
  };
  escalationConfig: {
    timeoutRules: EscalationRule[];
    escalationChains: EscalationChain[];
    notificationSettings: NotificationConfig;
  };
  auditTrail: {
    actions: AuditLogEntry[];
    filters: AuditFilters;
    exportFormats: string[];
  };
  loading: {
    approvals: boolean;
    chains: boolean;
    routing: boolean;
    escalation: boolean;
    audit: boolean;
  };
  error: string | null;
}

const initialState: ApprovalState = {
  activeApprovals: {
    pending: [],
    inProgress: [],
    completed: [],
    escalated: [],
  },
  approvalChains: [],
  routingRules: [],
  currentDocument: {
    selectedRequestId: null,  // Changed from documentId to be more accurate
    approvalHistory: [],
    currentStep: null,
    parallelApprovals: {
      totalRequired: 0,
      approved: 0,
      rejected: 0,
      changesRequested: 0,
      pending: [],
      completed: [],
      consensusReached: false,
      finalDecision: null,
    },
  },
  escalationConfig: {
    timeoutRules: [],
    escalationChains: [],
    notificationSettings: {
      email: {
        approvalRequired: true,
        escalation: true,
        decision: true,
        reminder: true,
      },
      inApp: {
        approvalRequired: true,
        escalation: true,
        decision: true,
        reminder: true,
      },
      mobile: {
        approvalRequired: true,
        escalation: true,
        decision: false,
        reminder: false,
      },
    },
  },
  auditTrail: {
    actions: [],
    filters: {
      dateRange: { start: null, end: null },
      userId: null,
      action: null,
      documentId: null,
      approvalId: null,
    },
    exportFormats: ['csv', 'json', 'pdf'],
  },
  loading: {
    approvals: false,
    chains: false,
    routing: false,
    escalation: false,
    audit: false,
  },
  error: null,
};

export const fetchPendingApprovals = createAsyncThunk(
  'approvals/fetchPending',
  async (userId: string) => {
    return await approvalsApi.getUserPendingApprovals(userId);
  }
);

export const submitApprovalDecision = createAsyncThunk(
  'approvals/submitDecision',
  async ({ approvalId, userId, decision, comments, annotations }: {
    approvalId: string;
    userId: string;
    decision: 'approve' | 'reject' | 'request_changes';
    comments: string;
    annotations: DocumentAnnotation[];
  }) => {
    // Convert annotations array to dictionary format expected by backend
    const annotationsDict: Record<string, any> = {};
    annotations.forEach((annotation, index) => {
      annotationsDict[`annotation_${index}`] = annotation;
    });

    const data = {
      user_id: userId,
      comments,
      annotations: annotationsDict // Send as dictionary instead of array
    };

    if (decision === 'approve') {
      return await approvalsApi.approveRequest(approvalId, data);
    } else if (decision === 'reject') {
      return await approvalsApi.rejectRequest(approvalId, data);
    } else {
      return await approvalsApi.requestChanges(approvalId, data);
    }
  }
);

export const routeDocument = createAsyncThunk(
  'approvals/routeDocument',
  async ({ documentId, chainId, priority, deadline, metadata }: {
    documentId: string;
    chainId: string;
    priority?: string;
    deadline?: string;
    metadata?: Record<string, any>;
  }) => {
    return await approvalsApi.createRequest({
      document_id: documentId,
      chain_id: chainId,
      priority,
      deadline,
      metadata
    });
  }
);

export const escalateApproval = createAsyncThunk(
  'approvals/escalate',
  async ({ approvalId, userId, reason }: { approvalId: string; userId: string; reason: string }) => {
    return await approvalsApi.escalateRequest(approvalId, {
      user_id: userId,
      comments: reason,
      annotations: {} // Add empty annotations dictionary
    });
  }
);

export const fetchApprovalHistory = createAsyncThunk(
  'approvals/fetchHistory',
  async (requestId: string) => {
    return await approvalsApi.getRequestHistory(requestId);
  }
);

export const bulkApprovalAction = createAsyncThunk(
  'approvals/bulkAction',
  async ({ approvalIds, userId, action, comments }: {
    approvalIds: string[];
    userId: string;
    action: 'approve' | 'reject' | 'request_changes';
    comments: string;
  }) => {
    return await approvalsApi.bulkAction({
      approval_ids: approvalIds,
      user_id: userId,
      action,
      comments
    });
  }
);

// Secure audit log creation with cryptographic integrity
export const createSecureAuditLogEntry = createAsyncThunk(
  'approvals/createSecureAuditLogEntry',
  async (params: {
    userId: string;
    userName: string;
    action: string;
    documentId: string;
    approvalId: string;
    details: Record<string, any>;
  }, { getState }) => {
    const state = getState() as { approvals: ApprovalState };
    const timestamp = new Date().toISOString();

    // Get client info for audit trail
    const ipAddress = '127.0.0.1'; // In production, this would come from request headers
    const userAgent = navigator.userAgent;

    // Create audit entry data
    const auditData = {
      userId: params.userId,
      action: params.action,
      documentId: params.documentId,
      approvalId: params.approvalId,
      timestamp,
      details: params.details,
      ipAddress,
      userAgent
    };

    // Generate cryptographic checksum
    const checksum = await generateAuditLogChecksum(auditData);

    // Get previous entry's chain checksum for chaining
    const previousEntry = state.approvals.auditTrail.actions[0];
    const previousChainChecksum = previousEntry?.chainChecksum || null;

    // Create chain checksum for immutability
    const chainChecksum = await createAuditChainChecksum(checksum, previousChainChecksum);

    const auditEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(timestamp),
      userName: params.userName,
      checksum,
      chainChecksum,
      ...auditData
    };

    return auditEntry;
  }
);

const approvalsSlice = createSlice({
  name: 'approvals',
  initialState,
  reducers: {
    setSelectedDocument: (state, action: PayloadAction<string>) => {
      state.currentDocument.selectedRequestId = action.payload;
    },
    clearSelectedDocument: (state) => {
      state.currentDocument.selectedRequestId = null;
      state.currentDocument.approvalHistory = [];
      state.currentDocument.currentStep = null;
      state.currentDocument.parallelApprovals = {
        totalRequired: 0,
        approved: 0,
        rejected: 0,
        changesRequested: 0,
        pending: [],
        completed: [],
        consensusReached: false,
        finalDecision: null,
      };
    },
    updateParallelApprovalStatus: (state, action: PayloadAction<{
      approvalId: string;
      userId: string;
      decision: 'approve' | 'reject' | 'request_changes';
    }>) => {
      const { userId, decision } = action.payload;
      const parallel = state.currentDocument.parallelApprovals;

      parallel.completed.push(userId);
      parallel.pending = parallel.pending.filter(id => id !== userId);

      switch (decision) {
        case 'approve':
          parallel.approved++;
          break;
        case 'reject':
          parallel.rejected++;
          break;
        case 'request_changes':
          parallel.changesRequested++;
          break;
      }

      parallel.consensusReached = checkConsensusReached(parallel);
      if (parallel.consensusReached) {
        parallel.finalDecision = determineFinalDecision(parallel);
      }
    },
    setApprovalFilters: (state, action: PayloadAction<Partial<AuditFilters>>) => {
      state.auditTrail.filters = { ...state.auditTrail.filters, ...action.payload };
    },
    addApprovalChain: (state, action: PayloadAction<ApprovalChain>) => {
      state.approvalChains.push(action.payload);
    },
    updateApprovalChain: (state, action: PayloadAction<ApprovalChain>) => {
      const index = state.approvalChains.findIndex(chain => chain.id === action.payload.id);
      if (index !== -1) {
        state.approvalChains[index] = action.payload;
      }
    },
    deleteApprovalChain: (state, action: PayloadAction<string>) => {
      state.approvalChains = state.approvalChains.filter(chain => chain.id !== action.payload);
    },
    addRoutingRule: (state, action: PayloadAction<RoutingRule>) => {
      state.routingRules.push(action.payload);
    },
    updateRoutingRule: (state, action: PayloadAction<RoutingRule>) => {
      const index = state.routingRules.findIndex(rule => rule.id === action.payload.id);
      if (index !== -1) {
        state.routingRules[index] = action.payload;
      }
    },
    deleteRoutingRule: (state, action: PayloadAction<string>) => {
      state.routingRules = state.routingRules.filter(rule => rule.id !== action.payload);
    },
    updateNotificationSettings: (state, action: PayloadAction<NotificationConfig>) => {
      state.escalationConfig.notificationSettings = action.payload;
    },
    addAuditLogEntry: (state, action: PayloadAction<AuditLogEntry>) => {
      state.auditTrail.actions.unshift(action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingApprovals.pending, (state) => {
        state.loading.approvals = true;
        state.error = null;
      })
      .addCase(fetchPendingApprovals.fulfilled, (state, action) => {
        state.loading.approvals = false;
        state.activeApprovals.pending = action.payload;
      })
      .addCase(fetchPendingApprovals.rejected, (state, action) => {
        state.loading.approvals = false;
        state.error = action.error.message || 'Failed to fetch pending approvals';
      })
      .addCase(submitApprovalDecision.pending, (state) => {
        state.loading.approvals = true;
        state.error = null;
      })
      .addCase(submitApprovalDecision.fulfilled, (state, action) => {
        state.loading.approvals = false;
        const { approvalId, decision } = action.payload;

        ['pending', 'inProgress', 'escalated'].forEach(status => {
          const list = state.activeApprovals[status as keyof typeof state.activeApprovals] as ApprovalRequest[];
          const approvalIndex = list.findIndex(approval => approval.id === approvalId);
          if (approvalIndex !== -1) {
            const approval = list[approvalIndex];
            approval.status = decision === 'approve' ? 'approved' :
                            decision === 'reject' ? 'rejected' : 'changes_requested';
            approval.updatedAt = new Date();

            list.splice(approvalIndex, 1);
            state.activeApprovals.completed.push(approval);
          }
        });
      })
      .addCase(submitApprovalDecision.rejected, (state, action) => {
        state.loading.approvals = false;
        state.error = action.error.message || 'Failed to submit approval decision';
      })
      .addCase(routeDocument.fulfilled, (state, action) => {
        const newApproval = action.payload;
        state.activeApprovals.pending.push(newApproval);
      })
      .addCase(escalateApproval.fulfilled, (state, action) => {
        const { approvalId } = action.payload;

        ['pending', 'inProgress'].forEach(status => {
          const list = state.activeApprovals[status as keyof typeof state.activeApprovals] as ApprovalRequest[];
          const approvalIndex = list.findIndex(approval => approval.id === approvalId);
          if (approvalIndex !== -1) {
            const approval = list[approvalIndex];
            approval.status = 'escalated';
            approval.escalationDate = new Date();
            approval.updatedAt = new Date();

            list.splice(approvalIndex, 1);
            state.activeApprovals.escalated.push(approval);
          }
        });
      })
      .addCase(fetchApprovalHistory.fulfilled, (state, action) => {
        state.currentDocument.approvalHistory = action.payload;
      })
      .addCase(bulkApprovalAction.fulfilled, (state, action) => {
        const { approvalIds, decision } = action.payload;

        ['pending', 'inProgress', 'escalated'].forEach(status => {
          const list = state.activeApprovals[status as keyof typeof state.activeApprovals] as ApprovalRequest[];
          const approvals = list.filter(approval => approvalIds.includes(approval.id));

          approvals.forEach(approval => {
            approval.status = decision === 'approve' ? 'approved' :
                            decision === 'reject' ? 'rejected' : 'changes_requested';
            approval.updatedAt = new Date();

            const index = list.findIndex(a => a.id === approval.id);
            if (index !== -1) {
              list.splice(index, 1);
              state.activeApprovals.completed.push(approval);
            }
          });
        });
      })
      .addCase(createSecureAuditLogEntry.fulfilled, (state, action) => {
        state.auditTrail.actions.unshift(action.payload);
      });
  },
});

function checkConsensusReached(parallel: ParallelApprovalStatus): boolean {
  const totalCompleted = parallel.approved + parallel.rejected + parallel.changesRequested;
  return totalCompleted >= parallel.totalRequired;
}

function determineFinalDecision(parallel: ParallelApprovalStatus): 'approved' | 'rejected' | 'changes_requested' {
  if (parallel.rejected > 0) return 'rejected';
  if (parallel.changesRequested > 0) return 'changes_requested';
  return 'approved';
}

export const {
  setSelectedDocument,
  clearSelectedDocument,
  updateParallelApprovalStatus,
  setApprovalFilters,
  addApprovalChain,
  updateApprovalChain,
  deleteApprovalChain,
  addRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  updateNotificationSettings,
  addAuditLogEntry,
  clearError,
} = approvalsSlice.actions;

export default approvalsSlice.reducer;