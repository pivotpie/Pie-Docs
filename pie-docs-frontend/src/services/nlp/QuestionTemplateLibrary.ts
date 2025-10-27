import type { QuestionTemplate, DocumentSearchResult } from '@/types/domain/Search';
import type { UserContext } from './ContextManager';

export interface ExecutableTemplate {
  template: QuestionTemplate;
  parameters: Record<string, any>;
  generatedQuery: string;
  suggestedFilters?: Record<string, any>;
}

export interface TemplateSuggestion {
  template: QuestionTemplate;
  relevanceScore: number;
  reason: string;
  suggestedParameters?: Record<string, any>;
}

export interface PersonalizedTemplate {
  personalizedText: string;
  suggestedParameters: Record<string, any>;
  contextHints: string[];
  relevanceScore: number;
}

export interface TemplateSearchResult {
  template: QuestionTemplate;
  score: number;
  matchedText: string[];
  matchedTags: string[];
}

export interface TemplateUsageAnalytics {
  [templateId: string]: {
    usageCount: number;
    uniqueUsers: number;
    lastUsed: string;
    avgScore?: number;
  };
}

export interface PopularTemplate {
  template: QuestionTemplate;
  usageCount: number;
  uniqueUsers: number;
}

export interface TemplateExport {
  version: string;
  timestamp: string;
  templates: (QuestionTemplate & { tags?: string[]; priority?: number })[];
}

/**
 * QuestionTemplateLibrary manages pre-built query templates and personalization
 */
export class QuestionTemplateLibrary {
  private static instance: QuestionTemplateLibrary | null = null;
  private templates: Map<string, QuestionTemplate & { tags?: string[]; priority?: number }> = new Map();
  private defaultTemplateIds: Set<string> = new Set();
  private usageAnalytics: TemplateUsageAnalytics = {};

  private constructor() {
    this.initializeDefaultTemplates();
  }

  static getInstance(): QuestionTemplateLibrary {
    if (!QuestionTemplateLibrary.instance) {
      QuestionTemplateLibrary.instance = new QuestionTemplateLibrary();
    }
    return QuestionTemplateLibrary.instance;
  }

  /**
   * Get templates with optional filtering
   */
  getTemplates(
    category?: QuestionTemplate['category'],
    language?: 'en' | 'ar'
  ): (QuestionTemplate & { tags?: string[]; priority?: number })[] {
    const allTemplates = Array.from(this.templates.values());

    return allTemplates.filter(template => {
      if (category && template.category !== category) return false;
      if (language && template.language !== language) return false;
      return true;
    });
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): (QuestionTemplate & { tags?: string[]; priority?: number }) | undefined {
    return this.templates.get(id);
  }

  /**
   * Add a custom template
   */
  addTemplate(template: QuestionTemplate & { tags?: string[]; priority?: number }): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove a template (only custom templates can be removed)
   */
  removeTemplate(id: string): boolean {
    if (this.defaultTemplateIds.has(id)) {
      return false; // Cannot remove default templates
    }
    return this.templates.delete(id);
  }

  /**
   * Execute a template with provided parameters
   */
  executeTemplate(templateId: string, parameters: Record<string, any>): ExecutableTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate required parameters
    for (const param of template.parameters) {
      if (param.required && (parameters[param.name] === undefined || parameters[param.name] === '')) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }

    // Generate query by replacing placeholders
    let generatedQuery = template.template;

    // Replace all parameters
    for (const param of template.parameters) {
      const value = parameters[param.name] || '';
      const placeholder = `{${param.name}}`;
      // Use safe replacement with null check
      if (generatedQuery) {
        generatedQuery = generatedQuery.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      }
    }

