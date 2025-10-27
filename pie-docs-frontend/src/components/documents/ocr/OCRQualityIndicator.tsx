import React from 'react';
import type { OCRQualityIndicatorProps, OCRQuality } from '@/types/domain/OCR';

const OCRQualityIndicator: React.FC<OCRQualityIndicatorProps> = ({
  qualityMetrics,
  confidence,
  showRecommendations = false,
}) => {
  const getQualityColor = (quality: OCRQuality) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'high':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getQualityIcon = (quality: OCRQuality) => {
    switch (quality) {
      case 'excellent':
        return '🌟';
      case 'high':
        return '✨';
      case 'medium':
        return '⚡';
      case 'low':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  const ConfidenceBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className={getConfidenceColor(value)}>{formatPercentage(value)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            value >= 75 ? 'bg-green-500' :
            value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-lg mr-2" role="img" aria-label="Quality Assessment">
            📊
          </span>
          <h3 className="text-sm font-medium text-gray-900">OCR Quality Assessment</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getQualityColor(qualityMetrics.quality)}`}>
          <span className="mr-1">{getQualityIcon(qualityMetrics.quality)}</span>
          {qualityMetrics.quality.charAt(0).toUpperCase() + qualityMetrics.quality.slice(1)}
        </div>
      </div>

      {/* Overall Confidence */}
      <div className="mb-4">
        <ConfidenceBar label="Overall Confidence" value={confidence.overall} />
      </div>

      {/* Detailed Confidence Scores */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <ConfidenceBar label="Character" value={confidence.character} />
          <ConfidenceBar label="Word" value={confidence.word} />
        </div>
        <div>
          <ConfidenceBar label="Line" value={confidence.line} />
          <ConfidenceBar label="Paragraph" value={confidence.paragraph} />
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="border-t border-gray-100 pt-4 mb-4">
        <h4 className="text-xs font-medium text-gray-700 mb-3">Quality Metrics</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Text Coverage:</span>
            <span className="font-medium">{formatPercentage(qualityMetrics.textCoverage)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Layout Preservation:</span>
            <span className="font-medium">{formatPercentage(qualityMetrics.layoutPreservation)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg. Word Length:</span>
            <span className="font-medium">{qualityMetrics.averageWordLength.toFixed(1)} chars</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Punctuation Ratio:</span>
            <span className="font-medium">{formatPercentage(qualityMetrics.punctuationRatio * 100)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Special Characters:</span>
            <span className="font-medium">{formatPercentage(qualityMetrics.specialCharacterRatio * 100)}</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {showRecommendations && qualityMetrics.recommendations.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
            <span className="mr-1" role="img" aria-label="Recommendations">💡</span>
            Recommendations
          </h4>
          <ul className="space-y-1">
            {qualityMetrics.recommendations.map((recommendation, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start">
                <span className="text-yellow-500 mr-1 mt-0.5">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quality Score Visual */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-center">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                className={getConfidenceColor(confidence.overall)}
                style={{
                  strokeDasharray: `${2 * Math.PI * 28}`,
                  strokeDashoffset: `${2 * Math.PI * 28 * (1 - confidence.overall / 100)}`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${getConfidenceColor(confidence.overall)}`}>
                {formatPercentage(confidence.overall)}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">Overall Quality Score</p>
      </div>
    </div>
  );
};

export default OCRQualityIndicator;