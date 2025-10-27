/**
 * Metadata Schema Service
 * Frontend API integration for metadata schemas and fields management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';

// ============================================
// Types and Interfaces
// ============================================

export interface MetadataFieldOption {
  value: string;
  label: string;
}

export interface ConditionalLogic {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface MetadataField {
  id: string;
  schema_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'dropdown' | 'multiselect' | 'checkbox' | 'textarea';
  description?: string;
  default_value?: string;
  placeholder?: string;

  // Validation
  is_required: boolean;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;

  // Options for dropdown/multiselect
  options?: MetadataFieldOption[];

  // Display settings
  display_order: number;
  display_width: 'full' | 'half' | 'third' | 'quarter';
  group_name?: string;

  // Conditional display
  conditional_logic?: ConditionalLogic;

  // Help
  help_text?: string;
  help_url?: string;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetadataSchema {
  id: string;
  name: string;
  description?: string;
  document_type_id?: string;
  version: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  fields?: MetadataField[];
}

export interface MetadataSchemaWithFields extends MetadataSchema {
  fields: MetadataField[];
}

export interface MetadataSchemaCreate {
  name: string;
  description?: string;
  document_type_id: string;
  is_active?: boolean;
  fields?: Omit<MetadataField, 'id' | 'schema_id' | 'created_at' | 'updated_at'>[];
}

export interface MetadataSchemaUpdate {
  name?: string;
  description?: string;
  document_type_id?: string;
  is_active?: boolean;
}

export interface MetadataFieldCreate extends Omit<MetadataField, 'id' | 'created_at' | 'updated_at'> {
  schema_id: string;
}

export interface MetadataFieldUpdate {
  field_label?: string;
  field_type?: string;
  description?: string;
  default_value?: string;
  placeholder?: string;
  is_required?: boolean;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  options?: MetadataFieldOption[];
  display_order?: number;
  display_width?: string;
  group_name?: string;
  conditional_logic?: ConditionalLogic;
  help_text?: string;
  help_url?: string;
  is_active?: boolean;
}

export interface DocumentMetadataUpdate {
  metadata: Record<string, any>;
}

export interface DocumentMetadataValidation {
  is_valid: boolean;
  errors?: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

// ============================================
// Service Class
// ============================================

class MetadataSchemaService {
  private baseUrl = `${API_BASE_URL}/metadata-schemas`;

  /**
   * Create a new metadata schema
   */
  async createSchema(schema: MetadataSchemaCreate): Promise<MetadataSchemaWithFields> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(schema),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create metadata schema');
    }

    return response.json();
  }

  /**
   * List all metadata schemas
   */
  async listSchemas(params?: {
    document_type_id?: string;
    is_active?: boolean;
    include_fields?: boolean;
  }): Promise<MetadataSchema[]> {
    const searchParams = new URLSearchParams();
    if (params?.document_type_id) searchParams.append('document_type_id', params.document_type_id);
    if (params?.is_active !== undefined) searchParams.append('is_active', String(params.is_active));
    if (params?.include_fields !== undefined) searchParams.append('include_fields', String(params.include_fields));

    const response = await fetch(`${this.baseUrl}?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list metadata schemas');
    }

    return response.json();
  }

  /**
   * Get a specific metadata schema with all fields
   */
  async getSchema(schemaId: string): Promise<MetadataSchemaWithFields> {
    const response = await fetch(`${this.baseUrl}/${schemaId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get metadata schema');
    }

    return response.json();
  }

  /**
   * Get schema by document type ID
   */
  async getSchemaByDocumentType(documentTypeId: string): Promise<MetadataSchemaWithFields> {
    const response = await fetch(`${this.baseUrl}/document-type/${documentTypeId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No metadata schema found for this document type');
      }
      throw new Error('Failed to get metadata schema');
    }

    return response.json();
  }

  /**
   * Update a metadata schema
   */
  async updateSchema(schemaId: string, update: MetadataSchemaUpdate): Promise<MetadataSchema> {
    const response = await fetch(`${this.baseUrl}/${schemaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update metadata schema');
    }

    return response.json();
  }

  /**
   * Delete a metadata schema (soft delete)
   */
  async deleteSchema(schemaId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${schemaId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete metadata schema');
    }
  }

  // ============================================
  // Metadata Fields Methods
  // ============================================

  /**
   * Create a new metadata field
   */
  async createField(schemaId: string, field: MetadataFieldCreate): Promise<MetadataField> {
    const response = await fetch(`${this.baseUrl}/${schemaId}/fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(field),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create metadata field');
    }

    return response.json();
  }

  /**
   * List all fields for a schema
   */
  async listFields(schemaId: string, includeInactive = false): Promise<MetadataField[]> {
    const searchParams = new URLSearchParams();
    if (includeInactive) searchParams.append('include_inactive', 'true');

    const response = await fetch(`${this.baseUrl}/${schemaId}/fields?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list metadata fields');
    }

    return response.json();
  }

  /**
   * Update a metadata field
   */
  async updateField(fieldId: string, update: MetadataFieldUpdate): Promise<MetadataField> {
    const response = await fetch(`${this.baseUrl}/fields/${fieldId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update metadata field');
    }

    return response.json();
  }

  /**
   * Delete a metadata field (soft delete)
   */
  async deleteField(fieldId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/fields/${fieldId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete metadata field');
    }
  }

  // ============================================
  // Document Metadata Methods
  // ============================================

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(documentId: string, metadata: Record<string, any>): Promise<{ metadata: Record<string, any> }> {
    const response = await fetch(`${this.baseUrl}/documents/${documentId}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metadata }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update document metadata');
    }

    return response.json();
  }

  /**
   * Validate document metadata against schema
   */
  async validateDocumentMetadata(documentId: string): Promise<DocumentMetadataValidation> {
    const response = await fetch(`${this.baseUrl}/documents/${documentId}/metadata/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to validate document metadata');
    }

    return response.json();
  }
}

export const metadataSchemaService = new MetadataSchemaService();
export default metadataSchemaService;
