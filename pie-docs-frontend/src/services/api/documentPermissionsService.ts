/**
 * Document Permissions Service
 * Handles document-level ACLs and sharing
 */

const API_BASE_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8001/api/v1';

// ============================================
// Type Definitions
// ============================================

export interface DocumentPermission {
  id: string;
  document_id: string;
  user_id?: string;
  role_id?: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;
  can_download: boolean;
  expires_at?: string;
  granted_by?: string;
  granted_at: string;
}

export interface DocumentPermissionCreate {
  document_id?: string; // Will be set from URL path
  user_id?: string;
  role_id?: string;
  can_view?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_share?: boolean;
  can_download?: boolean;
  expires_at?: string;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  share_token: string;
  share_type: 'public' | 'password' | 'email';
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  requires_password: boolean;
  allowed_emails: string[];
  max_access_count?: number;
  current_access_count: number;
  expires_at?: string;
  shared_by: string;
  shared_at: string;
  is_active: boolean;
  revoked_at?: string;
}

export interface DocumentShareCreate {
  document_id?: string; // Will be set from URL path
  share_type: 'public' | 'password' | 'email';
  can_view?: boolean;
  can_download?: boolean;
  can_edit?: boolean;
  requires_password?: boolean;
  password?: string; // Plain text password, will be hashed by backend
  allowed_emails?: string[];
  max_access_count?: number;
  expires_at?: string;
}

export interface ShareAccessLog {
  id: string;
  share_id: string;
  accessed_by_email?: string;
  ip_address?: string;
  user_agent?: string;
  access_type: 'view' | 'download';
  accessed_at: string;
}

// ============================================
// Service Class
// ============================================

