import type { QueryIntent, DocumentSearchResult } from '@/types/domain/Search';
import type { UserContext } from './ContextManager';

export interface RefinementSuggestion {
  id: string;
  type: 'filter' | 'expand' | 'narrow' | 'alternative' | 'clarify';
  title: string;
  description: string;
  action: string;
  confidence: number;
  parameters?: Record<string, any>;
  newQuery?: string;
  expectedImprovement: string;
}

export interface FollowUpQuestion {
  id: string;
  text: string;
  type: 'clarification' | 'expansion' | 'suggestion' | 'validation';
  priority: number;
  context?: Record<string, any>;
  suggestedAnswers?: string[];
}

export interface QuerySession {
  id: string;
  queries: Array<{
    text: string;
    intent: QueryIntent;
    timestamp: Date;
    results: DocumentSearchResult[];
    resultCount: number;
    userSatisfaction?: number;
  }>;
  currentQuery: string;
  refinements: RefinementSuggestion[];
  followUpQuestions: FollowUpQuestion[];
  userContext?: UserContext;
  sessionMetrics: {
    totalQueries: number;
    refinementCount: number;
    averageSatisfaction: number;
    successfulSearches: number;
  };
}

export interface RefinementAnalysis {
  queryQuality: {
    specificity: number; // 0-1, how specific is the query
    clarity: number; // 0-1, how clear/unambiguous
    completeness: number; // 0-1, how complete the information is
  };
  resultQuality: {
    relevance: number; // 0-1, how relevant results are
    coverage: number; // 0-1, how well the results cover the query
    diversity: number; // 0-1, how diverse the results are
  };
  improvementOpportunities: string[];
  confidence: number;
}

/**
 * QueryRefinementEngine handles iterative query improvement and follow-up suggestions
 */
export class QueryRefinementEngine {
  private static instance: QueryRefinementEngine | null = null;
  private sessions: Map<string, QuerySession> = new Map();

  private constructor() {}

  static getInstance(): QueryRefinementEngine {
    if (!QueryRefinementEngine.instance) {
      QueryRefinementEngine.instance = new QueryRefinementEngine();
    }
    return QueryRefinementEngine.instance;
  }

