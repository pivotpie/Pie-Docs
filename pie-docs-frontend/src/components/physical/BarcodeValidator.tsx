import React, { useState, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { barcodeGenerator } from '@/utils/barcodeGenerator';

interface BarcodeValidatorProps {
  onValidationComplete?: (result: ValidationResult) => void;
  className?: string;
}

interface ValidationResult {
  isValid: boolean;
  code: string;
  format: string;
  issues: ValidationIssue[];
  metadata?: {
    checksum?: string;
    length: number;
    characterSet: string;
    estimatedVersion?: number;
  };
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
}

type ValidationMode = 'single' | 'batch' | 'file' | 'camera';

export const BarcodeValidator: React.FC<BarcodeValidatorProps> = ({
  onValidationComplete,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const { configuration, loading, errors } = useAppSelector(state => state.physicalDocs);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);

  const [validationMode, setValidationMode] = useState<ValidationMode>('single');
  const [inputCode, setInputCode] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('auto');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [batchCodes, setBatchCodes] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  const formatOptions = [
    { id: 'auto', name: 'Auto-detect', standard: 'AUTO' },
    ...configuration.barcodeFormats,
  ];

  const validateCodeFormat = useCallback((code: string, format: string): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    if (!code || code.trim() === '') {
      issues.push({
        type: 'error',
        code: 'EMPTY_CODE',
        message: 'Barcode cannot be empty',
        suggestion: 'Enter a valid barcode value',
      });
      return issues;
    }

    const trimmedCode = code.trim();

    // Auto-detect format if needed
    if (format === 'auto') {
      const detectedFormat = detectBarcodeFormat(trimmedCode);
      if (!detectedFormat) {
        issues.push({
          type: 'warning',
          code: 'UNKNOWN_FORMAT',
          message: 'Could not auto-detect barcode format',
          suggestion: 'Manually select the correct format',
        });
      }
      format = detectedFormat || 'CODE128';
    }

    // Format-specific validation
    switch (format) {
      case 'CODE128':
        if (!barcodeGenerator.validateBarcodeFormat(trimmedCode, 'CODE128')) {
          issues.push({
            type: 'error',
            code: 'INVALID_CODE128',
            message: 'Invalid Code 128 format',
            suggestion: 'Code 128 supports ASCII characters (0-127) and max length 80',
          });
        }
        if (trimmedCode.length > 80) {
          issues.push({
            type: 'error',
            code: 'TOO_LONG',
            message: 'Code exceeds maximum length for Code 128',
            suggestion: 'Reduce code length to 80 characters or less',
          });
        }
        break;

      case 'CODE39':
        if (!barcodeGenerator.validateBarcodeFormat(trimmedCode, 'CODE39')) {
          issues.push({
            type: 'error',
            code: 'INVALID_CODE39',
            message: 'Invalid Code 39 format',
            suggestion: 'Code 39 supports numbers, uppercase letters, and symbols: - . $ / + % space',
          });
        }
        if (trimmedCode.length > 43) {
          issues.push({
            type: 'error',
            code: 'TOO_LONG',
            message: 'Code exceeds maximum length for Code 39',
            suggestion: 'Reduce code length to 43 characters or less',
          });
        }
        break;

      case 'QR':
        if (!barcodeGenerator.validateBarcodeFormat(trimmedCode, 'QR')) {
          issues.push({
            type: 'error',
            code: 'INVALID_QR',
            message: 'Invalid QR code format',
            suggestion: 'QR codes can contain up to 4,296 characters',
          });
        }
        break;

      case 'DATAMATRIX':
        if (!barcodeGenerator.validateBarcodeFormat(trimmedCode, 'DATAMATRIX')) {
          issues.push({
            type: 'error',
            code: 'INVALID_DATAMATRIX',
            message: 'Invalid Data Matrix format',
            suggestion: 'Data Matrix codes can contain up to 3,116 characters',
          });
        }
        break;
    }

    // General validation checks
    if (trimmedCode !== code) {
      issues.push({
        type: 'warning',
        code: 'WHITESPACE',
        message: 'Code contains leading/trailing whitespace',
        suggestion: 'Remove extra spaces for better compatibility',
      });
    }

    if (/[^\x20-\x7E]/.test(trimmedCode) && format !== 'QR') {
      issues.push({
        type: 'warning',
        code: 'NON_ASCII',
        message: 'Code contains non-ASCII characters',
        suggestion: 'Use ASCII characters for better compatibility',
      });
    }

    // Check for common issues
    if (trimmedCode.length < 3) {
      issues.push({
        type: 'warning',
        code: 'TOO_SHORT',
        message: 'Code is very short',
        suggestion: 'Consider using longer codes for better uniqueness',
      });
    }

    if (/^(.)\1+$/.test(trimmedCode)) {
      issues.push({
        type: 'warning',
        code: 'REPETITIVE',
        message: 'Code consists of repeated characters',
        suggestion: 'Use more varied characters for better uniqueness',
      });
    }

    return issues;
  }, []);

  const detectBarcodeFormat = useCallback((code: string): string | null => {
    // Simple format detection based on content and length
    if (/^[0-9]{8,14}$/.test(code)) {
      return 'EAN'; // EAN-8, EAN-13, UPC
    }
    if (/^[0-9A-Z\-. $/+%]*$/.test(code) && code.length <= 43) {
      return 'CODE39';
    }
    if (code.length <= 80 && /^[\x20-\x7E]*$/.test(code)) {
      return 'CODE128';
    }
    if (code.length > 80) {
      return 'QR';
    }
    return null;
  }, []);

  const generateMetadata = useCallback((code: string, format: string) => {
    const characterSet = detectCharacterSet(code);
    const checksum = barcodeGenerator.generateChecksum(code);

    return {
      checksum,
      length: code.length,
      characterSet,
      estimatedVersion: format === 'QR' ? Math.ceil(code.length / 100) : undefined,
    };
  }, []);

  const detectCharacterSet = useCallback((code: string): string => {
    if (/^[0-9]*$/.test(code)) return 'Numeric';
    if (/^[0-9A-Z $%*+\-./:]*$/.test(code)) return 'Alphanumeric';
    if (/^[\x20-\x7E]*$/.test(code)) return 'ASCII';
    return 'Unicode';
  }, []);

  const validateSingleCode = useCallback(async (code: string, format: string): Promise<ValidationResult> => {
    const issues = validateCodeFormat(code, format);
    const isValid = !issues.some(issue => issue.type === 'error');
    const metadata = generateMetadata(code, format);

    return {
      isValid,
      code: code.trim(),
      format,
      issues,
      metadata,
    };
  }, [validateCodeFormat, generateMetadata]);

  const handleSingleValidation = async () => {
    if (!inputCode.trim()) return;

    setIsValidating(true);
    try {
      const result = await validateSingleCode(inputCode, selectedFormat);
      setValidationResults([result]);
      onValidationComplete?.(result);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBatchValidation = async () => {
    if (!batchCodes.trim()) return;

    setIsValidating(true);
    try {
      const codes = batchCodes.split('\n').map(code => code.trim()).filter(code => code !== '');
      const results: ValidationResult[] = [];

      for (const code of codes) {
        const result = await validateSingleCode(code, selectedFormat);
        results.push(result);
      }

      setValidationResults(results);
    } catch (error) {
      console.error('Batch validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    try {
      const content = await file.text();
      const codes = content.split('\n').map(code => code.trim()).filter(code => code !== '');
      const results: ValidationResult[] = [];

      for (const code of codes) {
        const result = await validateSingleCode(code, selectedFormat);
        results.push(result);
      }

      setValidationResults(results);
    } catch (error) {
      console.error('File validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera access failed:', error);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current?.srcObject) {
      const tracks = (cameraRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      cameraRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const exportResults = () => {
    if (validationResults.length === 0) return;

    const csvContent = [
      'Code,Format,Valid,Issues,Character Set,Length,Checksum',
      ...validationResults.map(result =>
        `"${result.code}","${result.format}","${result.isValid}","${result.issues.map(i => i.message).join('; ')}","${result.metadata?.characterSet}","${result.metadata?.length}","${result.metadata?.checksum}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `validation_results_${Date.now()}.csv`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const clearResults = () => {
    setValidationResults([]);
    setInputCode('');
    setBatchCodes('');
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Barcode Validation System
        </h2>

        {/* Validation Mode Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Validation Mode
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { value: 'single', label: 'Single Code', icon: '🔍' },
              { value: 'batch', label: 'Batch Codes', icon: '📝' },
              { value: 'file', label: 'File Upload', icon: '📄' },
              { value: 'camera', label: 'Camera Scan', icon: '📷' },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setValidationMode(mode.value as ValidationMode)}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  validationMode === mode.value
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

        {/* Format Selection */}
        <div className="mb-4">
          <label htmlFor="validation-format" className="block text-sm font-medium text-gray-700 mb-2">
            Expected Format
          </label>
          <select
            id="validation-format"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {formatOptions.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name}
              </option>
            ))}
          </select>
        </div>

        {/* Single Code Validation */}
        {validationMode === 'single' && (
          <div className="mb-4">
            <label htmlFor="single-code" className="block text-sm font-medium text-gray-700 mb-2">
              Barcode to Validate
            </label>
            <div className="flex gap-2">
              <input
                id="single-code"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter barcode value..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSingleValidation}
                disabled={isValidating || !inputCode.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? 'Validating...' : 'Validate'}
              </button>
            </div>
          </div>
        )}

        {/* Batch Validation */}
        {validationMode === 'batch' && (
          <div className="mb-4">
            <label htmlFor="batch-codes" className="block text-sm font-medium text-gray-700 mb-2">
              Barcodes to Validate (one per line)
            </label>
            <textarea
              id="batch-codes"
              rows={6}
              value={batchCodes}
              onChange={(e) => setBatchCodes(e.target.value)}
              placeholder="Enter barcodes, one per line..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleBatchValidation}
              disabled={isValidating || !batchCodes.trim()}
              className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Validate Batch'}
            </button>
          </div>
        )}

        {/* File Upload */}
        {validationMode === 'file' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File with Barcodes
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: .txt, .csv (one barcode per line)
            </p>
          </div>
        )}

        {/* Camera Scan */}
        {validationMode === 'camera' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Camera Scanner
              </label>
              <div className="flex gap-2">
                <button
                  onClick={startCamera}
                  disabled={cameraActive}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Start Camera
                </button>
                <button
                  onClick={stopCamera}
                  disabled={!cameraActive}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Stop Camera
                </button>
              </div>
            </div>
            <video
              ref={cameraRef}
              autoPlay
              className="w-full h-64 bg-gray-200 rounded border"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />
            {!cameraActive && (
              <div className="w-full h-64 bg-gray-200 rounded border flex items-center justify-center">
                <p className="text-gray-500">Camera not active</p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Camera scanning requires additional barcode reading library (QuaggaJS/ZXing)
            </p>
          </div>
        )}
      </div>

      {/* Validation Results */}
      {validationResults.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              Validation Results ({validationResults.length} codes)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={exportResults}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Export CSV
              </button>
              <button
                onClick={clearResults}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Clear Results
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {validationResults.filter(r => r.isValid).length}
              </div>
              <div className="text-sm text-green-700">Valid</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {validationResults.filter(r => !r.isValid).length}
              </div>
              <div className="text-sm text-red-700">Invalid</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {validationResults.filter(r => r.issues.some(i => i.type === 'warning')).length}
              </div>
              <div className="text-sm text-yellow-700">Warnings</div>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {validationResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${
                  result.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">
                      {result.isValid ? '✅' : '❌'}
                    </span>
                    <code className="font-mono text-sm bg-white px-2 py-1 rounded border">
                      {result.code}
                    </code>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {result.format}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.metadata?.length} chars • {result.metadata?.characterSet}
                  </div>
                </div>

                {result.metadata && (
                  <div className="text-xs text-gray-600 mb-2">
                    Checksum: {result.metadata.checksum}
                    {result.metadata.estimatedVersion && (
                      <span> • QR Version: ~{result.metadata.estimatedVersion}</span>
                    )}
                  </div>
                )}

                {result.issues.length > 0 && (
                  <div className="space-y-1">
                    {result.issues.map((issue, issueIndex) => (
                      <div key={issueIndex} className="flex items-start">
                        <span className="mr-2">{getIssueIcon(issue.type)}</span>
                        <div className="flex-1">
                          <div className={`text-sm ${getIssueColor(issue.type)}`}>
                            {issue.message}
                          </div>
                          {issue.suggestion && (
                            <div className="text-xs text-gray-600 mt-1">
                              💡 {issue.suggestion}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {errors.validation && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
          {errors.validation}
        </div>
      )}
    </div>
  );
};