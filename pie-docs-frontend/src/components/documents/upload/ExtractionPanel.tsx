import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Cog6ToothIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface FileWithPreview {
  id: string;
  file: File;
  documentTypeName?: string;
  extractedMetadata?: any;
  ocrText?: string;
  embeddings?: number[];
  extractionStatus: 'pending' | 'extracting' | 'completed' | 'failed';
}

interface ExtractionPanelProps {
  file: FileWithPreview | null;
  isExtracting: boolean;
  allFiles: FileWithPreview[];
}

export const ExtractionPanel: React.FC<ExtractionPanelProps> = ({
  file,
  isExtracting,
  allFiles
}) => {
  const { theme } = useTheme();

  if (!file) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center p-8">
          <SparklesIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
          <p className="text-gray-400 text-sm">
            Select a file to view extraction status
          </p>
        </div>
      </div>
    );
  }

  const getOverallProgress = () => {
    const total = allFiles.length;
    const completed = allFiles.filter(f => f.extractionStatus === 'completed').length;
    const extracting = allFiles.filter(f => f.extractionStatus === 'extracting').length;
    const failed = allFiles.filter(f => f.extractionStatus === 'failed').length;
    const pending = allFiles.filter(f => f.extractionStatus === 'pending').length;

    return { total, completed, extracting, failed, pending };
  };

  const progress = getOverallProgress();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${
            isExtracting ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            {isExtracting ? (
              <Cog6ToothIcon className="h-6 w-6 text-blue-600 animate-spin" />
            ) : (
              <SparklesIcon className="h-6 w-6 text-green-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              AI Metadata Extraction
            </h3>
            <p className="text-xs text-gray-400">
              {isExtracting ? 'Extracting metadata from all pages...' : 'Extraction Complete'}
            </p>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-4 bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-300 font-medium">Overall Progress</span>
            <span className="text-gray-400">
              {progress.completed} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
          <div className="flex gap-3 text-xs">
            {progress.completed > 0 && (
              <div className="flex items-center text-green-400">
                <CheckIcon className="h-3 w-3 mr-1" />
                <span>{progress.completed} Complete</span>
              </div>
            )}
            {progress.extracting > 0 && (
              <div className="flex items-center text-yellow-400">
                <Cog6ToothIcon className="h-3 w-3 mr-1 animate-spin" />
                <span>{progress.extracting} Processing</span>
              </div>
            )}
            {progress.failed > 0 && (
              <div className="flex items-center text-red-400">
                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                <span>{progress.failed} Failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Process Info */}
        <div className="mt-3 bg-blue-900/20 border border-blue-500 rounded-lg p-3">
          <p className="text-xs text-blue-300">
            <span className="font-semibold">Full Document Processing:</span> All pages are being converted to images and analyzed by AI to extract metadata fields, complete OCR text, and generate semantic embeddings.
          </p>
        </div>
      </div>

      {/* File Extraction Status */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`p-4 rounded-lg border ${
            file.extractionStatus === 'completed'
              ? 'bg-green-900/20 border-green-500'
              : file.extractionStatus === 'extracting'
              ? 'bg-yellow-900/20 border-yellow-500'
              : file.extractionStatus === 'failed'
              ? 'bg-red-900/20 border-red-500'
              : 'bg-gray-800 border-gray-600'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {file.extractionStatus === 'completed' && (
                <>
                  <CheckIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-400">Extraction Complete</span>
                </>
              )}
              {file.extractionStatus === 'extracting' && (
                <>
                  <Cog6ToothIcon className="h-5 w-5 text-yellow-500 animate-spin" />
                  <span className="text-sm font-medium text-yellow-400">Extracting...</span>
                </>
              )}
              {file.extractionStatus === 'failed' && (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-400">Extraction Failed</span>
                </>
              )}
              {file.extractionStatus === 'pending' && (
                <>
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-400">Pending</span>
                </>
              )}
            </div>

            {file.extractionStatus === 'pending' && (
              <p className="text-xs text-gray-400">
                Waiting to be processed...
              </p>
            )}

            {file.extractionStatus === 'extracting' && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">
                  Processing all pages of this document...
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className="bg-yellow-500 h-1.5 rounded-full animate-pulse" style={{ width: '70%' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Document Info */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Document Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white font-medium">{file.documentTypeName || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Size:</span>
                <span className="text-white">{(file.file.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>

          {/* Extraction Results (if completed) */}
          {file.extractionStatus === 'completed' && (
            <>
              {/* Extracted Data Summary */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Extraction Results</h4>
                <div className="space-y-3">
                  {/* Metadata Fields */}
                  {file.extractedMetadata?.extracted_fields && (
                    <div className="flex items-start gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-white">Metadata Fields</p>
                        <p className="text-xs text-gray-400">
                          {Object.keys(file.extractedMetadata.extracted_fields).length} fields extracted
                        </p>
                      </div>
                    </div>
                  )}

                  {/* OCR Text */}
                  {file.ocrText && (
                    <div className="flex items-start gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-white">OCR Text (All Pages)</p>
                        <p className="text-xs text-gray-400">
                          {file.ocrText.length} characters extracted
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Embeddings */}
                  {file.embeddings && (
                    <div className="flex items-start gap-2">
                      <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-white">Semantic Embeddings</p>
                        <p className="text-xs text-gray-400">
                          {file.embeddings.length} dimensions for RAG
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pages Processed */}
                  {file.extractedMetadata?.pages_processed && (
                    <div className="flex items-start gap-2">
                      <DocumentTextIcon className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-white">Pages Processed</p>
                        <p className="text-xs text-gray-400">
                          {file.extractedMetadata.pages_processed} pages analyzed
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Features */}
              {(file.extractedMetadata?.insights || file.extractedMetadata?.key_terms) && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">AI Features</h4>
                  <div className="space-y-2 text-xs">
                    {file.extractedMetadata?.insights && file.extractedMetadata.insights.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Insights:</span>
                        <span className="text-white">{file.extractedMetadata.insights.length} generated</span>
                      </div>
                    )}
                    {file.extractedMetadata?.key_terms && file.extractedMetadata.key_terms.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Key Terms:</span>
                        <span className="text-white">{file.extractedMetadata.key_terms.length} identified</span>
                      </div>
                    )}
                    {file.extractedMetadata?.summary && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Summary:</span>
                        <span className="text-green-400">✓ Generated</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {file.extractedMetadata?.confidence !== undefined && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Extraction Confidence</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-white">
                        {(file.extractedMetadata.confidence * 100).toFixed(0)}%
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        file.extractedMetadata.confidence > 0.7
                          ? 'bg-green-100 text-green-800'
                          : file.extractedMetadata.confidence > 0.4
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {file.extractedMetadata.confidence > 0.7
                          ? 'High'
                          : file.extractedMetadata.confidence > 0.4
                          ? 'Medium'
                          : 'Low'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          file.extractedMetadata.confidence > 0.7
                            ? 'bg-green-500'
                            : file.extractedMetadata.confidence > 0.4
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${file.extractedMetadata.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Failed State */}
          {file.extractionStatus === 'failed' && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-400 mb-2">Extraction Error</h4>
              <p className="text-xs text-red-300">
                Failed to extract metadata from this document. You can manually enter metadata in the next step.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtractionPanel;
