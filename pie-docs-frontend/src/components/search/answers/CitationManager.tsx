import React, { useState, useCallback } from 'react';
import type { Citation } from '@/types/domain/Answer';
import { safeNavigateToUrl, buildDocumentUrl } from '@/utils/validation/urlValidation';

interface CitationManagerProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
  className?: string;
}

interface CitationPreviewProps {
  citation: Citation;
  isVisible: boolean;
  onClose: () => void;
}

const CitationPreview: React.FC<CitationPreviewProps> = ({
  citation,
  isVisible,
  onClose,
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute z-50 w-80 p-4 bg-white border border-gray-300 rounded-lg shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
          {citation.documentTitle}
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
          aria-label="Close preview"
        >
          ✕
        </button>
      </div>

      {citation.sectionTitle && (
        <div className="text-xs text-blue-600 mb-2 font-medium">
          {citation.sectionTitle}
          {citation.pageNumber && ` • Page ${citation.pageNumber}`}
        </div>
      )}

      <div className="text-sm text-gray-700 mb-3 leading-relaxed">
        "{citation.excerpt}"
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            Confidence: {Math.round(citation.confidence * 100)}%
          </div>
          <div className={`w-2 h-2 rounded-full ${
            citation.confidence >= 0.8 ? 'bg-green-500' :
            citation.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
        </div>
        <button
          onClick={() => safeNavigateToUrl(citation.url, {
            target: '_blank',
            onError: (error) => console.warn('Citation navigation blocked:', error)
          })}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          View Source →
        </button>
      </div>
    </div>
  );
};

interface CitationLinkProps {
  citationNumber: number;
  citation: Citation;
  onHover: (citation: Citation | null) => void;
  onClick: (citation: Citation) => void;
}

const CitationLink: React.FC<CitationLinkProps> = ({
  citationNumber,
  citation,
  onHover,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover(citation);
  }, [citation, onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onClick(citation);
  }, [citation, onClick]);

  const confidenceColor = citation.confidence >= 0.8 ? 'text-blue-600' :
                         citation.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600';

  return (
    <sup
      className={`${confidenceColor} cursor-pointer hover:underline font-medium text-xs relative`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title={`${citation.documentTitle} - Confidence: ${Math.round(citation.confidence * 100)}%`}
    >
      [{citationNumber}]
    </sup>
  );
};

export const CitationManager: React.FC<CitationManagerProps> = ({
  citations,
  onCitationClick,
  className = '',
}) => {
  const [hoveredCitation, setHoveredCitation] = useState<Citation | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);

  /**
   * Handle citation hover for preview display
   */
  const handleCitationHover = useCallback((citation: Citation | null, event?: React.MouseEvent) => {
    setHoveredCitation(citation);
    if (citation && event) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setPreviewPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    } else {
      setPreviewPosition(null);
    }
  }, []);

  /**
   * Handle citation click to navigate to source
   */
  const handleCitationClick = useCallback((citation: Citation) => {
    if (onCitationClick) {
      onCitationClick(citation);
    } else {
      // Default behavior: open in new tab/window with validation (SEC-003 fix)
      safeNavigateToUrl(citation.url, {
        target: '_blank',
        onError: (error) => console.warn('Citation navigation blocked:', error)
      });
    }
  }, [onCitationClick]);

  /**
   * Render citations inline within text content
   */
  const renderInlineCitations = useCallback((content: string) => {
    if (!citations.length) return content;

    // Find citation markers like [1], [2], etc.
    const citationRegex = /\[(\d+)\]/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      const citationNumber = parseInt(match[1]);
      const citation = citations[citationNumber - 1];

      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add citation link
      if (citation) {
        parts.push(
          <CitationLink
            key={`citation-${citationNumber}`}
            citationNumber={citationNumber}
            citation={citation}
            onHover={handleCitationHover}
            onClick={handleCitationClick}
          />
        );
      } else {
        // Fallback for missing citation
        parts.push(
          <sup key={`missing-${citationNumber}`} className="text-gray-400">
            [{citationNumber}]
          </sup>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts;
  }, [citations, handleCitationHover, handleCitationClick]);

  /**
   * Render citations list
   */
  const renderCitationsList = () => {
    if (!citations.length) return null;

    return (
      <div className="mt-6 border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Sources</h4>
        <div className="space-y-2">
          {citations.map((citation, index) => (
            <div
              key={citation.id}
              className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer group"
              onClick={() => handleCitationClick(citation)}
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {citation.documentTitle}
                </div>
                {citation.sectionTitle && (
                  <div className="text-xs text-blue-600 mt-1">
                    {citation.sectionTitle}
                    {citation.pageNumber && ` • Page ${citation.pageNumber}`}
                  </div>
                )}
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                  "{citation.excerpt}"
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="text-xs text-gray-500">
                    {Math.round(citation.confidence * 100)}% confidence
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    citation.confidence >= 0.8 ? 'bg-green-500' :
                    citation.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`citation-manager ${className}`}>
      {/* Citation preview on hover */}
      {hoveredCitation && previewPosition && (
        <div
          className="fixed z-50"
          style={{
            left: previewPosition.x - 160, // Center the 320px wide preview
            top: previewPosition.y,
          }}
        >
          <CitationPreview
            citation={hoveredCitation}
            isVisible={true}
            onClose={() => setHoveredCitation(null)}
          />
        </div>
      )}

      {/* Citations list */}
      {renderCitationsList()}
    </div>
  );
};

export default CitationManager;

/**
 * Utility function to enhance content with clickable citations
 */
export const enhanceContentWithCitations = (
  content: string,
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void
): React.ReactElement => {
  const citationRegex = /\[(\d+)\]/g;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(content)) !== null) {
    const citationNumber = parseInt(match[1]);
    const citation = citations[citationNumber - 1];

    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Add citation link
    if (citation) {
      parts.push(
        <span
          key={`citation-${citationNumber}`}
          className="inline-block"
        >
          <CitationLink
            citationNumber={citationNumber}
            citation={citation}
            onHover={() => {}} // No hover in utility function
            onClick={onCitationClick || (() => safeNavigateToUrl(citation.url, {
              target: '_blank',
              onError: (error) => console.warn('Citation navigation blocked:', error)
            }))}
          />
        </span>
      );
    } else {
      parts.push(
        <sup key={`missing-${citationNumber}`} className="text-gray-400">
          [{citationNumber}]
        </sup>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <span>{parts}</span>;
};