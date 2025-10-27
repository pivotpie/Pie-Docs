import type {
  AnswerGenerationRequest,
  AnswerGenerationResponse,
  GeneratedAnswer,
  Citation,
  AnswerValidation,
  ConfidenceScore,
  AnswerQualityMetrics
} from '@/types/domain/Answer';
import type { SearchResult } from '@/types/domain/Search';
import { validateAnswerGenerationRequest, validateAndSanitizeQuery } from '@/utils/validation/inputSanitization';

export class AnswerGenerator {
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor(baseUrl: string = '/api/nlp') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate comprehensive answer from search results using RAG
   */
  async generateAnswer(request: AnswerGenerationRequest): Promise<AnswerGenerationResponse> {
    // Validate and sanitize input (SEC-001 fix)
    const validation = validateAnswerGenerationRequest({
      query: request.query,
      conversationId: request.conversationId,
      maxSources: request.maxSources,
      confidenceThreshold: request.confidenceThreshold,
    });

    if (!validation.isValid) {
      throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
    }

    // Use sanitized query
    const sanitizedRequest = {
      ...request,
      query: validation.sanitizedInput || request.query,
    };

    // Cancel any ongoing generation
    this.cancelGeneration();

    // Create new abort controller
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${this.baseUrl}/generate-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sanitizedRequest.query,
          conversationId: sanitizedRequest.conversationId,
          searchResults: sanitizedRequest.searchResults,
          maxSources: sanitizedRequest.maxSources || 10,
          includeCitations: sanitizedRequest.includeCitations ?? true,
          confidenceThreshold: sanitizedRequest.confidenceThreshold || 0.7,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Answer generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processAnswerResponse(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Answer generation was cancelled');
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Stream answer generation for real-time responses
   */
  async* streamAnswer(request: AnswerGenerationRequest): AsyncGenerator<Partial<GeneratedAnswer>, void, unknown> {
    // Validate and sanitize input (SEC-001 fix)
    const validation = validateAnswerGenerationRequest({
      query: request.query,
      conversationId: request.conversationId,
      maxSources: request.maxSources,
      confidenceThreshold: request.confidenceThreshold,
    });

    if (!validation.isValid) {
      throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
    }

    // Use sanitized query
    const sanitizedRequest = {
      ...request,
      query: validation.sanitizedInput || request.query,
    };

    this.cancelGeneration();
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${this.baseUrl}/stream-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedRequest),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Streaming failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;

              try {
                const chunk = JSON.parse(data);
                yield chunk;
              } catch (error) {
                console.warn('Failed to parse streaming chunk:', error);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Synthesize information from multiple documents
   */
  async synthesizeMultiDocument(
    query: string,
    documents: SearchResult[],
    maxDocuments: number = 5
  ): Promise<{
    synthesizedContent: string;
    sourcesUsed: string[];
    coherenceScore: number;
    contradictions: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        documents: documents.slice(0, maxDocuments),
        includeCoherenceAnalysis: true,
        detectContradictions: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Synthesis failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validate answer quality against source documents
   */
  async validateAnswer(
    answer: GeneratedAnswer,
    sourceDocuments: SearchResult[]
  ): Promise<AnswerValidation> {
    const response = await fetch(`${this.baseUrl}/validate-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answer,
        sourceDocuments,
        checkFactualAccuracy: true,
        checkCompleteness: true,
        detectContradictions: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Answer validation failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Calculate answer confidence score
   */
  calculateConfidenceScore(
    answer: GeneratedAnswer,
    sourceReliability: number[],
    citationQuality: number
  ): ConfidenceScore {
    const avgSourceReliability = sourceReliability.reduce((a, b) => a + b, 0) / sourceReliability.length;
    const answerLength = answer.content.length;
    const citationDensity = answer.citations.length / Math.max(answerLength / 1000, 1);

    // Normalized scoring (0-1 scale)
    const factualAccuracy = Math.min(avgSourceReliability * 1.2, 1.0);
    const answerCompleteness = Math.min(answerLength / 2000, 1.0); // Assume 2000 chars is comprehensive
    const citationQualityNorm = Math.min(citationQuality, 1.0);
    const sourceDiversityScore = Math.min(answer.sources.length / 5, 1.0); // 5+ sources is excellent

    const overall = (
      factualAccuracy * 0.3 +
      answerCompleteness * 0.25 +
      citationQualityNorm * 0.25 +
      sourceDiversityScore * 0.2
    );

    let explanation = '';
    if (overall >= 0.9) {
      explanation = 'High confidence - comprehensive answer with reliable sources and quality citations';
    } else if (overall >= 0.7) {
      explanation = 'Good confidence - solid answer with good source coverage';
    } else if (overall >= 0.5) {
      explanation = 'Moderate confidence - answer may be incomplete or sources less reliable';
    } else {
      explanation = 'Low confidence - limited sources or potential accuracy concerns';
    }

    return {
      overall,
      factualAccuracy,
      sourceReliability: avgSourceReliability,
      answerCompleteness,
      citationQuality: citationQualityNorm,
      explanation,
    };
  }

  /**
   * Extract citations from generated content
   */
  extractCitations(
    content: string,
    sourceDocuments: SearchResult[],
    confidenceThreshold: number = 0.7
  ): Citation[] {
    // This would typically use NLP to find cited passages
    // For now, implementing a simplified version
    const citations: Citation[] = [];
    const citationRegex = /\[(\d+)\]/g;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      const citationIndex = parseInt(match[1]) - 1;
      if (citationIndex >= 0 && citationIndex < sourceDocuments.length) {
        const doc = sourceDocuments[citationIndex];
        citations.push({
          id: `citation-${citations.length + 1}`,
          documentId: doc.id,
          documentTitle: doc.title,
          sectionId: doc.metadata?.sectionId,
          sectionTitle: doc.metadata?.sectionTitle,
          pageNumber: doc.metadata?.pageNumber,
          startOffset: 0, // Would be calculated from actual content
          endOffset: 100, // Would be calculated from actual content
          excerpt: doc.excerpt || doc.content.substring(0, 200),
          confidence: Math.min(doc.score * 1.2, 1.0),
          url: `/documents/${doc.id}#section=${doc.metadata?.sectionId || 'top'}`,
        });
      }
    }

    return citations.filter(citation => citation.confidence >= confidenceThreshold);
  }

  /**
   * Cancel ongoing answer generation
   */
  cancelGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Process and validate answer response from API
   */
  private processAnswerResponse(data: any): AnswerGenerationResponse {
    const answer: GeneratedAnswer = {
      id: data.answer.id || `answer-${Date.now()}`,
      query: data.answer.query,
      content: data.answer.content,
      citations: data.answer.citations || [],
      confidence: data.answer.confidence || 0.5,
      confidenceExplanation: data.answer.confidenceExplanation || '',
      generatedAt: new Date(data.answer.generatedAt || Date.now()),
      processingTime: data.answer.processingTime || 0,
      sources: data.answer.sources || [],
      relatedQuestions: data.answer.relatedQuestions || [],
    };

    const validation: AnswerValidation = {
      isFactuallyAccurate: data.validation?.isFactuallyAccurate ?? true,
      isComplete: data.validation?.isComplete ?? true,
      hasContradictions: data.validation?.hasContradictions ?? false,
      missingInformation: data.validation?.missingInformation || [],
      qualityScore: data.validation?.qualityScore || 0.8,
      validationNotes: data.validation?.validationNotes || '',
    };

    return {
      answer,
      validation,
      processingMetadata: data.processingMetadata || {
        documentsAnalyzed: 0,
        totalTokens: 0,
        modelUsed: 'unknown',
        processingSteps: [],
      },
    };
  }

  /**
   * Calculate answer quality metrics
   */
  calculateQualityMetrics(answer: GeneratedAnswer): AnswerQualityMetrics {
    const answerLength = answer.content.length;
    const uniqueSources = new Set(answer.sources).size;
    const citationCount = answer.citations.length;

    return {
      answerLength,
      sourceDiversity: uniqueSources,
      citationDensity: citationCount / Math.max(answerLength / 1000, 1),
      readabilityScore: this.calculateReadabilityScore(answer.content),
      factualConsistency: answer.confidence,
      completenessScore: Math.min(answerLength / 1500, 1.0), // 1500 chars as complete threshold
    };
  }

  /**
   * Simple readability score calculation (Flesch-like)
   */
  private calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / Math.max(sentences, 1);

    // Simplified readability: lower is better (easier to read)
    // Convert to 0-1 scale where 1 is most readable
    return Math.max(0, Math.min(1, (30 - avgWordsPerSentence) / 20));
  }
}

// Export singleton instance
export const answerGenerator = new AnswerGenerator();