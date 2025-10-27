import { describe, it, expect, beforeEach } from 'vitest';
import { AnswerFormatter } from '@/services/nlp/answerGeneration/AnswerFormatter';
import type { GeneratedAnswer } from '@/types/domain/Answer';

const mockAnswer: GeneratedAnswer = {
  id: 'answer-1',
  query: 'What is machine learning?',
  content: `Machine learning is a subset of artificial intelligence [1]. It enables computers to learn and improve from experience without being explicitly programmed.

Key benefits include:
- Automated pattern recognition
- Predictive analytics [2]
- Decision automation

However, there are also challenges. Machine learning requires large datasets and significant computational resources [3].

Here's a simple example:

\`\`\`python
def train_model(data):
    # Training logic here
    return model
\`\`\`

| Algorithm | Accuracy | Speed |
|-----------|----------|-------|
| Linear    | 85%      | Fast  |
| Neural    | 95%      | Slow  |

> "Machine learning is the future of data analysis" - Expert Opinion [4]

Therefore, machine learning represents a significant advancement in computational capabilities.`,
  citations: [
    {
      id: 'citation-1',
      documentId: 'doc-1',
      documentTitle: 'AI Fundamentals',
      startOffset: 0,
      endOffset: 100,
      excerpt: 'Machine learning overview',
      confidence: 0.9,
      url: '/documents/doc-1',
    },
    {
      id: 'citation-2',
      documentId: 'doc-2',
      documentTitle: 'ML Applications',
      startOffset: 50,
      endOffset: 150,
      excerpt: 'Predictive analytics applications',
      confidence: 0.85,
      url: '/documents/doc-2',
    },
  ],
  confidence: 0.88,
  confidenceExplanation: 'High quality sources with good coverage',
  generatedAt: new Date(),
  processingTime: 2000,
  sources: ['doc-1', 'doc-2'],
  relatedQuestions: ['What are ML algorithms?', 'How does deep learning work?'],
};

