/**
 * Check-in/Check-out Service
 * Frontend API integration for document checkout management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';

export interface CheckoutRecord {
  id: string;
  document_id: string;
  user_id?: string;
  user_name: string;
  user_department?: string;
  status: 'checked-out' | 'checked-in' | 'expired' | 'force-checkin';
  checkout_date: string;
  checkin_date?: string;
  due_date?: string;
  lock_expiry?: string;
  version_at_checkout?: string;
  version_at_checkin?: string;
  reason?: string;
  checkout_notes?: string;
  checkin_notes?: string;
  is_overdue: boolean;
  is_active: boolean;
  was_forced: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckoutRequest {
  document_id: string;
  reason?: string;
  due_date?: string;
  checkout_notes?: string;
}

export interface CheckinRequest {
  checkout_record_id: string;
  checkin_notes?: string;
  version_number?: string;
}

export interface ExtendCheckoutRequest {
  checkout_record_id: string;
  new_due_date: string;
  reason?: string;
}

export interface ForceCheckinRequest {
  checkout_record_id: string;
  reason: string;
  admin_override?: boolean;
}

export interface CheckoutStatusResponse {
  is_checked_out: boolean;
  checked_out_by?: string;
  checkout_date?: string;
  due_date?: string;
  is_overdue: boolean;
  can_force_checkin: boolean;
  lock_info?: any;
}

export interface CheckoutAnalytics {
  total_active_checkouts: number;
  total_overdue: number;
  total_checked_in_today: number;
  avg_checkout_duration_hours: number;
  checkouts_by_department: Record<string, number>;
  most_checked_out_documents: Array<{
    id: string;
    title: string;
    checkout_count: number;
  }>;
  overdue_checkouts: CheckoutRecord[];
}

class CheckinoutService {
  private baseUrl = `${API_BASE_URL}/checkinout`;

  /**
   * Check out a document
   */
  async checkoutDocument(request: CheckoutRequest): Promise<CheckoutRecord> {
    const response = await fetch(`${this.baseUrl}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to checkout document');
    }

    return response.json();
  }

  /**
   * Check in a document
   */
  async checkinDocument(request: CheckinRequest): Promise<CheckoutRecord> {
    const response = await fetch(`${this.baseUrl}/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to checkin document');
    }

    return response.json();
  }

  /**
   * Extend checkout due date
   */
  async extendCheckout(request: ExtendCheckoutRequest): Promise<CheckoutRecord> {
    const response = await fetch(`${this.baseUrl}/extend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to extend checkout');
    }

    return response.json();
  }

  /**
   * Force check-in (admin override)
   */
  async forceCheckin(request: ForceCheckinRequest): Promise<CheckoutRecord> {
    const response = await fetch(`${this.baseUrl}/force-checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to force checkin');
    }

    return response.json();
  }

  /**
   * Get checkout status for a document
   */
  async getCheckoutStatus(documentId: string): Promise<CheckoutStatusResponse> {
    const response = await fetch(`${this.baseUrl}/document/${documentId}/status`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get checkout status');
    }

    return response.json();
  }

  /**
   * List checkout records with filtering
   */
  async listCheckoutRecords(params?: {
    status_filter?: string;
    department?: string;
    overdue_only?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    records: CheckoutRecord[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter);
    if (params?.department) searchParams.append('department', params.department);
    if (params?.overdue_only) searchParams.append('overdue_only', String(params.overdue_only));
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.page_size) searchParams.append('page_size', String(params.page_size));

    const response = await fetch(`${this.baseUrl}/records?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list checkout records');
    }

    return response.json();
  }

  /**
   * Get checkout analytics
   */
  async getAnalytics(): Promise<CheckoutAnalytics> {
    const response = await fetch(`${this.baseUrl}/analytics`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get checkout analytics');
    }

    return response.json();
  }

  /**
   * Get audit trail for a document
   */
  async getAuditTrail(documentId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/audit/${documentId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get audit trail');
    }

    return response.json();
  }
}

export const checkinoutService = new CheckinoutService();
export default checkinoutService;
