import { describe, it, expect } from 'vitest';
import {
  validateAndSanitizeQuery,
  validateConversationId,
  validateNumericParameter,
  validateAnswerGenerationRequest,
  DEFAULT_QUERY_VALIDATION,
} from '@/utils/validation/inputSanitization';

describe('inputSanitization', () => {
  describe('validateAndSanitizeQuery', () => {
    it('validates and sanitizes normal queries', () => {
      const result = validateAndSanitizeQuery('How to configure document workflows?');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput).toBe('How to configure document workflows?');
      expect(result.errors).toHaveLength(0);
    });

    it('trims whitespace from queries', () => {
      const result = validateAndSanitizeQuery('  test query  ');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput).toBe('test query');
    });

    it('normalizes multiple spaces', () => {
      const result = validateAndSanitizeQuery('test    multiple   spaces');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput).toBe('test multiple spaces');
    });

    it('rejects empty or null queries', () => {
      expect(validateAndSanitizeQuery('').isValid).toBe(false);
      expect(validateAndSanitizeQuery('   ').isValid).toBe(false);
      expect(validateAndSanitizeQuery(null as any).isValid).toBe(false);
      expect(validateAndSanitizeQuery(undefined as any).isValid).toBe(false);
    });

    it('rejects queries that exceed maximum length', () => {
      const longQuery = 'a'.repeat(6000);
      const result = validateAndSanitizeQuery(longQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum length');
    });

    it('blocks script tags and dangerous content', () => {
      const maliciousQueries = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'vbscript:msgbox("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'onload=alert("xss")',
        'eval(document.cookie)',
      ];

      maliciousQueries.forEach(query => {
        const result = validateAndSanitizeQuery(query);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('harmful');
      });
    });

    it('blocks invalid characters', () => {
      const result = validateAndSanitizeQuery('valid query \x00\x01\x02');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('invalid characters');
    });

    it('warns about long queries', () => {
      const longQuery = 'a'.repeat(1500);
      const result = validateAndSanitizeQuery(longQuery);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Long queries may impact performance');
    });

    it('warns about HTML-like characters', () => {
      const result = validateAndSanitizeQuery('What is <component> in React?');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Query contains HTML-like characters');
    });

    it('accepts valid special characters', () => {
      const validQuery = 'How to use @mentions, #hashtags, and $variables?';
      const result = validateAndSanitizeQuery(validQuery);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput).toBe(validQuery);
    });
  });

  describe('validateConversationId', () => {
    it('accepts valid UUID conversation IDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      validUUIDs.forEach(uuid => {
        const result = validateConversationId(uuid);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedInput).toBe(uuid);
      });
    });

    it('accepts valid alphanumeric conversation IDs', () => {
      const validIds = [
        'conv_123',
        'session-abc-123',
        'chat_room_1',
      ];

      validIds.forEach(id => {
        const result = validateConversationId(id);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedInput).toBe(id);
      });
    });

    it('accepts undefined conversation ID', () => {
      const result = validateConversationId(undefined);
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid conversation ID formats', () => {
      const invalidIds = [
        'invalid id with spaces',
        'id@with.email.format',
        'id/with/slashes',
        'very_long_conversation_id_that_exceeds_fifty_characters',
      ];

      invalidIds.forEach(id => {
        const result = validateConversationId(id);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Invalid conversation ID format');
      });
    });
  });

  describe('validateNumericParameter', () => {
    it('accepts valid numbers within range', () => {
      const result = validateNumericParameter(5, 'testParam', 1, 10);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts undefined values for optional parameters', () => {
      const result = validateNumericParameter(undefined, 'testParam', 1, 10);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects non-numeric values', () => {
      const result = validateNumericParameter('not a number' as any, 'testParam');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be a valid number');
    });

    it('rejects NaN values', () => {
      const result = validateNumericParameter(NaN, 'testParam');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be a valid number');
    });

    it('enforces minimum value', () => {
      const result = validateNumericParameter(0, 'testParam', 1, 10);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be at least 1');
    });

    it('enforces maximum value', () => {
      const result = validateNumericParameter(15, 'testParam', 1, 10);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot exceed 10');
    });
  });

  describe('validateAnswerGenerationRequest', () => {
    const validRequest = {
      query: 'How to configure workflows?',
      conversationId: 'conv-123',
      maxSources: 10,
      confidenceThreshold: 0.7,
    };

    it('validates complete valid requests', () => {
      const result = validateAnswerGenerationRequest(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedInput).toBe(validRequest.query);
    });

    it('validates minimal requests with only query', () => {
      const result = validateAnswerGenerationRequest({
        query: 'Simple question?',
      });

      expect(result.isValid).toBe(true);
      expect(result.sanitizedInput).toBe('Simple question?');
    });

    it('aggregates validation errors from all fields', () => {
      const invalidRequest = {
        query: '', // Invalid: empty
        conversationId: 'invalid id with spaces', // Invalid: bad format
        maxSources: -1, // Invalid: below minimum
        confidenceThreshold: 2, // Invalid: above maximum
      };

      const result = validateAnswerGenerationRequest(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
      expect(result.errors.some(e => e.includes('conversation ID'))).toBe(true);
      expect(result.errors.some(e => e.includes('maxSources'))).toBe(true);
      expect(result.errors.some(e => e.includes('confidenceThreshold'))).toBe(true);
    });

    it('sanitizes query input while preserving other validation errors', () => {
      const request = {
        query: '  How to configure workflows?  ', // Needs sanitization
        maxSources: -1, // Invalid
      };

      const result = validateAnswerGenerationRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.sanitizedInput).toBe('How to configure workflows?');
      expect(result.errors.some(e => e.includes('maxSources'))).toBe(true);
    });

    it('collects warnings from query validation', () => {
      const longQuery = 'a'.repeat(1500);
      const request = {
        query: longQuery,
      };

      const result = validateAnswerGenerationRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Long queries may impact performance');
    });

    it('validates maxSources range', () => {
      const requests = [
        { query: 'test', maxSources: 0 }, // Too low
        { query: 'test', maxSources: 100 }, // Too high
        { query: 'test', maxSources: 25 }, // Valid
      ];

      const results = requests.map(req => validateAnswerGenerationRequest(req));

      expect(results[0].isValid).toBe(false);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(true);
    });

    it('validates confidence threshold range', () => {
      const requests = [
        { query: 'test', confidenceThreshold: -0.1 }, // Too low
        { query: 'test', confidenceThreshold: 1.1 }, // Too high
        { query: 'test', confidenceThreshold: 0.8 }, // Valid
      ];

      const results = requests.map(req => validateAnswerGenerationRequest(req));

      expect(results[0].isValid).toBe(false);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(true);
    });
  });

  describe('DEFAULT_QUERY_VALIDATION', () => {
    it('has reasonable default values', () => {
      expect(DEFAULT_QUERY_VALIDATION.maxLength).toBe(5000);
      expect(DEFAULT_QUERY_VALIDATION.trimWhitespace).toBe(true);
      expect(DEFAULT_QUERY_VALIDATION.normalizeSpaces).toBe(true);
      expect(DEFAULT_QUERY_VALIDATION.blockPatterns).toBeDefined();
      expect(DEFAULT_QUERY_VALIDATION.allowedChars).toBeDefined();
    });

    it('blocks common XSS patterns', () => {
      const dangerousPatterns = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'vbscript:msgbox("xss")',
        'onclick=alert("xss")',
        'eval(document.cookie)',
        'expression(alert("xss"))',
      ];

      dangerousPatterns.forEach(pattern => {
        const hasBlockingPattern = DEFAULT_QUERY_VALIDATION.blockPatterns!.some(regex =>
          regex.test(pattern)
        );
        expect(hasBlockingPattern).toBe(true);
      });
    });
  });
});