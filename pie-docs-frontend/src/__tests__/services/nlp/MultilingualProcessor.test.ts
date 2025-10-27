import { describe, it, expect, beforeEach } from 'vitest';
import { MultilingualProcessor } from '@/services/nlp/MultilingualProcessor';
import type { DocumentSearchResult } from '@/types/domain/Search';

describe('MultilingualProcessor', () => {
  let processor: MultilingualProcessor;

  beforeEach(() => {
    processor = MultilingualProcessor.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MultilingualProcessor.getInstance();
      const instance2 = MultilingualProcessor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('language detection', () => {
    it('should detect English text', () => {
      const result = processor.detectLanguage('find server documents');

      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it('should detect Arabic text', () => {
      const result = processor.detectLanguage('ابحث عن مستندات الخادم');

      expect(result.language).toBe('ar');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it('should detect mixed language text', () => {
      const result = processor.detectLanguage('find مستندات server');

      expect(result.language).toBe('mixed');
      expect(result.segments.length).toBeGreaterThan(1);

      // Should have both English and Arabic segments
      const hasEnglish = result.segments.some(s => s.language === 'en');
      const hasArabic = result.segments.some(s => s.language === 'ar');
      expect(hasEnglish).toBe(true);
      expect(hasArabic).toBe(true);
    });

    it('should provide segment information', () => {
      const result = processor.detectLanguage('hello مرحبا world');

      expect(result.segments.length).toBe(3);
      expect(result.segments[0].language).toBe('en');
      expect(result.segments[0].text).toBe('hello');
      expect(result.segments[1].language).toBe('ar');
      expect(result.segments[1].text).toBe('مرحبا');
      expect(result.segments[2].language).toBe('en');
      expect(result.segments[2].text).toBe('world');
    });

    it('should handle empty or non-text input', () => {
      const result = processor.detectLanguage('123 456 !@#');

      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('text translation', () => {
    it('should translate Arabic to English', () => {
      const result = processor.translateText('مستند نظام', 'en', 'ar');

      expect(result.originalText).toBe('مستند نظام');
      expect(result.sourceLanguage).toBe('ar');
      expect(result.targetLanguage).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.translatedText).toContain('document');
      expect(result.translatedText).toContain('system');
    });

    it('should translate English to Arabic', () => {
      const result = processor.translateText('document system', 'ar', 'en');

      expect(result.originalText).toBe('document system');
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('ar');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.translatedText).toMatch(/مستند|وثيقة/);
      expect(result.translatedText).toMatch(/نظام|برنامج/);
    });

    it('should handle translation when source equals target language', () => {
      const result = processor.translateText('hello world', 'en', 'en');

      expect(result.originalText).toBe('hello world');
      expect(result.translatedText).toBe('hello world');
      expect(result.confidence).toBe(1.0);
    });

    it('should auto-detect language when not specified', () => {
      const result = processor.translateText('مستند', 'en');

      expect(result.sourceLanguage).toBe('ar');
      expect(result.targetLanguage).toBe('en');
      expect(result.translatedText).toContain('document');
    });

    it('should handle mixed language text', () => {
      const result = processor.translateText('find مستند in server', 'en');

      expect(result.translatedText).toContain('document');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle transliteration', () => {
      const result = processor.translateText('email software', 'ar', 'en');

      expect(result.translatedText).toContain('إيميل');
      expect(result.translatedText).toContain('سوفتوير');
    });

    it('should preserve untranslatable words', () => {
      const result = processor.translateText('find xyz123 document', 'ar', 'en');

      expect(result.translatedText).toContain('xyz123');
      expect(result.translatedText).toMatch(/مستند|وثيقة/);
    });
  });

  describe('cross-language document matching', () => {
    const mockDocuments: DocumentSearchResult[] = [
      {
        id: 'doc1',
        title: 'Database Administration Guide',
        content: 'Complete guide for database administration and management.',
        type: 'guide',
        language: 'en'
      },
      {
        id: 'doc2',
        title: 'دليل إدارة قاعدة البيانات',
        content: 'دليل شامل لإدارة قواعد البيانات وصيانتها.',
        type: 'guide',
        language: 'ar'
      },
      {
        id: 'doc3',
        title: 'Network Security Manual',
        content: 'Security protocols and network protection guidelines.',
        type: 'manual',
        language: 'en'
      },
      {
        id: 'doc4',
        title: 'دليل أمان الشبكة',
        content: 'إرشادات حماية الشبكة وبروتوكولات الأمان.',
        type: 'manual',
        language: 'ar'
      }
    ];

    it('should find cross-language matches', () => {
      const matches = processor.findCrossLanguageMatches('قاعدة بيانات', mockDocuments);

      expect(matches.length).toBeGreaterThan(0);

      // Should find English documents that match the Arabic query
      const englishMatch = matches.find(m => m.documentLanguage === 'en');
      expect(englishMatch).toBeDefined();
      expect(englishMatch?.document.title).toContain('Database');
    });

    it('should calculate match scores', () => {
      const matches = processor.findCrossLanguageMatches('database administration', mockDocuments);

      matches.forEach(match => {
        expect(match.matchScore).toBeGreaterThan(0);
        expect(match.matchScore).toBeLessThanOrEqual(1);
      });

      // Matches should be sorted by score
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i-1].matchScore).toBeGreaterThanOrEqual(matches[i].matchScore);
      }
    });

    it('should provide translated queries', () => {
      const matches = processor.findCrossLanguageMatches('أمان الشبكة', mockDocuments);

      const englishMatch = matches.find(m => m.documentLanguage === 'en');
      expect(englishMatch?.translatedQuery).toBeDefined();
      expect(englishMatch?.translatedQuery).toContain('security');
      expect(englishMatch?.translatedQuery).toContain('network');
    });

    it('should identify matched terms', () => {
      const matches = processor.findCrossLanguageMatches('نظام', mockDocuments);

      matches.forEach(match => {
        expect(match.matchedTerms).toBeDefined();
        expect(Array.isArray(match.matchedTerms)).toBe(true);

        if (match.matchedTerms.length > 0) {
          match.matchedTerms.forEach(term => {
            expect(term.queryTerm).toBeDefined();
            expect(term.documentTerm).toBeDefined();
            expect(['direct', 'translated', 'transliterated']).toContain(term.translationType);
          });
        }
      });
    });

    it('should limit results to maxResults parameter', () => {
      const matches = processor.findCrossLanguageMatches('document', mockDocuments, 1);

      expect(matches.length).toBeLessThanOrEqual(1);
    });

    it('should skip same-language matches', () => {
      const matches = processor.findCrossLanguageMatches('database', mockDocuments);

      // Should not include English documents when query is in English
      const englishMatches = matches.filter(m => m.documentLanguage === 'en');
      expect(englishMatches.length).toBe(0);
    });
  });

  describe('bilingual result sets', () => {
    const mockDocuments: DocumentSearchResult[] = [
      {
        id: 'doc1',
        title: 'English Document',
        content: 'English content',
        type: 'doc',
        language: 'en'
      },
      {
        id: 'doc2',
        title: 'مستند عربي',
        content: 'محتوى عربي',
        type: 'doc',
        language: 'ar'
      },
      {
        id: 'doc3',
        title: 'Mixed Document مختلط',
        content: 'Mixed content محتوى مختلط',
        type: 'doc',
        language: 'mixed'
      }
    ];

    it('should create bilingual result set', () => {
      const resultSet = processor.createBilingualResultSet(
        'document search',
        mockDocuments,
        [mockDocuments[0]] // Same language results
      );

      expect(resultSet.originalQuery).toBe('document search');
      expect(resultSet.queryLanguage).toBe('en');
      expect(resultSet.results.sameLanguage.length).toBe(1);
      expect(resultSet.results.crossLanguage.length).toBeGreaterThanOrEqual(0);
      expect(resultSet.results.mixed.length).toBeGreaterThanOrEqual(0);
      expect(resultSet.totalMatches).toBeGreaterThan(0);
    });

    it('should calculate language distribution', () => {
      const resultSet = processor.createBilingualResultSet('test', mockDocuments);

      expect(resultSet.languageDistribution).toBeDefined();
      expect(typeof resultSet.languageDistribution.en).toBe('number');
      expect(typeof resultSet.languageDistribution.ar).toBe('number');
    });

    it('should handle mixed language queries', () => {
      const resultSet = processor.createBilingualResultSet('find مستند', mockDocuments);

      expect(resultSet.queryLanguage).toBe('en'); // Falls back to English for mixed
      expect(resultSet.totalMatches).toBeGreaterThanOrEqual(0);
    });
  });

  describe('RTL support', () => {
    it('should detect when RTL is needed', () => {
      expect(processor.shouldUseRTL('مرحبا')).toBe(true);
      expect(processor.shouldUseRTL('hello')).toBe(false);
      expect(processor.shouldUseRTL('hello مرحبا')).toBe(true);
    });

    it('should format text for RTL display', () => {
      const formatted = processor.formatForRTL('مرحبا');
      expect(formatted).toBe('مرحبا'); // Simple Arabic text unchanged

      const mixedFormatted = processor.formatForRTL('hello مرحبا world');
      expect(mixedFormatted).toContain('\u202B'); // Should contain RTL embedding
      expect(mixedFormatted).toContain('\u202C');
    });

    it('should not add RTL formatting to English-only text', () => {
      const formatted = processor.formatForRTL('hello world');
      expect(formatted).toBe('hello world');
      expect(formatted).not.toContain('\u202B');
    });
  });

  describe('custom mappings', () => {
    it('should add custom translation mappings', () => {
      processor.addTranslationMapping('اختبار', ['test', 'trial', 'exam']);

      const result = processor.translateText('اختبار', 'en', 'ar');
      expect(result.translatedText).toContain('test');
    });

    it('should add transliteration patterns', () => {
      processor.addTransliterationPattern('github', 'جيت هاب');

      const result = processor.translateText('github repository', 'ar', 'en');
      expect(result.translatedText).toContain('جيت هاب');
    });

    it('should provide translation statistics', () => {
      const stats = processor.getTranslationStats();

      expect(stats.arabicToEnglishMappings).toBeGreaterThan(0);
      expect(stats.englishToArabicMappings).toBeGreaterThan(0);
      expect(stats.transliterationPatterns).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const detection = processor.detectLanguage('');
      expect(detection.language).toBe('en');
      expect(detection.confidence).toBe(0.5);

      const translation = processor.translateText('', 'ar');
      expect(translation.translatedText).toBe('');
    });

    it('should handle numbers and symbols', () => {
      const detection = processor.detectLanguage('123 !@# 456');
      expect(detection.language).toBe('en');

      const translation = processor.translateText('123 test 456', 'ar');
      expect(translation.translatedText).toContain('123');
      expect(translation.translatedText).toContain('456');
    });

    it('should handle very short text', () => {
      const detection = processor.detectLanguage('a');
      expect(detection.language).toBe('en');

      const translation = processor.translateText('a', 'ar');
      expect(translation.translatedText).toBe('a');
    });

    it('should handle text with only punctuation', () => {
      const detection = processor.detectLanguage('!@#$%');
      expect(detection.confidence).toBeLessThan(1);

      const translation = processor.translateText('!@#', 'ar');
      expect(translation.translatedText).toBe('!@#');
    });
  });

  describe('performance and accuracy', () => {
    it('should maintain reasonable confidence scores', () => {
      const testCases = [
        { text: 'مستند', expectedLang: 'ar' },
        { text: 'document', expectedLang: 'en' },
        { text: 'database قاعدة بيانات', expectedLang: 'mixed' }
      ];

      testCases.forEach(testCase => {
        const result = processor.detectLanguage(testCase.text);
        expect(result.language).toBe(testCase.expectedLang);
        if (testCase.expectedLang !== 'mixed') {
          expect(result.confidence).toBeGreaterThan(0.7);
        }
      });
    });

    it('should handle complex sentences', () => {
      const complexArabic = 'ابحث عن مستندات النظام في قاعدة البيانات';
      const complexEnglish = 'search for system documents in the database';

      const arResult = processor.detectLanguage(complexArabic);
      const enResult = processor.detectLanguage(complexEnglish);

      expect(arResult.language).toBe('ar');
      expect(enResult.language).toBe('en');
      expect(arResult.confidence).toBeGreaterThan(0.8);
      expect(enResult.confidence).toBeGreaterThan(0.8);
    });

    it('should translate technical terms accurately', () => {
      const technicalTerms = [
        { ar: 'قاعدة بيانات', en: 'database' },
        { ar: 'شبكة', en: 'network' },
        { ar: 'أمان', en: 'security' },
        { ar: 'نظام', en: 'system' }
      ];

      technicalTerms.forEach(term => {
        const arToEn = processor.translateText(term.ar, 'en', 'ar');
        const enToAr = processor.translateText(term.en, 'ar', 'en');

        expect(arToEn.translatedText.toLowerCase()).toContain(term.en);
        expect(enToAr.translatedText).toContain(term.ar);
      });
    });
  });
});