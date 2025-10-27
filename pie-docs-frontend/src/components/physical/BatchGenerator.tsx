import React, { useState, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { generateBarcode } from '@/store/slices/physicalDocsSlice';
import { barcodeGenerator } from '@/utils/barcodeGenerator';
import type { BarcodeGenerationOptions } from '@/utils/barcodeGenerator';
import JSZip from 'jszip';

interface BatchGeneratorProps {
  onBatchGenerated?: (barcodes: Array<{ code: string; image: string }>) => void;
  className?: string;
}

type BatchMode = 'sequential' | 'custom' | 'template' | 'csv';

interface BatchSettings {
  mode: BatchMode;
  count: number;
  format: string;
  prefix: string;
  suffix: string;
  includeChecksum: boolean;
  startNumber: number;
  customCodes: string[];
  templatePattern: string;
  csvData: string;
}

export const BatchGenerator: React.FC<BatchGeneratorProps> = ({
  onBatchGenerated,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const { configuration, loading, errors } = useAppSelector(state => state.physicalDocs);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<BatchSettings>({
    mode: 'sequential',
    count: 10,
    format: configuration.defaultSettings.defaultFormat,
    prefix: configuration.defaultSettings.prefix,
    suffix: configuration.defaultSettings.suffix,
    includeChecksum: configuration.defaultSettings.includeChecksum,
    startNumber: 1,
    customCodes: [],
    templatePattern: '{prefix}{number:4}{suffix}',
    csvData: '',
  });

  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBarcodes, setGeneratedBarcodes] = useState<Array<{ code: string; image: string }>>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const formatOptions = configuration.barcodeFormats;

  const validateSettings = useCallback((): string[] => {
    const errors: string[] = [];

    if (settings.count <= 0) {
      errors.push('Count must be greater than 0');
    }

    if (settings.count > 1000) {
      errors.push('Maximum batch size is 1000 barcodes');
    }

    if (settings.mode === 'custom' && settings.customCodes.length === 0) {
      errors.push('Custom codes list cannot be empty');
    }

    if (settings.mode === 'csv' && !settings.csvData.trim()) {
      errors.push('CSV data cannot be empty');
    }

    if (settings.mode === 'template' && !settings.templatePattern.includes('{number')) {
      errors.push('Template pattern must include {number} placeholder');
    }

    return errors;
  }, [settings]);

  const parseTemplatePattern = useCallback((pattern: string, number: number): string => {
    let result = pattern;

    // Replace placeholders
    result = result.replace(/\{prefix\}/g, settings.prefix);
    result = result.replace(/\{suffix\}/g, settings.suffix);
    result = result.replace(/\{date\}/g, new Date().toISOString().split('T')[0]);
    result = result.replace(/\{time\}/g, new Date().toTimeString().split(' ')[0].replace(/:/g, ''));

    // Handle number formatting with padding
    const numberMatch = result.match(/\{number:(\d+)\}/);
    if (numberMatch) {
      const padding = parseInt(numberMatch[1]);
      result = result.replace(/\{number:\d+\}/, number.toString().padStart(padding, '0'));
    } else {
      result = result.replace(/\{number\}/g, number.toString());
    }

    return result;
  }, [settings.prefix, settings.suffix]);

  const generateSequentialCodes = useCallback((): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < settings.count; i++) {
      const number = settings.startNumber + i;
      if (settings.mode === 'template') {
        codes.push(parseTemplatePattern(settings.templatePattern, number));
      } else {
        codes.push(`${settings.prefix}${number.toString().padStart(6, '0')}${settings.suffix}`);
      }
    }
    return codes;
  }, [settings, parseTemplatePattern]);

  const parseCSVData = useCallback((): string[] => {
    const lines = settings.csvData.trim().split('\n');
    const codes: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        // If CSV has headers, skip them
        if (trimmedLine.toLowerCase().includes('code') || trimmedLine.toLowerCase().includes('barcode')) {
          continue;
        }

        // Extract first column as code
        const columns = trimmedLine.split(',');
        if (columns.length > 0) {
          codes.push(columns[0].trim().replace(/"/g, ''));
        }
      }
    }

    return codes;
  }, [settings.csvData]);

  const generateCodes = useCallback((): string[] => {
    switch (settings.mode) {
      case 'sequential':
      case 'template':
        return generateSequentialCodes();
      case 'custom':
        return settings.customCodes.filter(code => code.trim() !== '');
      case 'csv':
        return parseCSVData();
      default:
        return [];
    }
  }, [settings.mode, generateSequentialCodes, settings.customCodes, parseCSVData]);

  const handleGenerate = async () => {
    const errors = validateSettings();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setValidationErrors([]);

    try {
      const codes = generateCodes();
      const selectedFormatConfig = formatOptions.find(f => f.id === settings.format);

      if (!selectedFormatConfig) {
        throw new Error('Invalid format selected');
      }

      const options: BarcodeGenerationOptions = {
        format: selectedFormatConfig.standard,
        prefix: settings.prefix,
        suffix: settings.suffix,
        includeChecksum: settings.includeChecksum,
        ...selectedFormatConfig.configuration,
      };

      const barcodes: Array<{ code: string; image: string }> = [];

      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];

        try {
          const image = await barcodeGenerator.generateBarcodeImage(code, options);
          barcodes.push({ code, image });

          // Dispatch to Redux store
          await dispatch(generateBarcode({
            format: settings.format,
            prefix: settings.prefix,
            suffix: settings.suffix,
          }));

          setProgress(((i + 1) / codes.length) * 100);
        } catch (error) {
          console.error(`Failed to generate barcode for code ${code}:`, error);
          // Continue with other barcodes
        }

        // Small delay to prevent UI blocking
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      setGeneratedBarcodes(barcodes);
      onBatchGenerated?.(barcodes);

    } catch (error) {
      console.error('Batch generation failed:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Batch generation failed']);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target?.result as string;
        setSettings(prev => ({ ...prev, csvData: csvContent }));
      };
      reader.readAsText(file);
    }
  };

  const handleCustomCodesChange = (value: string) => {
    const codes = value.split('\n').map(code => code.trim()).filter(code => code !== '');
    setSettings(prev => ({ ...prev, customCodes: codes }));
  };

  const downloadBatch = () => {
    if (generatedBarcodes.length === 0) return;

    const zipFile = new JSZip();

    generatedBarcodes.forEach((barcode, index) => {
      const imageData = barcode.image.split(',')[1]; // Remove data URL prefix
      zipFile.file(`${barcode.code}.png`, imageData, { base64: true });
    });

    zipFile.generateAsync({ type: 'blob' }).then((content: Blob) => {
      const link = document.createElement('a');
      link.download = `batch_barcodes_${Date.now()}.zip`;
      link.href = URL.createObjectURL(content);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });
  };

  const exportToCSV = () => {
    if (generatedBarcodes.length === 0) return;

    const csvContent = [
      'Code,Generated',
      ...generatedBarcodes.map(barcode => `${barcode.code},${new Date().toISOString()}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `batch_codes_${Date.now()}.csv`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Batch Barcode Generator
        </h2>

        {/* Batch Mode Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generation Mode
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { value: 'sequential', label: 'Sequential Numbers', icon: '🔢' },
              { value: 'custom', label: 'Custom List', icon: '📝' },
              { value: 'template', label: 'Template Pattern', icon: '🎨' },
              { value: 'csv', label: 'CSV Import', icon: '📄' },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setSettings(prev => ({ ...prev, mode: mode.value as BatchMode }))}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  settings.mode === mode.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-lg mb-1">{mode.icon}</div>
                <div className="text-xs font-medium">{mode.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Format and Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="batch-format" className="block text-sm font-medium text-gray-700 mb-2">
              Barcode Format
            </label>
            <select
              id="batch-format"
              value={settings.format}
              onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {formatOptions.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.name} ({format.type === '2d' ? '2D' : 'Linear'})
                </option>
              ))}
            </select>
          </div>

          {(settings.mode === 'sequential' || settings.mode === 'template') && (
            <div>
              <label htmlFor="batch-count" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Barcodes
              </label>
              <input
                id="batch-count"
                type="number"
                min="1"
                max="1000"
                value={settings.count}
                onChange={(e) => setSettings(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Prefix and Suffix */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="batch-prefix" className="block text-sm font-medium text-gray-700 mb-2">
              Prefix
            </label>
            <input
              id="batch-prefix"
              type="text"
              value={settings.prefix}
              onChange={(e) => setSettings(prev => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
              placeholder="DOC"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="batch-suffix" className="block text-sm font-medium text-gray-700 mb-2">
              Suffix
            </label>
            <input
              id="batch-suffix"
              type="text"
              value={settings.suffix}
              onChange={(e) => setSettings(prev => ({ ...prev, suffix: e.target.value.toUpperCase() }))}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Mode-specific Settings */}
        {settings.mode === 'sequential' && (
          <div className="mb-4">
            <label htmlFor="start-number" className="block text-sm font-medium text-gray-700 mb-2">
              Starting Number
            </label>
            <input
              id="start-number"
              type="number"
              min="1"
              value={settings.startNumber}
              onChange={(e) => setSettings(prev => ({ ...prev, startNumber: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {settings.mode === 'template' && (
          <div className="mb-4">
            <label htmlFor="template-pattern" className="block text-sm font-medium text-gray-700 mb-2">
              Template Pattern
            </label>
            <input
              id="template-pattern"
              type="text"
              value={settings.templatePattern}
              onChange={(e) => setSettings(prev => ({ ...prev, templatePattern: e.target.value }))}
              placeholder="{prefix}{number:4}{suffix}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available placeholders: {'{prefix}'}, {'{suffix}'}, {'{number}'}, {'{number:4}'} (padded), {'{date}'}, {'{time}'}
            </p>
          </div>
        )}

        {settings.mode === 'custom' && (
          <div className="mb-4">
            <label htmlFor="custom-codes" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Codes (one per line)
            </label>
            <textarea
              id="custom-codes"
              rows={6}
              value={settings.customCodes.join('\n')}
              onChange={(e) => handleCustomCodesChange(e.target.value)}
              placeholder="Enter codes, one per line..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {settings.mode === 'csv' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File Upload
            </label>
            <div className="flex items-center space-x-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm"
              >
                Choose CSV File
              </button>
              <span className="text-sm text-gray-600">
                {settings.csvData ? `${parseCSVData().length} codes detected` : 'No file selected'}
              </span>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="mb-6">
          <label htmlFor="batch-checksum" className="flex items-center">
            <input
              id="batch-checksum"
              type="checkbox"
              checked={settings.includeChecksum}
              onChange={(e) => setSettings(prev => ({ ...prev, includeChecksum: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Include checksum for validation</span>
          </label>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? `Generating... ${Math.round(progress)}%` : 'Generate Batch'}
        </button>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {generatedBarcodes.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              Generated Batch ({generatedBarcodes.length} barcodes)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={downloadBatch}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Download ZIP
              </button>
            </div>
          </div>

          {/* Preview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto">
            {generatedBarcodes.slice(0, 24).map((barcode, index) => (
              <div key={index} className="bg-white p-2 rounded border text-center">
                <img
                  src={barcode.image}
                  alt={barcode.code}
                  className="w-full h-auto mb-1"
                />
                <p className="text-xs font-mono text-gray-600 truncate">
                  {barcode.code}
                </p>
              </div>
            ))}
          </div>

          {generatedBarcodes.length > 24 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Showing first 24 barcodes. Download ZIP for all {generatedBarcodes.length} barcodes.
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {errors.generation && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
          {errors.generation}
        </div>
      )}
    </div>
  );
};