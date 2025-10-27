import type { DocumentSearchResult } from '@/types/domain/Search';

export interface ExpansionTerm {
  term: string;
  type: 'synonym' | 'related' | 'acronym' | 'semantic' | 'technical';
  confidence: number;
  frequency?: number;
  source: 'corpus' | 'dictionary' | 'context' | 'user';
}

export interface ExpandedQuery {
  originalQuery: string;
  expandedTerms: ExpansionTerm[];
  rankedVariations: {
    query: string;
    score: number;
    explanation: string;
  }[];
  suggestedFilters: {
    type: string;
    value: string;
    relevance: number;
  }[];
}

export interface CorpusAnalysis {
  termFrequency: Map<string, number>;
  cooccurrenceMatrix: Map<string, Map<string, number>>;
  technicalTerms: Set<string>;
  acronymMappings: Map<string, string[]>;
  conceptClusters: Map<string, string[]>;
}

/**
 * QueryExpander handles automatic term and concept expansion for enhanced search
 */
export class QueryExpander {
  private static instance: QueryExpander | null = null;
  private corpusAnalysis: CorpusAnalysis | null = null;

  // Built-in synonym dictionary
  private synonymDictionary: Map<string, string[]> = new Map([
    // Technical terms
    ['server', ['infrastructure', 'system', 'machine', 'host']],
    ['database', ['db', 'datastore', 'repository', 'storage']],
    ['application', ['app', 'software', 'program', 'system']],
    ['document', ['file', 'record', 'paper', 'report']],
    ['user', ['person', 'individual', 'account', 'member']],
    ['security', ['protection', 'safety', 'defense', 'access control']],
    ['network', ['connection', 'infrastructure', 'communication', 'link']],
    ['configuration', ['setup', 'settings', 'parameters', 'options']],
    ['backup', ['copy', 'archive', 'restore', 'recovery']],
    ['performance', ['speed', 'efficiency', 'optimization', 'throughput']],

    // Business terms
    ['policy', ['procedure', 'guideline', 'rule', 'standard']],
    ['employee', ['staff', 'worker', 'personnel', 'team member']],
    ['project', ['initiative', 'program', 'effort', 'task']],
    ['meeting', ['conference', 'discussion', 'session', 'gathering']],
    ['training', ['education', 'learning', 'development', 'course']],
    ['budget', ['funds', 'allocation', 'expenses', 'financial plan']],
    ['contract', ['agreement', 'deal', 'terms', 'arrangement']],
    ['report', ['document', 'analysis', 'summary', 'findings']],
    ['process', ['procedure', 'workflow', 'method', 'approach']],
    ['issue', ['problem', 'concern', 'matter', 'difficulty']],

    // Arabic synonyms
    ['مستند', ['وثيقة', 'ملف', 'تقرير', 'سجل']],
    ['نظام', ['برنامج', 'تطبيق', 'منصة', 'خدمة']],
    ['مستخدم', ['شخص', 'عضو', 'حساب', 'فرد']],
    ['أمان', ['حماية', 'أمن', 'سلامة', 'حراسة']],
    ['شبكة', ['اتصال', 'ربط', 'تواصل', 'شبكة اتصال']],
    ['إعداد', ['تكوين', 'ضبط', 'تهيئة', 'تحديد']],
    ['نسخة احتياطية', ['أرشيف', 'حفظ', 'استرداد', 'نسخ']],
    ['أداء', ['سرعة', 'كفاءة', 'تحسين', 'معدل']],
    ['سياسة', ['إجراء', 'قاعدة', 'معيار', 'نهج']],
    ['موظف', ['عامل', 'طاقم', 'فريق', 'شخص']]
  ]);

