/**
 * Classification Service
 * API client for document classification endpoints
 */

const API_BASE_URL = 'http://localhost:8001';

export interface ClassificationResult {
  document_type_id: string;
  document_type_name: string;
  confidence: number;
  reasoning: string;
  suggested_metadata: Record<string, any>;
}

export interface ClassificationResponse {
  success: boolean;
  classification: ClassificationResult;
  filename: string;
  ocr_performed: boolean;
  ocr_text_length: number;
  error?: string;
}

export interface BatchClassificationResponse {
  total: number;
  classifications: Array<{
    filename: string;
    success: boolean;
    classification: ClassificationResult;
    ocr_performed: boolean;
    error?: string;
  }>;
}

class ClassificationService {
  /**
   * Check if classification service is available
   */
  async getStatus(): Promise<{ available: boolean; service: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/classification/status`);
    if (!response.ok) {
      throw new Error('Failed to check classification service status');
    }
    return response.json();
  }

  /**
   * Classify a single document
   */
  async classifyDocument(
    file: File,
    useOcr: boolean = true,
    ocrText?: string
  ): Promise<ClassificationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ocr', String(useOcr));
    if (ocrText) {
      formData.append('ocr_text', ocrText);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/classification/classify`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Classification failed');
    }

    return response.json();
  }

  /**
   * Classify multiple documents in batch
   */
  async classifyDocumentsBatch(
    files: File[],
    useOcr: boolean = true
  ): Promise<BatchClassificationResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('use_ocr', String(useOcr));

    const response = await fetch(`${API_BASE_URL}/api/v1/classification/classify-batch`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Batch classification failed');
    }

    return response.json();
  }

  /**
   * Validate a classification result
   */
  async validateClassification(
    documentTypeId: string,
    confidenceThreshold: number = 0.7
  ): Promise<{
    valid: boolean;
    reason?: string;
    document_type_name?: string;
    requires_manual_review: boolean;
  }> {
    const formData = new FormData();
    formData.append('document_type_id', documentTypeId);
    formData.append('confidence_threshold', String(confidenceThreshold));

    const response = await fetch(`${API_BASE_URL}/api/v1/classification/validate-classification`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Validation failed');
    }

    return response.json();
  }
}

export const classificationService = new ClassificationService();
export default classificationService;
