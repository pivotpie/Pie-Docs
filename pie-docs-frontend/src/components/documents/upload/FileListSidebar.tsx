import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  PhotoIcon,
  DocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  documentTypeId?: string;
  documentTypeName?: string;
  classificationConfidence?: number;
  classificationReasoning?: string;
  metadata: Record<string, any>;
  extractedMetadata?: any;
  ocrText?: string;
  embeddings?: number[];
  barcodeId?: string;
  barcodeCode?: string;
  folderId?: string;
  folderPath?: string;
  rackId?: string;
  locationPath?: string;
  extractionStatus: 'pending' | 'extracting' | 'completed' | 'failed';
  classificationStatus: 'pending' | 'classifying' | 'completed' | 'failed';
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface FileListSidebarProps {
  files: FileWithPreview[];
  selectedFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onRemoveFile: (fileId: string) => void;
  currentStep: string;
  metadataFields?: any[];
}

export const FileListSidebar: React.FC<FileListSidebarProps> = ({
  files,
  selectedFileId,
  onFileSelect,
  onRemoveFile,
  currentStep,
  metadataFields = []
}) => {
  const { theme } = useTheme();

  const getFileType = (file: File): 'image' | 'pdf' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    return 'other';
  };

  const getFileIcon = (file: File) => {
    const fileType = getFileType(file);
    if (fileType === 'image') {
      return <PhotoIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    } else if (fileType === 'pdf') {
      return <DocumentIcon className="h-5 w-5 text-red-500 flex-shrink-0" />;
    } else {
      return <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />;
    }
  };

  const isMetadataComplete = (file: FileWithPreview): boolean => {
    if (!file.documentTypeId) return false;
    const requiredFields = metadataFields.filter(field => field.is_required);
    return requiredFields.every(field => {
      const value = file.metadata[field.field_name];
      return value !== undefined && value !== null && value !== '';
    });
  };

  const getStatusBadge = (file: FileWithPreview) => {
    switch (currentStep) {
      case 'preview':
        return null;

      case 'classification':
        if (file.classificationStatus === 'completed') {
          return <CheckIcon className="h-4 w-4 text-green-500" />;
        }
        if (file.classificationStatus === 'classifying') {
          return <Cog6ToothIcon className="h-4 w-4 text-yellow-500 animate-spin" />;
        }
        if (file.classificationStatus === 'failed') {
          return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
        }
        return <ClockIcon className="h-4 w-4 text-gray-400" />;

      case 'extraction':
        if (file.extractionStatus === 'completed') {
          return <CheckIcon className="h-4 w-4 text-green-500" />;
        }
        if (file.extractionStatus === 'extracting') {
          return <Cog6ToothIcon className="h-4 w-4 text-yellow-500 animate-spin" />;
        }
        if (file.extractionStatus === 'failed') {
          return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
        }
        return <ClockIcon className="h-4 w-4 text-gray-400" />;

      case 'metadata':
        if (!file.documentTypeId) {
          return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
        }
        return isMetadataComplete(file)
          ? <CheckIcon className="h-4 w-4 text-green-500" />
          : <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;

      case 'barcode':
        return file.barcodeId
          ? <CheckIcon className="h-4 w-4 text-green-500" />
          : <ClockIcon className="h-4 w-4 text-gray-400" />;

      case 'location':
        const hasDigital = file.folderId;
        const hasPhysical = file.rackId;
        if (hasDigital && hasPhysical) {
          return <CheckIcon className="h-4 w-4 text-green-500" />;
        }
        if (hasDigital || hasPhysical) {
          return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
        }
        return <ClockIcon className="h-4 w-4 text-gray-400" />;

      default:
        return null;
    }
  };

  const getStatusText = (file: FileWithPreview): string => {
    switch (currentStep) {
      case 'preview':
        return `${(file.file.size / 1024).toFixed(1)} KB`;

      case 'classification':
        if (file.classificationStatus === 'completed') return 'Classified';
        if (file.classificationStatus === 'classifying') return 'Classifying...';
        if (file.classificationStatus === 'failed') return 'Failed';
        return 'Pending';

      case 'extraction':
        if (file.extractionStatus === 'completed') return 'Extracted';
        if (file.extractionStatus === 'extracting') return 'Extracting...';
        if (file.extractionStatus === 'failed') return 'Failed';
        return 'Pending';

      case 'metadata':
        if (!file.documentTypeId) return 'No Type';
        return isMetadataComplete(file) ? 'Complete' : 'Incomplete';

      case 'barcode':
        return file.barcodeId ? file.barcodeCode || 'Assigned' : 'Not Set';

      case 'location':
        const hasDigital = file.folderId;
        const hasPhysical = file.rackId;
        if (hasDigital && hasPhysical) return 'Complete';
        if (hasDigital) return 'Digital Only';
        if (hasPhysical) return 'Physical Only';
        return 'Not Set';

      default:
        return '';
    }
  };

  const getCompletionSummary = () => {
    let completed = 0;
    let pending = 0;
    let failed = 0;

    files.forEach(file => {
      switch (currentStep) {
        case 'classification':
          if (file.classificationStatus === 'completed') completed++;
          else if (file.classificationStatus === 'failed') failed++;
          else pending++;
          break;

        case 'extraction':
          if (file.extractionStatus === 'completed') completed++;
          else if (file.extractionStatus === 'failed') failed++;
          else pending++;
          break;

        case 'metadata':
          if (isMetadataComplete(file)) completed++;
          else pending++;
          break;

        case 'barcode':
          if (file.barcodeId) completed++;
          else pending++;
          break;

        case 'location':
          if (file.folderId && file.rackId) completed++;
          else pending++;
          break;

        default:
          break;
      }
    });

    return { completed, pending, failed };
  };

  const summary = getCompletionSummary();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white mb-2">
          Files ({files.length})
        </h3>

        {currentStep !== 'preview' && (
          <div className="text-xs space-y-1">
            {summary.completed > 0 && (
              <div className="flex items-center text-green-400">
                <CheckIcon className="h-3 w-3 mr-1" />
                <span>Complete: {summary.completed}</span>
              </div>
            )}
            {summary.pending > 0 && (
              <div className="flex items-center text-gray-400">
                <ClockIcon className="h-3 w-3 mr-1" />
                <span>Pending: {summary.pending}</span>
              </div>
            )}
            {summary.failed > 0 && (
              <div className="flex items-center text-red-400">
                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                <span>Failed: {summary.failed}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
              selectedFileId === file.id
                ? 'border-blue-500 bg-blue-900 shadow-lg'
                : theme === 'dark'
                ? 'border-gray-600 bg-gray-800 hover:border-gray-400'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
            onClick={() => onFileSelect(file.id)}
          >
            <div className="flex flex-col gap-2">
              {/* File Icon and Remove Button */}
              <div className="flex items-center justify-between">
                {getFileIcon(file.file)}
                {currentStep === 'preview' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filename */}
              <p className={`text-xs font-medium truncate ${
                selectedFileId === file.id ? 'text-white' : 'text-gray-300'
              }`} title={file.file.name}>
                {file.file.name}
              </p>

              {/* Status Badge and Text */}
              <div className="flex items-center gap-2">
                {getStatusBadge(file)}
                <span className={`text-xs truncate ${
                  selectedFileId === file.id
                    ? 'text-gray-300'
                    : 'text-gray-400'
                }`}>
                  {getStatusText(file)}
                </span>
              </div>

              {/* Additional location info for location step */}
              {currentStep === 'location' && (
                <div className="text-xs space-y-1 mt-1">
                  {file.folderPath && (
                    <div className="flex items-center text-green-400 truncate" title={file.folderPath}>
                      <span className="mr-1">📁</span>
                      <span className="truncate">{file.folderPath}</span>
                    </div>
                  )}
                  {file.locationPath && (
                    <div className="flex items-center text-blue-400 truncate" title={file.locationPath}>
                      <span className="mr-1">🏢</span>
                      <span className="truncate">{file.locationPath}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileListSidebar;
