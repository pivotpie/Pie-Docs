import type {
  ConversationContext,
  QueryIntent,
  DocumentSearchResult
} from '@/types/domain/Search';

// Context types for different organizational knowledge
export interface OrganizationalContext {
  id: string;
  name: string;
  type: 'department' | 'project' | 'team' | 'domain';
  terminology: Record<string, string[]>; // term -> synonyms/related terms
  commonQueries: string[];
  documentTypes: string[];
}

export interface UserContext {
  id: string;
  role: string;
  department?: string;
  permissions: string[];
  recentActivity: {
    queries: string[];
    documents: string[];
    topics: string[];
  };
  preferences: {
    language: 'en' | 'ar';
    documentTypes: string[];
    searchHistory: string[];
  };
}

export interface DocumentCollectionContext {
  totalDocuments: number;
  documentTypes: Record<string, number>;
  authors: string[];
  topics: string[];
  averageDocumentAge: number;
  mostAccessedDocuments: string[];
  commonTerms: Record<string, number>;
  languageDistribution: Record<string, number>;
}

export interface ContextualQuery {
  originalQuery: string;
  enhancedQuery: string;
  context: {
    organizational: OrganizationalContext[];
    user: UserContext;
    collection: DocumentCollectionContext;
  };
  suggestedTerms: string[];
  disambiguation: {
    alternatives: string[];
    clarifications: string[];
  };
}

/**
 * ContextManager handles organizational and domain knowledge integration
 * for context-aware query processing
 */
export class ContextManager {
  private static instance: ContextManager | null = null;
  private organizationalContexts: Map<string, OrganizationalContext> = new Map();
  private documentCollectionContext: DocumentCollectionContext | null = null;
  private currentUserContext: UserContext | null = null;

  private constructor() {
    this.initializeDefaultContexts();
  }

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Initialize default organizational contexts
   */
  private initializeDefaultContexts(): void {
    // Default IT department context
    this.organizationalContexts.set('it', {
      id: 'it',
      name: 'Information Technology',
      type: 'department',
      terminology: {
        'server': ['infrastructure', 'hardware', 'system'],
        'database': ['db', 'data store', 'repository'],
        'api': ['interface', 'service', 'endpoint'],
        'security': ['authentication', 'authorization', 'access control'],
        'backup': ['recovery', 'restore', 'archive']
      },
      commonQueries: [
        'system maintenance reports',
        'security audit documents',
        'infrastructure specifications',
        'api documentation'
      ],
      documentTypes: ['specifications', 'manuals', 'reports', 'documentation']
    });

    // Default HR department context
    this.organizationalContexts.set('hr', {
      id: 'hr',
      name: 'Human Resources',
      type: 'department',
      terminology: {
        'employee': ['staff', 'personnel', 'team member'],
        'policy': ['procedure', 'guideline', 'rule'],
        'benefit': ['compensation', 'package', 'perk'],
        'training': ['development', 'education', 'course'],
        'performance': ['evaluation', 'review', 'assessment']
      },
      commonQueries: [
        'employee handbook',
        'policy documents',
        'training materials',
        'performance reviews'
      ],
      documentTypes: ['policies', 'handbooks', 'forms', 'training']
    });

    // Default legal department context
    this.organizationalContexts.set('legal', {
      id: 'legal',
      name: 'Legal Department',
      type: 'department',
      terminology: {
        'contract': ['agreement', 'terms', 'deal'],
        'compliance': ['regulation', 'standard', 'requirement'],
        'liability': ['responsibility', 'obligation', 'duty'],
        'intellectual property': ['ip', 'patent', 'trademark', 'copyright'],
        'dispute': ['conflict', 'disagreement', 'issue']
      },
      commonQueries: [
        'contract templates',
        'compliance documentation',
        'legal opinions',
        'regulatory requirements'
      ],
      documentTypes: ['contracts', 'legal opinions', 'compliance', 'regulations']
    });
  }

  /**
   * Set the current user context
   */
  setUserContext(userContext: UserContext): void {
    this.currentUserContext = userContext;
  }

