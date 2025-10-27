/**
 * Concept extraction and analysis utilities for semantic search
 */

export interface ConceptExtractionResult {
  concepts: string[];
  namedEntities: NamedEntity[];
  keywords: string[];
  topics: string[];
  confidence: number;
}

export interface NamedEntity {
  text: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'DATE' | 'MONEY' | 'MISC';
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface TopicModel {
  name: string;
  keywords: string[];
  weight: number;
  coherenceScore: number;
}

/**
 * Extract concepts from text using various NLP techniques
 */
export class ConceptExtractor {
  private stopWords: Set<string>;
  private arabicStopWords: Set<string>;

  constructor() {
    // English stop words
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'among', 'throughout', 'despite', 'towards', 'upon',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
      'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
      'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our',
      'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how'
    ]);

    // Arabic stop words (basic set)
    this.arabicStopWords = new Set([
      'في', 'من', 'إلى', 'على', 'عن', 'مع', 'أن', 'أو', 'لا', 'ما', 'هذا', 'هذه',
      'ذلك', 'تلك', 'التي', 'الذي', 'التي', 'اللذان', 'اللتان', 'اللذين', 'اللواتي',
      'هو', 'هي', 'أنت', 'أنتم', 'أنتن', 'نحن', 'هم', 'هن', 'كان', 'كانت', 'يكون',
      'تكون', 'أكون', 'نكون', 'يكونوا', 'تكن', 'قد', 'لقد', 'أم', 'أما', 'إما',
      'كل', 'جميع', 'بعض', 'غير', 'سوى', 'إلا', 'فقط', 'أيضا', 'كذلك', 'أيضاً'
    ]);
  }

  /**
   * Extract concepts from text content
   */
  async extractConcepts(
    text: string,
    language: 'en' | 'ar' | 'auto' = 'auto'
  ): Promise<ConceptExtractionResult> {
    const detectedLanguage = language === 'auto' ? this.detectLanguage(text) : language;

    // Clean and preprocess text
    const cleanedText = this.preprocessText(text, detectedLanguage);

    // Extract different types of concepts
    const keywords = this.extractKeywords(cleanedText, detectedLanguage);
    const namedEntities = this.extractNamedEntities(cleanedText, detectedLanguage);
    const topics = this.extractTopics(cleanedText, detectedLanguage);

    // Combine all concepts
    const concepts = this.combineConcepts(keywords, namedEntities, topics);

    return {
      concepts,
      namedEntities,
      keywords,
      topics,
      confidence: this.calculateConfidence(concepts, text.length)
    };
  }

  /**
   * Detect language of text
   */
  private detectLanguage(text: string): 'en' | 'ar' {
    // Simple Arabic detection based on Arabic Unicode ranges
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const arabicMatches = text.match(arabicPattern);
    const arabicRatio = arabicMatches ? arabicMatches.length / text.length : 0;

    return arabicRatio > 0.1 ? 'ar' : 'en';
  }

  /**
   * Preprocess text for concept extraction
   */
  private preprocessText(text: string, language: 'en' | 'ar'): string {
    // Remove HTML tags
    let cleaned = text.replace(/<[^>]*>/g, ' ');

    // Remove special characters but keep Arabic diacritics
    if (language === 'ar') {
      cleaned = cleaned.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\w]/g, ' ');
    } else {
      cleaned = cleaned.replace(/[^\w\s]/g, ' ');
    }

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Extract keywords using TF-IDF-like scoring
   */
  private extractKeywords(text: string, language: 'en' | 'ar'): string[] {
    const words = this.tokenize(text, language);
    const stopWords = language === 'ar' ? this.arabicStopWords : this.stopWords;

    // Filter stop words and short words
    const filteredWords = words.filter(word =>
      !stopWords.has(word.toLowerCase()) &&
      word.length > 2
    );

    // Count word frequencies
    const wordFreq = new Map<string, number>();
    filteredWords.forEach(word => {
      const normalized = word.toLowerCase();
      wordFreq.set(normalized, (wordFreq.get(normalized) || 0) + 1);
    });

    // Calculate simple TF scores and sort
    const totalWords = filteredWords.length;
    const scoredWords = Array.from(wordFreq.entries())
      .map(([word, freq]) => ({
        word,
        score: freq / totalWords
      }))
      .sort((a, b) => b.score - a.score);

    // Return top keywords
    return scoredWords
      .slice(0, 15)
      .map(item => item.word);
  }

  /**
   * Extract named entities using pattern matching
   */
  private extractNamedEntities(text: string, language: 'en' | 'ar'): NamedEntity[] {
    const entities: NamedEntity[] = [];

    // Date patterns
    const datePatterns = language === 'ar'
      ? [/\d{1,2}\/\d{1,2}\/\d{4}/g, /\d{4}-\d{1,2}-\d{1,2}/g]
      : [/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, /\b\d{4}-\d{1,2}-\d{1,2}\b/g, /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi];

    datePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'DATE',
          confidence: 0.9,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    });

    // Money patterns
    const moneyPatterns = language === 'ar'
      ? [/\d+\s*(دولار|ريال|دينار|درهم)/g]
      : [/\$\d+(?:\.\d{2})?/g, /\d+(?:\.\d{2})?\s*(?:USD|EUR|GBP|dollars?|euros?|pounds?)/gi];

    moneyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'MONEY',
          confidence: 0.8,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    });

    // Organization patterns (simplified)
    const orgPatterns = language === 'ar'
      ? [/\b[\u0600-\u06FF]+\s+(شركة|مؤسسة|منظمة|جامعة|وزارة)\b/g]
      : [/\b[A-Z][a-z]+\s+(Corp|Corporation|Inc|Company|Ltd|Limited|University|College|Ministry|Department)\b/g];

    orgPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'ORGANIZATION',
          confidence: 0.7,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    });

    // Person names (very basic pattern)
    const personPatterns = language === 'ar'
      ? [/\b[A-Z][\u0600-\u06FF\s]{2,30}(?=\s|$)/g]
      : [/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g];

    personPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Filter out common false positives
        if (!this.isCommonWord(match[0], language)) {
          entities.push({
            text: match[0],
            type: 'PERSON',
            confidence: 0.6,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      }
    });

    return entities;
  }

  /**
   * Extract topics using co-occurrence and clustering
   */
  private extractTopics(text: string, language: 'en' | 'ar'): string[] {
    const keywords = this.extractKeywords(text, language);

    // Group related keywords into topics
    const topics: string[] = [];
    const used = new Set<string>();

    keywords.forEach(keyword => {
      if (!used.has(keyword)) {
        const relatedWords = this.findRelatedWords(keyword, keywords, text);
        if (relatedWords.length >= 2) {
          const topic = this.generateTopicName(relatedWords);
          topics.push(topic);
          relatedWords.forEach(word => used.add(word));
        }
      }
    });

    return topics.slice(0, 8); // Return top 8 topics
  }

  /**
   * Find words related to a keyword based on co-occurrence
   */
  private findRelatedWords(keyword: string, allKeywords: string[], text: string): string[] {
    const related = [keyword];
    const sentences = text.split(/[.!?]+/);

    allKeywords.forEach(other => {
      if (other !== keyword) {
        const cooccurrence = sentences.filter(sentence =>
          sentence.toLowerCase().includes(keyword.toLowerCase()) &&
          sentence.toLowerCase().includes(other.toLowerCase())
        ).length;

        if (cooccurrence > 0) {
          related.push(other);
        }
      }
    });

    return related.slice(0, 5); // Max 5 related words per topic
  }

  /**
   * Generate a topic name from related words
   */
  private generateTopicName(words: string[]): string {
    // Use the most frequent or longest word as topic name
    return words.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    );
  }

  /**
   * Tokenize text based on language
   */
  private tokenize(text: string, language: 'en' | 'ar'): string[] {
    if (language === 'ar') {
      // Arabic tokenization
      return text.split(/\s+/).filter(word => word.length > 0);
    } else {
      // English tokenization
      return text.toLowerCase().split(/\W+/).filter(word => word.length > 0);
    }
  }

  /**
   * Check if a word is a common word that shouldn't be considered a person name
   */
  private isCommonWord(word: string, language: 'en' | 'ar'): boolean {
    const commonWords = language === 'ar'
      ? ['هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي']
      : ['This', 'That', 'The', 'A', 'An', 'For', 'To', 'From', 'With'];

    return commonWords.some(common =>
      word.toLowerCase().includes(common.toLowerCase())
    );
  }

  /**
   * Combine different types of concepts and remove duplicates
   */
  private combineConcepts(
    keywords: string[],
    entities: NamedEntity[],
    topics: string[]
  ): string[] {
    const allConcepts = new Set<string>();

    // Add keywords
    keywords.forEach(keyword => allConcepts.add(keyword));

    // Add entity texts
    entities.forEach(entity => allConcepts.add(entity.text));

    // Add topics
    topics.forEach(topic => allConcepts.add(topic));

    return Array.from(allConcepts);
  }

  /**
   * Calculate confidence score based on concept quality and text length
   */
  private calculateConfidence(concepts: string[], textLength: number): number {
    if (concepts.length === 0 || textLength === 0) {
      return 0;
    }

    // Base confidence on concept density and text length
    const conceptDensity = concepts.length / Math.max(textLength / 100, 1);
    const lengthFactor = Math.min(textLength / 1000, 1); // Favor longer texts

    return Math.min(conceptDensity * lengthFactor, 1);
  }
}