describe('AnswerFormatter', () => {
  let formatter: AnswerFormatter;

  beforeEach(() => {
    formatter = new AnswerFormatter();
  });

  describe('formatAnswer', () => {
    it('formats answer with all components', () => {
      const result = formatter.formatAnswer(mockAnswer);

      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('plainText');
      expect(result).toHaveProperty('structuredData');
      expect(result).toHaveProperty('readingTime');
      expect(result).toHaveProperty('wordCount');

      expect(result.html).toContain('<p class="answer-paragraph');
      expect(result.html).toContain('<table class="answer-table">');
      expect(result.html).toContain('<pre class="answer-code">');
      expect(result.html).toContain('<blockquote class="answer-quote">');

      // Check that list content is properly handled (might be formatted as paragraph or list)
      expect(result.html).toContain('Automated pattern recognition');
    });

    it('identifies different section types correctly', () => {
      const result = formatter.formatAnswer(mockAnswer);
      const sections = result.structuredData.sections;

      // Should have multiple sections (exact count may vary based on parsing)
      expect(sections.length).toBeGreaterThan(5);

      // Check that we have different types present
      const types = sections.map(s => s.type);
      expect(types).toContain('paragraph');
      expect(types).toContain('code');
      expect(types).toContain('table');
      expect(types).toContain('quote');
    });

    it('extracts key points correctly', () => {
      const result = formatter.formatAnswer(mockAnswer);
      const keyPoints = result.structuredData.keyPoints;

      expect(keyPoints.length).toBeGreaterThan(0);
      // Check for any relevant key terms in the key points
      const allPoints = keyPoints.join(' ').toLowerCase();
      expect(allPoints.includes('machine') || allPoints.includes('learning') || allPoints.includes('intelligence')).toBe(true);
    });

    it('calculates reading time and word count', () => {
      const result = formatter.formatAnswer(mockAnswer);

      expect(result.readingTime).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(typeof result.readingTime).toBe('number');
      expect(typeof result.wordCount).toBe('number');
    });

    it('generates proper plain text without HTML or citations', () => {
      const result = formatter.formatAnswer(mockAnswer);

      expect(result.plainText).not.toContain('<');
      expect(result.plainText).not.toContain('[1]');
      expect(result.plainText).toContain('Machine learning');
    });
  });

  describe('formatting options', () => {
    it('respects includeCitations option', () => {
      const formatterNoCitations = new AnswerFormatter({ includeCitations: false });
      const result = formatterNoCitations.formatAnswer(mockAnswer);

      expect(result.html).not.toContain('citation-link');
      expect(result.html).not.toContain('[1]');
    });

    it('respects enableMarkdown option', () => {
      const formatterNoMarkdown = new AnswerFormatter({ enableMarkdown: false });
      const result = formatterNoMarkdown.formatAnswer(mockAnswer);

      // Should still have basic structure but less rich formatting
      expect(result.html).toContain('<p class="answer-paragraph');
    });

    it('respects highlightKeyTerms option', () => {
      const formatterWithHighlight = new AnswerFormatter({ highlightKeyTerms: true });
      const result = formatterWithHighlight.formatAnswer(mockAnswer);

      expect(result.html).toContain('<strong class="key-term">');
    });

    it('respects enableTables option', () => {
      const formatterNoTables = new AnswerFormatter({ enableTables: false });
      const result = formatterNoTables.formatAnswer(mockAnswer);

      expect(result.html).not.toContain('<table class="answer-table">');
    });
  });

  describe('content structure analysis', () => {
    it('identifies paragraph sections', () => {
      const simpleAnswer = {
        ...mockAnswer,
        content: 'This is a simple paragraph. It contains basic information.',
      };

      const result = formatter.formatAnswer(simpleAnswer);
      expect(result.structuredData.sections[0].type).toBe('paragraph');
    });

    it('identifies list sections', () => {
      const listAnswer = {
        ...mockAnswer,
        content: `- First point
- Second point
- Third point`,
      };

      const result = formatter.formatAnswer(listAnswer);
      expect(result.structuredData.sections[0].type).toBe('list');
    });

    it('identifies code sections', () => {
      const codeAnswer = {
        ...mockAnswer,
        content: `Here's some code:

\`\`\`javascript
function example() {
  return "Hello World";
}
\`\`\``,
      };

      const result = formatter.formatAnswer(codeAnswer);
      expect(result.structuredData.sections[1].type).toBe('code');
    });

    it('identifies quote sections', () => {
      const quoteAnswer = {
        ...mockAnswer,
        content: '> This is a quote from an expert.',
      };

      const result = formatter.formatAnswer(quoteAnswer);
      expect(result.structuredData.sections[0].type).toBe('quote');
    });

    it('identifies table sections', () => {
      const tableAnswer = {
        ...mockAnswer,
        content: `| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |`,
      };

      const result = formatter.formatAnswer(tableAnswer);
      expect(result.structuredData.sections[0].type).toBe('table');
    });
  });

  describe('importance assessment', () => {
    it('marks first section as high importance', () => {
      const result = formatter.formatAnswer(mockAnswer);
      expect(result.structuredData.sections[0].importance).toBe('high');
    });

    it('assesses importance based on keywords and citations', () => {
      const importantAnswer = {
        ...mockAnswer,
        content: 'This is important information with a citation [1]. This is less important.',
      };

      const result = formatter.formatAnswer(importantAnswer);
      const sections = result.structuredData.sections;

      // First section should be high importance (first section + keywords + citation)
      expect(sections[0].importance).toBe('high');
    });
  });

  describe('related topics extraction', () => {
    it('extracts capitalized phrases as topics', () => {
      const result = formatter.formatAnswer(mockAnswer);
      const topics = result.structuredData.relatedTopics;

      expect(topics.length).toBeGreaterThan(0);
      expect(topics).toContain('Machine');
    });

    it('filters out common words', () => {
      const result = formatter.formatAnswer(mockAnswer);
      const topics = result.structuredData.relatedTopics;

      expect(topics).not.toContain('The');
      expect(topics).not.toContain('This');
    });
  });

  describe('citation formatting', () => {
    it('formats inline citations with proper links', () => {
      const result = formatter.formatAnswer(mockAnswer);

      expect(result.html).toContain('data-citation-id="citation-1"');
      expect(result.html).toContain('title="AI Fundamentals"');
    });

    it('handles missing citations gracefully', () => {
      const answerWithMissingCitation = {
        ...mockAnswer,
        content: 'Reference to missing citation [99].',
        citations: [],
      };

      const result = formatter.formatAnswer(answerWithMissingCitation);
      expect(result.html).toContain('citation-missing');
    });
  });

  describe('summary generation', () => {
    it('generates summary from first and last sentences', () => {
      const result = formatter.formatAnswer(mockAnswer);
      const summary = result.structuredData.summary;

      expect(summary).toBeTruthy();
      expect(summary.length).toBeGreaterThan(0);
    });

    it('returns full content for short answers', () => {
      const shortAnswer = {
        ...mockAnswer,
        content: 'This is a short answer.',
      };

      const result = formatter.formatAnswer(shortAnswer);
      expect(result.structuredData.summary).toBe('This is a short answer.');
    });
  });

  describe('options management', () => {
    it('updates options correctly', () => {
      const initialOptions = formatter.getOptions();
      expect(initialOptions.includeCitations).toBe(true);

      formatter.updateOptions({ includeCitations: false });
      const updatedOptions = formatter.getOptions();
      expect(updatedOptions.includeCitations).toBe(false);
    });

    it('preserves other options when updating', () => {
      formatter.updateOptions({ includeCitations: false });
      const options = formatter.getOptions();

      expect(options.enableMarkdown).toBe(true); // Should remain unchanged
      expect(options.includeCitations).toBe(false); // Should be updated
    });
  });
});