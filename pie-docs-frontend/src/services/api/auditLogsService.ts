/**
 * Audit Logs Service
 * Handles fetching and filtering audit logs
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';

export interface AuditLog {
  id: string;
  event_type: string;
  resource_type?: string;
  resource_id?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  action: string;
  description?: string;
  metadata?: Record<string, any>;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface AuditLogsResponse {
  audit_logs: AuditLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogsQuery {
  event_type?: string;
  resource_type?: string;
  resource_id?: string;
  user_id?: string;
  success?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

class AuditLogsService {
  /**
   * Get audit logs with optional filters
   */
  async getAuditLogs(params: AuditLogsQuery = {}): Promise<AuditLogsResponse> {
    const searchParams = new URLSearchParams();

    if (params.event_type) searchParams.append('event_type', params.event_type);
    if (params.resource_type) searchParams.append('resource_type', params.resource_type);
    if (params.resource_id) searchParams.append('resource_id', params.resource_id);
    if (params.user_id) searchParams.append('user_id', params.user_id);
    if (params.success !== undefined) searchParams.append('success', String(params.success));
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.page_size) searchParams.append('page_size', String(params.page_size));

    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/audit-logs?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get audit logs for a specific document
   */
  async getDocumentAuditLogs(documentId: string, page: number = 1, pageSize: number = 50): Promise<AuditLogsResponse> {
    return this.getAuditLogs({
      resource_type: 'document',
      resource_id: documentId,
      page,
      page_size: pageSize,
    });
  }

  /**
   * Get auth token from localStorage or sessionStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }
}

export const auditLogsService = new AuditLogsService();
export default auditLogsService;