  // Common acronyms and their expansions
  private acronymDictionary: Map<string, string[]> = new Map([
    ['API', ['Application Programming Interface', 'interface', 'service']],
    ['UI', ['User Interface', 'interface', 'frontend']],
    ['UX', ['User Experience', 'experience', 'usability']],
    ['DB', ['Database', 'datastore', 'storage']],
    ['SQL', ['Structured Query Language', 'database query', 'query']],
    ['HTTP', ['HyperText Transfer Protocol', 'web protocol', 'protocol']],
    ['HTTPS', ['HTTP Secure', 'secure protocol', 'encrypted']],
    ['URL', ['Uniform Resource Locator', 'web address', 'link']],
    ['PDF', ['Portable Document Format', 'document format', 'file']],
    ['CSV', ['Comma Separated Values', 'data format', 'spreadsheet']],
    ['JSON', ['JavaScript Object Notation', 'data format', 'structured data']],
    ['XML', ['eXtensible Markup Language', 'markup language', 'structured data']],
    ['HTML', ['HyperText Markup Language', 'web markup', 'webpage']],
    ['CSS', ['Cascading Style Sheets', 'styling', 'design']],
    ['JS', ['JavaScript', 'scripting', 'programming']],
    ['AI', ['Artificial Intelligence', 'machine learning', 'automation']],
    ['ML', ['Machine Learning', 'artificial intelligence', 'data science']],
    ['IT', ['Information Technology', 'technology', 'computing']],
    ['HR', ['Human Resources', 'personnel', 'staff management']],
    ['FAQ', ['Frequently Asked Questions', 'questions', 'help']],
    ['SOP', ['Standard Operating Procedure', 'procedure', 'process']],
    ['KPI', ['Key Performance Indicator', 'metric', 'measurement']],
    ['ROI', ['Return on Investment', 'profitability', 'financial return']],
    ['CRM', ['Customer Relationship Management', 'customer management', 'sales']],
    ['ERP', ['Enterprise Resource Planning', 'business management', 'integration']]
  ]);

  // Technical term patterns
  private technicalPatterns: RegExp[] = [
    /\b[A-Z]{2,}\b/g, // All caps (likely acronyms)
    /\b\w+\.(js|ts|py|java|cpp|h|css|html|php|rb|go|rs)\b/g, // File extensions
    /\b\w+\.(com|org|net|edu|gov)\b/g, // Domain names
    /\b\d+\.\d+\.\d+\.\d+\b/g, // IP addresses
    /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/g, // UUIDs
    /\b\w+:\/\/\w+/g, // URLs/protocols
    /\b[A-Z][a-z]+[A-Z][a-z]+/g, // CamelCase
    /\b\w+_\w+/g, // snake_case
    /\b\w+-\w+/g // kebab-case
  ];

  private constructor() {}

  static getInstance(): QueryExpander {
    if (!QueryExpander.instance) {
      QueryExpander.instance = new QueryExpander();
    }
    return QueryExpander.instance;
  }

  /**
   * Analyze document corpus to build expansion knowledge
   */
  analyzeCorpus(documents: DocumentSearchResult[]): void {
    const termFrequency = new Map<string, number>();
    const cooccurrenceMatrix = new Map<string, Map<string, number>>();
    const technicalTerms = new Set<string>();
    const acronymMappings = new Map<string, string[]>();
    const conceptClusters = new Map<string, string[]>();

    documents.forEach(doc => {
      const text = `${doc.title} ${doc.content || ''}`.toLowerCase();
      const words = this.extractTerms(text);

      // Build term frequency
      words.forEach(word => {
        if (word.length > 2) {
          termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
        }
      });

      // Build co-occurrence matrix
      for (let i = 0; i < words.length - 1; i++) {
        const word1 = words[i];
        const word2 = words[i + 1];

        if (word1.length > 2 && word2.length > 2) {
          if (!cooccurrenceMatrix.has(word1)) {
            cooccurrenceMatrix.set(word1, new Map());
          }
          const word1Cooccur = cooccurrenceMatrix.get(word1)!;
          word1Cooccur.set(word2, (word1Cooccur.get(word2) || 0) + 1);
        }
      }

      // Identify technical terms - check original text, not just the processed text
      const originalText = `${doc.title} ${doc.content || ''}`;
      this.technicalPatterns.forEach(pattern => {
        const matches = originalText.match(pattern);
        if (matches) {
          matches.forEach(match => technicalTerms.add(match.toLowerCase()));
        }
      });

      // Extract potential acronyms
      const potentialAcronyms = text.match(/\b[A-Z]{2,}\b/g);
      if (potentialAcronyms) {
        potentialAcronyms.forEach(acronym => {
          const expanded = this.findAcronymExpansion(acronym, text);
          if (expanded.length > 0) {
            acronymMappings.set(acronym.toLowerCase(), expanded);
          }
        });
      }
    });

    // Build concept clusters using co-occurrence
    termFrequency.forEach((freq, term) => {
      if (freq >= 3) { // Only consider terms that appear at least 3 times
        const relatedTerms: string[] = [];
        const termCooccur = cooccurrenceMatrix.get(term);

        if (termCooccur) {
          const sortedRelated = Array.from(termCooccur.entries())
            .filter(([, count]) => count >= 2)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([relatedTerm]) => relatedTerm);

          relatedTerms.push(...sortedRelated);
        }

        if (relatedTerms.length > 0) {
          conceptClusters.set(term, relatedTerms);
        }
      }
    });

