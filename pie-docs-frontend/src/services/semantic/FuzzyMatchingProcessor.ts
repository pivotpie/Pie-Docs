import type { FuzzyMatchResult } from '@/types/domain/SemanticSearch';

export interface FuzzyMatchOptions {
  algorithm: 'levenshtein' | 'jaro' | 'soundex' | 'metaphone' | 'auto';
  threshold: number;
  maxSuggestions: number;
  includePhonetic: boolean;
  includeOCRCorrection: boolean;
  language: 'en' | 'ar' | 'auto';
}

export class FuzzyMatchingProcessor {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/semantic-search') {
    this.baseUrl = baseUrl;
  }

  async fuzzyMatch(
    term: string,
    options: Partial<FuzzyMatchOptions> = {}
  ): Promise<FuzzyMatchResult[]> {
    const defaultOptions: FuzzyMatchOptions = {
      algorithm: 'auto',
      threshold: 0.8,
      maxSuggestions: 5,
      includePhonetic: true,
      includeOCRCorrection: true,
      language: 'auto'
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(`${this.baseUrl}/fuzzy-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, ...finalOptions })
      });

      if (!response.ok) {
        throw new Error(`Fuzzy matching failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to perform fuzzy matching:', error);
      throw error;
    }
  }
}