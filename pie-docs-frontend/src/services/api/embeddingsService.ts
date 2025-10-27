/**
 * Embeddings Service
 * API client for generating text embeddings
 */

const API_BASE_URL = 'http://localhost:8001';

export interface EmbeddingResponse {
  embedding: number[];
  dimension: number;
  model: string;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  count: number;
  dimension: number;
  model: string;
}

export interface ServiceStatus {
  available: boolean;
  model: string;
  dimension: number | null;
  status: string;
  error?: string;
}

class EmbeddingsService {
  /**
   * Check embedding service status
   */
  async getStatus(): Promise<ServiceStatus> {
    const response = await fetch(`${API_BASE_URL}/api/v1/embeddings/status`);
    if (!response.ok) {
      throw new Error('Failed to check embeddings service status');
    }
    return response.json();
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/embeddings/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate embedding');
    }

    return response.json();
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<BatchEmbeddingResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/embeddings/generate-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ texts })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate batch embeddings');
    }

    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    model: string;
    test_dimension: number;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/embeddings/health`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Health check failed');
    }

    return response.json();
  }
}

export const embeddingsService = new EmbeddingsService();
export default embeddingsService;
