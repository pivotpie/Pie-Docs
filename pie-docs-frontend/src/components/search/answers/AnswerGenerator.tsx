import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store';
import type {
  GeneratedAnswer,
  AnswerGenerationRequest,
  ConfidenceScore,
  Citation
} from '@/types/domain/Answer';
import { answerGenerator } from '@/services/nlp/answerGeneration/AnswerGenerator';
import { generateAnswer, selectSearchResults, selectCurrentQuery } from '@/store/slices/searchSlice';
import { CitationManager, enhanceContentWithCitations } from './CitationManager';
import ConfidenceIndicator from './ConfidenceIndicator';
import AnswerFormatter from './AnswerFormatter';

interface AnswerGeneratorProps {
  query: string;
  conversationId?: string;
  onAnswerGenerated?: (answer: GeneratedAnswer) => void;
  onCitationClick?: (citation: Citation) => void;
  className?: string;
}

export const AnswerGenerator: React.FC<AnswerGeneratorProps> = ({
  query,
  conversationId,
  onAnswerGenerated,
  onCitationClick,
  className = '',
}) => {
  const dispatch = useDispatch();
  const searchResults = useSelector(selectSearchResults);
  const currentQuery = useSelector(selectCurrentQuery);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<GeneratedAnswer | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<ConfidenceScore | null>(null);

  /**
   * Generate answer using search results
   */
  const handleGenerateAnswer = useCallback(async () => {
    if (!query || searchResults.length === 0) {
      setError('No search results available for answer generation');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStreamingContent('');
    setCurrentAnswer(null);

    try {
      const request: AnswerGenerationRequest = {
        query,
        conversationId,
        searchResults,
        maxSources: 10,
        includeCitations: true,
        confidenceThreshold: 0.6,
      };

      // Use streaming for real-time answer generation
      const generator = answerGenerator.streamAnswer(request);
      let accumulatedContent = '';

      for await (const chunk of generator) {
        if (chunk.content) {
          accumulatedContent += chunk.content;
          setStreamingContent(accumulatedContent);
        }
      }

      // Get final answer
      const response = await answerGenerator.generateAnswer(request);
      const finalAnswer = response.answer;

      // Calculate confidence score
      const sourceReliability = searchResults.map(result => result.score || 0.5);
      const citationQuality = finalAnswer.citations.length > 0 ? 0.8 : 0.3;
      const confidence = answerGenerator.calculateConfidenceScore(
        finalAnswer,
        sourceReliability,
        citationQuality
      );

      setCurrentAnswer(finalAnswer);
      setConfidenceScore(confidence);
      onAnswerGenerated?.(finalAnswer);

      // Dispatch to Redux store
      dispatch(generateAnswer.fulfilled(response, '', request));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate answer';
      setError(errorMessage);
      dispatch(generateAnswer.rejected(
        new Error(errorMessage),
        '',
        {} as AnswerGenerationRequest
      ));
    } finally {
      setIsGenerating(false);
    }
  }, [query, conversationId, searchResults, dispatch, onAnswerGenerated]);

  /**
   * Auto-generate answer when search results change
   */
  useEffect(() => {
    if (query && searchResults.length > 0 && query === currentQuery) {
      handleGenerateAnswer();
    }
  }, [query, searchResults, currentQuery, handleGenerateAnswer]);

  /**
   * Cancel answer generation
   */
  const handleCancel = useCallback(() => {
    answerGenerator.cancelGeneration();
    setIsGenerating(false);
    setStreamingContent('');
  }, []);

  /**
   * Render confidence indicator
   */
  const renderConfidenceIndicator = () => {
    if (!confidenceScore) return null;

    return (
      <div className="mb-4">
        <ConfidenceIndicator
          confidence={confidenceScore}
          showDetails={true}
          size="medium"
        />
      </div>
    );
  };

  /**
   * Handle citation click navigation
   */
  const handleCitationClick = useCallback((citation: Citation) => {
    if (onCitationClick) {
      onCitationClick(citation);
    } else {
      // Default behavior: navigate to document with citation context
      const url = `/documents/${citation.documentId}`;
      const params = new URLSearchParams();

      if (citation.sectionId) {
        params.set('section', citation.sectionId);
      }
      if (citation.pageNumber) {
        params.set('page', citation.pageNumber.toString());
      }
      if (citation.startOffset && citation.endOffset) {
        params.set('highlight', `${citation.startOffset}-${citation.endOffset}`);
      }

      const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;
      window.open(finalUrl, '_blank');
    }
  }, [onCitationClick]);

  /**
   * Handle citation click from formatted content
   */
  const handleFormatterCitationClick = useCallback((citationId: string) => {
    const citation = currentAnswer?.citations.find(c => c.id === citationId);
    if (citation) {
      handleCitationClick(citation);
    }
  }, [currentAnswer?.citations, handleCitationClick]);

  /**
   * Render answer content with enhanced formatting
   */
  const renderAnswerContent = () => {
    if (currentAnswer) {
      // Use AnswerFormatter for complete answers
      return (
        <AnswerFormatter
          answer={currentAnswer}
          onCitationClick={handleFormatterCitationClick}
          options={{
            includeCitations: true,
            enableMarkdown: true,
            highlightKeyTerms: true,
            mobileOptimized: false,
          }}
        />
      );
    }

    // For streaming content, use simple formatting
    if (streamingContent) {
      const citations = currentAnswer?.citations || [];
      return (
        <div className="prose max-w-none text-gray-800 leading-relaxed">
          {enhanceContentWithCitations(streamingContent, citations, handleCitationClick)}
        </div>
      );
    }

    return null;
  };

  /**
   * Render generation status
   */
  const renderStatus = () => {
    if (isGenerating) {
      return (
        <div className="flex items-center gap-2 text-blue-600 mb-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Generating comprehensive answer...</span>
          <button
            onClick={handleCancel}
            className="text-xs text-gray-500 hover:text-gray-700 underline ml-2"
          >
            Cancel
          </button>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-sm">⚠️ {error}</span>
            <button
              onClick={handleGenerateAnswer}
              className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!query) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        <div className="text-lg mb-2">🤖</div>
        <p>Enter a question to generate a comprehensive answer</p>
      </div>
    );
  }

  return (
    <div className={`answer-generator ${className}`}>
      {renderStatus()}

      {(currentAnswer || streamingContent) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          {renderConfidenceIndicator()}

          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Answer to: "{query}"
            </h3>
            {renderAnswerContent()}
          </div>

          {currentAnswer && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  Generated from {currentAnswer.sources.length} sources
                </span>
                <span>
                  {currentAnswer.processingTime > 0 &&
                    `${(currentAnswer.processingTime / 1000).toFixed(1)}s`
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {!isGenerating && !currentAnswer && !error && searchResults.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <div className="text-lg mb-2">🔍</div>
          <p>Run a search first to generate answers</p>
        </div>
      )}
    </div>
  );
};

export default AnswerGenerator;