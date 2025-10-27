/**
 * Signatures API Service
 * Handles all signature-related API calls
 */
import axios from 'axios';

// Get base URL from environment or default
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
  // Remove trailing slash if present
  return envUrl.replace(/\/$/, '');
};

export interface SignatureMetadata {
  width: number;
  height: number;
  deviceInfo?: string;
}

export interface SignatureCreate {
  document_id: string;
  signature_data: string;  // Base64 encoded PNG
  signature_type: 'draw' | 'upload';
  metadata?: SignatureMetadata;
}

export interface SignatureResponse {
  id: string;
  document_id: string;
  signature_data: string;
  signature_type: 'draw' | 'upload';
  metadata?: SignatureMetadata;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface SignatureListResponse {
  signatures: SignatureResponse[];
  total: number;
}

class SignaturesService {
  private readonly baseUrl: string;

  constructor() {
    const apiBase = getApiBaseUrl();
    // Check if base URL already includes /api/v1
    if (apiBase.includes('/api/v1')) {
      this.baseUrl = `${apiBase}/signatures`;
    } else {
      this.baseUrl = `${apiBase}/api/v1/signatures`;
    }
  }

  /**
   * Get authorization headers with token
   */
  private getHeaders() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a new signature for a document
   */
  async createSignature(signature: SignatureCreate): Promise<SignatureResponse> {
    try {
      const response = await axios.post<SignatureResponse>(
        this.baseUrl,
        signature,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error creating signature:', error);
      throw new Error(error.response?.data?.detail || 'Failed to create signature');
    }
  }

  /**
   * Get all signatures for a specific document
   */
  async getDocumentSignatures(documentId: string): Promise<SignatureListResponse> {
    try {
      const response = await axios.get<SignatureListResponse>(
        `${this.baseUrl}/document/${documentId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching document signatures:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch signatures');
    }
  }

  /**
   * Get a specific signature by ID
   */
  async getSignature(signatureId: string): Promise<SignatureResponse> {
    try {
      const response = await axios.get<SignatureResponse>(
        `${this.baseUrl}/${signatureId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching signature:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch signature');
    }
  }

  /**
   * Update a signature
   */
  async updateSignature(
    signatureId: string,
    updates: { signature_data?: string; metadata?: SignatureMetadata }
  ): Promise<SignatureResponse> {
    try {
      const response = await axios.put<SignatureResponse>(
        `${this.baseUrl}/${signatureId}`,
        updates,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating signature:', error);
      throw new Error(error.response?.data?.detail || 'Failed to update signature');
    }
  }

  /**
   * Delete a signature
   */
  async deleteSignature(signatureId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/${signatureId}`,
        { headers: this.getHeaders() }
      );
    } catch (error: any) {
      console.error('Error deleting signature:', error);
      throw new Error(error.response?.data?.detail || 'Failed to delete signature');
    }
  }
}

export const signaturesService = new SignaturesService();