  /**
   * Update document collection context based on current document corpus
   */
  updateDocumentCollectionContext(documents: DocumentSearchResult[]): void {
    const documentTypes: Record<string, number> = {};
    const authors: Set<string> = new Set();
    const topics: Set<string> = new Set();
    const commonTerms: Record<string, number> = {};
    const languageDistribution: Record<string, number> = {};

    let totalDocumentAge = 0;
    const accessCounts: Record<string, number> = {};

    documents.forEach(doc => {
      // Count document types
      const docType = doc.type || 'unknown';
      documentTypes[docType] = (documentTypes[docType] || 0) + 1;

      // Collect authors
      if (doc.author) {
        authors.add(doc.author);
      }

      // Collect topics/tags
      if (doc.tags) {
        doc.tags.forEach(tag => topics.add(tag));
      }

      // Calculate document age
      if (doc.createdAt) {
        const age = Date.now() - new Date(doc.createdAt).getTime();
        totalDocumentAge += age;
      }

      // Count language distribution
      const lang = doc.language || 'unknown';
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;

      // Track access counts (if available)
      if (doc.metadata?.accessCount) {
        accessCounts[doc.id] = doc.metadata.accessCount;
      }

      // Extract common terms from title and content
      const text = `${doc.title} ${doc.content || ''}`.toLowerCase();
      const words = text.match(/\b[a-zA-Z\u0600-\u06FF]{3,}\b/g) || [];
      words.forEach(word => {
        if (word.length > 3) { // Filter out short words
          commonTerms[word] = (commonTerms[word] || 0) + 1;
        }
      });
    });

    // Get most accessed documents
    const mostAccessedDocuments = Object.entries(accessCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    this.documentCollectionContext = {
      totalDocuments: documents.length,
      documentTypes,
      authors: Array.from(authors),
      topics: Array.from(topics),
      averageDocumentAge: documents.length > 0 ? totalDocumentAge / documents.length : 0,
      mostAccessedDocuments,
      commonTerms,
      languageDistribution
    };
  }

  /**
   * Add or update organizational context
   */
  addOrganizationalContext(context: OrganizationalContext): void {
    this.organizationalContexts.set(context.id, context);
  }

  /**
   * Get relevant organizational contexts based on user and query
   */
  getRelevantContexts(query: string, userContext?: UserContext): OrganizationalContext[] {
    const user = userContext || this.currentUserContext;
    const relevantContexts: OrganizationalContext[] = [];

    // Add user's department context if available
    if (user?.department && this.organizationalContexts.has(user.department)) {
      relevantContexts.push(this.organizationalContexts.get(user.department)!);
    }

    // Find contexts with terminology that matches the query
    const queryLower = query.toLowerCase();
    this.organizationalContexts.forEach(context => {
      if (context.id === user?.department) return; // Already added

      // Check if query contains terms from this context's terminology
      const hasRelevantTerms = Object.keys(context.terminology).some(term =>
        queryLower.includes(term.toLowerCase()) ||
        context.terminology[term].some(synonym =>
          queryLower.includes(synonym.toLowerCase())
        )
      );

      // Check if query matches common queries for this context
      const hasRelevantQueries = context.commonQueries.some(commonQuery =>
        queryLower.includes(commonQuery.toLowerCase()) ||
        commonQuery.toLowerCase().includes(queryLower)
      );

      if (hasRelevantTerms || hasRelevantQueries) {
        relevantContexts.push(context);
      }
    });

    return relevantContexts;
  }

  /**
   * Enhance query with contextual information
   */
  enhanceQuery(
    originalQuery: string,
    intent: QueryIntent,
    userContext?: UserContext
  ): ContextualQuery {
    const user = userContext || this.currentUserContext;
    const relevantContexts = this.getRelevantContexts(originalQuery, user);

    const enhancedQuery = originalQuery;
    const suggestedTerms: string[] = [];
    const alternatives: string[] = [];
    const clarifications: string[] = [];

    // Expand query with synonyms and related terms
    relevantContexts.forEach(context => {
      Object.entries(context.terminology).forEach(([term, synonyms]) => {
        const termPattern = new RegExp(`\\b${term}\\b`, 'gi');
        if (termPattern.test(originalQuery)) {
          // Add related terms as suggestions
          suggestedTerms.push(...synonyms);

          // Create alternative queries with synonyms
          synonyms.forEach(synonym => {
            alternatives.push(originalQuery.replace(termPattern, synonym));
          });
        }
      });
    });

    // Add user preference-based enhancements
    if (user) {
      // Suggest document types based on user preferences
      if (intent.type === 'search' && user.preferences.documentTypes.length > 0) {
        const docTypeHint = user.preferences.documentTypes[0];
        if (!originalQuery.toLowerCase().includes(docTypeHint)) {
          suggestedTerms.push(docTypeHint);
          alternatives.push(`${originalQuery} (${docTypeHint})`);
        }
      }

      // Add recent topics as suggestions
      user.recentActivity.topics.forEach(topic => {
        if (!originalQuery.toLowerCase().includes(topic.toLowerCase())) {
          suggestedTerms.push(topic);
        }
      });
    }

    // Generate clarification questions for ambiguous queries
    if (intent.confidence < 0.7) {
      if (relevantContexts.length > 1) {
        const departments = relevantContexts.map(c => c.name).join(', ');
        clarifications.push(`Are you looking for documents from: ${departments}?`);
      }

      if (this.documentCollectionContext) {
        const topDocTypes = Object.entries(this.documentCollectionContext.documentTypes)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([type]) => type);

        clarifications.push(`Are you looking for: ${topDocTypes.join(', ')}?`);
      }
    }

    // Remove duplicates and limit suggestions
    const uniqueSuggestions = [...new Set(suggestedTerms)].slice(0, 5);
    const uniqueAlternatives = [...new Set(alternatives)].slice(0, 3);
    const uniqueClarifications = [...new Set(clarifications)].slice(0, 2);

    return {
      originalQuery,
      enhancedQuery,
      context: {
        organizational: relevantContexts,
        user: user || this.createDefaultUserContext(),
        collection: this.documentCollectionContext || this.createDefaultCollectionContext()
      },
      suggestedTerms: uniqueSuggestions,
      disambiguation: {
        alternatives: uniqueAlternatives,
        clarifications: uniqueClarifications
      }
    };
  }

