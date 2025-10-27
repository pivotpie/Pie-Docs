import React, { useState } from 'react';
import type { OCRRetryControlsProps, OCRProcessingSettings } from '@/types/domain/OCR';

const OCRRetryControls: React.FC<OCRRetryControlsProps> = ({
  job,
  onRetry,
  onSettingsChange,
  disabled = false,
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [customSettings, setCustomSettings] = useState<Partial<OCRProcessingSettings>>({});
  const [retryReason, setRetryReason] = useState('');

  const canRetry = job.status === 'failed' && job.retryCount < job.maxRetries;

  const handleRetry = () => {
    if (!canRetry || disabled) return;

    const retryOptions = {
      jobId: job.id,
      newSettings: Object.keys(customSettings).length > 0 ? customSettings : undefined,
      reason: retryReason || 'Manual retry requested',
    };

    onRetry(retryOptions);
    setRetryReason('');
  };

  const handleSettingChange = (
    category: keyof OCRProcessingSettings,
    setting: string,
    value: boolean | number | string
  ) => {
    const newSettings = {
      ...customSettings,
      [category]: {
        ...customSettings[category],
        [setting]: value,
      },
    };
    setCustomSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleBasicSettingChange = (setting: string, value: boolean | number | string | string[]) => {
    const newSettings = {
      ...customSettings,
      [setting]: value,
    };
    setCustomSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const getRetryRecommendations = () => {
    const recommendations = [];

    if (job.error?.code === 'LOW_QUALITY_RESULT') {
      recommendations.push('Try increasing image resolution or enabling image preprocessing');
    }
    if (job.error?.code === 'LANGUAGE_DETECTION_FAILED') {
      recommendations.push('Manually specify the target languages');
    }
    if (job.error?.code === 'TIMEOUT_ERROR') {
      recommendations.push('Try processing with lower quality settings');
    }
    if (job.progress < 25) {
      recommendations.push('Check if the document format is supported');
    }

    return recommendations;
  };

  if (!canRetry) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center text-gray-600">
          <span className="mr-2">🚫</span>
          <span className="text-sm">
            {job.retryCount >= job.maxRetries
              ? `Maximum retry attempts reached (${job.maxRetries})`
              : 'Retry not available for current job status'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-lg mr-2" role="img" aria-label="Retry Controls">
            🔄
          </span>
          <h3 className="text-sm font-medium text-gray-900">Retry OCR Processing</h3>
        </div>
        <div className="text-xs text-gray-500">
          Attempts: {job.retryCount}/{job.maxRetries}
        </div>
      </div>

      {/* Error Info */}
      {job.error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm font-medium text-red-800 mb-1">Previous Error:</p>
          <p className="text-sm text-red-700">{job.error.message}</p>
          {job.error.code && (
            <p className="text-xs text-red-600 mt-1">Error Code: {job.error.code}</p>
          )}
        </div>
      )}

      {/* Recommendations */}
      {getRetryRecommendations().length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-2">💡 Recommendations:</p>
          <ul className="space-y-1">
            {getRetryRecommendations().map((recommendation, index) => (
              <li key={index} className="text-sm text-blue-700 flex items-start">
                <span className="mr-1 mt-0.5">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Retry Reason */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Retry Reason (Optional)
        </label>
        <textarea
          value={retryReason}
          onChange={(e) => setRetryReason(e.target.value)}
          placeholder="Describe what you're trying to improve..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={2}
          disabled={disabled}
        />
      </div>

      {/* Quick Settings */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Adjustments</h4>
        <div className="grid grid-cols-2 gap-3">
          {/* Quality Threshold */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Quality Threshold</label>
            <select
              value={customSettings.qualityThreshold || job.processingSettings.qualityThreshold}
              onChange={(e) => handleBasicSettingChange('qualityThreshold', parseInt(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={disabled}
            >
              <option value={90}>High (90%)</option>
              <option value={75}>Medium (75%)</option>
              <option value={60}>Low (60%)</option>
              <option value={40}>Minimum (40%)</option>
            </select>
          </div>

          {/* Target Languages */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Target Languages</label>
            <select
              value={customSettings.targetLanguages?.[0] || job.processingSettings.targetLanguages[0]}
              onChange={(e) => {
                const value = e.target.value;
                const languages = value === 'ar-en' ? ['ar', 'en'] : [value];
                handleBasicSettingChange('targetLanguages', languages);
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={disabled}
            >
              <option value="auto">Auto Detect</option>
              <option value="ar">Arabic Only</option>
              <option value="en">English Only</option>
              <option value="ar-en">Arabic + English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
          disabled={disabled}
        >
          <span className={`mr-1 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}>
            ▶️
          </span>
          Advanced Settings
        </button>
      </div>

      {/* Advanced Settings */}
      {showAdvancedSettings && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-4">
            {/* Image Preprocessing */}
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">Image Preprocessing</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={customSettings.imagePreprocessing?.enhanceContrast ??
                             job.processingSettings.imagePreprocessing.enhanceContrast}
                    onChange={(e) => handleSettingChange('imagePreprocessing', 'enhanceContrast', e.target.checked)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  Enhance Contrast
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={customSettings.imagePreprocessing?.denoiseImage ??
                             job.processingSettings.imagePreprocessing.denoiseImage}
                    onChange={(e) => handleSettingChange('imagePreprocessing', 'denoiseImage', e.target.checked)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  Denoise Image
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={customSettings.imagePreprocessing?.deskewImage ??
                             job.processingSettings.imagePreprocessing.deskewImage}
                    onChange={(e) => handleSettingChange('imagePreprocessing', 'deskewImage', e.target.checked)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  Deskew Image
                </label>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Resolution (DPI)</label>
                  <input
                    type="number"
                    min="150"
                    max="600"
                    step="50"
                    value={customSettings.imagePreprocessing?.resolutionDPI ??
                           job.processingSettings.imagePreprocessing.resolutionDPI}
                    onChange={(e) => handleSettingChange('imagePreprocessing', 'resolutionDPI', parseInt(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>

            {/* Text Processing */}
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">Text Processing</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={customSettings.textProcessing?.preserveFormatting ??
                             job.processingSettings.textProcessing.preserveFormatting}
                    onChange={(e) => handleSettingChange('textProcessing', 'preserveFormatting', e.target.checked)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  Preserve Formatting
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={customSettings.textProcessing?.extractTables ??
                             job.processingSettings.textProcessing.extractTables}
                    onChange={(e) => handleSettingChange('textProcessing', 'extractTables', e.target.checked)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  Extract Tables
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={customSettings.textProcessing?.extractHeaders ??
                             job.processingSettings.textProcessing.extractHeaders}
                    onChange={(e) => handleSettingChange('textProcessing', 'extractHeaders', e.target.checked)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  Extract Headers
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={customSettings.textProcessing?.mergeFragments ??
                             job.processingSettings.textProcessing.mergeFragments}
                    onChange={(e) => handleSettingChange('textProcessing', 'mergeFragments', e.target.checked)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  Merge Fragments
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setCustomSettings({});
            setRetryReason('');
            setShowAdvancedSettings(false);
          }}
          className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          disabled={disabled}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleRetry}
          disabled={disabled}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Retry OCR Processing
        </button>
      </div>
    </div>
  );
};

export default OCRRetryControls;