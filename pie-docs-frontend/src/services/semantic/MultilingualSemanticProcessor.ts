export interface CrossLanguageResult {
  documentId: string;
  similarity: number;
  language: 'en' | 'ar';
  translatedSnippet?: string;
  crossLanguageMatch: boolean;
}

export class MultilingualSemanticProcessor {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/semantic-search') {
    this.baseUrl = baseUrl;
  }

  async searchCrossLanguage(
    query: string,
    sourceLanguage: 'en' | 'ar' | 'auto',
    targetLanguages: ('en' | 'ar')[] = ['en', 'ar']
  ): Promise<CrossLanguageResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/cross-language/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          sourceLanguage,
          targetLanguages
        })
      });

      if (!response.ok) {
        throw new Error(`Cross-language search failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to perform cross-language search:', error);
      throw error;
    }
  }
}