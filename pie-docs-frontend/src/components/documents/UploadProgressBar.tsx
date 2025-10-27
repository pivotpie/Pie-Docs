import React from 'react';
import { FileValidator } from '@/utils/validation/fileValidator';
import type { UploadProgressBarProps } from '@/types/domain/Upload';

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  uploadFile,
  showDetails = true,
  showThumbnail = true,
  onCancel,
  onRetry,
  onRemove,
  className = '',
}) => {
  const {
    file,
    name,
    size,
    progress,
    status,
    error,
    thumbnail,
    uploadStartTime,
  } = uploadFile;

  const getProgressColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'uploading':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-300';
      case 'cancelled':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusBadge = () => {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';

    switch (status) {
      case 'pending':
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse mr-1" />
            Pending
          </span>
        );
      case 'uploading':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1" />
            Uploading
          </span>
        );
      case 'success':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Complete
          </span>
        );
      case 'error':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getFileTypeIcon = () => {
    if (FileValidator.isImageFile(file)) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (FileValidator.isVideoFile(file)) {
      return (
        <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      );
    }

    if (FileValidator.isAudioFile(file)) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const calculateUploadSpeed = () => {
    if (!uploadStartTime || status !== 'uploading') return null;

    const elapsedTime = (Date.now() - uploadStartTime) / 1000; // seconds
    const uploadedBytes = (size * progress) / 100;
    const speed = uploadedBytes / elapsedTime; // bytes per second

    return FileValidator.formatFileSize(speed) + '/s';
  };

  const calculateTimeRemaining = () => {
    if (status !== 'uploading' || progress === 0) return null;

    const speed = calculateUploadSpeed();
    if (!speed) return null;

    const remainingBytes = size - (size * progress) / 100;
    const speedInBytes = parseFloat(speed.split(' ')[0]) * (
      speed.includes('GB') ? 1024 * 1024 * 1024 :
      speed.includes('MB') ? 1024 * 1024 :
      speed.includes('KB') ? 1024 : 1
    );

    const remainingSeconds = remainingBytes / speedInBytes;

    if (remainingSeconds < 60) {
      return `${Math.ceil(remainingSeconds)}s remaining`;
    } else if (remainingSeconds < 3600) {
      return `${Math.ceil(remainingSeconds / 60)}m remaining`;
    } else {
      return `${Math.ceil(remainingSeconds / 3600)}h remaining`;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        {/* File Thumbnail/Icon */}
        {showThumbnail && (
          <div className="flex-shrink-0">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={name}
                className="w-12 h-12 object-cover rounded border"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                {getFileTypeIcon()}
              </div>
            )}
          </div>
        )}

        {/* File Info and Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">{name}</h4>
              <p className="text-xs text-gray-500">
                {FileValidator.formatFileSize(size)}
                {showDetails && file.type && ` • ${file.type}`}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge()}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>
                {status === 'uploading' && `${progress}%`}
                {status === 'success' && 'Upload completed'}
                {status === 'error' && (error || 'Upload failed')}
                {status === 'pending' && 'Waiting to start'}
                {status === 'cancelled' && 'Upload cancelled'}
              </span>
              {showDetails && (
                <span>
                  {calculateUploadSpeed() && `${calculateUploadSpeed()}`}
                  {calculateTimeRemaining() && ` • ${calculateTimeRemaining()}`}
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          </div>

          {/* Error Message */}
          {status === 'error' && error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {status === 'uploading' && onCancel && (
              <button
                onClick={onCancel}
                className="inline-flex items-center px-2.5 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Cancel
              </button>
            )}

            {status === 'error' && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-2.5 py-1 border border-blue-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Retry
              </button>
            )}

            {(status === 'success' || status === 'error' || status === 'cancelled') && onRemove && (
              <button
                onClick={onRemove}
                className="inline-flex items-center px-2.5 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
                    clipRule="evenodd"
                  />
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadProgressBar;