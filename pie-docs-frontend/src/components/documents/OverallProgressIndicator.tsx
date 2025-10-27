import React from 'react';
import { useSelector } from 'react-redux';
import { selectUploadQueue, selectUploadStats } from '@/store/slices/documentsSlice';
import { FileValidator } from '@/utils/validation/fileValidator';

interface OverallProgressIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export const OverallProgressIndicator: React.FC<OverallProgressIndicatorProps> = ({
  className = '',
  showDetails = true,
  compact = false,
}) => {
  const uploadQueue = useSelector(selectUploadQueue);
  const uploadStats = useSelector(selectUploadStats);

  const {
    files,
    isUploading,
    overallProgress,
    concurrentUploads,
    maxConcurrentUploads,
  } = uploadQueue;

  const {
    totalFiles,
    totalBytes,
    uploadedBytes,
  } = uploadStats;

  // Don't render if no files are being uploaded
  if (!isUploading && totalFiles === 0) {
    return null;
  }

  const activeUploads = files.filter(f => f.status === 'uploading').length;
  const pendingUploads = files.filter(f => f.status === 'pending').length;
  const successfulUploads = files.filter(f => f.status === 'success').length;
  const failedUploadsCount = files.filter(f => f.status === 'error').length;

  const getProgressColor = () => {
    if (failedUploadsCount > 0 && successfulUploads === 0) return 'bg-red-500';
    if (failedUploadsCount > 0) return 'bg-yellow-500';
    if (overallProgress === 100) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    if (!isUploading && overallProgress === 100) {
      return 'Upload Complete';
    }
    if (!isUploading && failedUploadsCount > 0) {
      return 'Upload Failed';
    }
    if (isUploading) {
      return `Uploading ${activeUploads} of ${totalFiles} files...`;
    }
    return 'Preparing upload...';
  };

  const calculateETA = () => {
    if (!isUploading || overallProgress === 0) return null;

    // Simple ETA calculation based on overall progress
    const uploadStartTime = Math.min(
      ...files
        .filter(f => f.uploadStartTime)
        .map(f => f.uploadStartTime!)
    );

    if (!uploadStartTime) return null;

    const elapsedTime = (Date.now() - uploadStartTime) / 1000; // seconds
    const remainingProgress = 100 - overallProgress;
    const timePerPercent = elapsedTime / overallProgress;
    const remainingSeconds = (remainingProgress * timePerPercent);

    if (remainingSeconds < 60) {
      return `${Math.ceil(remainingSeconds)}s remaining`;
    } else if (remainingSeconds < 3600) {
      return `${Math.ceil(remainingSeconds / 60)}m remaining`;
    } else {
      return `${Math.ceil(remainingSeconds / 3600)}h remaining`;
    }
  };

  const calculateUploadSpeed = () => {
    if (!isUploading) return null;

    const uploadingFiles = files.filter(f => f.uploadStartTime && f.status === 'uploading');
    if (uploadingFiles.length === 0) return null;

    const totalSpeed = uploadingFiles.reduce((sum, file) => {
      const elapsedTime = (Date.now() - file.uploadStartTime!) / 1000;
      const uploadedBytes = (file.size * file.progress) / 100;
      return sum + (uploadedBytes / elapsedTime);
    }, 0);

    return FileValidator.formatFileSize(totalSpeed) + '/s';
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700">{getStatusText()}</span>
            <span className="text-gray-600">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
        {isUploading && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Upload Progress
          </h3>
          {isUploading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {Math.round(overallProgress)}%
          </div>
          <div className="text-xs text-gray-500">
            {FileValidator.formatFileSize(uploadedBytes)} / {FileValidator.formatFileSize(totalBytes)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Status and Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">{getStatusText()}</span>
          {showDetails && (
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              {calculateUploadSpeed() && (
                <span>{calculateUploadSpeed()}</span>
              )}
              {calculateETA() && (
                <span>{calculateETA()}</span>
              )}
            </div>
          )}
        </div>

        {showDetails && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{totalFiles}</div>
              <div className="text-xs text-gray-600">Total Files</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{activeUploads}</div>
              <div className="text-xs text-gray-600">Uploading</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{successfulUploads}</div>
              <div className="text-xs text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{failedUploadsCount}</div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
          </div>
        )}

        {/* Concurrent Upload Info */}
        {isUploading && showDetails && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>
              {concurrentUploads} of {maxConcurrentUploads} concurrent uploads
            </span>
            {pendingUploads > 0 && (
              <span>
                {pendingUploads} files in queue
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Summary */}
      {failedUploadsCount > 0 && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-800">
              {failedUploadsCount} {failedUploadsCount === 1 ? 'file failed' : 'files failed'} to upload
            </span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {!isUploading && overallProgress === 100 && failedUploadsCount === 0 && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-green-800">
              All files uploaded successfully!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverallProgressIndicator;