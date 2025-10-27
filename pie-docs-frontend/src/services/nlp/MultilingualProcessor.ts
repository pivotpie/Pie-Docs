import type { QueryIntent, DocumentSearchResult } from '@/types/domain/Search';

export interface LanguageDetectionResult {
  language: 'en' | 'ar' | 'mixed';
  confidence: number;
  segments: {
    text: string;
    language: 'en' | 'ar';
    start: number;
    end: number;
  }[];
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: 'en' | 'ar';
  targetLanguage: 'en' | 'ar';
  confidence: number;
  alternatives?: string[];
}

export interface CrossLanguageMatch {
  query: string;
  queryLanguage: 'en' | 'ar';
  document: DocumentSearchResult;
  documentLanguage: 'en' | 'ar';
  matchScore: number;
  translatedQuery?: string;
  matchedTerms: {
    queryTerm: string;
    documentTerm: string;
    translationType: 'direct' | 'translated' | 'transliterated';
  }[];
}

export interface BilingualResultSet {
  originalQuery: string;
  queryLanguage: 'en' | 'ar';
  results: {
    sameLanguage: DocumentSearchResult[];
    crossLanguage: CrossLanguageMatch[];
    mixed: DocumentSearchResult[];
  };
  totalMatches: number;
  languageDistribution: Record<string, number>;
}

/**
 * MultilingualProcessor handles Arabic and English query processing with cross-language capabilities
 */
export class MultilingualProcessor {
  private static instance: MultilingualProcessor | null = null;

  // Arabic-English translation dictionaries
  private arabicToEnglish = new Map<string, string[]>([
    // Documents and files
    ['مستند', ['document', 'file', 'record']],
    ['وثيقة', ['document', 'paper', 'record']],
    ['ملف', ['file', 'document', 'folder']],
    ['تقرير', ['report', 'document', 'analysis']],
    ['سجل', ['record', 'log', 'registry']],
    ['صورة', ['image', 'picture', 'photo']],
    ['فيديو', ['video', 'clip', 'recording']],
    ['صوت', ['audio', 'sound', 'voice']],

    // Technology terms
    ['نظام', ['system', 'platform', 'application']],
    ['برنامج', ['program', 'software', 'application']],
    ['تطبيق', ['application', 'app', 'software']],
    ['خادم', ['server', 'host', 'machine']],
    ['شبكة', ['network', 'connection', 'infrastructure']],
    ['قاعدة بيانات', ['database', 'datastore', 'repository']],
    ['أمان', ['security', 'safety', 'protection']],
    ['حماية', ['protection', 'security', 'defense']],
    ['إعداد', ['configuration', 'setup', 'settings']],
    ['تهيئة', ['configuration', 'setup', 'initialization']],

    // Actions and verbs
    ['ابحث', ['search', 'find', 'look']],
    ['اعثر', ['find', 'locate', 'discover']],
    ['أظهر', ['show', 'display', 'present']],
    ['اعرض', ['display', 'show', 'present']],
    ['افتح', ['open', 'access', 'launch']],
    ['حمّل', ['download', 'load', 'fetch']],
    ['شارك', ['share', 'distribute', 'send']],
    ['احذف', ['delete', 'remove', 'erase']],
    ['عدّل', ['edit', 'modify', 'update']],
    ['انسخ', ['copy', 'duplicate', 'replicate']],

    // Business terms
    ['سياسة', ['policy', 'procedure', 'guideline']],
    ['إجراء', ['procedure', 'process', 'method']],
    ['موظف', ['employee', 'staff', 'worker']],
    ['فريق', ['team', 'group', 'crew']],
    ['مشروع', ['project', 'initiative', 'program']],
    ['اجتماع', ['meeting', 'conference', 'session']],
    ['تدريب', ['training', 'education', 'course']],
    ['ميزانية', ['budget', 'funds', 'allocation']],
    ['عقد', ['contract', 'agreement', 'deal']],

    // Time and dates
    ['اليوم', ['today', 'current', 'now']],
    ['أمس', ['yesterday', 'previous', 'past']],
    ['غداً', ['tomorrow', 'next', 'future']],
    ['أسبوع', ['week', 'weekly', 'period']],
    ['شهر', ['month', 'monthly', 'period']],
    ['سنة', ['year', 'annual', 'yearly']],
    ['حديث', ['recent', 'new', 'latest']],
    ['قديم', ['old', 'previous', 'archived']],

    // Descriptive terms
    ['مهم', ['important', 'critical', 'essential']],
    ['عاجل', ['urgent', 'priority', 'immediate']],
    ['سري', ['confidential', 'private', 'classified']],
    ['عام', ['public', 'general', 'common']],
    ['خاص', ['private', 'personal', 'specific']],
    ['رسمي', ['official', 'formal', 'authorized']],
    ['مؤقت', ['temporary', 'interim', 'provisional']],
    ['دائم', ['permanent', 'fixed', 'constant']]
  ]);

