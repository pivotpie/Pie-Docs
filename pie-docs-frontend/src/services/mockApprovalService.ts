import {
  ApprovalRequest,
  ApprovalAction,
  ApprovalChain,
  RoutingRule,
  EscalationRule,
  DocumentAnnotation,
} from '@/store/slices/approvalsSlice';

// Mock data
const mockApprovalRequests: ApprovalRequest[] = [
  {
    id: 'approval-1',
    documentId: 'doc-1',
    documentTitle: 'Q4 Budget Proposal 2025',
    documentType: 'proposal',
    documentUrl: '/documents/q4-budget-2025.pdf',
    requester: {
      id: 'user-123',
      name: 'Sarah Chen',
      email: 'sarah.chen@company.com',
    },
    currentStep: 2,
    totalSteps: 4,
    chainId: 'chain-budget',
    priority: 'high',
    deadline: new Date('2025-01-20T17:00:00'),
    escalationDate: new Date('2025-01-18T17:00:00'),
    status: 'pending',
    assignedTo: ['manager-1', 'finance-director'],
    parallelApprovalRequired: true,
    consensusType: 'majority',
    metadata: {
      value: 2500000,
      department: 'Finance',
      confidentiality: 'Internal',
    },
    createdAt: new Date('2025-01-15T09:00:00'),
    updatedAt: new Date('2025-01-15T09:00:00'),
  },
  {
    id: 'approval-2',
    documentId: 'doc-2',
    documentTitle: 'Employee Handbook Updates',
    documentType: 'policy',
    documentUrl: '/documents/employee-handbook-v3.pdf',
    requester: {
      id: 'user-456',
      name: 'Mike Johnson',
      email: 'mike.johnson@company.com',
    },
    currentStep: 1,
    totalSteps: 3,
    chainId: 'chain-policy',
    priority: 'medium',
    deadline: new Date('2025-01-25T17:00:00'),
    escalationDate: null,
    status: 'pending',
    assignedTo: ['hr-manager'],
    parallelApprovalRequired: false,
    consensusType: 'unanimous',
    metadata: {
      department: 'HR',
      confidentiality: 'Public',
    },
    createdAt: new Date('2025-01-14T10:30:00'),
    updatedAt: new Date('2025-01-14T10:30:00'),
  },
  {
    id: 'approval-3',
    documentId: 'doc-3',
    documentTitle: 'Data Privacy Compliance Contract',
    documentType: 'contract',
    documentUrl: '/documents/data-privacy-contract.pdf',
    requester: {
      id: 'user-789',
      name: 'Lisa Wong',
      email: 'lisa.wong@company.com',
    },
    currentStep: 3,
    totalSteps: 5,
    chainId: 'chain-legal',
    priority: 'critical',
    deadline: new Date('2025-01-17T17:00:00'),
    escalationDate: new Date('2025-01-16T17:00:00'),
    status: 'escalated',
    assignedTo: ['legal-counsel', 'cto', 'ceo'],
    parallelApprovalRequired: true,
    consensusType: 'unanimous',
    metadata: {
      value: 500000,
      department: 'Legal',
      confidentiality: 'Confidential',
    },
    createdAt: new Date('2025-01-10T08:00:00'),
    updatedAt: new Date('2025-01-15T16:00:00'),
  },
];

