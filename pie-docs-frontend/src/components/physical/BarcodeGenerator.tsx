import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { generateBarcode, validateBarcodeUniqueness, addBarcodeLocally } from '@/store/slices/physicalDocsSlice';
import { barcodeGenerator } from '@/utils/barcodeGenerator';
import type { BarcodeGenerationOptions } from '@/utils/barcodeGenerator';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { createError, getErrorMessage } from '@/types/errors';

interface BarcodeGeneratorProps {
  documentId?: string;
  assetId?: string;
  onBarcodeGenerated?: (barcode: { code: string; image: string }) => void;
  className?: string;
}

export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  documentId,
  assetId,
  onBarcodeGenerated,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const { configuration, loading, errors } = useAppSelector(state => state.physicalDocs);

  const [selectedFormat, setSelectedFormat] = useState(configuration.defaultSettings.defaultFormat);
  const [prefix, setPrefix] = useState(configuration.defaultSettings.prefix);
  const [suffix, setSuffix] = useState(configuration.defaultSettings.suffix);
  const [includeChecksum, setIncludeChecksum] = useState(configuration.defaultSettings.includeChecksum);
  const [skipValidation, setSkipValidation] = useState(false);
  const [generatedBarcode, setGeneratedBarcode] = useState<{ code: string; image: string } | null>(null);
  const [validationResult, setValidationResult] = useState<{ isUnique: boolean; message: string } | null>(null);

  const formatOptions = configuration.barcodeFormats;

  const handleGenerateBarcode = async (retryCount = 0) => {
    try {
      const selectedFormatConfig = formatOptions.find(f => f.id === selectedFormat);
      if (!selectedFormatConfig) {
        throw new Error('Invalid format selected');
      }

      // Generate unique code with retry mechanism
      let code = barcodeGenerator.generateUniqueId(prefix, suffix);
      let validation: { isUnique: boolean; message?: string } | null = null;

      // Try to validate uniqueness, with fallback if validation fails or is skipped
      if (skipValidation) {
        validation = { isUnique: true };
      } else {
        try {
          validation = await dispatch(validateBarcodeUniqueness(code)).unwrap();
        } catch (validationError) {
          console.warn('Uniqueness validation failed, proceeding with generation:', validationError);
          // If validation endpoint fails, proceed anyway (assume unique)
          validation = { isUnique: true };
        }
      }

      if (!validation.isUnique && retryCount < 3) {
        // Auto-retry with a different code (up to 3 times)
        console.log(`Code exists, retrying... (attempt ${retryCount + 1})`);
        return handleGenerateBarcode(retryCount + 1);
      }

      if (!validation.isUnique && retryCount >= 3) {
        setValidationResult({
          isUnique: false,
          message: 'Unable to generate unique code after multiple attempts. Please try with different prefix/suffix.',
        });
        return;
      }

      // Generate barcode image
      const options: BarcodeGenerationOptions = {
        format: selectedFormatConfig.standard,
        prefix,
        suffix,
        includeChecksum,
        ...selectedFormatConfig.configuration,
      };

      const image = await barcodeGenerator.generateBarcodeImage(code, options);

      const barcodeData = { code, image };
      setGeneratedBarcode(barcodeData);

      // Notify parent component immediately
      onBarcodeGenerated?.(barcodeData);

      // Add to local Redux store immediately so it shows in history
      const barcodeRecord = {
        id: `local-${Date.now()}`,
        code,
        format: formatOptions.find(f => f.id === selectedFormat) || formatOptions[0],
        documentId,
        assetId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        metadata: { image }
      };
      dispatch(addBarcodeLocally(barcodeRecord));

      // Try to dispatch to Redux store (save to backend)
      try {
        await dispatch(generateBarcode({
          documentId,
          assetId,
          format: selectedFormat,
          prefix,
          suffix,
        })).unwrap();
        setValidationResult({ isUnique: true, message: 'Barcode generated and saved successfully!' });
      } catch (storeError: any) {
        console.warn('Failed to save to backend, but barcode was generated:', storeError);
        // Show warning but still display the barcode
        setValidationResult({
          isUnique: true,
          message: 'Barcode generated locally! (Warning: Could not save to server - you can still download and use it)'
        });
      }

    } catch (error) {
      console.error('Failed to generate barcode:', error);
      const barcodeError = createError.barcode(
        error instanceof Error ? error.message : 'Failed to generate barcode',
        'generate',
        selectedFormat
      );
      setValidationResult({
        isUnique: false,
        message: getErrorMessage(barcodeError),
      });
    }
  };

  const handleRegenerateCorrupted = async () => {
    if (!generatedBarcode) return;

    try {
      const selectedFormatConfig = formatOptions.find(f => f.id === selectedFormat);
      if (!selectedFormatConfig) return;

      const options: BarcodeGenerationOptions = {
        format: selectedFormatConfig.standard,
        prefix,
        suffix,
        includeChecksum,
        ...selectedFormatConfig.configuration,
      };

      const newBarcode = await barcodeGenerator.regenerateBarcode(generatedBarcode.code, options);
      setGeneratedBarcode(newBarcode);
      setValidationResult({ isUnique: true, message: 'Barcode regenerated successfully!' });

      onBarcodeGenerated?.(newBarcode);
    } catch (error) {
      console.error('Failed to regenerate barcode:', error);
    }
  };

  const handleDownloadBarcode = () => {
    if (!generatedBarcode) return;

    const link = document.createElement('a');
    link.download = `barcode_${generatedBarcode.code}.png`;
    link.href = generatedBarcode.image;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    // Update default values when configuration changes
    setSelectedFormat(configuration.defaultSettings.defaultFormat);
    setPrefix(configuration.defaultSettings.prefix);
    setSuffix(configuration.defaultSettings.suffix);
    setIncludeChecksum(configuration.defaultSettings.includeChecksum);
  }, [configuration.defaultSettings]);

  return (
    <ErrorBoundary>
      <div className={`bg-white rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Barcode Generator
        </h2>

        {/* Format Selection */}
        <div className="mb-4">
          <label htmlFor="barcode-format" className="block text-sm font-medium text-gray-700 mb-2">
            Barcode Format
          </label>
          <select
            id="barcode-format"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {formatOptions.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name} ({format.type === '2d' ? '2D' : 'Linear'})
              </option>
            ))}
          </select>
        </div>

        {/* Prefix and Suffix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="barcode-prefix" className="block text-sm font-medium text-gray-700 mb-2">
              Prefix
            </label>
            <input
              id="barcode-prefix"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="DOC"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="barcode-suffix" className="block text-sm font-medium text-gray-700 mb-2">
              Suffix
            </label>
            <input
              id="barcode-suffix"
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value.toUpperCase())}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Options */}
        <div className="mb-6 space-y-3">
          <label htmlFor="include-checksum" className="flex items-center">
            <input
              id="include-checksum"
              type="checkbox"
              checked={includeChecksum}
              onChange={(e) => setIncludeChecksum(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Include checksum for validation</span>
          </label>
          <label htmlFor="skip-validation" className="flex items-center">
            <input
              id="skip-validation"
              type="checkbox"
              checked={skipValidation}
              onChange={(e) => setSkipValidation(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Skip uniqueness validation (use with caution)</span>
          </label>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateBarcode}
          disabled={loading.generating}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading.generating ? 'Generating...' : 'Generate Barcode'}
        </button>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={`mb-4 p-3 rounded-md ${
          validationResult.message.includes('Warning')
            ? 'bg-yellow-500/20 border border-yellow-400/50 text-yellow-200'
            : validationResult.isUnique
            ? 'bg-green-500/20 border border-green-400/50 text-green-200'
            : 'bg-red-500/20 border border-red-400/50 text-red-200'
        }`}>
          {validationResult.message}
        </div>
      )}

      {/* Error Display */}
      {errors.generation && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
          {errors.generation}
        </div>
      )}

      {/* Generated Barcode Display */}
      {generatedBarcode && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Generated Barcode</h3>

          {/* Barcode Image */}
          <div className="flex justify-center mb-4">
            <div className="bg-white p-4 rounded border">
              <img
                src={generatedBarcode.image}
                alt={`Barcode: ${generatedBarcode.code}`}
                className="max-w-full h-auto"
              />
            </div>
          </div>

          {/* Barcode Code */}
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">Code:</p>
            <p className="font-mono text-lg font-semibold text-gray-800">
              {generatedBarcode.code}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={handleDownloadBarcode}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Download PNG
            </button>
            <button
              onClick={handleRegenerateCorrupted}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Document/Asset Info */}
      {(documentId || assetId) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          {documentId && (
            <p className="text-sm text-blue-800">Document ID: {documentId}</p>
          )}
          {assetId && (
            <p className="text-sm text-blue-800">Asset ID: {assetId}</p>
          )}
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};