class DocumentPermissionsService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getStoredToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  private getStoredToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  private getStoredUser(): { id: string } | null {
    try {
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const storageType = rememberMe ? localStorage : sessionStorage;
      const userStr = storageType.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get current authenticated user's ID
   */
  getCurrentUserId(): string | null {
    const user = this.getStoredUser();
    return user?.id || null;
  }

  // ============================================
  // Document Permissions
  // ============================================

  /**
   * List all permissions for a specific document
   */
  async listDocumentPermissions(documentId: string): Promise<DocumentPermission[]> {
    return this.request<DocumentPermission[]>(`/documents/${documentId}/permissions`);
  }

  /**
   * Grant permission on a document to a user or role
   */
  async grantDocumentPermission(
    documentId: string,
    permission: DocumentPermissionCreate
  ): Promise<DocumentPermission> {
    // Ensure document_id is always included and all fields are properly set
    // Backend expects null (not undefined) for user_id/role_id when not provided
    const payload = {
      document_id: documentId,
      user_id: permission.user_id ?? null,
      role_id: permission.role_id ?? null,
      can_view: permission.can_view ?? false,
      can_edit: permission.can_edit ?? false,
      can_delete: permission.can_delete ?? false,
      can_share: permission.can_share ?? false,
      can_download: permission.can_download ?? false,
      ...(permission.expires_at && { expires_at: permission.expires_at }),
    };

    return this.request<DocumentPermission>(`/documents/${documentId}/permissions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Revoke a specific permission from a document
   */
  async revokeDocumentPermission(documentId: string, permissionId: string): Promise<void> {
    return this.request<void>(`/documents/${documentId}/permissions/${permissionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Bulk grant permissions to multiple users/roles
   */
  async bulkGrantPermissions(
    documentId: string,
    permissions: DocumentPermissionCreate[]
  ): Promise<DocumentPermission[]> {
    const grantPromises = permissions.map(permission =>
      this.grantDocumentPermission(documentId, permission)
    );
    return Promise.all(grantPromises);
  }

  /**
   * Update existing permission (by revoking and re-granting)
   */
  async updateDocumentPermission(
    documentId: string,
    permissionId: string,
    updates: DocumentPermissionCreate
  ): Promise<DocumentPermission> {
    // Since there's no PATCH endpoint, we revoke and re-grant
    await this.revokeDocumentPermission(documentId, permissionId);
    return this.grantDocumentPermission(documentId, updates);
  }

  /**
   * Check if current user has specific permission on a document
   * This can be extended to call a backend endpoint that checks permissions
   */
  async checkUserPermission(
    documentId: string,
    permissionType: 'view' | 'edit' | 'delete' | 'share' | 'download'
  ): Promise<boolean> {
    try {
      const permissions = await this.listDocumentPermissions(documentId);
      // This is a simplified check - ideally the backend would have an endpoint
      // that checks the current user's effective permissions (including role-based)
      return permissions.some(p => {
        switch (permissionType) {
          case 'view':
            return p.can_view;
          case 'edit':
            return p.can_edit;
          case 'delete':
            return p.can_delete;
          case 'share':
            return p.can_share;
          case 'download':
            return p.can_download;
          default:
            return false;
        }
      });
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  // ============================================
  // Document Shares
  // ============================================

  /**
   * List all shares for a specific document
   */
  async listDocumentShares(documentId: string): Promise<DocumentShare[]> {
    return this.request<DocumentShare[]>(`/documents/${documentId}/shares`);
  }

  /**
   * Create a new share link for a document
   */
  async createDocumentShare(
    documentId: string,
    share: DocumentShareCreate
  ): Promise<DocumentShare> {
    return this.request<DocumentShare>(`/documents/${documentId}/shares`, {
      method: 'POST',
      body: JSON.stringify(share),
    });
  }

  /**
   * Revoke a share link (soft delete - sets is_active to false)
   */
  async revokeDocumentShare(documentId: string, shareId: string): Promise<void> {
    return this.request<void>(`/documents/${documentId}/shares/${shareId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get share details by token (public endpoint)
   */
  async getShareByToken(shareToken: string): Promise<DocumentShare> {
    return this.request<DocumentShare>(`/shares/${shareToken}`);
  }

  /**
   * Access a shared document (records access in audit log)
   */
  async accessSharedDocument(
    shareToken: string,
    password?: string,
    email?: string
  ): Promise<{
    success: boolean;
    document?: any;
    error?: string;
  }> {
    return this.request<{
      success: boolean;
      document?: any;
      error?: string;
    }>(`/shares/${shareToken}/access`, {
      method: 'POST',
      body: JSON.stringify({ password, email }),
    });
  }

  /**
   * Get access log for a specific share
   */
  async getShareAccessLog(shareId: string): Promise<ShareAccessLog[]> {
    return this.request<ShareAccessLog[]>(`/shares/${shareId}/access-log`);
  }

  /**
   * Generate a shareable URL for a document
   */
  generateShareUrl(shareToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared/${shareToken}`;
  }

  /**
   * Copy share URL to clipboard
   */
  async copyShareUrlToClipboard(shareToken: string): Promise<boolean> {
    try {
      const url = this.generateShareUrl(shareToken);
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get effective permissions for current user on a document
   * Combines user-specific and role-based permissions
   */
  async getEffectivePermissions(documentId: string): Promise<{
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_share: boolean;
    can_download: boolean;
  }> {
    try {
      const permissions = await this.listDocumentPermissions(documentId);

      // Aggregate all permissions (OR logic)
      const effective = {
        can_view: false,
        can_edit: false,
        can_delete: false,
        can_share: false,
        can_download: false,
      };

      permissions.forEach(permission => {
        // Skip expired permissions
        if (permission.expires_at && new Date(permission.expires_at) < new Date()) {
          return;
        }

        effective.can_view = effective.can_view || permission.can_view;
        effective.can_edit = effective.can_edit || permission.can_edit;
        effective.can_delete = effective.can_delete || permission.can_delete;
        effective.can_share = effective.can_share || permission.can_share;
        effective.can_download = effective.can_download || permission.can_download;
      });

      return effective;
    } catch (error) {
      console.error('Error getting effective permissions:', error);
      // Return safe defaults on error
      return {
        can_view: false,
        can_edit: false,
        can_delete: false,
        can_share: false,
        can_download: false,
      };
    }
  }

  /**
   * Grant permission to the current authenticated user
   */
  async grantPermissionToCurrentUser(
    documentId: string,
    permissions: Omit<DocumentPermissionCreate, 'user_id' | 'role_id' | 'document_id'>
  ): Promise<DocumentPermission> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    return this.grantDocumentPermission(documentId, {
      ...permissions,
      user_id: userId,
    });
  }

  /**
   * Quick permission grant with common permission sets
   */
  async grantViewerPermission(documentId: string, userId?: string, roleId?: string): Promise<DocumentPermission> {
    return this.grantDocumentPermission(documentId, {
      user_id: userId,
      role_id: roleId,
      can_view: true,
      can_edit: false,
      can_delete: false,
      can_share: false,
      can_download: true,
    });
  }

  async grantEditorPermission(documentId: string, userId?: string, roleId?: string): Promise<DocumentPermission> {
    return this.grantDocumentPermission(documentId, {
      user_id: userId,
      role_id: roleId,
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_share: false,
      can_download: true,
    });
  }

  async grantOwnerPermission(documentId: string, userId?: string, roleId?: string): Promise<DocumentPermission> {
    return this.grantDocumentPermission(documentId, {
      user_id: userId,
      role_id: roleId,
      can_view: true,
      can_edit: true,
      can_delete: true,
      can_share: true,
      can_download: true,
    });
  }

  /**
   * Create common share types
   */
  async createPublicShare(
    documentId: string,
    options: {
      can_download?: boolean;
      expires_at?: string;
      max_access_count?: number;
    } = {}
  ): Promise<DocumentShare> {
    return this.createDocumentShare(documentId, {
      share_type: 'public',
      can_view: true,
      can_download: options.can_download ?? false,
      can_edit: false,
      expires_at: options.expires_at,
      max_access_count: options.max_access_count,
    });
  }

  async createPasswordProtectedShare(
    documentId: string,
    password: string,
    options: {
      can_download?: boolean;
      expires_at?: string;
    } = {}
  ): Promise<DocumentShare> {
    return this.createDocumentShare(documentId, {
      share_type: 'password',
      can_view: true,
      can_download: options.can_download ?? false,
      can_edit: false,
      requires_password: true,
      password,
      expires_at: options.expires_at,
    });
  }

  async createEmailRestrictedShare(
    documentId: string,
    allowedEmails: string[],
    options: {
      can_download?: boolean;
      expires_at?: string;
    } = {}
  ): Promise<DocumentShare> {
    return this.createDocumentShare(documentId, {
      share_type: 'email',
      can_view: true,
      can_download: options.can_download ?? false,
      can_edit: false,
      allowed_emails: allowedEmails,
      expires_at: options.expires_at,
    });
  }
}

// Export singleton instance
export const documentPermissionsService = new DocumentPermissionsService();
export default documentPermissionsService;