    this.corpusAnalysis = {
      termFrequency,
      cooccurrenceMatrix,
      technicalTerms,
      acronymMappings,
      conceptClusters
    };
  }

  /**
   * Expand a query with related terms and concepts
   */
  expandQuery(
    query: string,
    maxExpansions: number = 10,
    language: 'en' | 'ar' = 'en'
  ): ExpandedQuery {
    const originalTerms = this.extractTerms(query.toLowerCase());
    const expansions = new Set<ExpansionTerm>();
    const queryVariations: { query: string; score: number; explanation: string }[] = [];
    const suggestedFilters: { type: string; value: string; relevance: number }[] = [];

    // Expand each term in the query
    originalTerms.forEach(term => {
      // Add synonym expansions
      const synonyms = this.synonymDictionary.get(term) || [];
      synonyms.forEach(synonym => {
        expansions.add({
          term: synonym,
          type: 'synonym',
          confidence: 0.8,
          source: 'dictionary'
        });
      });

      // Add acronym expansions
      const acronymExpansions = this.acronymDictionary.get(term.toUpperCase()) || [];
      acronymExpansions.forEach(expansion => {
        expansions.add({
          term: expansion,
          type: 'acronym',
          confidence: 0.9,
          source: 'dictionary'
        });
      });

      // Add corpus-based expansions
      if (this.corpusAnalysis) {
        // Related terms from corpus
        const relatedTerms = this.corpusAnalysis.conceptClusters.get(term) || [];
        relatedTerms.forEach(related => {
          const frequency = this.corpusAnalysis!.termFrequency.get(related) || 0;
          expansions.add({
            term: related,
            type: 'related',
            confidence: Math.min(0.7, frequency / 100),
            frequency,
            source: 'corpus'
          });
        });

        // Technical term detection
        if (this.corpusAnalysis.technicalTerms.has(term)) {
          expansions.add({
            term: `technical:${term}`,
            type: 'technical',
            confidence: 0.6,
            source: 'corpus'
          });
        }
      }
    });

    // Generate query variations
    const expansionArray = Array.from(expansions)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxExpansions);

    // Create variations by substituting terms
    expansionArray.forEach(expansion => {
      if (expansion.type === 'synonym' || expansion.type === 'related') {
        // Try to find which term this expansion relates to
        for (const originalTerm of originalTerms) {
          const synonyms = this.synonymDictionary.get(originalTerm);
          if (synonyms && synonyms.includes(expansion.term)) {
            const variation = query.replace(
              new RegExp(`\\b${originalTerm}\\b`, 'gi'),
              expansion.term
            );
            if (variation !== query) { // Only add if it's actually different
              queryVariations.push({
                query: variation,
                score: expansion.confidence,
                explanation: `Replaced "${originalTerm}" with "${expansion.term}" (${expansion.type})`
              });
            }
            break;
          }
        }
      }
    });

    // Add term-based queries
    expansionArray.forEach(expansion => {
      if (expansion.type === 'acronym') {
        queryVariations.push({
          query: `${query} OR ${expansion.term}`,
          score: expansion.confidence,
          explanation: `Added acronym expansion: "${expansion.term}"`
        });
      }
    });

    // Generate suggested filters
    originalTerms.forEach(term => {
      // Document type suggestions
      const docTypes = ['pdf', 'document', 'report', 'manual', 'guide'];
      if (docTypes.includes(term)) {
        suggestedFilters.push({
          type: 'documentType',
          value: term,
          relevance: 0.8
        });
      }

      // Date-related filters
      if (['recent', 'latest', 'new', 'old', 'archived'].includes(term)) {
        suggestedFilters.push({
          type: 'dateRange',
          value: term === 'recent' || term === 'latest' ? 'last30days' : 'older',
          relevance: 0.7
        });
      }

      // Technical category filters
      if (this.corpusAnalysis?.technicalTerms.has(term)) {
        suggestedFilters.push({
          type: 'category',
          value: 'technical',
          relevance: 0.6
        });
      }
    });

    return {
      originalQuery: query,
      expandedTerms: expansionArray,
      rankedVariations: queryVariations
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
      suggestedFilters: suggestedFilters
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3)
    };
  }

  /**
   * Extract terms from text
   */
  private extractTerms(text: string): string[] {
    // Handle both English and Arabic text with improved regex
    const words = text.match(/[\w\u0600-\u06FF]{2,}/g) || [];
    return words.map(word => word.toLowerCase()).filter(word => word.length > 1);
  }

  /**
   * Find acronym expansion in text context
   */
  private findAcronymExpansion(acronym: string, text: string): string[] {
    const expansions: string[] = [];

    // Look for patterns like "Application Programming Interface (API)"
    const pattern = new RegExp(`([^.!?]*?)\\(${acronym}\\)`, 'gi');
    const matches = text.match(pattern);

    if (matches) {
      matches.forEach(match => {
        const expansion = match.replace(`(${acronym})`, '').trim();
        if (expansion.length > acronym.length && expansion.length < 100) {
          expansions.push(expansion);
        }
      });
    }

    return expansions;
  }

  /**
   * Find which original term corresponds to an expansion
   */
  private findOriginalTerm(expansion: string, originalTerms: string[]): string | null {
    for (const [original, synonyms] of this.synonymDictionary.entries()) {
      if (originalTerms.includes(original) && synonyms.includes(expansion)) {
        return original;
      }
    }

    // Also check if the expansion matches any original term directly
    for (const term of originalTerms) {
      const synonyms = this.synonymDictionary.get(term);
      if (synonyms && synonyms.includes(expansion)) {
        return term;
      }
    }

    return null;
  }

  /**
   * Add custom synonym mapping
   */
  addSynonymMapping(term: string, synonyms: string[]): void {
    const existing = this.synonymDictionary.get(term) || [];
    this.synonymDictionary.set(term, [...existing, ...synonyms]);
  }

  /**
   * Add custom acronym mapping
   */
  addAcronymMapping(acronym: string, expansions: string[]): void {
    const existing = this.acronymDictionary.get(acronym.toUpperCase()) || [];
    this.acronymDictionary.set(acronym.toUpperCase(), [...existing, ...expansions]);
  }

  /**
   * Get corpus analysis stats
   */
  getCorpusStats(): {
    totalTerms: number;
    uniqueTerms: number;
    technicalTerms: number;
    conceptClusters: number;
  } | null {
    if (!this.corpusAnalysis) return null;

    return {
      totalTerms: Array.from(this.corpusAnalysis.termFrequency.values())
        .reduce((sum, freq) => sum + freq, 0),
      uniqueTerms: this.corpusAnalysis.termFrequency.size,
      technicalTerms: this.corpusAnalysis.technicalTerms.size,
      conceptClusters: this.corpusAnalysis.conceptClusters.size
    };
  }

  /**
   * Get most frequent terms
   */
  getMostFrequentTerms(limit: number = 20): Array<{ term: string; frequency: number }> {
    if (!this.corpusAnalysis) return [];

    return Array.from(this.corpusAnalysis.termFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([term, frequency]) => ({ term, frequency }));
  }

  /**
   * Reset corpus analysis
   */
  resetCorpusAnalysis(): void {
    this.corpusAnalysis = null;
  }
}

// Export singleton instance
export const queryExpander = QueryExpander.getInstance();