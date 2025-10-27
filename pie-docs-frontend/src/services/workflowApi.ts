/**
 * Workflow API Service
 * Handles all API calls related to workflow management
 */

import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const workflowApi = axios.create({
  baseURL: `${API_BASE_URL}/workflows`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
workflowApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
workflowApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - clear tokens and redirect to login
      console.error('Unauthorized access - token may be expired');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');

      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        console.log('Redirecting to login page...');
        window.location.href = '/login';
      }
    } else if (error.response?.status === 404) {
      console.error('Resource not found');
    } else if (error.response?.status === 500) {
      console.error('Server error occurred');
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface WorkflowElementPosition {
  x: number;
  y: number;
}

export interface WorkflowElementData {
  title: string;
  description?: string;
  config?: Record<string, any>;
}

export interface WorkflowElement {
  id: string;
  type: 'approval' | 'review' | 'notification' | 'decision' | 'timer';
  position: WorkflowElementPosition;
  data: WorkflowElementData;
}

export interface WorkflowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  elements: WorkflowElement[];
  connections: WorkflowConnection[];
  version: number;
  status: 'draft' | 'active' | 'archived';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowCreate {
  name: string;
  description?: string;
  elements?: any[];
  connections?: any[];
  status?: 'draft' | 'active' | 'archived';
}

export interface WorkflowUpdate {
  name?: string;
  description?: string;
  elements?: any[];
  connections?: any[];
  status?: 'draft' | 'active' | 'archived';
}

export interface WorkflowListResponse {
  total: number;
  workflows: Workflow[];
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  document_id?: string;
  current_step_id?: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  execution_data: Record<string, any>;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  error_stack?: string;
}

export interface WorkflowExecutionCreate {
  document_id?: string;
  initial_data?: Record<string, any>;
}

export interface ValidationError {
  id: string;
  type: 'error' | 'warning';
  message: string;
  elementId?: string;
  connectionId?: string;
}

export interface ValidationResponse {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface WorkflowExportResponse {
  workflow: Workflow;
  export_date: string;
  version: string;
}

export interface WorkflowImportRequest {
  name: string;
  description?: string;
  elements: any[];
  connections: any[];
  preserve_ids?: boolean;
}

// ============================================================================
// API Service Functions
// ============================================================================

export const workflowService = {
  /**
   * List all workflows with pagination and filtering
   */
  async listWorkflows(params?: {
    skip?: number;
    limit?: number;
    status?: 'draft' | 'active' | 'archived';
  }): Promise<WorkflowListResponse> {
    const response = await workflowApi.get<WorkflowListResponse>('/', { params });
    return response.data;
  },

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: WorkflowCreate): Promise<Workflow> {
    const response = await workflowApi.post<Workflow>('/', workflow);
    return response.data;
  },

  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(id: string): Promise<Workflow> {
    const response = await workflowApi.get<Workflow>(`/${id}`);
    return response.data;
  },

  /**
   * Update an existing workflow
   */
  async updateWorkflow(id: string, workflow: WorkflowUpdate): Promise<Workflow> {
    const response = await workflowApi.put<Workflow>(`/${id}`, workflow);
    return response.data;
  },

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    await workflowApi.delete(`/${id}`);
  },

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    id: string,
    execution: WorkflowExecutionCreate
  ): Promise<WorkflowExecution> {
    const response = await workflowApi.post<WorkflowExecution>(
      `/${id}/execute`,
      execution
    );
    return response.data;
  },

  /**
   * List all executions for a workflow
   */
  async listExecutions(
    id: string,
    params?: { skip?: number; limit?: number }
  ): Promise<WorkflowExecution[]> {
    const response = await workflowApi.get<WorkflowExecution[]>(
      `/${id}/executions`,
      { params }
    );
    return response.data;
  },

  /**
   * Validate a workflow
   */
  async validateWorkflow(id: string): Promise<ValidationResponse> {
    const response = await workflowApi.post<ValidationResponse>(`/${id}/validate`);
    return response.data;
  },

  /**
   * Export a workflow as JSON
   */
  async exportWorkflow(id: string): Promise<WorkflowExportResponse> {
    const response = await workflowApi.post<WorkflowExportResponse>(`/${id}/export`);
    return response.data;
  },

  /**
   * Import a workflow from JSON
   */
  async importWorkflow(workflowData: WorkflowImportRequest): Promise<Workflow> {
    const response = await workflowApi.post<Workflow>('/import', workflowData);
    return response.data;
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Download workflow as JSON file
 */
export const downloadWorkflowJSON = (workflow: Workflow, filename?: string) => {
  const dataStr = JSON.stringify(workflow, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `workflow-${workflow.name}-${workflow.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parse and validate imported workflow JSON
 */
export const parseWorkflowJSON = (jsonString: string): WorkflowImportRequest => {
  try {
    const data = JSON.parse(jsonString);

    // Validate required fields
    if (!data.name) {
      throw new Error('Workflow name is required');
    }
    if (!Array.isArray(data.elements)) {
      throw new Error('Elements must be an array');
    }
    if (!Array.isArray(data.connections)) {
      throw new Error('Connections must be an array');
    }

    return {
      name: data.name,
      description: data.description,
      elements: data.elements,
      connections: data.connections,
      preserve_ids: data.preserve_ids || false,
    };
  } catch (error) {
    throw new Error(`Invalid workflow JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Format error messages from API
 */
export const formatApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
};

export default workflowService;
