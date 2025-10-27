// Document RAG Service - Production Implementation
// Connects to backend RAG endpoints for real document retrieval and question answering

import axios from '@/config/axiosConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

interface DocumentChunk {
  chunk_id?: string;
  document_id?: string;
  content: string;
  chunk_index?: number;
  similarity?: number;
  document_title?: string;
  metadata?: {
    documentType?: string;
    section?: string;
    relevanceScore?: number;
  };
}

interface RAGResponse {
  answer: string;
  relevant_chunks?: DocumentChunk[];
  relevantChunks?: DocumentChunk[];
  confidence: number;
  sources?: Array<{
    title: string;
    document_type: string;
    chunks: Array<{
      content: string;
      similarity: number;
    }>;
  }>;
}

interface SearchRequest {
  query: string;
  search_type: 'semantic' | 'hybrid';
  top_k?: number;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  document_type: string;
  author: string;
  created_at: string;
  metadata: Record<string, any>;
  tags: string[];
  similarity: number;
}

class DocumentRAGService {
  private useMockData: boolean = false;
  private mockService: MockRAGService | null = null;

  constructor() {
    // Check if backend is available, fallback to mock if needed
    this.checkBackendAvailability();
  }

  private async checkBackendAvailability(): Promise<void> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
      if (response.data && response.data.status === 'healthy') {
        this.useMockData = false;
        console.log('✅ RAG Backend connected successfully');
        console.log('Backend URL:', API_BASE_URL);
      } else {
        throw new Error('Backend health check failed');
      }
    } catch (error) {
      console.error('⚠️ RAG Backend connection failed:', error);
      console.log('Attempting to connect to:', API_BASE_URL);
      this.useMockData = true;
      this.mockService = new MockRAGService();
      console.warn('Using mock data as fallback');
    }
  }

  /**
   * Process a query using RAG - retrieves relevant chunks and generates answer
   * NOW USING ENHANCED ENDPOINT: /api/v1/search/rag (GPT-4o powered)
   */
  public async processQuery(userQuery: string, topK: number = 5): Promise<RAGResponse> {
    // Use mock data if backend is unavailable
    if (this.useMockData && this.mockService) {
      return this.mockService.processQuery(userQuery);
    }

    try {
      // ✅ ENHANCED: Using new /api/v1/search/rag endpoint with GPT-4o
      const response = await axios.post<RAGResponse>(
        `${API_BASE_URL}/api/v1/search/rag`,  // ← Changed from /api/v1/rag/query
        {
          query: userQuery,
          top_k: topK,
          include_sources: true  // ← Enhanced: Get full source attribution
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout for LLM processing
        }
      );

      // Normalize response format
      const data = response.data;
      return {
        answer: data.answer,
        relevantChunks: data.relevant_chunks || data.relevantChunks || [],
        confidence: data.confidence || 0.5,
        sources: data.sources || []
      };
    } catch (error) {
      console.error('RAG query error:', error);

      // Fallback to mock if API fails
      if (!this.mockService) {
        this.mockService = new MockRAGService();
      }
      this.useMockData = true;
      return this.mockService.processQuery(userQuery);
    }
  }

  /**
   * Perform semantic search on documents
   */
  public async semanticSearch(
    query: string,
    topK: number = 5
  ): Promise<SearchResult[]> {
    if (this.useMockData && this.mockService) {
      return [];
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/search`,
        {
          query,
          search_type: 'semantic',
          top_k: topK
        } as SearchRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return response.data.results || [];
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  /**
   * Perform hybrid search (semantic + keyword)
   */
  public async hybridSearch(
    query: string,
    topK: number = 5
  ): Promise<SearchResult[]> {
    if (this.useMockData && this.mockService) {
      return [];
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/search`,
        {
          query,
          search_type: 'hybrid',
          top_k: topK
        } as SearchRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return response.data.results || [];
    } catch (error) {
      console.error('Hybrid search error:', error);
      return [];
    }
  }

  /**
   * Get suggested queries
   */
  public async suggestQueries(): Promise<string[]> {
    if (this.useMockData && this.mockService) {
      return this.mockService.suggestQueries();
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/rag/suggestions`);
      return response.data.suggestions || [];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [
        "What is the Document Problem?",
        "Show me all invoices from December 2023",
        "What is intelligent document processing?",
        "What are our technology vendors?",
        "Explain the Intelligence Gap"
      ];
    }
  }

  /**
   * Get document statistics
   */
  public async getDocumentStats(): Promise<{
    totalDocuments: number;
    documentTypes: string[];
    dateRange: string;
  }> {
    if (this.useMockData && this.mockService) {
      return this.mockService.getDocumentStats();
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/status`);
      return {
        totalDocuments: response.data.database?.tables || 0,
        documentTypes: ['PDF', 'Invoice', 'Research Paper'],
        dateRange: 'Current database'
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        totalDocuments: 0,
        documentTypes: [],
        dateRange: 'Unknown'
      };
    }
  }

  /**
   * Regenerate embeddings for a document
   */
  public async regenerateEmbeddings(documentId: string): Promise<boolean> {
    if (this.useMockData) {
      return false;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/admin/regenerate-embeddings/${documentId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return true;
    } catch (error) {
      console.error('Error regenerating embeddings:', error);
      return false;
    }
  }

  /**
   * Check if using mock data
   */
  public isUsingMockData(): boolean {
    return this.useMockData;
  }
}