  /**
   * Get context-aware suggestions for query completion
   */
  getQuerySuggestions(partialQuery: string, userContext?: UserContext): string[] {
    const user = userContext || this.currentUserContext;
    const suggestions: string[] = [];

    // Add suggestions from user's search history
    if (user) {
      user.preferences.searchHistory.forEach(query => {
        if (query.toLowerCase().startsWith(partialQuery.toLowerCase())) {
          suggestions.push(query);
        }
      });
    }

    // Add suggestions from organizational contexts
    const relevantContexts = this.getRelevantContexts(partialQuery, user);
    relevantContexts.forEach(context => {
      context.commonQueries.forEach(query => {
        if (query.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.push(query);
        }
      });
    });

    // Add suggestions from document collection
    if (this.documentCollectionContext) {
      // Suggest based on common terms
      Object.keys(this.documentCollectionContext.commonTerms).forEach(term => {
        if (term.toLowerCase().startsWith(partialQuery.toLowerCase())) {
          suggestions.push(`find documents about ${term}`);
        }
      });

      // Suggest based on topics
      this.documentCollectionContext.topics.forEach(topic => {
        if (topic.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.push(`show me ${topic} documents`);
        }
      });
    }

    return [...new Set(suggestions)].slice(0, 8);
  }

  /**
   * Create default user context
   */
  private createDefaultUserContext(): UserContext {
    return {
      id: 'default',
      role: 'user',
      permissions: ['read'],
      recentActivity: {
        queries: [],
        documents: [],
        topics: []
      },
      preferences: {
        language: 'en',
        documentTypes: [],
        searchHistory: []
      }
    };
  }

  /**
   * Create default collection context
   */
  private createDefaultCollectionContext(): DocumentCollectionContext {
    return {
      totalDocuments: 0,
      documentTypes: {},
      authors: [],
      topics: [],
      averageDocumentAge: 0,
      mostAccessedDocuments: [],
      commonTerms: {},
      languageDistribution: {}
    };
  }

  /**
   * Update user activity context
   */
  updateUserActivity(
    userId: string,
    activity: {
      query?: string;
      documentId?: string;
      topic?: string;
    }
  ): void {
    if (!this.currentUserContext || this.currentUserContext.id !== userId) {
      return;
    }

    if (activity.query) {
      this.currentUserContext.recentActivity.queries.unshift(activity.query);
      this.currentUserContext.recentActivity.queries =
        this.currentUserContext.recentActivity.queries.slice(0, 10);

      // Also update search history
      if (!this.currentUserContext.preferences.searchHistory.includes(activity.query)) {
        this.currentUserContext.preferences.searchHistory.unshift(activity.query);
        this.currentUserContext.preferences.searchHistory =
          this.currentUserContext.preferences.searchHistory.slice(0, 20);
      }
    }

    if (activity.documentId) {
      this.currentUserContext.recentActivity.documents.unshift(activity.documentId);
      this.currentUserContext.recentActivity.documents =
        this.currentUserContext.recentActivity.documents.slice(0, 10);
    }

    if (activity.topic) {
      if (!this.currentUserContext.recentActivity.topics.includes(activity.topic)) {
        this.currentUserContext.recentActivity.topics.unshift(activity.topic);
        this.currentUserContext.recentActivity.topics =
          this.currentUserContext.recentActivity.topics.slice(0, 10);
      }
    }
  }

  /**
   * Get current user context
   */
  getCurrentUserContext(): UserContext | null {
    return this.currentUserContext;
  }

  /**
   * Get document collection context
   */
  getDocumentCollectionContext(): DocumentCollectionContext | null {
    return this.documentCollectionContext;
  }

  /**
   * Get all organizational contexts
   */
  getAllOrganizationalContexts(): OrganizationalContext[] {
    return Array.from(this.organizationalContexts.values());
  }
}

// Export singleton instance
export const contextManager = ContextManager.getInstance();