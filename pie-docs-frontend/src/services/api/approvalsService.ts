/**
 * Approvals API Service
 * Handles all API calls for the approval workflow system
 */

import axios from '@/config/axiosConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
const APPROVALS_API = `${API_BASE_URL}/approvals`;

// ==========================================
// Approval Chains
// ==========================================

export interface ApprovalChain {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  document_types?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalChainCreate {
  name: string;
  description?: string;
  is_active?: boolean;
  document_types?: string[];
  created_by?: string;
}

export interface ApprovalChainUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
  document_types?: string[];
}

export interface ApprovalChainStep {
  id: string;
  chain_id: string;
  step_number: number;
  name: string;
  approver_ids: string[];
  parallel_approval: boolean;
  consensus_type: 'all' | 'any' | 'majority' | 'weighted';
  timeout_days?: number;
  escalation_chain?: string[];
  conditions?: Record<string, any>;
  is_optional: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalChainStepCreate {
  step_number: number;
  name: string;
  approver_ids: string[];
  parallel_approval?: boolean;
  consensus_type?: 'all' | 'any' | 'majority' | 'weighted';
  timeout_days?: number;
  escalation_chain?: string[];
  conditions?: Record<string, any>;
  is_optional?: boolean;
}

// Approval Chains API
export const approvalsApi = {
  // ==========================================
  // Approval Chains
  // ==========================================

  async listChains(isActive?: boolean): Promise<ApprovalChain[]> {
    const params = isActive !== undefined ? { is_active: isActive } : {};
    const response = await axios.get(`${APPROVALS_API}/chains`, { params });
    return response.data;
  },

  async getChain(chainId: string): Promise<ApprovalChain> {
    const response = await axios.get(`${APPROVALS_API}/chains/${chainId}`);
    return response.data;
  },

  async createChain(chain: ApprovalChainCreate): Promise<ApprovalChain> {
    const response = await axios.post(`${APPROVALS_API}/chains`, chain);
    return response.data;
  },

  async updateChain(chainId: string, updates: ApprovalChainUpdate): Promise<ApprovalChain> {
    const response = await axios.patch(`${APPROVALS_API}/chains/${chainId}`, updates);
    return response.data;
  },

  async deleteChain(chainId: string): Promise<void> {
    await axios.delete(`${APPROVALS_API}/chains/${chainId}`);
  },

  async validateChain(chainId: string): Promise<{ valid: boolean; message: string }> {
    const response = await axios.post(`${APPROVALS_API}/chains/${chainId}/validate`);
    return response.data;
  },

  // ==========================================
  // Approval Chain Steps
  // ==========================================

  async listChainSteps(chainId: string): Promise<ApprovalChainStep[]> {
    const response = await axios.get(`${APPROVALS_API}/chains/${chainId}/steps`);
    return response.data;
  },

  async createChainStep(chainId: string, step: ApprovalChainStepCreate): Promise<ApprovalChainStep> {
    const response = await axios.post(`${APPROVALS_API}/chains/${chainId}/steps`, step);
    return response.data;
  },

  async updateChainStep(stepId: string, updates: Partial<ApprovalChainStepCreate>): Promise<ApprovalChainStep> {
    const response = await axios.patch(`${APPROVALS_API}/chains/steps/${stepId}`, updates);
    return response.data;
  },

  async deleteChainStep(stepId: string): Promise<void> {
    await axios.delete(`${APPROVALS_API}/chains/steps/${stepId}`);
  },

  // ==========================================
  // Approval Requests
  // ==========================================

  async listRequests(params: {
    page?: number;
    page_size?: number;
    status?: string;
    document_id?: string;
  }): Promise<{ requests: any[]; total: number; page: number; page_size: number }> {
    const response = await axios.get(`${APPROVALS_API}/requests`, { params });
    return response.data;
  },

  async getRequest(requestId: string): Promise<any> {
    const response = await axios.get(`${APPROVALS_API}/requests/${requestId}`);
    return response.data;
  },

  async createRequest(request: {
    document_id: string;
    chain_id: string;
    priority?: string;
    deadline?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    console.log('[approvalsApi.createRequest] Sending request to:', `${APPROVALS_API}/requests`);
    console.log('[approvalsApi.createRequest] Request payload:', JSON.stringify(request, null, 2));
    console.log('[approvalsApi.createRequest] Metadata type:', typeof request.metadata);
    console.log('[approvalsApi.createRequest] Metadata keys:', request.metadata ? Object.keys(request.metadata) : 'null');

    try {
      const response = await axios.post(`${APPROVALS_API}/requests`, request);
      console.log('[approvalsApi.createRequest] Success! Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[approvalsApi.createRequest] Request failed!');
      console.error('[approvalsApi.createRequest] Error status:', error.response?.status);
      console.error('[approvalsApi.createRequest] Error data:', error.response?.data);
      console.error('[approvalsApi.createRequest] Error message:', error.message);
      throw error;
    }
  },

  async updateRequest(requestId: string, updates: {
    priority?: string;
    deadline?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const response = await axios.patch(`${APPROVALS_API}/requests/${requestId}`, updates);
    return response.data;
  },

  async cancelRequest(requestId: string): Promise<void> {
    await axios.post(`${APPROVALS_API}/requests/${requestId}/cancel`);
  },

  // ==========================================
  // Approval Actions
  // ==========================================

  async approveRequest(requestId: string, data: {
    user_id: string;
    comments?: string;
    annotations?: Record<string, any>;
  }): Promise<any> {
    const response = await axios.post(`${APPROVALS_API}/requests/${requestId}/approve`, data);
    return response.data;
  },

  async rejectRequest(requestId: string, data: {
    user_id: string;
    comments?: string;
    annotations?: Record<string, any>;
  }): Promise<any> {
    const response = await axios.post(`${APPROVALS_API}/requests/${requestId}/reject`, data);
    return response.data;
  },

  async requestChanges(requestId: string, data: {
    user_id: string;
    comments?: string;
    annotations?: Record<string, any>;
  }): Promise<any> {
    const response = await axios.post(`${APPROVALS_API}/requests/${requestId}/request-changes`, data);
    return response.data;
  },

  async escalateRequest(requestId: string, data: {
    user_id: string;
    comments?: string;
    annotations?: Record<string, any>;
  }): Promise<any> {
    const response = await axios.post(`${APPROVALS_API}/requests/${requestId}/escalate`, data);
    return response.data;
  },

  async delegateRequest(requestId: string, newApproverId: string): Promise<void> {
    await axios.post(`${APPROVALS_API}/requests/${requestId}/delegate`, null, {
      params: { new_approver_id: newApproverId }
    });
  },

  async getRequestHistory(requestId: string): Promise<any[]> {
    const response = await axios.get(`${APPROVALS_API}/requests/${requestId}/history`);
    return response.data;
  },

  async getUserPendingApprovals(userId: string): Promise<any[]> {
    const response = await axios.get(`${APPROVALS_API}/user/${userId}/pending`);
    return response.data;
  },

  async getRequestMetrics(requestId: string): Promise<{
    completion_percentage: number;
    current_step: number;
    total_steps: number;
    time_elapsed_seconds: number;
    time_remaining_seconds: number | null;
    is_overdue: boolean;
    action_count: number;
    status: string;
  }> {
    const response = await axios.get(`${APPROVALS_API}/requests/${requestId}/metrics`);
    return response.data;
  },

  // ==========================================
  // Routing & Auto-Route
  // ==========================================

  async autoRoute(documentMetadata: Record<string, any>): Promise<{
    matched: boolean;
    chain_id: string | null;
    chain: ApprovalChain | null;
    message?: string;
  }> {
    const response = await axios.post(`${APPROVALS_API}/requests/auto-route`, documentMetadata);
    return response.data;
  },

  async listRoutingRules(isActive?: boolean): Promise<any[]> {
    const params = isActive !== undefined ? { is_active: isActive } : {};
    const response = await axios.get(`${APPROVALS_API}/routing-rules`, { params });
    return response.data;
  },

  async getRoutingRule(ruleId: string): Promise<any> {
    const response = await axios.get(`${APPROVALS_API}/routing-rules/${ruleId}`);
    return response.data;
  },

  async createRoutingRule(rule: {
    name: string;
    description?: string;
    conditions: Record<string, any>;
    target_chain_id: string;
    priority?: number;
    is_active?: boolean;
  }): Promise<any> {
    const response = await axios.post(`${APPROVALS_API}/routing-rules`, rule);
    return response.data;
  },

  async updateRoutingRule(ruleId: string, updates: {
    name?: string;
    description?: string;
    conditions?: Record<string, any>;
    target_chain_id?: string;
    priority?: number;
    is_active?: boolean;
  }): Promise<any> {
    const response = await axios.put(`${APPROVALS_API}/routing-rules/${ruleId}`, updates);
    return response.data;
  },

  async deleteRoutingRule(ruleId: string): Promise<void> {
    await axios.delete(`${APPROVALS_API}/routing-rules/${ruleId}`);
  },

  // ==========================================
  // Bulk Operations
  // ==========================================

  async bulkAction(data: {
    approval_ids: string[];
    action: 'approve' | 'reject' | 'request_changes';
    comments?: string;
    user_id: string;
  }): Promise<{
    succeeded: string[];
    failed: Array<{ id: string; error: string }>;
    total: number;
    success_count: number;
    failure_count: number;
  }> {
    const response = await axios.post(`${APPROVALS_API}/requests/bulk-action`, data);
    return response.data;
  },

  // ==========================================
  // Escalation
  // ==========================================

  async checkEscalationTimeouts(): Promise<{
    escalated_count: number;
    escalated_requests: string[];
  }> {
    const response = await axios.post(`${APPROVALS_API}/escalation/check-timeouts`);
    return response.data;
  },
};

export default approvalsApi;
