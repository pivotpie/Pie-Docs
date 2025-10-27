import React from 'react';
import type { OCRStatusIndicatorProps } from '@/types/domain/OCR';

const OCRStatusIndicator: React.FC<OCRStatusIndicatorProps> = ({
  job,
  showDetails = false,
  compact = false,
}) => {
  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'processing':
      case 'retrying':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return '⏳';
      case 'processing':
      case 'retrying':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'retrying':
        return `Retrying (${job.retryCount}/${job.maxRetries})`;
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getElapsedTime = () => {
    const startTime = new Date(job.startTime).getTime();
    const currentTime = Date.now();
    return Math.floor((currentTime - startTime) / 1000);
  };

  const getRemainingTime = () => {
    if (job.estimatedTimeRemaining) {
      return formatTime(job.estimatedTimeRemaining);
    }
    return null;
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
        <span className="mr-1" role="img" aria-label={`OCR Status: ${getStatusText()}`}>
          {getStatusIcon()}
        </span>
        <span>{getStatusText()}</span>
        {job.status === 'processing' && (
          <span className="ml-2 text-xs">
            {job.progress}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-lg mr-2" role="img" aria-label={`OCR Status: ${getStatusText()}`}>
            {getStatusIcon()}
          </span>
          <h3 className="text-sm font-medium text-gray-900">OCR Processing</h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Progress Bar */}
      {(job.status === 'processing' || job.status === 'retrying') && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{job.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="space-y-2 text-xs text-gray-600">
          {/* Language */}
          {job.detectedLanguage && (
            <div className="flex justify-between">
              <span>Detected Language:</span>
              <span className="font-medium">
                {job.detectedLanguage === 'ar' ? 'Arabic' :
                 job.detectedLanguage === 'en' ? 'English' :
                 job.detectedLanguage === 'ar-en' ? 'Arabic & English' : 'Auto'}
              </span>
            </div>
          )}

          {/* Timing */}
          <div className="flex justify-between">
            <span>Elapsed Time:</span>
            <span className="font-medium">{formatTime(getElapsedTime())}</span>
          </div>

          {job.status === 'processing' && getRemainingTime() && (
            <div className="flex justify-between">
              <span>Estimated Remaining:</span>
              <span className="font-medium">{getRemainingTime()}</span>
            </div>
          )}

          {/* Retry Info */}
          {job.retryCount > 0 && (
            <div className="flex justify-between">
              <span>Retry Attempts:</span>
              <span className="font-medium">{job.retryCount}/{job.maxRetries}</span>
            </div>
          )}

          {/* Start Time */}
          <div className="flex justify-between">
            <span>Started:</span>
            <span className="font-medium">
              {new Date(job.startTime).toLocaleTimeString()}
            </span>
          </div>

          {/* End Time */}
          {job.endTime && (
            <div className="flex justify-between">
              <span>
                {job.status === 'completed' ? 'Completed:' : 'Failed:'}
              </span>
              <span className="font-medium">
                {new Date(job.endTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {job.status === 'failed' && job.error && (
        <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
          <p className="text-xs text-red-700 font-medium mb-1">Error:</p>
          <p className="text-xs text-red-600">{job.error.message}</p>
          {job.error.recoverable && (
            <p className="text-xs text-red-500 mt-1">
              This error is recoverable. You can retry the operation.
            </p>
          )}
        </div>
      )}

      {/* Settings Info */}
      {showDetails && job.processingSettings && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-700 font-medium">
              Processing Settings
            </summary>
            <div className="mt-2 space-y-1 text-gray-600">
              <div>
                Languages: {job.processingSettings.targetLanguages.join(', ')}
              </div>
              <div>
                Quality Threshold: {job.processingSettings.qualityThreshold}%
              </div>
              <div>
                Language Detection: {job.processingSettings.enableLanguageDetection ? 'Enabled' : 'Disabled'}
              </div>
              <div>
                Resolution: {job.processingSettings.imagePreprocessing.resolutionDPI} DPI
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default OCRStatusIndicator;