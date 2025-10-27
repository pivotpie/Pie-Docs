import type { QueryIntent } from '@/types/domain/Search';
import { contextManager, type ContextualQuery, type UserContext } from './ContextManager';
import { queryExpander, type ExpandedQuery } from './QueryExpander';

// Intent patterns for different query types
const INTENT_PATTERNS = {
  search: [
    /(?:find|search|look\s+for|get|where\s+is|locate)/i,
    /(?:ابحث|اعثر|أين)/i, // Arabic search patterns
  ],
  filter: [
    /(?:filter|narrow|refine|limit|only|just|specifically)/i,
    /(?:صفّي|حدد|اختر|فقط)/i, // Arabic filter patterns
  ],
  analytics: [
    /(?:how\s+many|count|total|sum|average|statistics|stats|analyze)/i,
    /(?:كم|عدد|مجموع|معدل|إحصائيات|تحليل)/i, // Arabic analytics patterns
  ],
  action: [
    /(?:open|download|share|delete|edit|copy|move|organize)/i,
    /(?:افتح|حمّل|شارك|احذف|عدّل|انسخ|انقل|نظّم)/i, // Arabic action patterns
  ],
  context: [
    /(?:show\s+me\s+(?:recent|latest|new|popular|trending|similar|related))/i,
    /(?:أظهر|اعرض)\s+(?:أحدث|جديد|شائع|مشابه|مثل|قريب)/i, // Arabic context patterns
  ],
};

// Entity patterns for extracting information
const ENTITY_PATTERNS = {
  document_type: [
    /(pdf|word|excel|powerpoint|image|photo|video|audio|text|document)s?/i,
    /(ملف|مستند|صورة|فيديو|صوت|نص)/i, // Arabic document types
    /(صور)/i, // Arabic plural for images
  ],
  date: [
    /(?:today|yesterday|tomorrow|last\s+week|next\s+week|this\s+month|last\s+month)/i,
    /(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/,
    /(?:اليوم|أمس|غداً|الأسبوع\s+الماضي|الشهر\s+الماضي|هذا\s+الشهر)/i, // Arabic dates
  ],
  author: [
    /(?:by|from|created\s+by|authored\s+by|written\s+by)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)(?:\s+(?:about|regarding|concerning)|$)/i,
    /(?:من\s+قبل|بواسطة|كتبه|أنشأه)\s+([a-zA-Z\u0600-\u06FF]+(?:\s+[a-zA-Z\u0600-\u06FF]+)*)/i, // Arabic authors
  ],
  topic: [
    /(?:about|regarding|concerning|related\s+to)\s+([a-zA-Z\s]+)/i,
    /(?:حول|بخصوص|متعلق\s+بـ)\s+([a-zA-Z\u0600-\u06FF\s]+)/i, // Arabic topics
  ],
};

// Common query normalizations
const QUERY_NORMALIZATIONS = {
  // Expand common abbreviations
  'docs': 'documents',
  'pics': 'pictures',
  'vids': 'videos',
  // Arabic normalizations
  'وثائق': 'مستندات',
  'صور': 'صورة',
};

/**
 * QueryProcessor handles natural language query analysis and intent recognition
 */
export class QueryProcessor {
  private static instance: QueryProcessor | null = null;

  private constructor() {}

  static getInstance(): QueryProcessor {
    if (!QueryProcessor.instance) {
      QueryProcessor.instance = new QueryProcessor();
    }
    return QueryProcessor.instance;
  }

  /**
   * Analyzes a natural language query and returns intent and entities
   */
  async processQuery(query: string, language: 'en' | 'ar' = 'en'): Promise<QueryIntent> {
    // Input validation
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    if (!['en', 'ar'].includes(language)) {
      throw new Error('Language must be either "en" or "ar"');
    }

    // Sanitize and limit query length
    const sanitizedQuery = this.sanitizeInput(query);
    if (sanitizedQuery.length > 500) {
      throw new Error('Query exceeds maximum length of 500 characters');
    }

    if (sanitizedQuery.length < 2) {
      throw new Error('Query must be at least 2 characters long');
    }

    const normalizedQuery = this.normalizeQuery(sanitizedQuery, language);
    const intent = this.detectIntent(normalizedQuery, language);
    // Extract entities from original query to preserve case
    const entities = this.extractEntities(sanitizedQuery, language);
    const confidence = this.calculateConfidence(normalizedQuery, intent, entities);

    return {
      type: intent.type,
      action: intent.action,
      confidence,
      entities,
      parameters: intent.parameters,
    };
  }

  /**
   * Process query with full context awareness and expansion
   */
  async processQueryWithContext(
    query: string,
    language: 'en' | 'ar' = 'en',
    userContext?: UserContext
  ): Promise<{
    intent: QueryIntent;
    contextualQuery: ContextualQuery;
    expandedQuery: ExpandedQuery;
  }> {
    // First get the basic intent
    const intent = await this.processQuery(query, language);

    // Update user activity for context learning
    if (userContext) {
      contextManager.updateUserActivity(userContext.id, { query });
    }

    // Enhance query with contextual information
    const contextualQuery = contextManager.enhanceQuery(query, intent, userContext);

    // Expand query with synonyms and related terms
    const expandedQuery = queryExpander.expandQuery(query, 10, language);

    return {
      intent,
      contextualQuery,
      expandedQuery
    };
  }

