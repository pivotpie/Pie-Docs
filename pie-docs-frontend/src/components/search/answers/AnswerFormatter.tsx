import React, { useMemo, useState } from 'react';
import type { GeneratedAnswer } from '@/types/domain/Answer';
import { AnswerFormatter as FormatterService, type AnswerFormatOptions, type FormattedContent } from '@/services/nlp/answerGeneration/AnswerFormatter';

interface AnswerFormatterProps {
  answer: GeneratedAnswer;
  options?: Partial<AnswerFormatOptions>;
  onCitationClick?: (citationId: string) => void;
  className?: string;
}

interface FormattingControlsProps {
  options: AnswerFormatOptions;
  onOptionsChange: (newOptions: Partial<AnswerFormatOptions>) => void;
  className?: string;
}

const FormattingControls: React.FC<FormattingControlsProps> = ({
  options,
  onOptionsChange,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enable-markdown"
          checked={options.enableMarkdown}
          onChange={(e) => onOptionsChange({ enableMarkdown: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label htmlFor="enable-markdown" className="text-sm text-gray-700">
          Rich formatting
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="highlight-terms"
          checked={options.highlightKeyTerms}
          onChange={(e) => onOptionsChange({ highlightKeyTerms: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label htmlFor="highlight-terms" className="text-sm text-gray-700">
          Highlight key terms
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="include-citations"
          checked={options.includeCitations}
          onChange={(e) => onOptionsChange({ includeCitations: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label htmlFor="include-citations" className="text-sm text-gray-700">
          Show citations
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="mobile-optimized"
          checked={options.mobileOptimized}
          onChange={(e) => onOptionsChange({ mobileOptimized: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label htmlFor="mobile-optimized" className="text-sm text-gray-700">
          Mobile view
        </label>
      </div>
    </div>
  );
};

interface AnswerMetricsProps {
  formattedContent: FormattedContent;
  className?: string;
}

const AnswerMetrics: React.FC<AnswerMetricsProps> = ({
  formattedContent,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-4 text-sm text-gray-500 ${className}`}>
      <span>📖 {formattedContent.readingTime} min read</span>
      <span>📝 {formattedContent.wordCount} words</span>
      <span>📑 {formattedContent.structuredData.sections.length} sections</span>
      {formattedContent.structuredData.keyPoints.length > 0 && (
        <span>💡 {formattedContent.structuredData.keyPoints.length} key points</span>
      )}
    </div>
  );
};

interface KeyPointsDisplayProps {
  keyPoints: string[];
  className?: string;
}

const KeyPointsDisplay: React.FC<KeyPointsDisplayProps> = ({
  keyPoints,
  className = '',
}) => {
  if (keyPoints.length === 0) return null;

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
        💡 Key Points
      </h4>
      <ul className="space-y-1">
        {keyPoints.map((point, index) => (
          <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface RelatedTopicsProps {
  topics: string[];
  onTopicClick?: (topic: string) => void;
  className?: string;
}

const RelatedTopics: React.FC<RelatedTopicsProps> = ({
  topics,
  onTopicClick,
  className = '',
}) => {
  if (topics.length === 0) return null;

  return (
    <div className={`${className}`}>
      <h4 className="font-semibold text-gray-900 mb-2">Related Topics</h4>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic, index) => (
          <button
            key={index}
            onClick={() => onTopicClick?.(topic)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
};

export const AnswerFormatter: React.FC<AnswerFormatterProps> = ({
  answer,
  options = {},
  onCitationClick,
  className = '',
}) => {
  const [showControls, setShowControls] = useState(false);
  const [formatOptions, setFormatOptions] = useState<AnswerFormatOptions>({
    includeCitations: true,
    enableMarkdown: true,
    enableTables: true,
    enableLists: true,
    maxLineLength: 80,
    preferBulletPoints: false,
    highlightKeyTerms: true,
    mobileOptimized: false,
    ...options,
  });

  // Memoized formatter instance and formatted content
  const { formatter, formattedContent } = useMemo(() => {
    const formatter = new FormatterService(formatOptions);
    const content = formatter.formatAnswer(answer);
    return { formatter, formattedContent: content };
  }, [answer, formatOptions]);

  const handleOptionsChange = (newOptions: Partial<AnswerFormatOptions>) => {
    setFormatOptions(prev => ({ ...prev, ...newOptions }));
  };

  const handleCitationClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const citationId = target.getAttribute('data-citation-id');
    if (citationId && onCitationClick) {
      onCitationClick(citationId);
    }
  };

  return (
    <div className={`answer-formatter ${className}`}>
      {/* Formatting Controls */}
      <div className="mb-4">
        <button
          onClick={() => setShowControls(!showControls)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showControls ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Format Options
        </button>

        {showControls && (
          <FormattingControls
            options={formatOptions}
            onOptionsChange={handleOptionsChange}
            className="mt-2"
          />
        )}
      </div>

      {/* Answer Metrics */}
      <AnswerMetrics formattedContent={formattedContent} className="mb-4" />

      {/* Key Points */}
      <KeyPointsDisplay
        keyPoints={formattedContent.structuredData.keyPoints}
        className="mb-4"
      />

      {/* Formatted Answer Content */}
      <div
        className={`
          formatted-answer prose max-w-none
          ${formatOptions.mobileOptimized ? 'prose-sm' : 'prose-base'}
          ${formatOptions.highlightKeyTerms ? 'highlight-enabled' : ''}
        `}
        dangerouslySetInnerHTML={{ __html: formattedContent.html }}
        onClick={handleCitationClick}
      />

      {/* Related Topics */}
      <RelatedTopics
        topics={formattedContent.structuredData.relatedTopics}
        onTopicClick={(topic) => {
          // Emit search event for related topic
          window.dispatchEvent(new CustomEvent('search-related-topic', {
            detail: { topic }
          }));
        }}
        className="mt-6"
      />

      {/* Summary (collapsible) */}
      {formattedContent.structuredData.summary !== formattedContent.plainText && (
        <details className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <summary className="font-semibold text-gray-900 cursor-pointer hover:text-gray-700">
            📄 Summary
          </summary>
          <p className="mt-2 text-gray-700 text-sm leading-relaxed">
            {formattedContent.structuredData.summary}
          </p>
        </details>
      )}

      {/* Plain Text Toggle */}
      <details className="mt-4">
        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
          📋 View as plain text
        </summary>
        <pre className="mt-2 p-3 bg-gray-100 rounded text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
          {formattedContent.plainText}
        </pre>
      </details>
    </div>
  );
};

export default AnswerFormatter;

// CSS styles to be added to global styles
export const answerFormatterStyles = `
.formatted-answer {
  line-height: 1.7;
}

.formatted-answer .answer-paragraph {
  margin-bottom: 1rem;
}

.formatted-answer .answer-section-high {
  font-weight: 500;
}

.formatted-answer .answer-section-medium {
  opacity: 0.95;
}

.formatted-answer .answer-section-low {
  opacity: 0.85;
}

.formatted-answer .answer-list {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.formatted-answer .answer-list li {
  margin-bottom: 0.5rem;
}

.formatted-answer .answer-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
}

.formatted-answer .answer-table th,
.formatted-answer .answer-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.formatted-answer .answer-table th {
  background-color: #f9fafb;
  font-weight: 600;
}

.formatted-answer .answer-table tr:hover {
  background-color: #f9fafb;
}

.formatted-answer .answer-code {
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
  overflow-x: auto;
}

.formatted-answer .answer-quote {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  color: #6b7280;
}

.formatted-answer .key-term {
  background-color: #fef3c7;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-weight: 600;
  color: #92400e;
}

.formatted-answer .citation-link {
  color: #3b82f6;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
}

.formatted-answer .citation-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.formatted-answer .citation-missing {
  color: #9ca3af;
}

@media (max-width: 768px) {
  .formatted-answer.prose-sm {
    font-size: 0.875rem;
  }

  .formatted-answer .answer-table {
    font-size: 0.875rem;
  }

  .formatted-answer .answer-table th,
  .formatted-answer .answer-table td {
    padding: 0.5rem;
  }
}
`;