const mockApprovalChains: ApprovalChain[] = [
  {
    id: 'chain-budget',
    name: 'Budget Approval Chain',
    description: 'Standard approval process for budget proposals',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        name: 'Department Manager',
        approvers: ['manager-1'],
        parallelApproval: false,
        consensusType: 'unanimous',
        timeoutDays: 2,
        escalationChain: ['director-1'],
        conditions: [],
        isOptional: false,
      },
      {
        id: 'step-2',
        stepNumber: 2,
        name: 'Finance Review',
        approvers: ['finance-director', 'cfo'],
        parallelApproval: true,
        consensusType: 'majority',
        timeoutDays: 3,
        escalationChain: ['ceo'],
        conditions: [],
        isOptional: false,
      },
      {
        id: 'step-3',
        stepNumber: 3,
        name: 'Executive Approval',
        approvers: ['ceo'],
        parallelApproval: false,
        consensusType: 'unanimous',
        timeoutDays: 5,
        escalationChain: ['board'],
        conditions: [
          { field: 'value', operator: 'greater_than', value: 1000000 }
        ],
        isOptional: true,
      },
    ],
    isActive: true,
    documentTypes: ['proposal', 'budget'],
    createdBy: 'admin',
    createdAt: new Date('2025-01-01T00:00:00'),
    updatedAt: new Date('2025-01-01T00:00:00'),
  },
  {
    id: 'chain-policy',
    name: 'Policy Approval Chain',
    description: 'Standard approval process for policy documents',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        name: 'Department Review',
        approvers: ['hr-manager'],
        parallelApproval: false,
        consensusType: 'unanimous',
        timeoutDays: 3,
        escalationChain: ['hr-director'],
        conditions: [],
        isOptional: false,
      },
      {
        id: 'step-2',
        stepNumber: 2,
        name: 'Legal Review',
        approvers: ['legal-counsel'],
        parallelApproval: false,
        consensusType: 'unanimous',
        timeoutDays: 2,
        escalationChain: ['legal-director'],
        conditions: [],
        isOptional: false,
      },
      {
        id: 'step-3',
        stepNumber: 3,
        name: 'Executive Approval',
        approvers: ['coo'],
        parallelApproval: false,
        consensusType: 'unanimous',
        timeoutDays: 3,
        escalationChain: ['ceo'],
        conditions: [],
        isOptional: false,
      },
    ],
    isActive: true,
    documentTypes: ['policy', 'procedure'],
    createdBy: 'admin',
    createdAt: new Date('2025-01-01T00:00:00'),
    updatedAt: new Date('2025-01-01T00:00:00'),
  },
];

const mockRoutingRules: RoutingRule[] = [
  {
    id: 'rule-1',
    name: 'High Value Contract Routing',
    description: 'Route high-value contracts through legal chain',
    conditions: [
      { field: 'type', operator: 'equals', value: 'contract' },
      { field: 'value', operator: 'greater_than', value: 100000, logicalOperator: 'AND' },
    ],
    targetChainId: 'chain-legal',
    priority: 10,
    isActive: true,
  },
  {
    id: 'rule-2',
    name: 'Budget Proposal Routing',
    description: 'Route budget proposals through budget chain',
    conditions: [
      { field: 'type', operator: 'equals', value: 'proposal' },
      { field: 'department', operator: 'equals', value: 'Finance', logicalOperator: 'AND' },
    ],
    targetChainId: 'chain-budget',
    priority: 8,
    isActive: true,
  },
  {
    id: 'rule-3',
    name: 'HR Policy Routing',
    description: 'Route HR policies through policy chain',
    conditions: [
      { field: 'type', operator: 'equals', value: 'policy' },
      { field: 'department', operator: 'equals', value: 'HR', logicalOperator: 'AND' },
    ],
    targetChainId: 'chain-policy',
    priority: 5,
    isActive: true,
  },
];

// External integration webhooks
interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  headers?: Record<string, string>;
}

const mockWebhooks: WebhookConfig[] = [
  {
    id: 'webhook-1',
    name: 'Slack Notifications',
    url: process.env.SLACK_WEBHOOK_URL || 'https://example.com/webhook/slack',
    events: ['approval_required', 'approval_completed', 'approval_escalated'],
    isActive: true,
    headers: {
      'Content-Type': 'application/json',
    },
  },
  {
    id: 'webhook-2',
    name: 'External ERP System',
    url: 'https://api.company.com/approvals/webhook',
    events: ['approval_completed'],
    isActive: true,
    secret: 'webhook-secret-key',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token-123',
    },
  },
];

