import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  documentTypeId?: string;
  documentTypeName?: string;
  metadata: Record<string, any>;
  ocrText?: string;
}

interface PreviewPanelProps {
  file: FileWithPreview | null;
  className?: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ file, className = '' }) => {
  const { theme } = useTheme();

  const getFileType = (file: File): 'image' | 'pdf' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    return 'other';
  };

  if (!file) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center">
          <div className="text-center p-8">
            <DocumentIcon className="mx-auto h-20 w-20 text-gray-600 mb-4" />
            <p className="text-gray-400 text-sm">
              Select a file to preview
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fileType = getFileType(file.file);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white truncate" title={file.file.name}>
          Preview: {file.file.name}
        </h3>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
          <span>{file.file.type || 'Unknown type'}</span>
          <span>•</span>
          <span>{(file.file.size / 1024).toFixed(1)} KB</span>
          {file.documentTypeName && (
            <>
              <span>•</span>
              <span className="text-blue-400">{file.documentTypeName}</span>
            </>
          )}
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        {file.preview ? (
          <>
            {fileType === 'image' ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            ) : fileType === 'pdf' ? (
              <iframe
                src={`${file.preview}#view=FitH`}
                title={file.file.name}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4">
                <div className="text-center">
                  <DocumentIcon className="mx-auto h-20 w-20 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-white">
                    {file.file.name}
                  </p>
                  <p className="text-sm text-gray-300 mt-2">
                    {file.file.type || 'Unknown type'} • {(file.file.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs mt-4 text-gray-400">
                    Preview available
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="text-center">
              {fileType === 'image' ? (
                <PhotoIcon className="mx-auto h-20 w-20 text-gray-400 mb-4" />
              ) : (
                <DocumentIcon className="mx-auto h-20 w-20 text-gray-400 mb-4" />
              )}
              <p className="text-lg font-medium text-white">
                {file.file.name}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                {file.file.type || 'Unknown type'} • {(file.file.size / 1024).toFixed(1)} KB
              </p>
              <p className="text-xs mt-4 text-gray-400">
                {fileType === 'pdf' ? 'PDF preview not available' :
                 fileType === 'image' ? 'Image preview not available' :
                 'Preview not available for this file type'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info (Optional) */}
      {file.ocrText && (
        <div className="mt-2 text-xs text-gray-400">
          <span>OCR Text: {file.ocrText.length} characters</span>
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
