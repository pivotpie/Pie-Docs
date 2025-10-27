import type { GeneratedAnswer, Citation } from '@/types/domain/Answer';

export interface AnswerFormatOptions {
  includeCitations?: boolean;
  enableMarkdown?: boolean;
  enableTables?: boolean;
  enableLists?: boolean;
  maxLineLength?: number;
  preferBulletPoints?: boolean;
  highlightKeyTerms?: boolean;
  mobileOptimized?: boolean;
}

export interface FormattedContent {
  html: string;
  plainText: string;
  structuredData: AnswerStructure;
  readingTime: number; // in minutes
  wordCount: number;
}

export interface AnswerStructure {
  sections: AnswerSection[];
  keyPoints: string[];
  summary: string;
  relatedTopics: string[];
}

export interface AnswerSection {
  id: string;
  title?: string;
  content: string;
  type: 'paragraph' | 'list' | 'table' | 'code' | 'quote';
  citations: Citation[];
  importance: 'high' | 'medium' | 'low';
}

export class AnswerFormatter {
  private options: AnswerFormatOptions;

  constructor(options: AnswerFormatOptions = {}) {
    this.options = {
      includeCitations: true,
      enableMarkdown: true,
      enableTables: true,
      enableLists: true,
      maxLineLength: 80,
      preferBulletPoints: false,
      highlightKeyTerms: true,
      mobileOptimized: false,
      ...options,
    };
  }

  /**
   * Format a generated answer into structured content
   */
  formatAnswer(answer: GeneratedAnswer): FormattedContent {
    const structure = this.analyzeAnswerStructure(answer.content);
    const html = this.generateHTML(structure, answer.citations);
    const plainText = this.generatePlainText(structure);
    const readingTime = this.calculateReadingTime(answer.content);
    const wordCount = this.countWords(answer.content);

    return {
      html,
      plainText,
      structuredData: structure,
      readingTime,
      wordCount,
    };
  }

  /**
   * Analyze and structure the answer content
   */
  private analyzeAnswerStructure(content: string): AnswerStructure {
    const sections = this.identifySections(content);
    const keyPoints = this.extractKeyPoints(content);
    const summary = this.generateSummary(content);
    const relatedTopics = this.identifyRelatedTopics(content);

    return {
      sections,
      keyPoints,
      summary,
      relatedTopics,
    };
  }

  /**
   * Identify logical sections in the content
   */
  private identifySections(content: string): AnswerSection[] {
    const sections: AnswerSection[] = [];

    // Split by paragraphs and analyze each
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());

    paragraphs.forEach((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return;

      // Detect section type
      const type = this.detectSectionType(trimmed);
      const citations = this.extractCitationsFromText(trimmed);
      const importance = this.assessImportance(trimmed, index === 0);

      sections.push({
        id: `section-${index + 1}`,
        content: trimmed,
        type,
        citations,
        importance,
      });
    });