    return {
      template,
      parameters,
      generatedQuery: (generatedQuery || template.template || '').trim(),
      suggestedFilters: this.extractSuggestedFilters(template, parameters)
    };
  }

  /**
   * Suggest templates based on user context and optional query text
   */
  suggestTemplates(
    userContext?: UserContext,
    queryText?: string,
    maxSuggestions: number = 5
  ): TemplateSuggestion[] {
    const allTemplates = Array.from(this.templates.values());
    const suggestions: TemplateSuggestion[] = [];

    for (const template of allTemplates) {
      const relevanceScore = this.calculateTemplateRelevance(template, userContext, queryText);

      if (relevanceScore > 0) {
        suggestions.push({
          template,
          relevanceScore,
          reason: this.generateSuggestionReason(template, userContext, queryText),
          suggestedParameters: this.suggestParameters(template, userContext)
        });
      }
    }

    // Sort by relevance score and limit results
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxSuggestions);
  }

  /**
   * Search templates by text content and tags
   */
  searchTemplates(query: string, maxResults: number = 10): TemplateSearchResult[] {
    if (!query.trim()) return [];

    const queryLower = query.toLowerCase();
    const results: TemplateSearchResult[] = [];

    for (const template of this.templates.values()) {
      const score = this.calculateSearchScore(template, queryLower);

      if (score > 0) {
        results.push({
          template,
          score,
          matchedText: this.getMatchedText(template, queryLower),
          matchedTags: this.getMatchedTags(template, queryLower)
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Personalize a template for a specific user context
   */
  personalizeTemplate(template: QuestionTemplate, userContext?: UserContext): PersonalizedTemplate {
    const suggestedParameters = this.suggestParameters(template, userContext);
    const contextHints = this.generateContextHints(template, userContext);
    const relevanceScore = this.calculateTemplateRelevance(template, userContext);

    // Personalize template text based on user context
    let personalizedText = template.template;

    // Replace parameters with suggested values if available
    for (const param of template.parameters) {
      if (suggestedParameters[param.name]) {
        const placeholder = `{${param.name}}`;
        personalizedText = personalizedText.replace(
          placeholder,
          `[${suggestedParameters[param.name]}]`
        );
      }
    }

    return {
      personalizedText,
      suggestedParameters,
      contextHints,
      relevanceScore
    };
  }

  /**
   * Track template usage for analytics
   */
  trackTemplateUsage(templateId: string, userId: string): void {
    if (!this.usageAnalytics[templateId]) {
      this.usageAnalytics[templateId] = {
        usageCount: 0,
        uniqueUsers: 0,
        lastUsed: new Date().toISOString()
      };
    }

    const analytics = this.usageAnalytics[templateId];
    analytics.usageCount++;
    analytics.lastUsed = new Date().toISOString();

    // Track unique users (simplified - in real app would use Set or database)
    // For now, we'll use a simple heuristic: assume each user uses it roughly twice
    analytics.uniqueUsers = Math.max(1, Math.floor((analytics.usageCount + 1) / 1.5));
  }

  /**
   * Get usage analytics
   */
  getUsageAnalytics(): TemplateUsageAnalytics {
    return { ...this.usageAnalytics };
  }

  /**
   * Get popular templates based on usage
   */
  getPopularTemplates(maxResults: number = 10): PopularTemplate[] {
    const popular: PopularTemplate[] = [];

    for (const [templateId, analytics] of Object.entries(this.usageAnalytics)) {
      const template = this.templates.get(templateId);
      if (template) {
        popular.push({
          template,
          usageCount: analytics.usageCount,
          uniqueUsers: analytics.uniqueUsers
        });
      }
    }

    return popular
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, maxResults);
  }

  /**
   * Clear usage analytics
   */
  clearUsageAnalytics(): void {
    this.usageAnalytics = {};
  }

  /**
   * Export templates
   */
  exportTemplates(templateIds?: string[]): TemplateExport {
    const templatesToExport = templateIds
      ? templateIds.map(id => this.templates.get(id)).filter(Boolean) as (QuestionTemplate & { tags?: string[]; priority?: number })[]
      : Array.from(this.templates.values());

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      templates: templatesToExport
    };
  }

  /**
   * Import templates
   */
  importTemplates(data: TemplateExport, replace: boolean = false): void {
    for (const template of data.templates) {
      // Validate template structure
      if (!template.id || !template.template || !template.category ||
          !template.title || !template.description || !template.language ||
          !Array.isArray(template.parameters) || !Array.isArray(template.examples)) {
        continue; // Skip invalid templates
      }

      // Skip existing templates if replace is false
      if (!replace && this.templates.has(template.id)) {
        continue;
      }

      this.templates.set(template.id, template);
    }
  }

  /**
   * Initialize default question templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: (QuestionTemplate & { tags?: string[]; priority?: number })[] = [
      // English Discovery Templates
      {
        id: 'find-documents-by-type',
        category: 'discovery',
        title: 'Find Documents by Type',
        description: 'Search for documents of a specific type',
        template: 'Find {type} documents',
        parameters: [
          {
            name: 'type',
            type: 'select',
            required: true,
            options: ['PDF', 'Word', 'Excel', 'PowerPoint', 'image', 'video', 'text']
          }
        ],
        language: 'en',
        examples: [
          'Find PDF documents',
          'Find image documents',
          'Find Excel documents'
        ],
        tags: ['search', 'filter', 'type'],
        priority: 1
      },
      {
        id: 'find-documents-by-author-and-topic',
        category: 'discovery',
        title: 'Find Documents by Author and Topic',
        description: 'Search for documents by author and topic',
        template: 'Find documents by {author} about {topic}',
        parameters: [
          {
            name: 'author',
            type: 'text',
            required: true
          },
          {
            name: 'topic',
            type: 'text',
            required: true
          }
        ],
        language: 'en',
        examples: [
          'Find documents by John Smith about machine learning',
          'Find documents by Sarah Johnson about project management'
        ],
        tags: ['search', 'author', 'topic'],
        priority: 2
      },
      {
        id: 'find-recent-documents',
        category: 'discovery',
        title: 'Find Recent Documents',
        description: 'Search for recently created or modified documents',
        template: 'Show me recent documents',
        parameters: [],
        language: 'en',
        examples: [
          'Show me recent documents',
          'Find recent documents'
        ],
        tags: ['recent', 'timeline'],
        priority: 1
      },
      {
        id: 'count-documents-by-type',
        category: 'analytics',
        title: 'Count Documents by Type',
        description: 'Get analytics on document counts by type',
        template: 'How many {type} documents do we have',
        parameters: [
          {
            name: 'type',
            type: 'select',
            required: true,
            options: ['PDF', 'Word', 'Excel', 'PowerPoint', 'image', 'video', 'text', 'all']
          }
        ],
        language: 'en',
        examples: [
          'How many PDF documents do we have',
          'How many all documents do we have'
        ],
        tags: ['analytics', 'count', 'type'],
        priority: 1
      },
      {
        id: 'show-document-status',
        category: 'status',
        title: 'Show Document Status',
        description: 'Check the status of documents',
        template: 'Show documents with {status} status',
        parameters: [
          {
            name: 'status',
            type: 'select',
            required: true,
            options: ['draft', 'review', 'approved', 'archived']
          }
        ],
        language: 'en',
        examples: [
          'Show documents with draft status',
          'Show documents with approved status'
        ],
        tags: ['status', 'workflow'],
        priority: 1
      },
      {
        id: 'download-document',
        category: 'action',
        title: 'Download Document',
        description: 'Download a specific document',
        template: 'Download document {document_name}',
        parameters: [
          {
            name: 'document_name',
            type: 'text',
            required: true
          }
        ],
        language: 'en',
        examples: [
          'Download document annual_report.pdf',
          'Download document project_plan.docx'
        ],
        tags: ['action', 'download'],
        priority: 2
      },

      // Arabic Templates
      {
        id: 'find-documents-by-type-ar',
        category: 'discovery',
        title: 'البحث عن الملفات حسب النوع',
        description: 'البحث عن ملفات من نوع محدد',
        template: 'ابحث عن ملفات {type}',
        parameters: [
          {
            name: 'type',
            type: 'select',
            required: true,
            options: ['PDF', 'Word', 'Excel', 'PowerPoint', 'صور', 'فيديو', 'نص']
          }
        ],
        language: 'ar',
        examples: [
          'ابحث عن ملفات PDF',
          'ابحث عن ملفات صور',
          'ابحث عن ملفات Excel'
        ],
        tags: ['بحث', 'تصفية', 'نوع'],
        priority: 1
      },
      {
        id: 'find-documents-by-author-ar',
        category: 'discovery',
        title: 'البحث عن الملفات حسب المؤلف',
        description: 'البحث عن ملفات أنشأها شخص معين',
        template: 'ابحث عن ملفات بواسطة {author}',
        parameters: [
          {
            name: 'author',
            type: 'text',
            required: true
          }
        ],
        language: 'ar',
        examples: [
          'ابحث عن ملفات بواسطة أحمد محمد',
          'ابحث عن ملفات بواسطة فاطمة علي'
        ],
        tags: ['بحث', 'مؤلف'],
        priority: 1
      },
      {
        id: 'find-recent-documents-ar',
        category: 'discovery',
        title: 'البحث عن الملفات الحديثة',
        description: 'البحث عن الملفات التي تم إنشاؤها أو تعديلها مؤخراً',
        template: 'أظهر لي الملفات الحديثة',
        parameters: [],
        language: 'ar',
        examples: [
          'أظهر لي الملفات الحديثة',
          'ابحث عن الملفات الحديثة'
        ],
        tags: ['حديث', 'زمني'],
        priority: 1
      },
      {
        id: 'count-documents-ar',
        category: 'analytics',
        title: 'عدد الملفات',
        description: 'الحصول على إحصائيات عدد الملفات',
        template: 'كم عدد الملفات لدينا',
        parameters: [],
        language: 'ar',
        examples: [
          'كم عدد الملفات لدينا',
          'إحصائيات الملفات'
        ],
        tags: ['إحصائيات', 'عدد'],
        priority: 1
      },
      {
        id: 'show-document-status-ar',
        category: 'status',
        title: 'عرض حالة الملف',
        description: 'فحص حالة الملفات',
        template: 'أظهر الملفات بحالة {status}',
        parameters: [
          {
            name: 'status',
            type: 'select',
            required: true,
            options: ['مسودة', 'مراجعة', 'معتمد', 'مؤرشف']
          }
        ],
        language: 'ar',
        examples: [
          'أظهر الملفات بحالة مسودة',
          'أظهر الملفات بحالة معتمد'
        ],
        tags: ['حالة', 'سير العمل'],
        priority: 1
      },
      {
        id: 'download-document-ar',
        category: 'action',
        title: 'تحميل الملف',
        description: 'تحميل ملف معين',
        template: 'حمّل الملف {document_name}',
        parameters: [
          {
            name: 'document_name',
            type: 'text',
            required: true
          }
        ],
        language: 'ar',
        examples: [
          'حمّل الملف التقرير_السنوي.pdf',
          'حمّل الملف خطة_المشروع.docx'
        ],
        tags: ['إجراء', 'تحميل'],
        priority: 2
      }
    ];

    // Add all default templates
    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
      this.defaultTemplateIds.add(template.id);
    }
  }

  /**
   * Calculate relevance score for template suggestion
   */
  private calculateTemplateRelevance(
    template: QuestionTemplate & { tags?: string[]; priority?: number },
    userContext?: UserContext,
    queryText?: string
  ): number {
    let score = 0;

    // Base score from template priority
    score += (template.priority || 1) * 0.2;

    // Language preference
    if (userContext?.preferences.language === template.language) {
      score += 0.3;
    }

    // Query text matching
    if (queryText) {
      const queryLower = queryText.toLowerCase();
      if (template.template?.toLowerCase().includes(queryLower)) {
        score += 0.4;
      }
      if (template.tags?.some(tag => queryLower.includes(tag))) {
        score += 0.3;
      }
    }

    // User activity matching
    if (userContext?.recentActivity.topics) {
      const topics = userContext.recentActivity.topics.join(' ').toLowerCase();
      if (template.template?.toLowerCase().includes(topics) ||
          template.tags?.some(tag => topics.includes(tag))) {
        score += 0.2;
      }
    }

    // Department-specific relevance
    if (userContext?.department && template.tags?.includes(userContext.department)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate suggestion reason
   */
  private generateSuggestionReason(
    template: QuestionTemplate,
    userContext?: UserContext,
    queryText?: string
  ): string {
    if (queryText && template.template?.toLowerCase().includes(queryText.toLowerCase())) {
      return 'Matches your search query';
    }

    if (userContext?.preferences.language === template.language) {
      return 'Matches your language preference';
    }

    if (userContext?.recentActivity.topics?.some(topic =>
      template.template?.toLowerCase().includes(topic.toLowerCase()))) {
      return 'Related to your recent activity';
    }

    return 'Popular template';
  }

  /**
   * Suggest parameters based on user context
   */
  private suggestParameters(template: QuestionTemplate, userContext?: UserContext): Record<string, any> {
    const suggestions: Record<string, any> = {};

    for (const param of template.parameters) {
      if (param.name === 'type' && userContext?.preferences.documentTypes?.length) {
        suggestions.type = userContext.preferences.documentTypes[0];
      }

      if (param.name === 'author' && userContext?.recentActivity.documents?.length) {
        // Could suggest recent authors from document metadata
        // For now, leave empty
      }
    }

    return suggestions;
  }

  /**
   * Generate context hints for template personalization
   */
  private generateContextHints(template: QuestionTemplate, userContext?: UserContext): string[] {
    const hints: string[] = [];

    if (userContext?.recentActivity.topics?.length) {
      hints.push(`Based on your recent topics: ${userContext.recentActivity.topics.slice(0, 3).join(', ')}`);
    }

    if (userContext?.preferences.documentTypes?.length) {
      hints.push(`Your preferred document types: ${userContext.preferences.documentTypes.join(', ')}`);
    }

    if (userContext?.department) {
      hints.push(`Tailored for ${userContext.department} department`);
    }

    return hints;
  }

  /**
   * Calculate search score for template
   */
  private calculateSearchScore(
    template: QuestionTemplate & { tags?: string[]; priority?: number },
    queryLower: string
  ): number {
    let score = 0;

    // Template text matching
    if (template.template?.toLowerCase().includes(queryLower)) {
      score += 0.6;
    }

    // Title matching
    if (template.title?.toLowerCase().includes(queryLower)) {
      score += 0.5;
    }

    // Description matching
    if (template.description?.toLowerCase().includes(queryLower)) {
      score += 0.3;
    }

    // Tags matching
    if (template.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
      score += 0.4;
    }

    // Examples matching
    if (template.examples?.some(example => example.toLowerCase().includes(queryLower))) {
      score += 0.2;
    }

    return score;
  }

  /**
   * Get matched text for search results
   */
  private getMatchedText(template: QuestionTemplate, queryLower: string): string[] {
    const matches: string[] = [];

    if (template.template?.toLowerCase().includes(queryLower)) {
      matches.push(template.template);
    }

    if (template.title?.toLowerCase().includes(queryLower)) {
      matches.push(template.title);
    }

    return matches;
  }

  /**
   * Get matched tags for search results
   */
  private getMatchedTags(
    template: QuestionTemplate & { tags?: string[] },
    queryLower: string
  ): string[] {
    return template.tags?.filter(tag => tag.toLowerCase().includes(queryLower)) || [];
  }

  /**
   * Extract suggested filters from template and parameters
   */
  private extractSuggestedFilters(
    template: QuestionTemplate,
    parameters: Record<string, any>
  ): Record<string, any> {
    const filters: Record<string, any> = {};

    // Extract document type filter
    if (parameters.type) {
      filters.documentTypes = [parameters.type.toLowerCase()];
    }

    // Extract author filter
    if (parameters.author) {
      filters.authors = [parameters.author];
    }

    // Extract status filter
    if (parameters.status) {
      filters.status = [parameters.status];
    }

    return filters;
  }
}

// Export singleton instance
export const questionTemplateLibrary = QuestionTemplateLibrary.getInstance();