  /**
   * Create a new query session
   */
  createSession(userId: string, userContext?: UserContext): string {
    const sessionId = `session_${userId}_${Date.now()}`;

    const session: QuerySession = {
      id: sessionId,
      queries: [],
      currentQuery: '',
      refinements: [],
      followUpQuestions: [],
      userContext,
      sessionMetrics: {
        totalQueries: 0,
        refinementCount: 0,
        averageSatisfaction: 0,
        successfulSearches: 0
      }
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Add a query to a session and analyze for refinement opportunities
   */
  addQueryToSession(
    sessionId: string,
    query: string,
    intent: QueryIntent,
    results: DocumentSearchResult[]
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Add query to session history
    session.queries.push({
      text: query,
      intent,
      timestamp: new Date(),
      results,
      resultCount: results.length
    });

    session.currentQuery = query;
    session.sessionMetrics.totalQueries++;

    // Analyze and generate refinement suggestions
    this.analyzeAndRefine(session, query, intent, results);
  }

  /**
   * Get refinement suggestions for a query session
   */
  getRefinementSuggestions(sessionId: string): RefinementSuggestion[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return session.refinements.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get follow-up questions for a query session
   */
  getFollowUpQuestions(sessionId: string): FollowUpQuestion[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return session.followUpQuestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Apply a refinement suggestion and get refined query
   */
  applyRefinement(sessionId: string, refinementId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const refinement = session.refinements.find(r => r.id === refinementId);
    if (!refinement) {
      throw new Error(`Refinement not found: ${refinementId}`);
    }

    session.sessionMetrics.refinementCount++;

    // Generate refined query based on refinement type
    switch (refinement.type) {
      case 'filter':
        return this.applyFilterRefinement(session.currentQuery, refinement);
      case 'expand':
        return this.applyExpandRefinement(session.currentQuery, refinement);
      case 'narrow':
        return this.applyNarrowRefinement(session.currentQuery, refinement);
      case 'alternative':
        return refinement.newQuery || session.currentQuery;
      case 'clarify':
        return this.applyClarifyRefinement(session.currentQuery, refinement);
      default:
        return session.currentQuery;
    }
  }

  /**
   * Record user satisfaction for a query
   */
  recordSatisfaction(sessionId: string, queryIndex: number, satisfaction: number): void {
    const session = this.sessions.get(sessionId);
    if (!session || queryIndex >= session.queries.length) {
      return;
    }

    session.queries[queryIndex].userSatisfaction = satisfaction;

    // Update metrics
    const satisfactionScores = session.queries
      .map(q => q.userSatisfaction)
      .filter(s => s !== undefined) as number[];

    session.sessionMetrics.averageSatisfaction =
      satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length;

    if (satisfaction >= 0.7) {
      session.sessionMetrics.successfulSearches++;
    }
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(sessionId: string): QuerySession['sessionMetrics'] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return { ...session.sessionMetrics };
  }

  /**
   * Analyze query and results to generate refinement suggestions
   */
  private analyzeAndRefine(
    session: QuerySession,
    query: string,
    intent: QueryIntent,
    results: DocumentSearchResult[]
  ): void {
    const analysis = this.analyzeQueryQuality(query, intent, results, session);

    // Clear previous suggestions
    session.refinements = [];
    session.followUpQuestions = [];

    // Generate refinement suggestions based on analysis
    this.generateFilterRefinements(session, query, intent, results, analysis);
    this.generateExpansionRefinements(session, query, intent, results, analysis);
    this.generateNarrowingRefinements(session, query, intent, results, analysis);
    this.generateAlternativeQueries(session, query, intent, results, analysis);
    this.generateClarificationSuggestions(session, query, intent, results, analysis);

    // Generate follow-up questions
    this.generateFollowUpQuestions(session, query, intent, results, analysis);
  }

  /**
   * Analyze query quality and result relevance
   */
  private analyzeQueryQuality(
    query: string,
    intent: QueryIntent,
    results: DocumentSearchResult[],
    session: QuerySession
  ): RefinementAnalysis {
    const analysis: RefinementAnalysis = {
      queryQuality: {
        specificity: this.calculateSpecificity(query, intent),
        clarity: this.calculateClarity(query, intent),
        completeness: this.calculateCompleteness(query, intent)
      },
      resultQuality: {
        relevance: this.calculateRelevance(query, results),
        coverage: this.calculateCoverage(query, results),
        diversity: this.calculateDiversity(results)
      },
      improvementOpportunities: [],
      confidence: 0
    };

    // Identify improvement opportunities
    if (analysis.queryQuality.specificity < 0.6) {
      analysis.improvementOpportunities.push('Query could be more specific');
    }
    if (analysis.queryQuality.clarity < 0.6) {
      analysis.improvementOpportunities.push('Query could be clearer');
    }
    if (analysis.resultQuality.relevance < 0.7) {
      analysis.improvementOpportunities.push('Results may not be highly relevant');
    }
    if (results.length === 0) {
      analysis.improvementOpportunities.push('No results found');
    }
    if (results.length > 50) {
      analysis.improvementOpportunities.push('Too many results, could narrow down');
    }

    // Calculate overall confidence
    analysis.confidence = (
      analysis.queryQuality.specificity +
      analysis.queryQuality.clarity +
      analysis.queryQuality.completeness +
      analysis.resultQuality.relevance
    ) / 4;

    return analysis;
  }

  /**
   * Generate filter-based refinement suggestions
   */
  private generateFilterRefinements(
    session: QuerySession,
    query: string,
    intent: QueryIntent,
    results: DocumentSearchResult[],
    analysis: RefinementAnalysis
  ): void {
    // Document type filters
    const documentTypes = this.extractDocumentTypes(results);
    if (documentTypes.length > 1) {
      documentTypes.forEach(type => {
        session.refinements.push({
          id: `filter_type_${type}`,
          type: 'filter',
          title: `Filter by ${type.toUpperCase()} documents`,
          description: `Show only ${type.toUpperCase()} documents from the results`,
          action: `Add document type filter: ${type}`,
          confidence: 0.8,
          parameters: { documentType: type },
          expectedImprovement: 'More focused results by document type'
        });
      });
    }

    // Date filters
    if (results.length > 10) {
      session.refinements.push({
        id: 'filter_recent',
        type: 'filter',
        title: 'Show recent documents only',
        description: 'Filter to documents created in the last month',
        action: 'Add date filter: last month',
        confidence: 0.7,
        parameters: { dateRange: 'last_month' },
        expectedImprovement: 'More current and relevant documents'
      });
    }

    // Author filters
    const authors = this.extractAuthors(results);
    if (authors.length > 1 && authors.length <= 5) {
      authors.slice(0, 3).forEach(author => {
        session.refinements.push({
          id: `filter_author_${author}`,
          type: 'filter',
          title: `Filter by author: ${author}`,
          description: `Show only documents by ${author}`,
          action: `Add author filter: ${author}`,
          confidence: 0.6,
          parameters: { author },
          expectedImprovement: 'Focus on specific author\'s work'
        });
      });
    }
  }

  /**
   * Generate expansion-based refinement suggestions
   */
  private generateExpansionRefinements(
    session: QuerySession,
    query: string,
    intent: QueryIntent,
    results: DocumentSearchResult[],
    analysis: RefinementAnalysis
  ): void {
    if (results.length < 5) {
      // Suggest broadening the search
      session.refinements.push({
        id: 'expand_synonyms',
        type: 'expand',
        title: 'Broaden search with synonyms',
        description: 'Include related terms and synonyms to find more documents',
        action: 'Add related terms to search',
        confidence: 0.7,
        expectedImprovement: 'Find more relevant documents'
      });

      // Remove filters if query seems over-constrained
      if (intent.entities.length > 2) {
        session.refinements.push({
          id: 'expand_remove_filters',
          type: 'expand',
          title: 'Remove some filters',
          description: 'Your search might be too specific. Try removing some constraints.',
          action: 'Simplify search criteria',
          confidence: 0.6,
          expectedImprovement: 'Cast a wider net for results'
        });
      }
    }

    // Suggest related topics from user context
    if (session.userContext?.recentActivity.topics) {
      session.userContext.recentActivity.topics.slice(0, 2).forEach(topic => {
        if (!query.toLowerCase().includes(topic.toLowerCase())) {
          session.refinements.push({
            id: `expand_topic_${topic}`,
            type: 'expand',
            title: `Include "${topic}" in search`,
            description: `Add ${topic} to your search based on your recent activity`,
            action: `Expand search to include ${topic}`,
            confidence: 0.5,
            newQuery: `${query} ${topic}`,
            expectedImprovement: 'Leverage your search history'
          });
        }
      });
    }
  }

  /**
   * Generate narrowing refinement suggestions
   */
  private generateNarrowingRefinements(
    session: QuerySession,
    query: string,
    intent: QueryIntent,
    results: DocumentSearchResult[],
    analysis: RefinementAnalysis
  ): void {
    if (results.length > 20) {
      // Too many results, suggest narrowing
      session.refinements.push({
        id: 'narrow_specific_terms',
        type: 'narrow',
        title: 'Add more specific terms',
        description: 'Add more specific keywords to reduce the number of results',
        action: 'Make search more specific',
        confidence: 0.8,
        expectedImprovement: 'More precise and relevant results'
      });

      // Suggest exact phrase search
      if (!query.includes('"')) {
        session.refinements.push({
          id: 'narrow_exact_phrase',
          type: 'narrow',
          title: 'Search for exact phrase',
          description: 'Use quotes to search for the exact phrase',
          action: 'Add quotes for exact match',
          confidence: 0.7,
          newQuery: `"${query}"`,
          expectedImprovement: 'Find documents with exact phrase match'
        });
      }
    }

    // Suggest adding context from recent queries
    if (session.queries.length > 1) {
      const previousQuery = session.queries[session.queries.length - 2];
      const commonTerms = this.findCommonTerms(query, previousQuery.text);

      if (commonTerms.length > 0) {
        session.refinements.push({
          id: 'narrow_context',
          type: 'narrow',
          title: 'Add context from previous search',
          description: 'Combine insights from your previous search',
          action: 'Build on previous search',
          confidence: 0.6,
          expectedImprovement: 'More contextually relevant results'
        });
      }
    }
  }

  /**
   * Generate alternative query suggestions
   */
  private generateAlternativeQueries(
    session: QuerySession,
    query: string,
    intent: QueryIntent,
    results: DocumentSearchResult[],
    analysis: RefinementAnalysis
  ): void {
    // Suggest alternative phrasings
    const alternatives = this.generateAlternativePhrasings(query, intent);
    alternatives.forEach((alternative, index) => {
      session.refinements.push({
        id: `alternative_${index}`,
        type: 'alternative',
        title: `Try: "${alternative}"`,
        description: 'Alternative way to phrase your search',
        action: 'Use alternative phrasing',
        confidence: 0.6,
        newQuery: alternative,
        expectedImprovement: 'Different perspective on the same topic'
      });
    });

    // Suggest question-based queries
    if (!query.startsWith('how') && !query.startsWith('what') && !query.startsWith('why')) {
      session.refinements.push({
        id: 'alternative_question',
        type: 'alternative',
        title: 'Try as a question',
        description: 'Rephrase as a question for different results',
        action: 'Convert to question format',
        confidence: 0.5,
        newQuery: `How to ${query}`,
        expectedImprovement: 'Find how-to guides and explanations'
      });
    }
  }

  /**
   * Generate clarification suggestions
   */
  private generateClarificationSuggestions(
    session: QuerySession,
    query: string,
    intent: QueryIntent,
    results: DocumentSearchResult[],
    analysis: RefinementAnalysis
  ): void {
    if (analysis.queryQuality.clarity < 0.6) {
      session.refinements.push({
        id: 'clarify_ambiguous',
        type: 'clarify',
        title: 'Clarify ambiguous terms',
        description: 'Your query contains terms that could have multiple meanings',
        action: 'Add clarifying context',
        confidence: 0.7,
        expectedImprovement: 'Remove ambiguity for better results'
      });
    }

    // Suggest clarification for short queries
    if (query.split(' ').length < 3) {
      session.refinements.push({
        id: 'clarify_short',
        type: 'clarify',
        title: 'Add more context',
        description: 'Your search is quite short. Adding more context could help.',
        action: 'Expand with more details',
        confidence: 0.6,
        expectedImprovement: 'More comprehensive search results'
      });
    }
  }

  /**
   * Generate follow-up questions
   */
  private generateFollowUpQuestions(
    session: QuerySession,
    query: string,
    intent: QueryIntent,
    results: DocumentSearchResult[],
    analysis: RefinementAnalysis
  ): void {
    // Results-based questions
    if (results.length === 0) {
      session.followUpQuestions.push({
        id: 'no_results_clarify',
        text: 'I couldn\'t find any results. Would you like to try a broader search or use different keywords?',
        type: 'clarification',
        priority: 9,
        suggestedAnswers: ['Try broader search', 'Use different keywords', 'Check spelling']
      });
    } else if (results.length > 50) {
      session.followUpQuestions.push({
        id: 'too_many_results',
        text: 'I found many results. Would you like me to help narrow down the search?',
        type: 'suggestion',
        priority: 7,
        suggestedAnswers: ['Yes, narrow down', 'Show all results', 'Add filters']
      });
    }

    // Content-based questions
    if (results.length > 0) {
      const types = this.extractDocumentTypes(results);
      if (types.length > 1) {
        session.followUpQuestions.push({
          id: 'document_type_preference',
          text: `I found ${types.join(', ')} documents. Are you looking for a specific type?`,
          type: 'clarification',
          priority: 6,
          context: { documentTypes: types },
          suggestedAnswers: types.map(type => `Show ${type} only`)
        });
      }
    }

    // User context-based questions
    if (session.userContext?.recentActivity.topics && session.userContext.recentActivity.topics.length > 0) {
      const relatedTopics = session.userContext.recentActivity.topics.filter(topic =>
        !query.toLowerCase().includes(topic.toLowerCase())
      );

      if (relatedTopics.length > 0) {
        session.followUpQuestions.push({
          id: 'related_topics',
          text: `Based on your recent searches, would you also like to include results about ${relatedTopics[0]}?`,
          type: 'expansion',
          priority: 5,
          context: { suggestedTopic: relatedTopics[0] },
          suggestedAnswers: ['Yes, include it', 'No, keep current search', 'Show both separately']
        });
      }
    }

    // Satisfaction validation
    if (session.queries.length > 1) {
      session.followUpQuestions.push({
        id: 'satisfaction_check',
        text: 'Are you finding what you\'re looking for, or would you like me to suggest a different approach?',
        type: 'validation',
        priority: 4,
        suggestedAnswers: ['This is helpful', 'Try different approach', 'Need more specific results']
      });
    }
  }

  // Helper methods for analysis

  private calculateSpecificity(query: string, intent: QueryIntent): number {
    let score = 0.5; // Base score

    // Length factor
    const wordCount = query.split(' ').length;
    score += Math.min(wordCount * 0.1, 0.3);

    // Entity factor
    score += intent.entities.length * 0.1;

    // Specific terms factor
    if (intent.entities.some(e => e.type === 'document_type')) score += 0.1;
    if (intent.entities.some(e => e.type === 'author')) score += 0.1;
    if (intent.entities.some(e => e.type === 'date')) score += 0.1;

    return Math.min(score, 1.0);
  }

  private calculateClarity(query: string, intent: QueryIntent): number {
    let score = 0.7; // Base score for clarity

    // Ambiguous terms penalty
    const ambiguousTerms = ['it', 'this', 'that', 'thing', 'stuff'];
    const hasAmbiguous = ambiguousTerms.some(term =>
      query.toLowerCase().includes(term)
    );
    if (hasAmbiguous) score -= 0.3;

    // Grammar and structure
    if (query.includes('?')) score += 0.1; // Questions are often clearer
    if (intent.confidence < 0.6) score -= 0.2; // Low intent confidence suggests ambiguity

    return Math.max(0, Math.min(score, 1.0));
  }

  private calculateCompleteness(query: string, intent: QueryIntent): number {
    let score = 0.6; // Base score

    // Information richness
    if (intent.entities.length > 0) score += 0.2;
    if (intent.entities.length > 2) score += 0.1;

    // Query length (optimal range)
    const wordCount = query.split(' ').length;
    if (wordCount >= 3 && wordCount <= 8) score += 0.1;

    return Math.min(score, 1.0);
  }

  private calculateRelevance(query: string, results: DocumentSearchResult[]): number {
    if (results.length === 0) return 0;

    // Average score from search results
    const avgScore = results.reduce((sum, result) => sum + (result.score || 0.5), 0) / results.length;
    return avgScore;
  }

  private calculateCoverage(query: string, results: DocumentSearchResult[]): number {
    if (results.length === 0) return 0;

    // Simple heuristic: more results generally means better coverage
    const coverageScore = Math.min(results.length / 20, 1.0);
    return coverageScore;
  }

  private calculateDiversity(results: DocumentSearchResult[]): number {
    if (results.length === 0) return 0;

    // Count unique document types and authors
    const types = new Set(results.map(r => r.type));
    const authors = new Set(results.map(r => r.author));

    const typesDiversity = Math.min(types.size / 5, 1.0);
    const authorsDiversity = Math.min(authors.size / 10, 1.0);

    return (typesDiversity + authorsDiversity) / 2;
  }

  private extractDocumentTypes(results: DocumentSearchResult[]): string[] {
    const types = new Set(results.map(r => r.type));
    return Array.from(types).slice(0, 5);
  }

  private extractAuthors(results: DocumentSearchResult[]): string[] {
    const authors = new Set(results.map(r => r.author).filter(Boolean));
    return Array.from(authors).slice(0, 5);
  }

  private findCommonTerms(query1: string, query2: string): string[] {
    const terms1 = query1.toLowerCase().split(' ');
    const terms2 = query2.toLowerCase().split(' ');
    return terms1.filter(term => terms2.includes(term) && term.length > 2);
  }

  private generateAlternativePhrasings(query: string, intent: QueryIntent): string[] {
    const alternatives: string[] = [];

    // Basic rephrasing patterns
    if (!query.startsWith('find')) {
      alternatives.push(`find ${query}`);
    }
    if (!query.includes('about') && intent.type === 'search') {
      alternatives.push(`documents about ${query}`);
    }
    if (!query.includes('how to')) {
      alternatives.push(`how to ${query}`);
    }

    return alternatives.slice(0, 2);
  }

  // Refinement application methods

  private applyFilterRefinement(query: string, refinement: RefinementSuggestion): string {
    const params = refinement.parameters || {};

    if (params.documentType) {
      return `${query} filetype:${params.documentType}`;
    }
    if (params.author) {
      return `${query} author:"${params.author}"`;
    }
    if (params.dateRange) {
      return `${query} date:${params.dateRange}`;
    }

    return query;
  }

  private applyExpandRefinement(query: string, refinement: RefinementSuggestion): string {
    if (refinement.newQuery) {
      return refinement.newQuery;
    }

    // Add OR operators for broader search
    return `${query} OR related OR similar`;
  }

  private applyNarrowRefinement(query: string, refinement: RefinementSuggestion): string {
    if (refinement.newQuery) {
      return refinement.newQuery;
    }

    // Add AND operators for more specific search
    return `${query} AND specific`;
  }

  private applyClarifyRefinement(query: string, refinement: RefinementSuggestion): string {
    // Add clarifying context
    return `${query} (specific context needed)`;
  }

  /**
   * Clean up old sessions to free memory
   */
  cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.queries.length > 0) {
        const lastActivity = Math.max(...session.queries.map(q => q.timestamp.getTime()));
        if (lastActivity < cutoff) {
          this.sessions.delete(sessionId);
        }
      }
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): QuerySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update user context for a session
   */
  updateSessionContext(sessionId: string, userContext: UserContext): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.userContext = userContext;
    }
  }
}

// Export singleton instance
export const queryRefinementEngine = QueryRefinementEngine.getInstance();