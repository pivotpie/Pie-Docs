/**
 * Document Types Service
 * API service for document type management
 */

import axios from '@/config/axiosConfig';

const API_BASE_URL = 'http://localhost:8001/api/v1';

export interface DocumentType {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  metadata_schema_id?: string;
  required_fields?: any[];
  optional_fields?: any[];
  default_folder_id?: string;
  allowed_file_types?: string[];
  max_file_size_mb?: number;
  default_workflow_id?: string;
  default_approval_chain_id?: string;
  requires_approval?: boolean;
  retention_days?: number;
  auto_delete_after_retention?: boolean;
  is_active?: boolean;
  is_system_type?: boolean;
  restricted_to_roles?: string[];
  document_count?: number;
  last_used_at?: string;
  created_by?: string;
  created_at: string;
  updated_by?: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DocumentTypeCreate {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  metadata_schema_id?: string;
  required_fields?: any[];
  optional_fields?: any[];
  default_folder_id?: string;
  allowed_file_types?: string[];
  max_file_size_mb?: number;
  default_workflow_id?: string;
  default_approval_chain_id?: string;
  requires_approval?: boolean;
  retention_days?: number;
  auto_delete_after_retention?: boolean;
  is_active?: boolean;
  restricted_to_roles?: string[];
}

export interface DocumentTypeUpdate {
  display_name?: string;
  description?: string;
  icon?: string;
  color?: string;
  metadata_schema_id?: string;
  required_fields?: any[];
  optional_fields?: any[];
  default_folder_id?: string;
  allowed_file_types?: string[];
  max_file_size_mb?: number;
  default_workflow_id?: string;
  default_approval_chain_id?: string;
  requires_approval?: boolean;
  retention_days?: number;
  auto_delete_after_retention?: boolean;
  is_active?: boolean;
  restricted_to_roles?: string[];
}

export interface DocumentTypeListResponse {
  document_types: DocumentType[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DocumentTypeStats {
  id: string;
  name: string;
  display_name: string;
  document_count: number;
  last_used_at?: string;
  avg_file_size_mb?: number;
  total_storage_mb?: number;
}

export const documentTypesService = {
  /**
   * List document types with pagination and filtering
   */
  async listDocumentTypes(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    include_system?: boolean;
  }): Promise<DocumentTypeListResponse> {
    const response = await axios.get(`${API_BASE_URL}/document-types`, { params });
    return response.data;
  },

  /**
   * Get document type statistics
   */
  async getDocumentTypeStats(): Promise<DocumentTypeStats[]> {
    const response = await axios.get(`${API_BASE_URL}/document-types/stats`);
    return response.data;
  },

  /**
   * Get a specific document type by ID
   */
  async getDocumentType(id: string): Promise<DocumentType> {
    const response = await axios.get(`${API_BASE_URL}/document-types/${id}`);
    return response.data;
  },

  /**
   * Get a specific document type by name
   */
  async getDocumentTypeByName(name: string): Promise<DocumentType> {
    const response = await axios.get(`${API_BASE_URL}/document-types/by-name/${name}`);
    return response.data;
  },

  /**
   * Create a new document type
   */
  async createDocumentType(data: DocumentTypeCreate): Promise<DocumentType> {
    const response = await axios.post(`${API_BASE_URL}/document-types`, data);
    return response.data;
  },

  /**
   * Update an existing document type
   */
  async updateDocumentType(id: string, data: DocumentTypeUpdate): Promise<DocumentType> {
    const response = await axios.patch(`${API_BASE_URL}/document-types/${id}`, data);
    return response.data;
  },

  /**
   * Delete a document type
   */
  async deleteDocumentType(id: string, hardDelete: boolean = false): Promise<void> {
    await axios.delete(`${API_BASE_URL}/document-types/${id}`, {
      params: { hard_delete: hardDelete }
    });
  },

  /**
   * Increment document count for a document type
   */
  async incrementDocumentCount(id: string): Promise<DocumentType> {
    const response = await axios.post(`${API_BASE_URL}/document-types/${id}/increment-count`);
    return response.data;
  },
};
