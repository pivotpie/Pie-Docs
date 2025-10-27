import React, { useState } from 'react';
import type { ConfidenceScore } from '@/types/domain/Answer';

interface ConfidenceIndicatorProps {
  confidence: ConfidenceScore;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

interface ConfidenceTooltipProps {
  confidence: ConfidenceScore;
  isVisible: boolean;
  onClose: () => void;
}

const ConfidenceTooltip: React.FC<ConfidenceTooltipProps> = ({
  confidence,
  isVisible,
  onClose,
}) => {
  if (!isVisible) return null;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreText = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="absolute z-50 w-80 p-4 bg-white border border-gray-300 rounded-lg shadow-lg">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-sm text-gray-900">
          Confidence Breakdown
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 ml-2"
          aria-label="Close tooltip"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* Overall Score */}
        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-sm font-medium text-gray-700">Overall</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${getScoreColor(confidence.overall)}`}>
              {Math.round(confidence.overall * 100)}%
            </span>
            <span className="text-xs text-gray-500">
              {getScoreText(confidence.overall)}
            </span>
          </div>
        </div>

        {/* Individual Scores */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Factual Accuracy</span>
            <span className={`text-xs font-medium ${getScoreColor(confidence.factualAccuracy)}`}>
              {Math.round(confidence.factualAccuracy * 100)}%
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Source Reliability</span>
            <span className={`text-xs font-medium ${getScoreColor(confidence.sourceReliability)}`}>
              {Math.round(confidence.sourceReliability * 100)}%
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Answer Completeness</span>
            <span className={`text-xs font-medium ${getScoreColor(confidence.answerCompleteness)}`}>
              {Math.round(confidence.answerCompleteness * 100)}%
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Citation Quality</span>
            <span className={`text-xs font-medium ${getScoreColor(confidence.citationQuality)}`}>
              {Math.round(confidence.citationQuality * 100)}%
            </span>
          </div>
        </div>

        {/* Visual Progress Bars */}
        <div className="space-y-2 mt-3">
          {[
            { label: 'Accuracy', value: confidence.factualAccuracy },
            { label: 'Sources', value: confidence.sourceReliability },
            { label: 'Completeness', value: confidence.answerCompleteness },
            { label: 'Citations', value: confidence.citationQuality },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20 text-right">{item.label}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    item.value >= 0.8 ? 'bg-green-500' :
                    item.value >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${item.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-600 leading-relaxed">
            {confidence.explanation}
          </p>
        </div>

        {/* Recommendations */}
        <div className="mt-2">
          {confidence.overall < 0.7 && (
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
              <strong>Tip:</strong> Consider reviewing additional sources or reformulating your question for more reliable results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  showDetails = false,
  size = 'medium',
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const percentage = Math.round(confidence.overall * 100);

  // Determine color scheme based on confidence level
  const getColorClasses = () => {
    if (confidence.overall >= 0.8) {
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-200',
        icon: '🟢',
      };
    } else if (confidence.overall >= 0.6) {
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        icon: '🟡',
      };
    } else {
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: '🔴',
      };
    }
  };

  // Size-specific classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'px-2 py-1 text-xs',
          text: 'text-xs',
          icon: 'text-xs',
        };
      case 'large':
        return {
          container: 'px-4 py-2 text-base',
          text: 'text-base',
          icon: 'text-sm',
        };
      default: // medium
        return {
          container: 'px-3 py-1.5 text-sm',
          text: 'text-sm',
          icon: 'text-sm',
        };
    }
  };

  const colors = getColorClasses();
  const sizes = getSizeClasses();

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleClick = () => {
    setShowTooltip(!showTooltip);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          inline-flex items-center gap-2 rounded-full font-medium cursor-pointer transition-all
          ${colors.bg} ${colors.text} ${colors.border} border
          ${sizes.container}
          hover:shadow-sm hover:scale-105
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        title={showDetails ? undefined : confidence.explanation}
      >
        <span className={`${sizes.icon}`}>{colors.icon}</span>
        <span className={`font-semibold ${sizes.text}`}>
          {percentage}% Confidence
        </span>

        {showDetails && (
          <svg
            className={`w-3 h-3 transition-transform ${showTooltip ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </div>

      {/* Detailed breakdown on hover/click */}
      {showDetails && (
        <ConfidenceTooltip
          confidence={confidence}
          isVisible={showTooltip}
          onClose={() => setShowTooltip(false)}
        />
      )}
    </div>
  );
};

/**
 * Compact confidence badge for inline use
 */
interface CompactConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export const CompactConfidenceBadge: React.FC<CompactConfidenceBadgeProps> = ({
  confidence,
  className = '',
}) => {
  const percentage = Math.round(confidence * 100);
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ${className}`}
      title={`${percentage}% confidence`}
    >
      <div className={`w-2 h-2 rounded-full ${getColor()}`} />
      <span>{percentage}%</span>
    </div>
  );
};

/**
 * Confidence progress bar for detailed views
 */
interface ConfidenceProgressBarProps {
  confidence: ConfidenceScore;
  className?: string;
}

export const ConfidenceProgressBar: React.FC<ConfidenceProgressBarProps> = ({
  confidence,
  className = '',
}) => {
  const percentage = confidence.overall * 100;
  const getColor = () => {
    if (confidence.overall >= 0.8) return 'bg-green-500';
    if (confidence.overall >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Answer Confidence</span>
        <span className="text-sm text-gray-600">{Math.round(percentage)}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-gray-600">{confidence.explanation}</p>
    </div>
  );
};

export default ConfidenceIndicator;