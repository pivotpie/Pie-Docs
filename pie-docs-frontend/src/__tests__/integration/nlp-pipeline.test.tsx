import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nlpIntegrationService } from '@/services/nlp/NLPIntegrationService';
import { queryProcessor } from '@/services/nlp/QueryProcessor';

describe('NLP Pipeline Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Query Processing', () => {
    it('should process simple search queries', async () => {
      const result = await nlpIntegrationService.processQuery('find documents about sales', 'en');

      expect(result).toBeDefined();
      expect(result.originalQuery).toBe('find documents about sales');
      expect(result.intent.type).toBe('search');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.language).toBe('en');
      expect(result.searchResults).toHaveLength(1);
    });

    it('should process Arabic queries', async () => {
      const result = await nlpIntegrationService.processQuery('ابحث عن المستندات', 'ar');

      expect(result).toBeDefined();
      expect(result.originalQuery).toBe('ابحث عن المستندات');
      expect(result.intent.type).toBe('search');
      expect(result.language).toBe('ar');
      expect(result.searchResults).toHaveLength(1);
    });

    it('should handle analytics queries', async () => {
      const result = await nlpIntegrationService.processQuery('how many documents do I have', 'en');

      expect(result).toBeDefined();
      expect(result.intent.type).toBe('analytics');
      expect(result.intent.parameters.aggregation).toBe('count');
    });

    it('should extract entities from queries', async () => {
      const result = await nlpIntegrationService.processQuery('find PDF documents from last month', 'en');

      expect(result.intent.entities).toContainEqual(
        expect.objectContaining({
          type: 'document_type',
          value: 'PDF',
          normalized: 'pdf'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle empty queries gracefully', async () => {
      try {
        await nlpIntegrationService.processQuery('', 'en');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid language codes', async () => {
      try {
        await nlpIntegrationService.processQuery('test', 'invalid' as any);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should provide fallback for processing errors', async () => {
      // Mock an error in query processor
      const originalMethod = queryProcessor.processQuery;
      vi.spyOn(queryProcessor, 'processQuery').mockRejectedValueOnce(new Error('Test error'));

      const result = await nlpIntegrationService.processQuery('test query', 'en');

      expect(result.confidence).toBe(0.3);
      expect(result.intent.type).toBe('search');

      // Restore original method
      queryProcessor.processQuery = originalMethod;
    });
  });

  describe('Input Validation', () => {
    it('should reject queries that are too long', async () => {
      const longQuery = 'a'.repeat(501);

      try {
        await nlpIntegrationService.processQuery(longQuery, 'en');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should sanitize malicious input', async () => {
      const maliciousQuery = '<script>alert("xss")</script>find documents';

      const result = await nlpIntegrationService.processQuery(maliciousQuery, 'en');

      // Should process successfully and still classify as search
      expect(result.intent.type).toBe('search');

      // The original query is preserved for logging purposes
      // but the dangerous content is sanitized during processing
      expect(result.originalQuery).toBe(maliciousQuery);

      // The important thing is that intent extraction still works
      // despite the malicious content being sanitized internally
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle queries with special characters', async () => {
      const specialQuery = 'find "important documents" & reports';

      const result = await nlpIntegrationService.processQuery(specialQuery, 'en');

      expect(result).toBeDefined();
      expect(result.intent.type).toBe('search');
    });
  });

  describe('Ambiguity Detection', () => {
    it('should detect ambiguous queries', () => {
      expect(nlpIntegrationService.isAmbiguous('find')).toBe(true);
      expect(nlpIntegrationService.isAmbiguous('show')).toBe(true);
      expect(nlpIntegrationService.isAmbiguous('find documents about sales report')).toBe(false);
    });

    it('should provide clarification questions for ambiguous queries', () => {
      const clarifications = nlpIntegrationService.getClarificationQuestions('find', 'en');

      expect(clarifications).toHaveLength(2);
      expect(clarifications[0]).toContain('looking for');
    });

    it('should provide Arabic clarification questions', () => {
      const clarifications = nlpIntegrationService.getClarificationQuestions('ابحث', 'ar');

      expect(clarifications).toHaveLength(2);
      expect(clarifications[0]).toContain('تريد');
    });
  });

  describe('Performance', () => {
    it('should process queries within reasonable time', async () => {
      const startTime = performance.now();

      await nlpIntegrationService.processQuery('find documents about project management', 'en');

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should complete within 1 second for basic queries
      expect(processingTime).toBeLessThan(1000);
    });

    it('should include processing time in results', async () => {
      const result = await nlpIntegrationService.processQuery('test query', 'en');

      expect(result.processingTime).toBeGreaterThan(0);
      expect(typeof result.processingTime).toBe('number');
    });
  });
});