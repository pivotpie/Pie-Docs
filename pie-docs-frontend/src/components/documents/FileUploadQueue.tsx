import React from 'react';
import { useDispatch } from 'react-redux';
import {
  clearCompletedUploads,
  clearUploadQueue,
} from '@/store/slices/documentsSlice';
import { FileValidator } from '@/utils/validation/fileValidator';
import type { FileUploadQueueProps, UploadFile } from '@/types/domain/Upload';

const FileUploadItem: React.FC<{
  uploadFile: UploadFile;
  onCancel: () => void;
  onRetry: () => void;
  onRemove: () => void;
  _onUpdateMetadata: (metadata: UploadFile['metadata']) => void;
}> = ({ uploadFile, onCancel, onRetry, onRemove, _onUpdateMetadata }) => {
  const { file, name, size, progress, status, error, thumbnail } = uploadFile;

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return (
          <div className="h-4 w-4 rounded-full border-2 border-gray-300 animate-pulse" />
        );
      case 'uploading':
        return (
          <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        );
      case 'success':
        return (
          <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case 'cancelled':
        return (
          <div className="h-4 w-4 rounded-full bg-gray-500 flex items-center justify-center">
            <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'success':
        return 'Completed';
      case 'error':
        return error || 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  };

  const getFileIcon = () => {
    if (thumbnail) {
      return (
        <img
          src={thumbnail}
          alt={name}
          className="w-8 h-8 object-cover rounded border"
        />
      );
    }

    if (FileValidator.isImageFile(file)) {
      return (
        <div className="w-8 h-8 bg-blue-100 rounded border flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }

    if (FileValidator.isVideoFile(file)) {
      return (
        <div className="w-8 h-8 bg-purple-100 rounded border flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM8 9a1 1 0 100 2h4a1 1 0 100-2H8z" />
          </svg>
        </div>
      );
    }

    if (FileValidator.isAudioFile(file)) {
      return (
        <div className="w-8 h-8 bg-green-100 rounded border flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        </div>
      );
    }

    return (
      <div className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center">
        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
      {/* File Icon/Thumbnail */}
      {getFileIcon()}

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          {getStatusIcon()}
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <p className="text-xs text-gray-500">{FileValidator.formatFileSize(size)}</p>
          <span className="text-xs text-gray-400">•</span>
          <p className={`text-xs ${
            status === 'error' ? 'text-red-600' :
            status === 'success' ? 'text-green-600' :
            'text-gray-500'
          }`}>
            {getStatusText()}
          </p>
        </div>

        {/* Progress Bar */}
        {(status === 'uploading' || status === 'pending') && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-1">
        {status === 'uploading' && (
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Cancel upload"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={onRetry}
            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            title="Retry upload"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {(status === 'success' || status === 'error' || status === 'cancelled') && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Remove from queue"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
          </button>
        )}
      </div>
    </div>
  );
};

export const FileUploadQueue: React.FC<FileUploadQueueProps> = ({
  uploadQueue,
  onCancelUpload,
  onRetryUpload,
  onRemoveFile,
  onUpdateMetadata,
  className = '',
}) => {
  const dispatch = useDispatch();

  const { files, totalFiles, completedFiles, failedFiles, overallProgress } = uploadQueue;

  if (files.length === 0) {
    return null;
  }

  const handleClearCompleted = () => {
    dispatch(clearCompletedUploads());
  };

  const handleClearAll = () => {
    dispatch(clearUploadQueue());
  };

  const activeUploads = files.filter(f => f.status === 'uploading' || f.status === 'pending').length;
  const hasCompleted = completedFiles > 0 || failedFiles > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Queue Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Queue ({totalFiles} files)
            </h3>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
              {activeUploads > 0 && (
                <span>
                  {activeUploads} uploading
                </span>
              )}
              {completedFiles > 0 && (
                <span className="text-green-600">
                  {completedFiles} completed
                </span>
              )}
              {failedFiles > 0 && (
                <span className="text-red-600">
                  {failedFiles} failed
                </span>
              )}
            </div>
          </div>

          {/* Overall Progress Bar */}
          {activeUploads > 0 && (
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Overall Progress</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Queue Actions */}
        <div className="flex items-center space-x-2">
          {hasCompleted && (
            <button
              onClick={handleClearCompleted}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded border border-gray-300"
            >
              Clear Completed
            </button>
          )}
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-300"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {files.map((uploadFile) => (
          <FileUploadItem
            key={uploadFile.id}
            uploadFile={uploadFile}
            onCancel={() => onCancelUpload(uploadFile.id)}
            onRetry={() => onRetryUpload(uploadFile.id)}
            onRemove={() => onRemoveFile(uploadFile.id)}
            onUpdateMetadata={(metadata) => onUpdateMetadata(uploadFile.id, metadata)}
          />
        ))}
      </div>
    </div>
  );
};

export default FileUploadQueue;