    return sections;
  }

  /**
   * Detect the type of content section
   */
  private detectSectionType(content: string): AnswerSection['type'] {
    // Check for code blocks first (most specific)
    if (/```[\s\S]*```/.test(content)) {
      return 'code';
    }

    // Check for tables (markdown-style)
    if (content.includes('|') && content.includes('---')) {
      return 'table';
    }

    // Check for quotes
    if (content.startsWith('>')) {
      return 'quote';
    }

    // Check for lists - look for multiple lines with list markers
    const lines = content.split('\n');
    const listLines = lines.filter(line =>
      /^[\s]*[-•*]\s+/.test(line) || /^\d+\.\s+/.test(line)
    );

    if (listLines.length >= 2 || (listLines.length >= 1 && lines.length <= 2)) {
      return 'list';
    }

    // Check if content contains list-like structure without markers
    if (content.includes('include:') && content.includes('-')) {
      const afterColon = content.split('include:')[1];
      if (afterColon && afterColon.includes('-')) {
        return 'list';
      }
    }

    return 'paragraph';
  }

  /**
   * Extract citations from text content
   */
  private extractCitationsFromText(content: string): Citation[] {
    const citations: Citation[] = [];
    const citationMatches = content.match(/\[(\d+)\]/g);

    if (citationMatches) {
      citationMatches.forEach(match => {
        const number = parseInt(match.replace(/[\[\]]/g, ''));
        // Note: In real implementation, would lookup actual citation data
        citations.push({
          id: `citation-${number}`,
          documentId: `doc-${number}`,
          documentTitle: `Source ${number}`,
          startOffset: 0,
          endOffset: 100,
          excerpt: 'Citation excerpt',
          confidence: 0.8,
          url: `/documents/doc-${number}`,
        });
      });
    }

    return citations;
  }

  /**
   * Assess the importance of a content section
   */
  private assessImportance(content: string, isFirst: boolean): 'high' | 'medium' | 'low' {
    if (isFirst) return 'high';

    const hasKeywords = /\b(important|key|main|primary|essential|crucial|significant)\b/i.test(content);
    const hasCitations = /\[\d+\]/.test(content);
    const isLong = content.length > 200;

    if (hasKeywords && hasCitations) return 'high';
    if (hasKeywords || (hasCitations && isLong)) return 'medium';
    return 'low';
  }

  /**
   * Extract key points from the answer
   */
  private extractKeyPoints(content: string): string[] {
    const keyPoints: string[] = [];

    // Look for sentences with key indicators
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());

    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (this.isKeyPoint(trimmed)) {
        keyPoints.push(trimmed + '.');
      }
    });

    return keyPoints.slice(0, 5); // Limit to top 5 key points
  }

  /**
   * Determine if a sentence is a key point
   */
  private isKeyPoint(sentence: string): boolean {
    if (sentence.length < 20 || sentence.length > 150) return false;

    const keyIndicators = [
      /\b(important|key|main|primary|essential)\b/i,
      /\b(shows?|demonstrates?|proves?|indicates?)\b/i,
      /\b(results?|findings?|conclusion)\b/i,
      /\[\d+\]/, // Has citations
    ];

    return keyIndicators.some(pattern => pattern.test(sentence));
  }

  /**
   * Generate a summary of the answer
   */
  private generateSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length <= 2) return content;

    // Take first sentence and last sentence for basic summary
    const firstSentence = sentences[0].trim() + '.';
    const lastSentence = sentences[sentences.length - 1].trim() + '.';

    if (firstSentence === lastSentence) {
      return firstSentence;
    }

    return `${firstSentence} ${lastSentence}`;
  }

  /**
   * Identify related topics from the content
   */
  private identifyRelatedTopics(content: string): string[] {
    const topics: string[] = [];

    // Extract capitalized phrases (potential topics)
    const capitalizedMatches = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];

    // Filter and deduplicate
    const uniqueTopics = [...new Set(capitalizedMatches)]
      .filter(topic =>
        topic.length > 3 &&
        topic.length < 50 &&
        !['The', 'This', 'That', 'These', 'Those'].includes(topic)
      );

    return uniqueTopics.slice(0, 8);
  }

  /**
   * Generate HTML from structured content
   */
  private generateHTML(structure: AnswerStructure, citations: Citation[]): string {
    let html = '';

    structure.sections.forEach(section => {
      switch (section.type) {
        case 'paragraph':
          html += this.formatParagraph(section, citations);
          break;
        case 'list':
          html += this.formatList(section, citations);
          break;
        case 'table':
          html += this.formatTable(section, citations);
          break;
        case 'code':
          html += this.formatCode(section);
          break;
        case 'quote':
          html += this.formatQuote(section, citations);
          break;
      }
    });

    return html;
  }

  /**
   * Format paragraph content
   */
  private formatParagraph(section: AnswerSection, citations: Citation[]): string {
    let content = section.content;

    if (this.options.highlightKeyTerms) {
      content = this.highlightKeyTerms(content);
    }

    // Always process citations based on the option
    content = this.formatInlineCitations(content, citations);

    const importanceClass = `answer-section-${section.importance}`;
    return `<p class="answer-paragraph ${importanceClass}">${content}</p>\n`;
  }

  /**
   * Format list content
   */
  private formatList(section: AnswerSection, citations: Citation[]): string {
    let content = section.content;

    // Always process citations based on the option
    content = this.formatInlineCitations(content, citations);

    // Detect if ordered or unordered list
    const isOrdered = /^\d+\./.test(content);
    const tag = isOrdered ? 'ol' : 'ul';

    // Convert to proper list items
    const items = content
      .split(/\n/)
      .filter(line => line.trim())
      .map(line => {
        const cleaned = line.replace(/^[\s]*[-•*]\s+|^\d+\.\s+/, '');
        return `  <li>${cleaned}</li>`;
      })
      .join('\n');

    return `<${tag} class="answer-list">\n${items}\n</${tag}>\n`;
  }

  /**
   * Format table content
   */
  private formatTable(section: AnswerSection, citations: Citation[]): string {
    if (!this.options.enableTables) {
      return this.formatParagraph(section, citations);
    }

    const lines = section.content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return this.formatParagraph(section, citations);

    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
    const rows = lines.slice(2).map(line =>
      line.split('|').map(cell => cell.trim()).filter(cell => cell)
    );

    let html = '<table class="answer-table">\n';

    // Headers
    html += '  <thead>\n    <tr>\n';
    headers.forEach(header => {
      html += `      <th>${header}</th>\n`;
    });
    html += '    </tr>\n  </thead>\n';

    // Body
    html += '  <tbody>\n';
    rows.forEach(row => {
      html += '    <tr>\n';
      row.forEach(cell => {
        const formattedCell = this.formatInlineCitations(cell, citations);
        html += `      <td>${formattedCell}</td>\n`;
      });
      html += '    </tr>\n';
    });
    html += '  </tbody>\n</table>\n';

    return html;
  }

  /**
   * Format code content
   */
  private formatCode(section: AnswerSection): string {
    const content = section.content
      .replace(/```[\w]*\n?/, '')
      .replace(/```$/, '');

    return `<pre class="answer-code"><code>${this.escapeHtml(content)}</code></pre>\n`;
  }

  /**
   * Format quote content
   */
  private formatQuote(section: AnswerSection, citations: Citation[]): string {
    let content = section.content.replace(/^>\s*/, '');

    // Always process citations based on the option
    content = this.formatInlineCitations(content, citations);

    return `<blockquote class="answer-quote">${content}</blockquote>\n`;
  }

  /**
   * Highlight key terms in content
   */
  private highlightKeyTerms(content: string): string {
    const keyTermPatterns = [
      /\b(important|significant|key|main|primary|essential|crucial)\b/gi,
      /\b(shows?|demonstrates?|proves?|indicates?|suggests?)\b/gi,
      /\b(however|therefore|consequently|furthermore|moreover)\b/gi,
    ];

    let highlighted = content;
    keyTermPatterns.forEach(pattern => {
      highlighted = highlighted.replace(pattern, '<strong class="key-term">$&</strong>');
    });

    return highlighted;
  }

  /**
   * Format inline citations
   */
  private formatInlineCitations(content: string, citations: Citation[]): string {
    if (!this.options.includeCitations) {
      // Remove citation markers completely
      return content.replace(/\[(\d+)\]/g, '');
    }

    return content.replace(/\[(\d+)\]/g, (match, number) => {
      const citationIndex = parseInt(number) - 1;
      const citation = citations[citationIndex];

      if (citation) {
        return `<sup class="citation-link" data-citation-id="${citation.id}" title="${citation.documentTitle}">[${number}]</sup>`;
      }

      return `<sup class="citation-missing">[${number}]</sup>`;
    });
  }

  /**
   * Generate plain text version
   */
  private generatePlainText(structure: AnswerStructure): string {
    return structure.sections
      .map(section => {
        // Remove HTML and citation markers for plain text
        return section.content
          .replace(/<[^>]*>/g, '')
          .replace(/\[\d+\]/g, '')
          .trim();
      })
      .filter(content => content)
      .join('\n\n');
  }

  /**
   * Calculate reading time in minutes
   */
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = this.countWords(content);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML
      .replace(/\[\d+\]/g, '') // Remove citations
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update formatting options
   */
  updateOptions(newOptions: Partial<AnswerFormatOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current formatting options
   */
  getOptions(): AnswerFormatOptions {
    return { ...this.options };
  }
}

// Export singleton instance
export const answerFormatter = new AnswerFormatter();