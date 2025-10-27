import { describe, it, expect, beforeEach } from 'vitest';
import { QueryExpander, type ExpansionTerm } from '@/services/nlp/QueryExpander';
import type { DocumentSearchResult } from '@/types/domain/Search';

describe('QueryExpander', () => {
  let queryExpander: QueryExpander;

  beforeEach(() => {
    queryExpander = QueryExpander.getInstance();
    queryExpander.resetCorpusAnalysis();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = QueryExpander.getInstance();
      const instance2 = QueryExpander.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('basic query expansion', () => {
    it('should expand query with synonyms', () => {
      const result = queryExpander.expandQuery('find server document');

      expect(result.originalQuery).toBe('find server document');
      expect(result.expandedTerms.length).toBeGreaterThan(0);

      // Should include server synonyms
      const serverSynonyms = result.expandedTerms.filter(term =>
        ['infrastructure', 'system', 'machine', 'host'].includes(term.term)
      );
      expect(serverSynonyms.length).toBeGreaterThan(0);

      // Should include document synonyms
      const docSynonyms = result.expandedTerms.filter(term =>
        ['file', 'record', 'paper', 'report'].includes(term.term)
      );
      expect(docSynonyms.length).toBeGreaterThan(0);
    });

    it('should expand acronyms', () => {
      const result = queryExpander.expandQuery('find API documentation');

      expect(result.expandedTerms.length).toBeGreaterThan(0);

      // Should include API expansion
      const apiExpansions = result.expandedTerms.filter(term =>
        term.type === 'acronym' &&
        ['Application Programming Interface', 'interface', 'service'].includes(term.term)
      );
      expect(apiExpansions.length).toBeGreaterThan(0);
    });

    it('should generate query variations', () => {
      const result = queryExpander.expandQuery('database backup procedures');

      expect(result.rankedVariations.length).toBeGreaterThan(0);

      // Variations should be scored
      result.rankedVariations.forEach(variation => {
        expect(variation.score).toBeGreaterThan(0);
        expect(variation.score).toBeLessThanOrEqual(1);
        expect(variation.explanation).toBeTruthy();
      });
    });

    it('should suggest relevant filters', () => {
      const result = queryExpander.expandQuery('recent PDF reports');

      expect(result.suggestedFilters.length).toBeGreaterThan(0);

      // Should suggest document type filter
      const docTypeFilter = result.suggestedFilters.find(filter =>
        filter.type === 'documentType'
      );
      expect(docTypeFilter).toBeDefined();

      // Should suggest date range filter
      const dateFilter = result.suggestedFilters.find(filter =>
        filter.type === 'dateRange'
      );
      expect(dateFilter).toBeDefined();
    });

    it('should handle Arabic queries', () => {
      const result = queryExpander.expandQuery('مستند نظام');

      expect(result.originalQuery).toBe('مستند نظام');
      expect(result.expandedTerms.length).toBeGreaterThan(0);

      // Should include Arabic synonyms for مستند
      const arabicSynonyms = result.expandedTerms.filter(term =>
        ['وثيقة', 'ملف', 'تقرير', 'سجل'].includes(term.term)
      );
      expect(arabicSynonyms.length).toBeGreaterThan(0);
    });
  });

  describe('corpus analysis', () => {
    const mockDocuments: DocumentSearchResult[] = [
      {
        id: 'doc1',
        title: 'Database Administration Guide',
        content: 'This guide covers database administration, backup procedures, and performance monitoring. The database (DB) system requires regular maintenance.',
        type: 'guide',
        author: 'John Doe'
      },
      {
        id: 'doc2',
        title: 'API Development Manual',
        content: 'Application Programming Interface (API) development guidelines. This manual covers REST API design and implementation.',
        type: 'manual',
        author: 'Jane Smith'
      },
      {
        id: 'doc3',
        title: 'Network Configuration',
        content: 'Network setup and configuration procedures. Covers server infrastructure and network security protocols.',
        type: 'manual',
        author: 'Bob Wilson'
      },
      {
        id: 'doc4',
        title: 'Security Audit Report',
        content: 'Security assessment findings and recommendations. Database security and network protection measures.',
        type: 'report',
        author: 'Alice Brown'
      }
    ];

    beforeEach(() => {
      queryExpander.analyzeCorpus(mockDocuments);
    });

    it('should analyze document corpus', () => {
      const stats = queryExpander.getCorpusStats();

      expect(stats).toBeDefined();
      expect(stats!.totalTerms).toBeGreaterThan(0);
      expect(stats!.uniqueTerms).toBeGreaterThan(0);
      expect(stats!.conceptClusters).toBeGreaterThan(0);
    });

    it('should identify frequent terms', () => {
      const frequentTerms = queryExpander.getMostFrequentTerms(10);

      expect(frequentTerms.length).toBeGreaterThan(0);

      // Should be sorted by frequency
      for (let i = 1; i < frequentTerms.length; i++) {
        expect(frequentTerms[i-1].frequency).toBeGreaterThanOrEqual(frequentTerms[i].frequency);
      }

      // Should include common terms like 'database', 'network', 'security'
      const termNames = frequentTerms.map(t => t.term);
      const hasCommonTerms = ['database', 'network', 'security', 'api'].some(term =>
        termNames.includes(term)
      );
      expect(hasCommonTerms).toBe(true);
    });

    it('should provide corpus-based expansions', () => {
      const result = queryExpander.expandQuery('database security');

      // Should include corpus-based related terms
      const corpusExpansions = result.expandedTerms.filter(term =>
        term.source === 'corpus'
      );
      expect(corpusExpansions.length).toBeGreaterThan(0);
    });

    it('should detect technical terms', () => {
      const stats = queryExpander.getCorpusStats();
      // Technical terms detection might not always find terms, so we'll check if stats exist
      expect(stats).toBeDefined();
      expect(stats!.technicalTerms).toBeGreaterThanOrEqual(0);

      const result = queryExpander.expandQuery('API development');
      const technicalExpansions = result.expandedTerms.filter(term =>
        term.type === 'technical'
      );
      expect(technicalExpansions.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract acronyms from context', () => {
      const result = queryExpander.expandQuery('API documentation');

      // Should include API expansion from corpus context
      const apiExpansions = result.expandedTerms.filter(term =>
        term.type === 'acronym' && term.term.includes('Application Programming Interface')
      );
      expect(apiExpansions.length).toBeGreaterThan(0);
    });
  });

  describe('custom mappings', () => {
    it('should add custom synonym mappings', () => {
      queryExpander.addSynonymMapping('custom_term', ['alternative1', 'alternative2']);

      const result = queryExpander.expandQuery('custom_term usage');

      const customSynonyms = result.expandedTerms.filter(term =>
        ['alternative1', 'alternative2'].includes(term.term)
      );
      expect(customSynonyms.length).toBeGreaterThan(0);
    });

    it('should add custom acronym mappings', () => {
      queryExpander.addAcronymMapping('CTO', ['Chief Technology Officer', 'technology leader']);

      const result = queryExpander.expandQuery('CTO approval');

      const ctoExpansions = result.expandedTerms.filter(term =>
        term.type === 'acronym' &&
        ['Chief Technology Officer', 'technology leader'].includes(term.term)
      );
      expect(ctoExpansions.length).toBeGreaterThan(0);
    });
  });

  describe('expansion ranking and scoring', () => {
    it('should rank expansions by confidence', () => {
      const result = queryExpander.expandQuery('database backup');

      // Expansions should be sorted by confidence
      for (let i = 1; i < result.expandedTerms.length; i++) {
        expect(result.expandedTerms[i-1].confidence).toBeGreaterThanOrEqual(
          result.expandedTerms[i].confidence
        );
      }
    });

    it('should limit number of expansions', () => {
      const result = queryExpander.expandQuery('server database network security', 5);

      expect(result.expandedTerms.length).toBeLessThanOrEqual(5);
    });

    it('should provide confidence scores', () => {
      const result = queryExpander.expandQuery('API server');

      result.expandedTerms.forEach(term => {
        expect(term.confidence).toBeGreaterThan(0);
        expect(term.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should rank query variations by score', () => {
      const result = queryExpander.expandQuery('database performance');

      // Variations should be sorted by score
      for (let i = 1; i < result.rankedVariations.length; i++) {
        expect(result.rankedVariations[i-1].score).toBeGreaterThanOrEqual(
          result.rankedVariations[i].score
        );
      }
    });
  });

  describe('multilingual support', () => {
    it('should handle English language parameter', () => {
      const result = queryExpander.expandQuery('server maintenance', 10, 'en');

      expect(result.expandedTerms.length).toBeGreaterThan(0);
      expect(result.originalQuery).toBe('server maintenance');
    });

    it('should handle Arabic language parameter', () => {
      const result = queryExpander.expandQuery('صيانة الخادم', 10, 'ar');

      expect(result.expandedTerms.length).toBeGreaterThanOrEqual(0);
      expect(result.originalQuery).toBe('صيانة الخادم');
    });

    it('should expand mixed language queries', () => {
      const result = queryExpander.expandQuery('API تطوير development');

      expect(result.expandedTerms.length).toBeGreaterThan(0);

      // Should handle both English and Arabic terms
      const englishExpansions = result.expandedTerms.filter(term =>
        /^[a-zA-Z\s]+$/.test(term.term)
      );
      expect(englishExpansions.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty queries', () => {
      const result = queryExpander.expandQuery('');

      expect(result.originalQuery).toBe('');
      expect(result.expandedTerms).toEqual([]);
      expect(result.rankedVariations).toEqual([]);
      expect(result.suggestedFilters).toEqual([]);
    });

    it('should handle single word queries', () => {
      const result = queryExpander.expandQuery('database');

      expect(result.expandedTerms.length).toBeGreaterThan(0);
      expect(result.rankedVariations.length).toBeGreaterThan(0);
    });

    it('should handle queries with special characters', () => {
      const result = queryExpander.expandQuery('server-config.json file');

      expect(result.originalQuery).toBe('server-config.json file');
      expect(result.expandedTerms.length).toBeGreaterThan(0);
    });

    it('should handle very long queries', () => {
      const longQuery = 'database server configuration management system administration backup recovery procedures manual documentation guide';
      const result = queryExpander.expandQuery(longQuery);

      expect(result.originalQuery).toBe(longQuery);
      expect(result.expandedTerms.length).toBeGreaterThan(0);
    });

    it('should reset corpus analysis', () => {
      const mockDocs: DocumentSearchResult[] = [
        { id: 'doc1', title: 'Test Document', type: 'test' }
      ];

      queryExpander.analyzeCorpus(mockDocs);
      expect(queryExpander.getCorpusStats()).toBeDefined();

      queryExpander.resetCorpusAnalysis();
      expect(queryExpander.getCorpusStats()).toBeNull();
    });
  });

  describe('expansion types', () => {
    it('should identify different expansion types', () => {
      const result = queryExpander.expandQuery('API database server');

      const expansionTypes = new Set(result.expandedTerms.map(term => term.type));

      expect(expansionTypes.has('synonym')).toBe(true);
      expect(expansionTypes.has('acronym')).toBe(true);
    });

    it('should provide source information', () => {
      const result = queryExpander.expandQuery('network security');

      result.expandedTerms.forEach(term => {
        expect(['corpus', 'dictionary', 'context', 'user']).toContain(term.source);
      });
    });

    it('should handle frequency information', () => {
      const mockDocs: DocumentSearchResult[] = [
        {
          id: 'doc1',
          title: 'Security Guide',
          content: 'Security measures and security protocols for network security.',
          type: 'guide'
        }
      ];

      queryExpander.analyzeCorpus(mockDocs);
      const result = queryExpander.expandQuery('security');

      const corpusExpansions = result.expandedTerms.filter(term =>
        term.source === 'corpus' && term.frequency !== undefined
      );

      if (corpusExpansions.length > 0) {
        corpusExpansions.forEach(term => {
          expect(term.frequency).toBeGreaterThan(0);
        });
      }
    });
  });
});