  /**
   * Process query with expansion only
   */
  async processQueryWithExpansion(
    query: string,
    language: 'en' | 'ar' = 'en',
    maxExpansions: number = 10
  ): Promise<{
    intent: QueryIntent;
    expandedQuery: ExpandedQuery;
  }> {
    const intent = await this.processQuery(query, language);
    const expandedQuery = queryExpander.expandQuery(query, maxExpansions, language);

    return {
      intent,
      expandedQuery
    };
  }

  /**
   * Get context-aware query suggestions
   */
  getQuerySuggestions(partialQuery: string, userContext?: UserContext): string[] {
    return contextManager.getQuerySuggestions(partialQuery, userContext);
  }

  /**
   * Set user context for processing
   */
  setUserContext(userContext: UserContext): void {
    contextManager.setUserContext(userContext);
  }

  /**
   * Update document corpus for query expansion
   */
  updateDocumentCorpus(documents: any[]): void {
    queryExpander.analyzeCorpus(documents);
  }

  /**
   * Add custom synonym mapping for query expansion
   */
  addSynonymMapping(term: string, synonyms: string[]): void {
    queryExpander.addSynonymMapping(term, synonyms);
  }

  /**
   * Add custom acronym mapping for query expansion
   */
  addAcronymMapping(acronym: string, expansions: string[]): void {
    queryExpander.addAcronymMapping(acronym, expansions);
  }

  /**
   * Get corpus analysis statistics
   */
  getCorpusStats(): any {
    return queryExpander.getCorpusStats();
  }

  /**
   * Sanitizes user input to prevent injection attacks
   */
  private sanitizeInput(query: string): string {
    // Remove potentially dangerous characters and HTML
    let sanitized = query
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags and content
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>'"&]/g, '') // Remove dangerous characters
      .replace(/\0/g, '') // Remove null bytes
      .trim();

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized;
  }

