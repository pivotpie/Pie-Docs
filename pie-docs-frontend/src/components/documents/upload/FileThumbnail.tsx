import React, { useState, useEffect } from 'react';
import { FileValidator } from '@/utils/validation/fileValidator';

interface FileThumbnailProps {
  file: File;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPreview?: boolean;
  onPreviewClick?: () => void;
}

interface FilePreviewModalProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: string;
    type: string;
    lastModified: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !file) return;

    // Generate preview URL for images
    if (FileValidator.isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Cleanup URL when component unmounts
      return () => URL.revokeObjectURL(url);
    }

    // Set file information
    setFileInfo({
      name: file.name,
      size: FileValidator.formatFileSize(file.size),
      type: file.type || 'Unknown',
      lastModified: new Date(file.lastModified).toLocaleString()
    });
  }, [file, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" dir="ltr">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{file.name}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview Area */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Preview</h4>

              {FileValidator.isImageFile(file) && previewUrl ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                    {getFileTypeIcon(file)}
                  </div>
                  <p className="text-gray-600 text-sm">
                    Preview not available for this file type
                  </p>
                </div>
              )}
            </div>

            {/* File Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">File Information</h4>

              {fileInfo && (
                <div className="space-y-3">
                  <div className="flex flex-col space-y-1">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">File Name</dt>
                    <dd className="text-sm text-gray-900 break-words">{fileInfo.name}</dd>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">File Size</dt>
                    <dd className="text-sm text-gray-900">{fileInfo.size}</dd>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">File Type</dt>
                    <dd className="text-sm text-gray-900">{fileInfo.type}</dd>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Modified</dt>
                    <dd className="text-sm text-gray-900">{fileInfo.lastModified}</dd>
                  </div>

                  {/* File Type Details */}
                  <div className="pt-3 border-t border-gray-200">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">File Type Details</dt>
                    <div className="space-y-2">
                      {FileValidator.isImageFile(file) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Image File
                        </span>
                      )}
                      {FileValidator.isVideoFile(file) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Video File
                        </span>
                      )}
                      {FileValidator.isAudioFile(file) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Audio File
                        </span>
                      )}
                      {FileValidator.isPDFFile(file) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          PDF Document
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const getFileTypeIcon = (file: File) => {
  const iconClass = "w-8 h-8 text-gray-400";

  if (FileValidator.isImageFile(file)) {
    return (
      <svg className={`${iconClass} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    );
  }

  if (FileValidator.isVideoFile(file)) {
    return (
      <svg className={`${iconClass} text-purple-500`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }

  if (FileValidator.isAudioFile(file)) {
    return (
      <svg className={`${iconClass} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
      </svg>
    );
  }

  if (FileValidator.isPDFFile(file)) {
    return (
      <svg className={`${iconClass} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  );
};

export const FileThumbnail: React.FC<FileThumbnailProps> = ({
  file,
  size = 'md',
  className = '',
  showPreview = true,
  onPreviewClick
}) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (FileValidator.isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setThumbnail(url);

      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const handleClick = () => {
    if (onPreviewClick) {
      onPreviewClick();
    } else if (showPreview) {
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <div
        className={`${sizeClasses[size]} ${className} ${showPreview ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''} relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center`}
        onClick={handleClick}
        role={showPreview ? "button" : undefined}
        tabIndex={showPreview ? 0 : undefined}
        onKeyDown={showPreview ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        } : undefined}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`${iconSizeClasses[size]}`}>
            {getFileTypeIcon(file)}
          </div>
        )}

        {/* Preview overlay for hover effect */}
        {showPreview && (
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
            <svg className="w-4 h-4 text-white opacity-0 hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <FilePreviewModal
        file={file}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default FileThumbnail;