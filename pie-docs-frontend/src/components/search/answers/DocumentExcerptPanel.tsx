import React, { useState, useEffect, useMemo } from 'react';
import type { Citation, GeneratedAnswer, DocumentExcerpt } from '@/types/domain/Answer';
import type { SearchResult } from '@/types/domain/Search';

interface DocumentExcerptPanelProps {
  answer: GeneratedAnswer;
  searchResults: SearchResult[];
  className?: string;
  onExcerptClick?: (excerpt: DocumentExcerpt) => void;
}

interface ExcerptWithRelevance extends DocumentExcerpt {
  relevanceReason: string;
  contextMatch: number;
}

export const DocumentExcerptPanel: React.FC<DocumentExcerptPanelProps> = ({
  answer,
  searchResults,
  className = '',
  onExcerptClick,
}) => {
  const [selectedExcerptId, setSelectedExcerptId] = useState<string | null>(null);
  const [showAllExcerpts, setShowAllExcerpts] = useState(false);

  /**
   * Extract and score relevant passages from search results
   */
  const relevantExcerpts = useMemo((): ExcerptWithRelevance[] => {
    const excerpts: ExcerptWithRelevance[] = [];
    const answerWords = answer.content.toLowerCase().split(/\s+/);
    const answerKeyTerms = new Set(answerWords.filter(word => word.length > 3));

    searchResults.forEach(result => {
      // Extract multiple excerpts from each document
      const content = result.content.toLowerCase();
      const sentences = result.content.split(/[.!?]+/).filter(s => s.trim().length > 20);

      sentences.forEach((sentence, index) => {
        const sentenceLower = sentence.toLowerCase();
        const sentenceWords = sentenceLower.split(/\s+/);

        // Calculate relevance score based on term overlap
        const matchingTerms = sentenceWords.filter(word =>
          answerKeyTerms.has(word) && word.length > 3
        );
        const contextMatch = matchingTerms.length / Math.max(sentenceWords.length, 1);

        // Only include excerpts with reasonable relevance
        if (contextMatch > 0.1 && matchingTerms.length >= 2) {
          excerpts.push({
            documentId: result.id,
            documentTitle: result.title,
            excerpt: sentence.trim(),
            relevanceScore: contextMatch,
            pageNumber: result.metadata?.pageNumber,
            sectionTitle: result.metadata?.sectionTitle,
            highlightedTerms: matchingTerms,
            relevanceReason: `${matchingTerms.length} key terms match`,
            contextMatch: Math.round(contextMatch * 100),
          });
        }
      });
    });

    // Sort by relevance score and limit results
    return excerpts
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, showAllExcerpts ? 20 : 8);
  }, [answer.content, searchResults, showAllExcerpts]);

  /**
   * Highlight matching terms in excerpt text
   */
  const highlightTerms = (text: string, terms: string[]): React.ReactElement => {
    if (!terms.length) return <span>{text}</span>;

    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, index) => {
          const isMatch = terms.some(term =>
            part.toLowerCase() === term.toLowerCase()
          );
          return isMatch ? (
            <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </span>
    );
  };

  /**
   * Handle excerpt selection
   */
  const handleExcerptClick = (excerpt: ExcerptWithRelevance) => {
    setSelectedExcerptId(excerpt.documentId + excerpt.excerpt.substring(0, 20));
    onExcerptClick?.(excerpt);
  };

  /**
   * Render relevance indicator
   */
  const renderRelevanceIndicator = (score: number) => {
    const percentage = Math.round(score * 100);
    const color = percentage >= 80 ? 'bg-green-500' :
                  percentage >= 60 ? 'bg-yellow-500' : 'bg-gray-400';

    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs text-gray-500">{percentage}% relevant</span>
      </div>
    );
  };

  if (!relevantExcerpts.length) {
    return (
      <div className={`document-excerpt-panel ${className}`}>
        <div className="text-center text-gray-500 py-8">
          <div className="text-lg mb-2">📄</div>
          <p>No relevant source excerpts found for verification</p>
          <p className="text-sm mt-1">The answer may be based on synthesized information</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`document-excerpt-panel ${className}`}>
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Source Verification
            </h3>
            <span className="text-xs text-gray-500">
              {relevantExcerpts.length} relevant excerpts
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Compare the answer with these source passages for accuracy
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {relevantExcerpts.map((excerpt, index) => {
            const excerptId = excerpt.documentId + excerpt.excerpt.substring(0, 20);
            const isSelected = selectedExcerptId === excerptId;

            return (
              <div
                key={excerptId}
                className={`border-b border-gray-100 p-4 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleExcerptClick(excerpt)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {excerpt.documentTitle}
                    </h4>
                    {excerpt.sectionTitle && (
                      <p className="text-xs text-blue-600 mt-1">
                        {excerpt.sectionTitle}
                        {excerpt.pageNumber && ` • Page ${excerpt.pageNumber}`}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    {renderRelevanceIndicator(excerpt.relevanceScore)}
                  </div>
                </div>

                <div className="text-sm text-gray-700 leading-relaxed mb-3">
                  {highlightTerms(excerpt.excerpt, excerpt.highlightedTerms)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {excerpt.relevanceReason} • {excerpt.contextMatch}% context match
                  </div>
                  <div className="text-xs text-blue-600 hover:text-blue-800">
                    View in document →
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {searchResults.length > 8 && !showAllExcerpts && (
          <div className="border-t border-gray-200 px-4 py-3">
            <button
              onClick={() => setShowAllExcerpts(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Show more excerpts ({Math.min(relevantExcerpts.length + 12, 20 - relevantExcerpts.length)} more)
            </button>
          </div>
        )}
      </div>

      {/* Side-by-side comparison view when excerpt is selected */}
      {selectedExcerptId && (
        <div className="mt-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                Side-by-Side Comparison
              </h4>
              <button
                onClick={() => setSelectedExcerptId(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close comparison"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Generated Answer
              </h5>
              <div className="text-sm text-gray-800 leading-relaxed bg-white p-3 rounded border">
                {answer.content.substring(0, 300)}
                {answer.content.length > 300 && '...'}
              </div>
            </div>

            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Source Excerpt
              </h5>
              <div className="text-sm text-gray-800 leading-relaxed bg-white p-3 rounded border">
                {relevantExcerpts.find(e =>
                  (e.documentId + e.excerpt.substring(0, 20)) === selectedExcerptId
                )?.excerpt || ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentExcerptPanel;