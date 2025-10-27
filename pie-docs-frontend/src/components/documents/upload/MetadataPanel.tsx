import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { DynamicMetadataForm } from './DynamicMetadataForm';
import type { MetadataField } from '@/services/api/metadataSchemaService';
import {
  Cog6ToothIcon,
  EyeIcon,
  TagIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface FileWithPreview {
  id: string;
  file: File;
  documentTypeId?: string;
  documentTypeName?: string;
  metadata: Record<string, any>;
  extractedMetadata?: any;
  ocrText?: string;
  extractionStatus: 'pending' | 'extracting' | 'completed' | 'failed';
}

interface MetadataPanelProps {
  file: FileWithPreview | null;
  metadataFields: MetadataField[];
  onMetadataChange: (fieldName: string, value: any) => void;
  onViewOcr: (ocrText: string) => void;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({
  file,
  metadataFields,
  onMetadataChange,
  onViewOcr
}) => {
  const { theme } = useTheme();

  if (!file) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center p-8">
          <TagIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
          <p className="text-gray-400 text-sm">
            Select a file to edit metadata
          </p>
        </div>
      </div>
    );
  }

  const isMetadataComplete = () => {
    if (!file.documentTypeId) return false;
    const requiredFields = metadataFields.filter(field => field.is_required);
    return requiredFields.every(field => {
      const value = file.metadata[field.field_name];
      return value !== undefined && value !== null && value !== '';
    });
  };

  const requiredFieldsCount = metadataFields.filter(f => f.is_required).length;
  const completedFieldsCount = metadataFields.filter(f => {
    const value = file.metadata[f.field_name];
    return value !== undefined && value !== null && value !== '';
  }).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${
            isMetadataComplete() ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {isMetadataComplete() ? (
              <CheckIcon className="h-6 w-6 text-green-600" />
            ) : (
              <TagIcon className="h-6 w-6 text-yellow-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Document Metadata
            </h3>
            <p className="text-xs text-gray-400">
              Review and edit extracted fields
            </p>
          </div>
        </div>

        {/* Completion Status */}
        <div className={`mt-3 rounded-lg p-3 border ${
          isMetadataComplete()
            ? 'bg-green-900/20 border-green-500'
            : 'bg-yellow-900/20 border-yellow-500'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white">
              {isMetadataComplete() ? 'All Required Fields Complete' : 'Incomplete Fields'}
            </span>
            <span className="text-xs text-gray-400">
              {completedFieldsCount} / {metadataFields.length} filled
            </span>
          </div>
          {!isMetadataComplete() && (
            <div className="flex items-center gap-1 text-xs text-yellow-400">
              <ExclamationTriangleIcon className="h-3 w-3" />
              <span>{requiredFieldsCount - metadataFields.filter(f => {
                const value = file.metadata[f.field_name];
                return f.is_required && (value !== undefined && value !== null && value !== '');
              }).length} required fields remaining</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4">
          {/* AI Extraction Info */}
          {file.extractedMetadata && file.extractionStatus === 'completed' && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Cog6ToothIcon className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  AI-Extracted Data
                </span>
                {file.extractedMetadata.confidence !== undefined && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    file.extractedMetadata.confidence > 0.7
                      ? 'bg-green-100 text-green-800'
                      : file.extractedMetadata.confidence > 0.4
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {(file.extractedMetadata.confidence * 100).toFixed(0)}% confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-green-300">
                Metadata has been pre-filled by AI. Please review and modify as needed.
              </p>
            </div>
          )}

          {/* Extraction Failed Warning */}
          {file.extractionStatus === 'failed' && (
            <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">
                  Manual Entry Required
                </span>
              </div>
              <p className="text-xs text-yellow-300">
                AI extraction failed. Please manually enter the metadata fields below.
              </p>
            </div>
          )}

          {/* Document Type Display */}
          {file.documentTypeName && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Document Type</h4>
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <span className="text-sm font-semibold text-white">{file.documentTypeName}</span>
              </div>
            </div>
          )}

          {/* Metadata Form */}
          {metadataFields.length > 0 ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-4">
                Metadata Fields
                {requiredFieldsCount > 0 && (
                  <span className="text-xs text-gray-400 ml-2">
                    (* = required)
                  </span>
                )}
              </h4>
              <DynamicMetadataForm
                fields={metadataFields}
                metadata={file.metadata}
                onChange={onMetadataChange}
              />
            </div>
          ) : (
            <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">
                  No Schema Defined
                </span>
              </div>
              <p className="text-xs text-yellow-300">
                No metadata schema is defined for this document type. You can still upload the document without custom metadata.
              </p>
            </div>
          )}

          {/* OCR Text Viewer */}
          {file.ocrText && (
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-400 mb-2">
                OCR Text Available
              </h4>
              <p className="text-xs text-blue-300 mb-3">
                Text was extracted from this document during AI analysis. Click below to view the full OCR results.
              </p>
              <button
                onClick={() => onViewOcr(file.ocrText || '')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
              >
                <EyeIcon className="mr-2 h-4 w-4" />
                View OCR Text ({file.ocrText.length} characters)
              </button>
              <div className="mt-2 text-xs text-gray-400">
                Lines: {file.ocrText.split('\n').length}
              </div>
            </div>
          )}

          {/* File Information */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">File Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white truncate ml-2" title={file.file.name}>
                  {file.file.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Size:</span>
                <span className="text-white">{(file.file.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white">{file.file.type || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataPanel;
