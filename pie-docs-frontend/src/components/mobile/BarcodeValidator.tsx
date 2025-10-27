import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarcodeFormat } from '@zxing/browser';

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  format: string;
  isDuplicate: boolean;
  errorType?: 'corrupted' | 'invalid_format' | 'not_found' | 'duplicate';
  suggestions?: string[];
}

interface BarcodeValidatorProps {
  barcode: string;
  format: BarcodeFormat;
  onValidationComplete: (result: ValidationResult) => void;
  onRetryRequested: () => void;
  isVisible: boolean;
}

const BarcodeValidator: React.FC<BarcodeValidatorProps> = ({
  barcode,
  format,
  onValidationComplete,
  onRetryRequested,
  isVisible
}) => {
  const [validationState, setValidationState] = useState<'validating' | 'success' | 'error' | 'duplicate'>('validating');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    if (barcode && isVisible) {
      validateBarcode();
    }
  }, [barcode, isVisible]);

  const validateBarcode = async () => {
    setValidationState('validating');
    setConfidence(0);

    try {
      // Simulate confidence building animation
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setConfidence(i);
      }

      // Perform actual validation
      const result = await performBarcodeValidation(barcode, format);
      setValidationResult(result);

      if (result.isDuplicate) {
        setValidationState('duplicate');
      } else if (result.isValid) {
        setValidationState('success');
      } else {
        setValidationState('error');
      }

      // Provide haptic feedback
      if ('vibrate' in navigator) {
        if (result.isValid && !result.isDuplicate) {
          navigator.vibrate([100, 50, 100]); // Success pattern
        } else {
          navigator.vibrate([200, 100, 200, 100, 200]); // Error pattern
        }
      }

      onValidationComplete(result);

    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        confidence: 0,
        format: format.toString(),
        isDuplicate: false,
        errorType: 'corrupted',
        suggestions: ['Try scanning again', 'Ensure barcode is clean and well-lit']
      };

      setValidationResult(errorResult);
      setValidationState('error');
      onValidationComplete(errorResult);
    }
  };

  const performBarcodeValidation = async (code: string, format: BarcodeFormat): Promise<ValidationResult> => {
    // Mock validation logic - in real implementation, this would call the API
    return new Promise((resolve) => {
      setTimeout(() => {
        const isValidFormat = validateBarcodeFormat(code, format);
        const isDuplicate = checkForDuplicate(code);
        const confidence = calculateConfidence(code, format);

        resolve({
          isValid: isValidFormat && !isDuplicate,
          confidence,
          format: format.toString(),
          isDuplicate,
          errorType: !isValidFormat ? 'invalid_format' : isDuplicate ? 'duplicate' : undefined,
          suggestions: generateSuggestions(code, format, isValidFormat, isDuplicate)
        });
      }, 1000);
    });
  };

  const validateBarcodeFormat = (code: string, format: BarcodeFormat): boolean => {
    const formatValidators = {
      [BarcodeFormat.CODE_128]: (c: string) => /^[A-Za-z0-9\s\-_]+$/.test(c) && c.length >= 4,
      [BarcodeFormat.CODE_39]: (c: string) => /^[A-Z0-9\s\-.$\/+%]+$/.test(c) && c.length >= 3,
      [BarcodeFormat.QR_CODE]: (c: string) => c.length > 0,
      [BarcodeFormat.DATA_MATRIX]: (c: string) => c.length > 0,
    };

    const validator = formatValidators[format];
    return validator ? validator(code) : true;
  };

  const checkForDuplicate = (code: string): boolean => {
    // Mock duplicate check - would check against scan history
    const recentScans = JSON.parse(localStorage.getItem('recentScans') || '[]');
    return recentScans.includes(code);
  };

  const calculateConfidence = (code: string, format: BarcodeFormat): number => {
    let confidence = 80; // Base confidence

    // Adjust based on code length
    if (code.length < 5) confidence -= 20;
    if (code.length > 20) confidence += 10;

    // Adjust based on character validation
    if (validateBarcodeFormat(code, format)) confidence += 15;

    // Add some randomness to simulate real scanning variance
    confidence += Math.random() * 10 - 5;

    return Math.max(0, Math.min(100, confidence));
  };

  const generateSuggestions = (code: string, format: BarcodeFormat, isValid: boolean, isDuplicate: boolean): string[] => {
    const suggestions: string[] = [];

    if (!isValid) {
      suggestions.push('Check barcode format compatibility');
      suggestions.push('Ensure barcode is not damaged');
    }

    if (isDuplicate) {
      suggestions.push('This barcode was recently scanned');
      suggestions.push('Check if this is intentional');
    }

    if (code.length < 5) {
      suggestions.push('Barcode appears unusually short');
    }

    suggestions.push('Try adjusting distance from barcode');
    suggestions.push('Ensure adequate lighting');

    return suggestions;
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-sm w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Validating Barcode
            </h3>
            <div className="text-sm text-gray-300 font-mono bg-white/5 backdrop-blur-sm border border-white/20 px-3 py-2 rounded">
              {barcode}
            </div>
          </div>

          {/* Validation State */}
          <div className="text-center mb-6">
            <AnimatePresence mode="wait">
              {validationState === 'validating' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="w-16 h-16 mx-auto bg-blue-500/20 backdrop-blur-sm border border-blue-400/50 rounded-full flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </motion.div>
                  </div>

                  {/* Confidence meter */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">Confidence: {confidence}%</div>
                    <div className="w-full bg-white/5 rounded-full h-2">
                      <motion.div
                        className="bg-blue-500/70 h-2 rounded-full"
                        animate={{ width: `${confidence}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {validationState === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="w-16 h-16 mx-auto bg-green-500/20 backdrop-blur-sm border border-green-400/50 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-green-400 font-medium">Valid Barcode</div>
                  <div className="text-sm text-gray-300">
                    Format: {validationResult?.format}
                    <br />
                    Confidence: {validationResult?.confidence.toFixed(1)}%
                  </div>
                </motion.div>
              )}

              {validationState === 'duplicate' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="w-16 h-16 mx-auto bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/50 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="text-yellow-400 font-medium">Duplicate Scan</div>
                  <div className="text-sm text-gray-300">
                    This barcode was recently scanned
                  </div>
                </motion.div>
              )}

              {validationState === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="w-16 h-16 mx-auto bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="text-red-400 font-medium">Invalid Barcode</div>
                  <div className="text-sm text-gray-300">
                    {validationResult?.errorType === 'invalid_format' && 'Invalid format detected'}
                    {validationResult?.errorType === 'corrupted' && 'Barcode appears corrupted'}
                    {validationResult?.errorType === 'not_found' && 'Barcode not found in system'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Suggestions */}
          {validationResult?.suggestions && validationResult.suggestions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-white mb-2">Suggestions:</h4>
              <ul className="text-xs text-gray-300 space-y-1">
                {validationResult.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-1 h-1 bg-gray-300 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {(validationState === 'error' || validationState === 'duplicate') && (
              <button
                onClick={onRetryRequested}
                className="w-full bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 hover:bg-blue-500/50 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            )}

            {validationState === 'success' && (
              <button
                onClick={() => onValidationComplete(validationResult!)}
                className="w-full bg-green-500/30 backdrop-blur-sm text-white border border-green-400/50 hover:bg-green-500/50 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            )}

            <button
              onClick={() => onValidationComplete(validationResult || {
                isValid: false,
                confidence: 0,
                format: '',
                isDuplicate: false
              })}
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-gray-300 hover:bg-white/20 hover:text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BarcodeValidator;