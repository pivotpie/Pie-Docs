import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  format?: string;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  metadata?: Record<string, any>;
}

interface ValidationFeedbackProps {
  data: string;
  type: 'barcode' | 'document';
  onValidationComplete?: (result: ValidationResult) => void;
  className?: string;
}

const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  data,
  type,
  onValidationComplete,
  className = '',
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (data) {
      validateData();
    }
  }, [data, type]);

  const validateData = async () => {
    setIsValidating(true);

    try {
      // Simulate validation delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const result = type === 'barcode'
        ? await validateBarcode(data)
        : await validateDocument(data);

      setValidationResult(result);

      if (onValidationComplete) {
        onValidationComplete(result);
      }
    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        confidence: 0,
        errors: [`Validation failed: ${error}`],
        warnings: [],
        suggestions: ['Please try scanning again'],
      };

      setValidationResult(errorResult);

      if (onValidationComplete) {
        onValidationComplete(errorResult);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const validateBarcode = async (barcodeData: string): Promise<ValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic barcode validation
    if (!barcodeData || barcodeData.trim().length === 0) {
      errors.push('Barcode data is empty');
      suggestions.push('Ensure proper lighting and steady positioning');
      return { isValid: false, confidence: 0, errors, warnings, suggestions };
    }

    // Length validation
    if (barcodeData.length < 3) {
      errors.push('Barcode too short (minimum 3 characters)');
      suggestions.push('Scan from closer distance for better accuracy');
    }

    if (barcodeData.length > 100) {
      warnings.push('Unusually long barcode data');
    }

    // Character validation
    const invalidChars = barcodeData.match(/[^\w\-\.\/\s]/g);
    if (invalidChars) {
      warnings.push(`Contains special characters: ${invalidChars.join(', ')}`);
    }

    // Format detection
    let format = 'Unknown';
    let confidence = 0.7;

    if (/^\d+$/.test(barcodeData)) {
      if (barcodeData.length === 12 || barcodeData.length === 13) {
        format = 'UPC/EAN';
        confidence = 0.95;
      } else if (barcodeData.length === 8) {
        format = 'EAN-8';
        confidence = 0.9;
      } else {
        format = 'Numeric';
        confidence = 0.8;
      }
    } else if (/^[A-Z0-9\s\-\$\%\.\+\/]+$/i.test(barcodeData)) {
      format = 'Code 39/128';
      confidence = 0.85;
    }

    // Checksum validation (simplified)
    if (format.includes('UPC/EAN') && barcodeData.length === 13) {
      const isValidChecksum = validateEAN13Checksum(barcodeData);
      if (!isValidChecksum) {
        errors.push('Invalid EAN-13 checksum');
        suggestions.push('Rescan the barcode - may have read incorrectly');
      }
    }

    // Database lookup simulation
    const isInDatabase = Math.random() > 0.3; // 70% chance of being in database
    if (!isInDatabase) {
      warnings.push('Barcode not found in database');
      suggestions.push('This may be a new product or custom barcode');
    }

    // Quality checks
    if (confidence < 0.8) {
      warnings.push('Low confidence reading');
      suggestions.push('Try better lighting or scan from different angle');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      confidence,
      format,
      errors,
      warnings,
      suggestions,
      metadata: {
        length: barcodeData.length,
        inDatabase: isInDatabase,
        scannedAt: new Date().toISOString(),
      },
    };
  };

  const validateDocument = async (documentId: string): Promise<ValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Mock document validation
    const confidence = Math.random() * 0.4 + 0.6; // 60-100%

    // Quality checks
    if (confidence < 0.7) {
      warnings.push('Document quality could be improved');
      suggestions.push('Ensure good lighting and stable camera position');
    }

    if (confidence < 0.6) {
      errors.push('Document quality too low for processing');
      suggestions.push('Retake the photo with better conditions');
    }

    // Edge detection validation
    const edgesDetected = Math.random() > 0.2; // 80% success rate
    if (!edgesDetected) {
      warnings.push('Document edges not clearly detected');
      suggestions.push('Place document on contrasting background');
    }

    // Text detection simulation
    const textDetected = Math.random() > 0.1; // 90% success rate
    if (!textDetected) {
      warnings.push('No text detected in document');
      suggestions.push('Ensure document contains readable text');
    }

    // Size validation
    const isValidSize = Math.random() > 0.05; // 95% success rate
    if (!isValidSize) {
      errors.push('Document appears too small or blurry');
      suggestions.push('Move closer to the document or use better lighting');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      confidence,
      format: 'Document',
      errors,
      warnings,
      suggestions,
      metadata: {
        edgesDetected,
        textDetected,
        estimatedQuality: confidence,
        processedAt: new Date().toISOString(),
      },
    };
  };

  const validateEAN13Checksum = (barcode: string): boolean => {
    if (barcode.length !== 13) return false;

    const digits = barcode.split('').map(Number);
    const checkDigit = digits.pop()!;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }

    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    return calculatedCheckDigit === checkDigit;
  };

  const getStatusColor = () => {
    if (!validationResult) return 'bg-gray-500';
    if (validationResult.isValid) return 'bg-green-500';
    if (validationResult.warnings.length > 0 && validationResult.errors.length === 0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = () => {
    if (isValidating) {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </motion.div>
      );
    }

    if (!validationResult) return null;

    if (validationResult.isValid) {
      return (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (isValidating) return 'Validating...';
    if (!validationResult) return 'Ready to validate';

    if (validationResult.isValid) {
      return `Valid ${type} (${Math.round(validationResult.confidence * 100)}% confidence)`;
    }

    if (validationResult.warnings.length > 0 && validationResult.errors.length === 0) {
      return `Valid with warnings (${Math.round(validationResult.confidence * 100)}% confidence)`;
    }

    return `Invalid ${type}`;
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {/* Status header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor()}`}>
            {getStatusIcon()}
          </div>
          <div>
            <div className="text-white font-medium text-sm">
              {getStatusText()}
            </div>
            {validationResult?.format && (
              <div className="text-gray-400 text-xs">
                Format: {validationResult.format}
              </div>
            )}
          </div>
        </div>

        {validationResult && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-white"
          >
            <svg className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Quick feedback */}
      {validationResult && !showDetails && (
        <div className="space-y-2">
          {validationResult.errors.length > 0 && (
            <div className="text-red-300 text-sm">
              ❌ {validationResult.errors[0]}
            </div>
          )}
          {validationResult.warnings.length > 0 && validationResult.errors.length === 0 && (
            <div className="text-yellow-300 text-sm">
              ⚠️ {validationResult.warnings[0]}
            </div>
          )}
          {validationResult.isValid && validationResult.warnings.length === 0 && (
            <div className="text-green-300 text-sm">
              ✅ {type === 'barcode' ? 'Barcode' : 'Document'} is valid and ready to process
            </div>
          )}
        </div>
      )}

      {/* Detailed feedback */}
      <AnimatePresence>
        {showDetails && validationResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-4"
          >
            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div>
                <h4 className="text-red-300 font-medium text-sm mb-2">
                  Errors ({validationResult.errors.length})
                </h4>
                <div className="space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="text-red-200 text-sm flex items-start space-x-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div>
                <h4 className="text-yellow-300 font-medium text-sm mb-2">
                  Warnings ({validationResult.warnings.length})
                </h4>
                <div className="space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index} className="text-yellow-200 text-sm flex items-start space-x-2">
                      <span className="text-yellow-400 mt-0.5">•</span>
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {validationResult.suggestions.length > 0 && (
              <div>
                <h4 className="text-blue-300 font-medium text-sm mb-2">
                  Suggestions ({validationResult.suggestions.length})
                </h4>
                <div className="space-y-1">
                  {validationResult.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-blue-200 text-sm flex items-start space-x-2">
                      <span className="text-blue-400 mt-0.5">💡</span>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {validationResult.metadata && (
              <div>
                <h4 className="text-gray-300 font-medium text-sm mb-2">
                  Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(validationResult.metadata).map(([key, value]) => (
                    <div key={key} className="text-gray-400">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                      <span className="text-gray-300">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={validateData}
                disabled={isValidating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-3 rounded text-sm"
              >
                Re-validate
              </button>
              {!validationResult.isValid && (
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded text-sm"
                >
                  Accept Anyway
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ValidationFeedback;