  /**
   * Normalizes query text for better processing
   */
  private normalizeQuery(query: string, language: 'en' | 'ar'): string {
    let normalized = query.toLowerCase().trim();

    // Apply language-specific normalizations
    Object.entries(QUERY_NORMALIZATIONS).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from}\\b`, 'gi');
      normalized = normalized.replace(regex, to);
    });

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized;
  }

  /**
   * Detects the primary intent of a query
   */
  private detectIntent(query: string, language: 'en' | 'ar'): {
    type: QueryIntent['type'];
    action: string;
    parameters: Record<string, any>;
  } {
    // Check each intent type
    for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          return {
            type: intentType as QueryIntent['type'],
            action: this.extractAction(query, intentType, language),
            parameters: this.extractParameters(query, intentType),
          };
        }
      }
    }

    // Default to search intent
    return {
      type: 'search',
      action: 'find',
      parameters: this.extractParameters(query, 'search'),
    };
  }

  /**
   * Extracts specific action verb from query
   */
  private extractAction(query: string, intentType: string, language: 'en' | 'ar'): string {
    const actionMap: Record<string, Record<string, string[]>> = {
      search: {
        en: ['find', 'search', 'look', 'get', 'show', 'locate'],
        ar: ['ابحث', 'اعثر', 'أظهر', 'اعرض'],
      },
      filter: {
        en: ['filter', 'narrow', 'refine', 'limit', 'select'],
        ar: ['صفّي', 'حدد', 'اختر'],
      },
      analytics: {
        en: ['count', 'analyze', 'summarize', 'calculate'],
        ar: ['احسب', 'حلّل', 'لخّص'],
      },
      action: {
        en: ['open', 'download', 'share', 'delete', 'edit'],
        ar: ['افتح', 'حمّل', 'شارك', 'احذف', 'عدّل'],
      },
      context: {
        en: ['show', 'find', 'get'],
        ar: ['أظهر', 'اعثر', 'اعرض'],
      },
    };

    const actions = actionMap[intentType]?.[language] || actionMap[intentType]?.en || ['find'];

    for (const action of actions) {
      const regex = new RegExp(`\\b${action}\\b`, 'i');
      if (regex.test(query)) {
        return action;
      }
    }

    return actions[0]; // Default action
  }

  /**
   * Extracts parameters specific to intent type
   */
  private extractParameters(query: string, intentType: string): Record<string, any> {
    const parameters: Record<string, any> = {};

    switch (intentType) {
      case 'analytics':
        // Extract aggregation type
        if (/count|how\s+many|كم|عدد/i.test(query)) {
          parameters.aggregation = 'count';
        } else if (/sum|total|مجموع/i.test(query)) {
          parameters.aggregation = 'sum';
        } else if (/average|معدل/i.test(query)) {
          parameters.aggregation = 'average';
        }
        break;

      case 'filter':
        // Extract filter scope
        if (/only|just|فقط/i.test(query)) {
          parameters.exclusive = true;
        }
        break;

      case 'context':
        // Extract context type
        if (/recent|latest|أحدث/i.test(query)) {
          parameters.context = 'recent';
        } else if (/popular|trending|شائع/i.test(query)) {
          parameters.context = 'popular';
        } else if (/similar|related|مشابه/i.test(query)) {
          parameters.context = 'similar';
        }
        break;
    }

    // Extract context parameters for any intent type
    if (/recent|latest|أحدث/i.test(query)) {
      parameters.context = 'recent';
    } else if (/popular|trending|شائع/i.test(query)) {
      parameters.context = 'popular';
    } else if (/similar|related|مشابه/i.test(query)) {
      parameters.context = 'similar';
    }


    return parameters;
  }

  /**
   * Extracts entities (nouns, dates, etc.) from query
   */
  private extractEntities(query: string, language: 'en' | 'ar'): QueryIntent['entities'] {
    const entities: QueryIntent['entities'] = [];

    // Extract each entity type
    Object.entries(ENTITY_PATTERNS).forEach(([entityType, patterns]) => {
      patterns.forEach(pattern => {
        const matches = query.match(pattern);
        if (matches) {
          let value = matches[1] || matches[0];

          // Special handling for entity types with context
          if (entityType === 'author' || entityType === 'topic') {
            // For captured groups, use the captured part
            value = matches[1] || value;
          }

          entities.push({
            type: entityType as QueryIntent['entities'][0]['type'],
            value: value.trim(),
            normalized: this.normalizeEntity(value.trim(), entityType),
          });
        }
      });
    });

    // Extract quoted phrases as topics
    const quotedMatches = query.match(/"([^"]+)"/g);
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        const value = match.replace(/"/g, '');
        entities.push({
          type: 'topic',
          value,
          normalized: value.toLowerCase(),
        });
      });
    }

    return entities;
  }

  /**
   * Normalizes entity values for better matching
   */
  private normalizeEntity(value: string, entityType: string): string {
    switch (entityType) {
      case 'document_type':
        // Normalize document types to standard forms
        const typeMap: Record<string, string> = {
          'pdf': 'pdf',
          'word': 'docx',
          'excel': 'xlsx',
          'powerpoint': 'pptx',
          'image': 'image',
          'photo': 'image',
          'video': 'video',
          'audio': 'audio',
          'text': 'txt',
          'ملف': 'document',
          'مستند': 'document',
          'صورة': 'image',
          'صور': 'image',
          'فيديو': 'video',
          'صوت': 'audio',
        };
        return typeMap[value.toLowerCase()] || value.toLowerCase();

      case 'date':
        // Normalize relative dates
        const dateMap: Record<string, string> = {
          'today': new Date().toISOString().split('T')[0],
          'yesterday': new Date(Date.now() - 86400000).toISOString().split('T')[0],
          'اليوم': new Date().toISOString().split('T')[0],
          'أمس': new Date(Date.now() - 86400000).toISOString().split('T')[0],
        };
        return dateMap[value.toLowerCase()] || value;

      default:
        return value.toLowerCase();
    }
  }

  /**
   * Calculates confidence score for the intent recognition
   */
  private calculateConfidence(
    query: string,
    intent: { type: string; action: string },
    entities: QueryIntent['entities']
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for specific patterns
    const wordCount = query.split(' ').length;

    // Boost confidence for longer, more specific queries
    if (wordCount > 3) {
      confidence += 0.2;
    }

    // Boost confidence for entity extraction
    if (entities.length > 0) {
      confidence += entities.length * 0.1;
    }

    // Boost confidence for clear intent keywords
    const intentKeywords = INTENT_PATTERNS[intent.type as keyof typeof INTENT_PATTERNS] || [];
    const hasStrongIntent = intentKeywords.some(pattern => pattern.test(query));
    if (hasStrongIntent) {
      confidence += 0.2;
    }

    // Cap confidence at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Validates if a query is ambiguous and needs clarification
   */
  isAmbiguous(query: string, confidence: number): boolean {
    // Query is ambiguous if confidence is low or query is very short
    return confidence < 0.6 || query.trim().split(' ').length < 2;
  }

  /**
   * Generates clarification questions for ambiguous queries
   */
  generateClarificationQuestions(query: string, language: 'en' | 'ar' = 'en'): string[] {
    const questions: string[] = [];

    if (language === 'ar') {
      questions.push(
        'هل تريد البحث عن مستندات معينة؟',
        'هل تقصد نوع ملف محدد؟',
        'هل تريد تحديد فترة زمنية معينة؟'
      );
    } else {
      questions.push(
        'Are you looking for specific documents?',
        'Do you want to filter by document type?',
        'Would you like to specify a time range?'
      );
    }

    return questions.slice(0, 2); // Return up to 2 clarification questions
  }
}

// Export singleton instance
export const queryProcessor = QueryProcessor.getInstance();