  private englishToArabic = new Map<string, string[]>();

  // Transliteration patterns
  private transliterationPatterns = new Map<string, string>([
    // English to Arabic transliteration
    ['email', 'إيميل'],
    ['internet', 'إنترنت'],
    ['computer', 'كومبيوتر'],
    ['software', 'سوفتوير'],
    ['hardware', 'هاردوير'],
    ['website', 'موقع'],
    ['online', 'أونلاين'],
    ['offline', 'أوفلاين'],
    ['digital', 'رقمي'],
    ['mobile', 'موبايل'],
    ['tablet', 'تابلت'],
    ['laptop', 'لابتوب'],
    ['desktop', 'ديسكتوب'],
    ['server', 'سيرفر'],
    ['router', 'راوتر'],
    ['modem', 'مودم'],
    ['wifi', 'واي فاي'],
    ['bluetooth', 'بلوتوث']
  ]);

  // Language detection patterns
  private arabicPattern = /[\u0600-\u06FF]/;
  private englishPattern = /[a-zA-Z]/;

  private constructor() {
    this.buildReverseTranslationMap();
  }

  static getInstance(): MultilingualProcessor {
    if (!MultilingualProcessor.instance) {
      MultilingualProcessor.instance = new MultilingualProcessor();
    }
    return MultilingualProcessor.instance;
  }

  /**
   * Build reverse translation map (English to Arabic)
   */
  private buildReverseTranslationMap(): void {
    for (const [arabic, englishTerms] of this.arabicToEnglish.entries()) {
      englishTerms.forEach(english => {
        if (!this.englishToArabic.has(english)) {
          this.englishToArabic.set(english, []);
        }
        this.englishToArabic.get(english)!.push(arabic);
      });
    }
  }

  /**
   * Detect language of text with segment analysis
   */
  detectLanguage(text: string): LanguageDetectionResult {
    const segments: LanguageDetectionResult['segments'] = [];
    let currentSegment = '';
    let currentLanguage: 'en' | 'ar' | null = null;
    let currentStart = 0;

    // Analyze character by character
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      let charLanguage: 'en' | 'ar' | null = null;

      if (this.arabicPattern.test(char)) {
        charLanguage = 'ar';
      } else if (this.englishPattern.test(char)) {
        charLanguage = 'en';
      }

      // If language changed or this is the last character
      if (charLanguage !== currentLanguage || i === text.length - 1) {
        // Save previous segment if exists
        if (currentSegment.trim() && currentLanguage) {
          segments.push({
            text: currentSegment.trim(),
            language: currentLanguage,
            start: currentStart,
            end: charLanguage !== currentLanguage ? i - 1 : i
          });
        }

        // Start new segment
        if (i === text.length - 1 && charLanguage === currentLanguage) {
          // Last character, same language - add to current segment
          currentSegment += char;
          if (currentSegment.trim() && currentLanguage) {
            segments.push({
              text: currentSegment.trim(),
              language: currentLanguage,
              start: currentStart,
              end: i
            });
          }
        } else {
          // Language changed - start new segment
          currentSegment = char;
          currentLanguage = charLanguage;
          currentStart = i;
        }
      } else {
        currentSegment += char;
      }
    }