// Mock service implementation
export const mockApprovalService = {
  // Approval requests
  async getPendingApprovals(userId: string): Promise<ApprovalRequest[]> {
    await delay(500);
    return mockApprovalRequests.filter(approval =>
      approval.status === 'pending' && approval.assignedTo.includes(userId)
    );
  },

  async getApprovalById(approvalId: string): Promise<ApprovalRequest | null> {
    await delay(300);
    return mockApprovalRequests.find(approval => approval.id === approvalId) || null;
  },

  async submitApprovalDecision(params: {
    approvalId: string;
    decision: 'approve' | 'reject' | 'request_changes';
    comments: string;
    annotations: DocumentAnnotation[];
  }): Promise<{ success: boolean; approvalId: string; decision: string }> {
    await delay(1000);

    const approval = mockApprovalRequests.find(a => a.id === params.approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    // Update approval status
    approval.status = params.decision === 'approve' ? 'approved' :
                     params.decision === 'reject' ? 'rejected' : 'changes_requested';
    approval.updatedAt = new Date();

    // Trigger webhooks
    await triggerWebhooks('approval_decision', {
      approvalId: params.approvalId,
      decision: params.decision,
      comments: params.comments,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      approvalId: params.approvalId,
      decision: params.decision,
    };
  },

  async routeDocument(params: {
    documentId: string;
    chainId: string;
  }): Promise<ApprovalRequest> {
    await delay(800);

    const newApproval: ApprovalRequest = {
      id: `approval-${Date.now()}`,
      documentId: params.documentId,
      documentTitle: 'Routed Document',
      documentType: 'document',
      documentUrl: '/documents/routed-document.pdf',
      requester: {
        id: 'current-user',
        name: 'Current User',
        email: 'current.user@company.com',
      },
      currentStep: 1,
      totalSteps: 3,
      chainId: params.chainId,
      priority: 'medium',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      escalationDate: null,
      status: 'pending',
      assignedTo: ['initial-approver'],
      parallelApprovalRequired: false,
      consensusType: 'unanimous',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockApprovalRequests.push(newApproval);

    // Trigger webhook
    await triggerWebhooks('document_routed', {
      approvalId: newApproval.id,
      documentId: params.documentId,
      chainId: params.chainId,
      timestamp: new Date().toISOString(),
    });

    return newApproval;
  },

  async escalateApproval(params: {
    approvalId: string;
    reason: string;
  }): Promise<{ success: boolean; escalationLevel: number }> {
    await delay(600);

    const approval = mockApprovalRequests.find(a => a.id === params.approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    approval.status = 'escalated';
    approval.escalationDate = new Date();
    approval.updatedAt = new Date();

    // Trigger webhook
    await triggerWebhooks('approval_escalated', {
      approvalId: params.approvalId,
      reason: params.reason,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      escalationLevel: 2, // Mock escalation level
    };
  },

  async getApprovalHistory(documentId: string): Promise<ApprovalAction[]> {
    await delay(400);

    // Mock approval history
    return [
      {
        id: 'action-1',
        approvalId: 'approval-1',
        userId: 'user-1',
        userName: 'John Smith',
        action: 'approve',
        comments: 'Budget allocation looks reasonable for Q4 objectives.',
        annotations: [],
        timestamp: new Date('2025-01-15T10:30:00'),
      },
      {
        id: 'action-2',
        approvalId: 'approval-1',
        userId: 'user-2',
        userName: 'Sarah Johnson',
        action: 'request_changes',
        comments: 'Please provide more detail on the marketing budget breakdown.',
        annotations: [
          {
            id: 'ann-1',
            pageNumber: 2,
            x: 100,
            y: 200,
            width: 200,
            height: 30,
            content: 'Marketing budget needs breakdown',
            type: 'comment',
          },
        ],
        timestamp: new Date('2025-01-15T14:20:00'),
      },
    ];
  },

  // Approval chains
  async getApprovalChains(): Promise<ApprovalChain[]> {
    await delay(300);
    return mockApprovalChains;
  },

  async createApprovalChain(chain: Omit<ApprovalChain, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApprovalChain> {
    await delay(500);

    const newChain: ApprovalChain = {
      ...chain,
      id: `chain-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockApprovalChains.push(newChain);
    return newChain;
  },

  async updateApprovalChain(chain: ApprovalChain): Promise<ApprovalChain> {
    await delay(400);

    const index = mockApprovalChains.findIndex(c => c.id === chain.id);
    if (index === -1) {
      throw new Error('Chain not found');
    }

    mockApprovalChains[index] = { ...chain, updatedAt: new Date() };
    return mockApprovalChains[index];
  },

  // Routing rules
  async getRoutingRules(): Promise<RoutingRule[]> {
    await delay(250);
    return mockRoutingRules;
  },

  async createRoutingRule(rule: Omit<RoutingRule, 'id'>): Promise<RoutingRule> {
    await delay(400);

    const newRule: RoutingRule = {
      ...rule,
      id: `rule-${Date.now()}`,
    };

    mockRoutingRules.push(newRule);
    return newRule;
  },

  async updateRoutingRule(rule: RoutingRule): Promise<RoutingRule> {
    await delay(350);

    const index = mockRoutingRules.findIndex(r => r.id === rule.id);
    if (index === -1) {
      throw new Error('Rule not found');
    }

    mockRoutingRules[index] = rule;
    return mockRoutingRules[index];
  },

  async deleteRoutingRule(ruleId: string): Promise<{ success: boolean }> {
    await delay(300);

    const index = mockRoutingRules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      throw new Error('Rule not found');
    }

    mockRoutingRules.splice(index, 1);
    return { success: true };
  },

  // External integrations
  async getWebhooks(): Promise<WebhookConfig[]> {
    await delay(200);
    return mockWebhooks;
  },

  async createWebhook(webhook: Omit<WebhookConfig, 'id'>): Promise<WebhookConfig> {
    await delay(400);

    const newWebhook: WebhookConfig = {
      ...webhook,
      id: `webhook-${Date.now()}`,
    };

    mockWebhooks.push(newWebhook);
    return newWebhook;
  },

  async updateWebhook(webhook: WebhookConfig): Promise<WebhookConfig> {
    await delay(350);

    const index = mockWebhooks.findIndex(w => w.id === webhook.id);
    if (index === -1) {
      throw new Error('Webhook not found');
    }

    mockWebhooks[index] = webhook;
    return mockWebhooks[index];
  },

  async deleteWebhook(webhookId: string): Promise<{ success: boolean }> {
    await delay(300);

    const index = mockWebhooks.findIndex(w => w.id === webhookId);
    if (index === -1) {
      throw new Error('Webhook not found');
    }

    mockWebhooks.splice(index, 1);
    return { success: true };
  },

  // Bulk operations
  async bulkApprovalAction(params: {
    approvalIds: string[];
    action: 'approve' | 'reject' | 'request_changes';
    comments: string;
  }): Promise<{ success: boolean; processed: number; failed: string[] }> {
    await delay(2000); // Simulate longer processing time

    const failed: string[] = [];
    let processed = 0;

    for (const approvalId of params.approvalIds) {
      try {
        await this.submitApprovalDecision({
          approvalId,
          decision: params.action,
          comments: params.comments,
          annotations: [],
        });
        processed++;
      } catch (error) {
        failed.push(approvalId);
      }
    }

    return { success: failed.length === 0, processed, failed };
  },

  // Analytics and reporting
  async getApprovalMetrics(dateRange: { start: Date; end: Date }): Promise<any> {
    await delay(800);

    return {
      totalApprovals: 45,
      approvedCount: 38,
      rejectedCount: 4,
      changesRequestedCount: 3,
      averageProcessingTime: 2.3, // days
      escalationRate: 8.9, // percentage
      onTimeCompletionRate: 91.1, // percentage
    };
  },
};

// Helper functions
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function triggerWebhooks(event: string, data: any): Promise<void> {
  const relevantWebhooks = mockWebhooks.filter(
    webhook => webhook.isActive && webhook.events.includes(event)
  );

  // SECURITY FIX: In development, simulate webhook calls without making actual HTTP requests
  for (const webhook of relevantWebhooks) {
    console.log(`[MOCK] Triggering webhook: ${webhook.name} for event: ${event}`, {
      webhookUrl: webhook.url,
      event,
      data: JSON.stringify(data, null, 2),
      timestamp: new Date().toISOString(),
    });

    // Simulate webhook call with fake delay and response
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

      // Simulate success/failure based on webhook configuration
      const shouldSucceed = Math.random() > 0.1; // 90% success rate

      if (shouldSucceed) {
        console.log(`[MOCK] Webhook ${webhook.name} delivered successfully`);
      } else {
        throw new Error('Simulated webhook delivery failure');
      }
    } catch (error) {
      console.warn(`[MOCK] Webhook delivery failed for ${webhook.name}:`, error);
    }
  }
}

export type { WebhookConfig };