// Mock RAG Service for fallback
class MockRAGService {
  private documentContext: string = `
# Demo Documents Database

## Document 1: Enterprise Intelligence White Paper
**Document Type:** Research Paper/White Paper
**Title:** The Decisive Enterprise: How a Modern Intelligence Stack Solves Automation's Core Challenges

### Key Concepts:
- **The Document Problem:** 80% of enterprise business-critical information is unstructured
- **The Intelligence Gap:** Chasm between static logic of old automation and dynamic business reality
- **Modern Intelligence Stack:** Cohesive intelligent document processing and decision-making tech stack
- **Intelligent Document Processing (IDP):** Advanced computer vision and learning models
- **Decision Intelligence Engine:** Business Process Management platforms with integrated business rules

### Content Summary:
Traditional automation has stalled because rule-based systems cannot handle unstructured documents. The solution is a modern intelligence stack with two layers: IDP layer for document processing and Decision Intelligence Engine for automated decision-making.
`;

  private calculateRelevance(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    let matches = 0;

    queryTerms.forEach(term => {
      if (contentLower.includes(term)) matches++;
    });

    return matches / queryTerms.length;
  }

  public async processQuery(userQuery: string): Promise<RAGResponse> {
    const relevanceScore = this.calculateRelevance(userQuery, this.documentContext);

    let answer = "I'm currently running in demo mode. ";

    if (userQuery.toLowerCase().includes('document problem')) {
      answer += "The Document Problem refers to the fact that around 80% of enterprise business-critical information is born unstructured—trapped in invoices, contracts, purchase orders, and emails.";
    } else if (userQuery.toLowerCase().includes('intelligence gap')) {
      answer += "The Intelligence Gap is the chasm between the static logic of old automation and the dynamic reality of business communication, causing brittle bots and operational bottlenecks.";
    } else if (userQuery.toLowerCase().includes('idp')) {
      answer += "Intelligent Document Processing (IDP) uses advanced computer vision and learning models to read documents holistically, identifying fields by context regardless of location.";
    } else {
      answer += "Connect to the backend API to access full RAG capabilities with your actual document database.";
    }

    return {
      answer,
      relevantChunks: [{
        content: this.documentContext.slice(0, 300),
        metadata: {
          documentType: 'Research Paper',
          section: 'Demo Content',
          relevanceScore: relevanceScore
        }
      }],
      confidence: relevanceScore,
      sources: []
    };
  }

  public suggestQueries(): string[] {
    return [
      "What is the Document Problem?",
      "Explain the Intelligence Gap",
      "What is Intelligent Document Processing?",
      "Tell me about automation challenges",
      "What is the Modern Intelligence Stack?"
    ];
  }

  public getDocumentStats() {
    return {
      totalDocuments: 3,
      documentTypes: ['Research Paper', 'Invoice'],
      dateRange: 'Demo Mode'
    };
  }
}

export default new DocumentRAGService();
