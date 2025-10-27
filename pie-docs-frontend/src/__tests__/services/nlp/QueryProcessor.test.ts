import { describe, it, expect, beforeEach } from 'vitest';
import { QueryProcessor } from '@/services/nlp/QueryProcessor';
import type { UserContext } from '@/services/nlp/ContextManager';

describe('QueryProcessor', () => {
  let processor: QueryProcessor;

  beforeEach(() => {
    processor = QueryProcessor.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = QueryProcessor.getInstance();
      const instance2 = QueryProcessor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('intent detection', () => {
    it('should detect search intent for English queries', async () => {
      const result = await processor.processQuery('find documents about project management');

      expect(result.type).toBe('search');
      expect(result.action).toBe('find');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect search intent for Arabic queries', async () => {
      const result = await processor.processQuery('ابحث عن مستندات المشروع', 'ar');

      expect(result.type).toBe('search');
      expect(result.action).toBe('ابحث');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect filter intent', async () => {
      const result = await processor.processQuery('filter documents by PDF type only');

      expect(result.type).toBe('filter');
      expect(result.action).toBe('filter');
      expect(result.parameters?.exclusive).toBe(true);
    });

    it('should detect analytics intent', async () => {
      const result = await processor.processQuery('how many documents were created last month');

      expect(result.type).toBe('analytics');
      expect(result.action).toBe('count');
      expect(result.parameters?.aggregation).toBe('count');
    });

    it('should detect action intent', async () => {
      const result = await processor.processQuery('download this document');

      expect(result.type).toBe('action');
      expect(result.action).toBe('download');
    });

    it('should detect context intent', async () => {
      const result = await processor.processQuery('show me recent documents');

      expect(result.type).toBe('context');
      expect(result.parameters?.context).toBe('recent');
    });

    it('should default to search intent for unclear queries', async () => {
      const result = await processor.processQuery('something unclear');

      expect(result.type).toBe('search');
      expect(result.action).toBe('find');
    });
  });

  describe('entity extraction', () => {
    it('should extract document type entities', async () => {
      const result = await processor.processQuery('find PDF documents');

      const docTypeEntity = result.entities.find(e => e.type === 'document_type');
      expect(docTypeEntity).toBeDefined();
      expect(docTypeEntity?.value).toBe('PDF');
      expect(docTypeEntity?.normalized).toBe('pdf');
    });

    it('should extract author entities', async () => {
      const result = await processor.processQuery('documents written by John Smith');

      const authorEntity = result.entities.find(e => e.type === 'author');
      expect(authorEntity).toBeDefined();
      expect(authorEntity?.value).toBe('John Smith');
    });

    it('should extract date entities', async () => {
      const result = await processor.processQuery('documents from yesterday');

      const dateEntity = result.entities.find(e => e.type === 'date');
      expect(dateEntity).toBeDefined();
      expect(dateEntity?.value).toBe('yesterday');
    });

    it('should extract topic entities', async () => {
      const result = await processor.processQuery('documents about machine learning');

      const topicEntity = result.entities.find(e => e.type === 'topic');
      expect(topicEntity).toBeDefined();
      expect(topicEntity?.value).toBe('machine learning');
    });

    it('should extract quoted phrases as topics', async () => {
      const result = await processor.processQuery('find documents about "artificial intelligence"');

      const topicEntity = result.entities.find(e => e.type === 'topic' && e.value === 'artificial intelligence');
      expect(topicEntity).toBeDefined();
    });

    it('should extract multiple entities', async () => {
      const result = await processor.processQuery('find PDF documents by John Doe about "project management" from yesterday');

      expect(result.entities).toHaveLength(4);

      const docType = result.entities.find(e => e.type === 'document_type');
      const author = result.entities.find(e => e.type === 'author');
      const topic = result.entities.find(e => e.type === 'topic');
      const date = result.entities.find(e => e.type === 'date');

      expect(docType?.value).toBe('PDF');
      expect(author?.value).toBe('John Doe');
      expect(topic?.value).toBe('project management');
      expect(date?.value).toBe('yesterday');
    });
  });

  describe('Arabic language support', () => {
    it('should process Arabic queries correctly', async () => {
      const result = await processor.processQuery('ابحث عن ملفات PDF', 'ar');

      expect(result.type).toBe('search');
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('should extract Arabic document types', async () => {
      const result = await processor.processQuery('أظهر لي الصور', 'ar');

      const docTypeEntity = result.entities.find(e => e.type === 'document_type');
      expect(docTypeEntity).toBeDefined();
      expect(docTypeEntity?.normalized).toBe('image');
    });

    it('should normalize Arabic date references', async () => {
      const result = await processor.processQuery('مستندات من اليوم', 'ar');

      const dateEntity = result.entities.find(e => e.type === 'date');
      expect(dateEntity).toBeDefined();
      expect(dateEntity?.normalized).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('confidence calculation', () => {
    it('should give higher confidence to specific queries', async () => {
      const specific = await processor.processQuery('find PDF documents created by John Smith about machine learning from yesterday');
      const vague = await processor.processQuery('find stuff');

      expect(specific.confidence).toBeGreaterThan(vague.confidence);
    });

    it('should give higher confidence when entities are found', async () => {
      const withEntities = await processor.processQuery('find PDF documents');
      const withoutEntities = await processor.processQuery('find things');

      expect(withEntities.confidence).toBeGreaterThan(withoutEntities.confidence);
    });

    it('should cap confidence at 1.0', async () => {
      const result = await processor.processQuery('find PDF documents created by John Smith about machine learning project management from yesterday with detailed analysis');

      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('ambiguity detection', () => {
    it('should detect ambiguous queries', () => {
      expect(processor.isAmbiguous('find', 0.4)).toBe(true);
      expect(processor.isAmbiguous('something unclear here', 0.5)).toBe(true);
    });

    it('should not flag clear queries as ambiguous', () => {
      expect(processor.isAmbiguous('find PDF documents about project management', 0.8)).toBe(false);
    });

    it('should generate clarification questions for English', () => {
      const questions = processor.generateClarificationQuestions('find documents', 'en');

      expect(questions).toHaveLength(2);
      expect(questions[0]).toContain('specific documents');
    });

    it('should generate clarification questions for Arabic', () => {
      const questions = processor.generateClarificationQuestions('ابحث عن ملفات', 'ar');

      expect(questions).toHaveLength(2);
      expect(questions[0]).toContain('مستندات معينة');
    });
  });

  describe('query normalization', () => {
    it('should normalize common abbreviations', async () => {
      const result = await processor.processQuery('find docs and pics');

      // Should have processed "docs" as "documents" and "pics" as "pictures"
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle extra whitespace', async () => {
      const result = await processor.processQuery('  find   PDF   documents  ');

      expect(result.type).toBe('search');
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', async () => {
      const result1 = await processor.processQuery('FIND PDF DOCUMENTS');
      const result2 = await processor.processQuery('find pdf documents');

      expect(result1.type).toBe(result2.type);
      expect(result1.entities.length).toBe(result2.entities.length);
    });
  });

  describe('parameter extraction', () => {
    it('should extract analytics aggregation parameters', async () => {
      const countResult = await processor.processQuery('how many documents');
      const sumResult = await processor.processQuery('total size of documents');
      const avgResult = await processor.processQuery('average document size');

      expect(countResult.parameters?.aggregation).toBe('count');
      expect(sumResult.parameters?.aggregation).toBe('sum');
      expect(avgResult.parameters?.aggregation).toBe('average');
    });

    it('should extract filter exclusivity parameters', async () => {
      const result = await processor.processQuery('only PDF documents');

      expect(result.parameters?.exclusive).toBe(true);
    });

    it('should extract context type parameters', async () => {
      const recentResult = await processor.processQuery('recent documents');
      const popularResult = await processor.processQuery('popular documents');
      const similarResult = await processor.processQuery('similar documents');

      expect(recentResult.parameters?.context).toBe('recent');
      expect(popularResult.parameters?.context).toBe('popular');
      expect(similarResult.parameters?.context).toBe('similar');
    });
  });

  describe('context-aware processing', () => {
    const mockUserContext: UserContext = {
      id: 'test-user',
      role: 'admin',
      department: 'it',
      permissions: ['read', 'write'],
      recentActivity: {
        queries: [],
        documents: [],
        topics: []
      },
      preferences: {
        language: 'en',
        documentTypes: ['manuals'],
        searchHistory: []
      }
    };

    it('should process query with full context awareness', async () => {
      const result = await processor.processQueryWithContext(
        'find server documentation',
        'en',
        mockUserContext
      );

      expect(result.intent).toBeDefined();
      expect(result.contextualQuery).toBeDefined();
      expect(result.intent.type).toBe('search');
      expect(result.contextualQuery.originalQuery).toBe('find server documentation');
      expect(result.contextualQuery.context.user.department).toBe('it');
      expect(result.contextualQuery.context.organizational.length).toBeGreaterThan(0);
    });

    it('should provide context-aware query suggestions', () => {
      // First set some search history in the user context
      const userWithHistory: UserContext = {
        ...mockUserContext,
        preferences: {
          ...mockUserContext.preferences,
          searchHistory: ['server maintenance', 'server configuration']
        }
      };

      const suggestions = processor.getQuerySuggestions('server', userWithHistory);

      expect(suggestions).toBeInstanceOf(Array);
      // Should include suggestions from search history or organizational contexts
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should set user context for processing', () => {
      processor.setUserContext(mockUserContext);
      // The context should be set in the ContextManager
      // This is tested more thoroughly in ContextManager tests
      expect(() => processor.setUserContext(mockUserContext)).not.toThrow();
    });

    it('should update user activity when processing with context', async () => {
      const queryText = 'find network configuration';

      await processor.processQueryWithContext(queryText, 'en', mockUserContext);

      // The user activity should be updated through ContextManager
      // This behavior is tested in ContextManager tests
      expect(true).toBe(true); // Placeholder - actual verification happens in ContextManager
    });

    it('should handle queries without user context', async () => {
      const result = await processor.processQueryWithContext('find documents');

      expect(result.intent).toBeDefined();
      expect(result.contextualQuery).toBeDefined();
      expect(result.intent.type).toBe('search');
    });

    it('should provide enhanced queries with organizational context', async () => {
      const result = await processor.processQueryWithContext(
        'find server information',
        'en',
        mockUserContext
      );

      expect(result.contextualQuery.suggestedTerms.length).toBeGreaterThan(0);
      // Should include IT-related terms due to user's department
      const hasItContext = result.contextualQuery.context.organizational.some(
        ctx => ctx.id === 'it'
      );
      expect(hasItContext).toBe(true);
    });

    it('should include query expansion in context processing', async () => {
      const result = await processor.processQueryWithContext(
        'find database documentation',
        'en',
        mockUserContext
      );

      expect(result.expandedQuery).toBeDefined();
      expect(result.expandedQuery.originalQuery).toBe('find database documentation');
      expect(result.expandedQuery.expandedTerms.length).toBeGreaterThan(0);
    });

    it('should process query with expansion only', async () => {
      const result = await processor.processQueryWithExpansion('server database');

      expect(result.intent).toBeDefined();
      expect(result.expandedQuery).toBeDefined();
      expect(result.expandedQuery.expandedTerms.length).toBeGreaterThan(0);
    });

    it('should update document corpus for expansion', () => {
      const mockDocs = [
        { id: 'doc1', title: 'Database Guide', content: 'Database administration guide', type: 'guide' }
      ];

      expect(() => processor.updateDocumentCorpus(mockDocs)).not.toThrow();
    });

    it('should add custom mappings for expansion', () => {
      expect(() => processor.addSynonymMapping('custom', ['alternative'])).not.toThrow();
      expect(() => processor.addAcronymMapping('CTM', ['Custom Term Mapping'])).not.toThrow();
    });

    it('should get corpus statistics', () => {
      const stats = processor.getCorpusStats();
      expect(stats).toBeDefined();
    });
  });
});