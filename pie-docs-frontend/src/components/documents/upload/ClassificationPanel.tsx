import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Cog6ToothIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface FileWithPreview {
  id: string;
  file: File;
  documentTypeId?: string;
  documentTypeName?: string;
  classificationConfidence?: number;
  classificationReasoning?: string;
  classificationStatus: 'pending' | 'classifying' | 'completed' | 'failed';
}

interface ClassificationPanelProps {
  file: FileWithPreview | null;
  documentTypes: any[];
  isClassifying: boolean;
  allFiles: FileWithPreview[];
}

export const ClassificationPanel: React.FC<ClassificationPanelProps> = ({
  file,
  documentTypes,
  isClassifying,
  allFiles
}) => {
  const { theme } = useTheme();

  if (!file) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center p-8">
          <SparklesIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
          <p className="text-gray-400 text-sm">
            Select a file to view classification results
          </p>
        </div>
      </div>
    );
  }

  const docType = documentTypes.find(dt => dt.id === file.documentTypeId);

  const getOverallProgress = () => {
    const total = allFiles.length;
    const completed = allFiles.filter(f => f.classificationStatus === 'completed').length;
    const classifying = allFiles.filter(f => f.classificationStatus === 'classifying').length;
    const failed = allFiles.filter(f => f.classificationStatus === 'failed').length;
    const pending = allFiles.filter(f => f.classificationStatus === 'pending').length;

    return { total, completed, classifying, failed, pending };
  };

  const progress = getOverallProgress();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${
            isClassifying ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            {isClassifying ? (
              <Cog6ToothIcon className="h-6 w-6 text-blue-600 animate-spin" />
            ) : (
              <SparklesIcon className="h-6 w-6 text-green-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              AI Classification
            </h3>
            <p className="text-xs text-gray-400">
              {isClassifying ? 'Analyzing documents...' : 'Classification Complete'}
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
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
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
            {progress.classifying > 0 && (
              <div className="flex items-center text-yellow-400">
                <Cog6ToothIcon className="h-3 w-3 mr-1 animate-spin" />
                <span>{progress.classifying} Processing</span>
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
      </div>

      {/* File Classification Results */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4">
          {/* Status Badge */}
          <div className={`p-4 rounded-lg border ${
            file.classificationStatus === 'completed'
              ? 'bg-green-900/20 border-green-500'
              : file.classificationStatus === 'classifying'
              ? 'bg-yellow-900/20 border-yellow-500'
              : file.classificationStatus === 'failed'
              ? 'bg-red-900/20 border-red-500'
              : 'bg-gray-800 border-gray-600'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {file.classificationStatus === 'completed' && (
                <>
                  <CheckIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-400">Classification Complete</span>
                </>
              )}
              {file.classificationStatus === 'classifying' && (
                <>
                  <Cog6ToothIcon className="h-5 w-5 text-yellow-500 animate-spin" />
                  <span className="text-sm font-medium text-yellow-400">Classifying...</span>
                </>
              )}
              {file.classificationStatus === 'failed' && (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-400">Classification Failed</span>
                </>
              )}
              {file.classificationStatus === 'pending' && (
                <>
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-400">Pending</span>
                </>
              )}
            </div>

            {file.classificationStatus === 'pending' && (
              <p className="text-xs text-gray-400">
                Waiting to be classified...
              </p>
            )}

            {file.classificationStatus === 'classifying' && (
              <p className="text-xs text-gray-400">
                AI is analyzing this document to determine its type...
              </p>
            )}
          </div>

          {/* Classification Results */}
          {file.classificationStatus === 'completed' && file.documentTypeName && (
            <>
              {/* Document Type */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Document Type</h4>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">📄</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-white">
                      {file.documentTypeName}
                    </p>
                    {docType?.description && (
                      <p className="text-xs text-gray-400 mt-1">
                        {docType.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Confidence Score */}
              {file.classificationConfidence !== undefined && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Confidence Score</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">
                        {(file.classificationConfidence * 100).toFixed(0)}%
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        file.classificationConfidence > 0.8
                          ? 'bg-green-100 text-green-800'
                          : file.classificationConfidence > 0.5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {file.classificationConfidence > 0.8
                          ? 'High Confidence'
                          : file.classificationConfidence > 0.5
                          ? 'Medium Confidence'
                          : 'Low Confidence'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          file.classificationConfidence > 0.8
                            ? 'bg-green-500'
                            : file.classificationConfidence > 0.5
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${file.classificationConfidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              {file.classificationReasoning && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">AI Reasoning</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {file.classificationReasoning}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Failed State */}
          {file.classificationStatus === 'failed' && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-400 mb-2">Error</h4>
              <p className="text-xs text-red-300">
                Failed to classify this document. The AI service may be temporarily unavailable.
                You can manually select a document type in the metadata step.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassificationPanel;
