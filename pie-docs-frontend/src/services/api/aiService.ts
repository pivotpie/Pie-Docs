/**
 * AI Service - Handles all AI-related API calls
 * Connects to GPT-5 powered backend endpoints
 */

// Environment configuration - Using local backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL_LOCAL || 'http://localhost:8001';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');

export interface DocumentInsight {
  id: string;
  document_id: string;
  insight_type: 'clause' | 'pii' | 'financial' | 'reference' | 'date' | 'risk';
  category: string;
  content: string;
  page_number?: number;
  confidence: number;
  severity?: 'low' | 'medium' | 'high';
  action?: string;
  metadata?: any;
  created_at: string;
}

export interface DocumentSummary {
  id: string;
  document_id: string;
  summary_type: string;
  summary_text: string;
  key_points: string[];
  word_count: number;
  generated_at: string;
  model_version: string;
}

export interface DocumentKeyTerm {
  id: string;
  document_id: string;
  term: string;
  definition?: string;
  importance: 'critical' | 'important' | 'reference';
  category: 'legal' | 'financial' | 'technical' | 'date' | 'party' | 'other';
  page_references?: number[];
  context?: string;
  metadata?: any;
  created_at: string;
}

export interface GenerateDocumentRequest {
  prompt: string;
  source_document_ids: string[];
  document_type?: string;
}

export interface GeneratedDocument {
  id: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class AIService {
  private baseURL = `${API_BASE_URL}/api/v1/ai`;

  /**
   * Get stored authentication token
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  /**
   * Get headers with authentication
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Get all insights for a document (cached from upload-time processing)
   */
  async getDocumentInsights(documentId: string): Promise<{ insights: DocumentInsight[]; count: number }> {
    try {
      const response = await fetch(`${this.baseURL}/documents/${documentId}/insights`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to fetch document insights:', error);
      throw error;
    }
  }

  /**
   * Get document summary (cached from upload-time processing)
   */
  async getDocumentSummary(documentId: string): Promise<DocumentSummary> {
    try {
      const response = await fetch(`${this.baseURL}/documents/${documentId}/summary`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to fetch document summary:', error);
      throw error;
    }
  }

  /**
   * Get key terms for a document (cached from upload-time processing)
   */
  async getDocumentKeyTerms(documentId: string): Promise<{ terms: DocumentKeyTerm[]; count: number }> {
    try {
      const response = await fetch(`${this.baseURL}/documents/${documentId}/key-terms`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch key terms: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to fetch document key terms:', error);
      throw error;
    }
  }

  /**
   * Generate new document using GPT-5 (real-time generation)
   * Uses extended timeout (3 minutes for GPT-5 with low reasoning_effort)
   */
  async generateDocument(request: GenerateDocumentRequest): Promise<GeneratedDocument> {
    try {
      const response = await fetch(`${this.baseURL}/generate-document`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(180000), // 3 minutes - GPT-5 typically takes ~2-3 min
      });
      if (!response.ok) {
        throw new Error(`Failed to generate document: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to generate document:', error);
      throw error;
    }
  }

  /**
   * Create custom summary with specific length (real-time generation)
   */
  async createCustomSummary(documentId: string, length: 'short' | 'medium' | 'long' = 'medium'): Promise<{ summary: string }> {
    try {
      const response = await fetch(`${this.baseURL}/documents/${documentId}/summary/custom`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ length }),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to create custom summary: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to create custom summary:', error);
      throw error;
    }
  }

  /**
   * Generate amendment document (real-time generation)
   */
  async generateAmendment(documentId: string, changes: string): Promise<{ amendment: string }> {
    try {
      const response = await fetch(`${this.baseURL}/documents/${documentId}/actions/amendment`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ action: 'amendment', input_text: changes }),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to generate amendment: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to generate amendment:', error);
      throw error;
    }
  }

  /**
   * Execute dynamic AI action (insights, key terms)
   */
  async executeDynamicAction(
    documentId: string,
    actionType: 'insights' | 'key-terms',
    inputText?: string
  ): Promise<{ action: string; result: any; generation_time_ms: number; cached: boolean }> {
    try {
      const response = await fetch(`${this.baseURL}/documents/${documentId}/actions/${actionType}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ action: actionType, input_text: inputText }),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to execute ${actionType}: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Failed to execute ${actionType}:`, error);
      throw error;
    }
  }

  /**
   * Get multimodal analysis for a document
   */
  async getDocumentMultimodalAnalysis(
    documentId: string,
    analysisType?: string
  ): Promise<{ analyses: any[]; count: number; document_id: string }> {
    try {
      const url = new URL(`${this.baseURL}/documents/${documentId}/multimodal`);
      if (analysisType) {
        url.searchParams.append('analysis_type', analysisType);
      }

      const response = await fetch(url.toString(), {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch multimodal analysis: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to fetch multimodal analysis:', error);
      throw error;
    }
  }

  /**
   * Get a generated document by ID
   */
  async getGeneratedDocument(docId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/generated-documents/${docId}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch generated document: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to fetch generated document:', error);
      throw error;
    }
  }

  /**
   * Save a generated document to the library
   */
  async saveGeneratedDocumentToLibrary(
    docId: string,
    folderId?: string
  ): Promise<{ success: boolean; document_id: string; message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/generated-documents/${docId}/save-to-library`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ folder_id: folderId }),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to save generated document: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Failed to save generated document:', error);
      throw error;
    }
  }

  /**
   * Download a generated document
   */
  async downloadGeneratedDocument(docId: string, format: 'markdown' | 'pdf' | 'docx' = 'markdown'): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseURL}/generated-documents/${docId}/download?format=${format}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      if (!response.ok) {
        throw new Error(`Failed to download generated document: ${response.statusText}`);
      }
      return response.blob();
    } catch (error) {
      console.error('Failed to download generated document:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