    // Calculate overall language and confidence
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = arabicChars + englishChars;

    let language: 'en' | 'ar' | 'mixed' = 'en';
    let confidence = 0;

    if (totalChars === 0) {
      language = 'en';
      confidence = 0.5;
    } else if (arabicChars > englishChars * 2) {
      language = 'ar';
      confidence = arabicChars / totalChars;
    } else if (englishChars > arabicChars * 2) {
      language = 'en';
      confidence = englishChars / totalChars;
    } else {
      language = 'mixed';
      confidence = Math.max(arabicChars, englishChars) / totalChars;
    }

    return {
      language,
      confidence,
      segments: segments.filter(s => s.text.length > 0)
    };
  }

  /**
   * Translate text between Arabic and English
   */
  translateText(
    text: string,
    targetLanguage: 'en' | 'ar',
    sourceLanguage?: 'en' | 'ar'
  ): TranslationResult {
    const detectedLanguage = sourceLanguage || this.detectLanguage(text).language;

    if (detectedLanguage === 'mixed') {
      // Handle mixed language text
      return this.translateMixedLanguageText(text, targetLanguage);
    }

    if (detectedLanguage === targetLanguage) {
      // No translation needed
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage: detectedLanguage as 'en' | 'ar',
        targetLanguage,
        confidence: 1.0
      };
    }

    const words = text.toLowerCase().split(/\s+/);
    const translatedWords: string[] = [];
    let translatedCount = 0;

    words.forEach(word => {
      // Clean word of punctuation
      const cleanWord = word.replace(/[^\w\u0600-\u06FF]/g, '');
      let translated = false;

      if (targetLanguage === 'en' && detectedLanguage === 'ar') {
        // Arabic to English
        const englishTranslations = this.arabicToEnglish.get(cleanWord);
        if (englishTranslations && englishTranslations.length > 0) {
          translatedWords.push(englishTranslations[0]);
          translatedCount++;
          translated = true;
        }
      } else if (targetLanguage === 'ar' && detectedLanguage === 'en') {
        // English to Arabic
        const arabicTranslations = this.englishToArabic.get(cleanWord);
        if (arabicTranslations && arabicTranslations.length > 0) {
          translatedWords.push(arabicTranslations[0]);
          translatedCount++;
          translated = true;
        }
      }

      // Try transliteration if direct translation failed
      if (!translated) {
        const transliterated = this.transliterationPatterns.get(cleanWord);
        if (transliterated) {
          translatedWords.push(transliterated);
          translatedCount++;
          translated = true;
        }
      }

      // Keep original word if no translation found
      if (!translated) {
        translatedWords.push(word);
      }
    });

    const confidence = words.length > 0 ? translatedCount / words.length : 0;

    return {
      originalText: text,
      translatedText: translatedWords.join(' '),
      sourceLanguage: detectedLanguage as 'en' | 'ar',
      targetLanguage,
      confidence
    };
  }

  /**
   * Handle mixed language text translation
   */
  private translateMixedLanguageText(text: string, targetLanguage: 'en' | 'ar'): TranslationResult {
    const detection = this.detectLanguage(text);
    let translatedText = text;
    let translatedSegments = 0;

    detection.segments.forEach(segment => {
      if (segment.language !== targetLanguage) {
        const translation = this.translateText(segment.text, targetLanguage, segment.language);
        if (translation.confidence > 0.3) { // Only replace if reasonably confident
          translatedText = translatedText.replace(segment.text, translation.translatedText);
          translatedSegments++;
        }
      }
    });

    const confidence = detection.segments.length > 0 ? translatedSegments / detection.segments.length : 0;

    return {
      originalText: text,
      translatedText,
      sourceLanguage: 'mixed' as any,
      targetLanguage,
      confidence
    };
  }

  /**
   * Perform cross-language document matching
   */
  findCrossLanguageMatches(
    query: string,
    documents: DocumentSearchResult[],
    maxResults: number = 20
  ): CrossLanguageMatch[] {
    const queryLanguage = this.detectLanguage(query).language as 'en' | 'ar';
    const matches: CrossLanguageMatch[] = [];

    documents.forEach(doc => {
      const docLanguage = this.detectLanguage(doc.title + ' ' + (doc.content || '')).language as 'en' | 'ar';

      // Skip if same language (not cross-language)
      if (queryLanguage === docLanguage || queryLanguage === 'mixed' || docLanguage === 'mixed') {
        return;
      }

      // Translate query to document language
      const translatedQuery = this.translateText(query, docLanguage, queryLanguage);

      if (translatedQuery.confidence < 0.3) {
        return; // Skip if translation confidence is too low
      }

      // Calculate match score
      const matchScore = this.calculateCrossLanguageMatchScore(
        query,
        translatedQuery.translatedText,
        doc,
        queryLanguage,
        docLanguage
      );

      if (matchScore > 0.3) { // Only include decent matches
        matches.push({
          query,
          queryLanguage,
          document: doc,
          documentLanguage: docLanguage,
          matchScore,
          translatedQuery: translatedQuery.translatedText,
          matchedTerms: this.findMatchedTerms(query, doc, queryLanguage, docLanguage)
        });
      }
    });

    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);
  }

  /**
   * Calculate cross-language match score
   */
  private calculateCrossLanguageMatchScore(
    originalQuery: string,
    translatedQuery: string,
    document: DocumentSearchResult,
    queryLanguage: 'en' | 'ar',
    docLanguage: 'en' | 'ar'
  ): number {
    const docText = (document.title + ' ' + (document.content || '')).toLowerCase();
    const queryTerms = translatedQuery.toLowerCase().split(/\s+/);

    let matchedTerms = 0;
    let totalWeight = 0;

    queryTerms.forEach(term => {
      const termWeight = term.length > 3 ? 1 : 0.5; // Longer terms get more weight
      totalWeight += termWeight;

      if (docText.includes(term)) {
        matchedTerms += termWeight;
      }
    });

    const baseScore = totalWeight > 0 ? matchedTerms / totalWeight : 0;

    // Boost score for title matches
    const titleText = document.title.toLowerCase();
    const titleMatches = queryTerms.filter(term => titleText.includes(term)).length;
    const titleBoost = titleMatches > 0 ? 0.2 * (titleMatches / queryTerms.length) : 0;

    return Math.min(baseScore + titleBoost, 1.0);
  }

  /**
   * Find matched terms between query and document
   */
  private findMatchedTerms(
    query: string,
    document: DocumentSearchResult,
    queryLanguage: 'en' | 'ar',
    docLanguage: 'en' | 'ar'
  ): CrossLanguageMatch['matchedTerms'] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const docText = (document.title + ' ' + (document.content || '')).toLowerCase();
    const matchedTerms: CrossLanguageMatch['matchedTerms'] = [];

    queryTerms.forEach(queryTerm => {
      const cleanQueryTerm = queryTerm.replace(/[^\w\u0600-\u06FF]/g, '');

      // Direct translation
      let translations: string[] = [];
      if (queryLanguage === 'ar' && docLanguage === 'en') {
        translations = this.arabicToEnglish.get(cleanQueryTerm) || [];
      } else if (queryLanguage === 'en' && docLanguage === 'ar') {
        translations = this.englishToArabic.get(cleanQueryTerm) || [];
      }

      translations.forEach(translation => {
        if (docText.includes(translation.toLowerCase())) {
          matchedTerms.push({
            queryTerm: cleanQueryTerm,
            documentTerm: translation,
            translationType: 'translated'
          });
        }
      });

      // Transliteration
      const transliterated = this.transliterationPatterns.get(cleanQueryTerm);
      if (transliterated && docText.includes(transliterated.toLowerCase())) {
        matchedTerms.push({
          queryTerm: cleanQueryTerm,
          documentTerm: transliterated,
          translationType: 'transliterated'
        });
      }

      // Direct match (for mixed content)
      if (docText.includes(cleanQueryTerm)) {
        matchedTerms.push({
          queryTerm: cleanQueryTerm,
          documentTerm: cleanQueryTerm,
          translationType: 'direct'
        });
      }
    });

    return matchedTerms;
  }

  /**
   * Create bilingual result set with language-aware ranking
   */
  createBilingualResultSet(
    query: string,
    allDocuments: DocumentSearchResult[],
    sameLanguageResults: DocumentSearchResult[] = [],
    maxCrossLanguageResults: number = 10
  ): BilingualResultSet {
    const queryLanguage = this.detectLanguage(query).language as 'en' | 'ar';

    // Find cross-language matches
    const crossLanguageMatches = this.findCrossLanguageMatches(
      query,
      allDocuments,
      maxCrossLanguageResults
    );

    // Separate mixed language documents
    const mixedDocuments = allDocuments.filter(doc => {
      const docLang = this.detectLanguage(doc.title + ' ' + (doc.content || '')).language;
      return docLang === 'mixed';
    });

    // Calculate language distribution
    const languageDistribution: Record<string, number> = {};
    allDocuments.forEach(doc => {
      const docLang = this.detectLanguage(doc.title + ' ' + (doc.content || '')).language;
      languageDistribution[docLang] = (languageDistribution[docLang] || 0) + 1;
    });

    return {
      originalQuery: query,
      queryLanguage: queryLanguage === 'mixed' ? 'en' : queryLanguage,
      results: {
        sameLanguage: sameLanguageResults,
        crossLanguage: crossLanguageMatches,
        mixed: mixedDocuments
      },
      totalMatches: sameLanguageResults.length + crossLanguageMatches.length + mixedDocuments.length,
      languageDistribution
    };
  }

  /**
   * Add custom translation mapping
   */
  addTranslationMapping(arabic: string, english: string[]): void {
    this.arabicToEnglish.set(arabic, english);
    english.forEach(en => {
      if (!this.englishToArabic.has(en)) {
        this.englishToArabic.set(en, []);
      }
      this.englishToArabic.get(en)!.push(arabic);
    });
  }

  /**
   * Add transliteration pattern
   */
  addTransliterationPattern(source: string, target: string): void {
    this.transliterationPatterns.set(source.toLowerCase(), target);
  }

  /**
   * Get translation statistics
   */
  getTranslationStats(): {
    arabicToEnglishMappings: number;
    englishToArabicMappings: number;
    transliterationPatterns: number;
  } {
    return {
      arabicToEnglishMappings: this.arabicToEnglish.size,
      englishToArabicMappings: this.englishToArabic.size,
      transliterationPatterns: this.transliterationPatterns.size
    };
  }

  /**
   * Check if RTL (Right-to-Left) layout should be used
   */
  shouldUseRTL(text: string): boolean {
    const detection = this.detectLanguage(text);
    return detection.language === 'ar' ||
           (detection.language === 'mixed' && detection.segments.some(s => s.language === 'ar'));
  }

  /**
   * Format text for RTL display
   */
  formatForRTL(text: string): string {
    if (!this.shouldUseRTL(text)) {
      return text;
    }

    // Add RTL markers for mixed content
    const detection = this.detectLanguage(text);
    if (detection.language === 'mixed') {
      let formatted = text;
      detection.segments.forEach(segment => {
        if (segment.language === 'ar') {
          formatted = formatted.replace(
            segment.text,
            `\u202B${segment.text}\u202C` // RTL embedding characters
          );
        }
      });
      return formatted;
    }

    return text;
  }
}

// Export singleton instance
export const multilingualProcessor = MultilingualProcessor.getInstance();