import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SecureStorage from '@/utils/secureStorage';

interface ScanRecord {
  barcode: string;
  timestamp: number;
  format: string;
  sessionId: string;
  location?: string;
}

interface DuplicateDetectionResult {
  isDuplicate: boolean;
  originalScan?: ScanRecord;
  timeSinceOriginal?: number;
  frequency?: number;
  recommendations: string[];
}

interface DuplicateScanDetectorProps {
  currentBarcode: string;
  currentFormat: string;
  sessionId: string;
  onDetectionComplete: (result: DuplicateDetectionResult) => void;
  onProceedWithDuplicate?: () => void;
  isActive: boolean;
}

const DuplicateScanDetector: React.FC<DuplicateScanDetectorProps> = ({
  currentBarcode,
  currentFormat,
  sessionId,
  onDetectionComplete,
  onProceedWithDuplicate,
  isActive
}) => {
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [detectionResult, setDetectionResult] = useState<DuplicateDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Load scan history from localStorage on mount
    const initializeHistory = async () => {
      await loadScanHistory();
    };
    initializeHistory();
  }, []);

  useEffect(() => {
    if (isActive && currentBarcode) {
      analyzeDuplicate();
    }
  }, [isActive, currentBarcode]);

  const loadScanHistory = async () => {
    try {
      const history = await SecureStorage.getItem('mobileScanHistory') || [];

      // Clean old records (older than 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const cleanHistory = history.filter((record: ScanRecord) => record.timestamp > oneDayAgo);

      setScanHistory(cleanHistory);

      // Save cleaned history back to localStorage
      await SecureStorage.setItem('mobileScanHistory', cleanHistory);
    } catch (error) {
      console.error('Failed to load scan history:', error);
      setScanHistory([]);
    }
  };

  const analyzeDuplicate = async () => {
    setIsAnalyzing(true);

    try {
      // Find duplicate scans
      const duplicates = scanHistory.filter(record =>
        record.barcode === currentBarcode && record.format === currentFormat
      );

      if (duplicates.length === 0) {
        // No duplicate found
        const result: DuplicateDetectionResult = {
          isDuplicate: false,
          recommendations: ['New scan - no duplicates detected']
        };

        setDetectionResult(result);
        onDetectionComplete(result);

        // Add current scan to history
        addToScanHistory();
      } else {
        // Duplicate found
        const originalScan = duplicates[0]; // Most recent duplicate
        const timeSinceOriginal = Date.now() - originalScan.timestamp;
        const frequency = duplicates.length;

        const result: DuplicateDetectionResult = {
          isDuplicate: true,
          originalScan,
          timeSinceOriginal,
          frequency,
          recommendations: generateRecommendations(timeSinceOriginal, frequency)
        };

        setDetectionResult(result);
        onDetectionComplete(result);
      }
    } catch (error) {
      console.error('Duplicate analysis failed:', error);

      const errorResult: DuplicateDetectionResult = {
        isDuplicate: false,
        recommendations: ['Analysis failed - proceeding with scan']
      };

      setDetectionResult(errorResult);
      onDetectionComplete(errorResult);
    }

    setIsAnalyzing(false);
  };

  const addToScanHistory = () => {
    const newRecord: ScanRecord = {
      barcode: currentBarcode,
      timestamp: Date.now(),
      format: currentFormat,
      sessionId,
      location: getCurrentLocation()
    };

    const updatedHistory = [newRecord, ...scanHistory].slice(0, 100); // Keep last 100 scans
    setScanHistory(updatedHistory);
    SecureStorage.setItem('mobileScanHistory', updatedHistory);
  };

  const getCurrentLocation = (): string | undefined => {
    // This would integrate with actual location services
    // For now, return undefined
    return undefined;
  };

  const generateRecommendations = (timeSinceOriginal: number, frequency: number): string[] => {
    const recommendations: string[] = [];
    const minutes = Math.floor(timeSinceOriginal / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (minutes < 5) {
      recommendations.push('This barcode was scanned very recently');
      recommendations.push('Check if this is an accidental duplicate');
    } else if (minutes < 30) {
      recommendations.push('This barcode was scanned within the last 30 minutes');
      recommendations.push('Verify if a new scan is needed');
    } else if (hours < 24) {
      recommendations.push('This barcode was scanned earlier today');
      recommendations.push('Consider if document status has changed');
    }

    if (frequency > 3) {
      recommendations.push(`This barcode has been scanned ${frequency} times`);
      recommendations.push('Check if multiple scans are intentional');
    }

    if (frequency > 10) {
      recommendations.push('Unusually high scan frequency detected');
      recommendations.push('Consider marking this as a template or test barcode');
    }

    recommendations.push('You can proceed if this scan is intentional');

    return recommendations;
  };

  const handleProceedWithDuplicate = () => {
    addToScanHistory(); // Add to history even though it's a duplicate
    if (onProceedWithDuplicate) {
      onProceedWithDuplicate();
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (!isActive || !detectionResult) return null;

  return (
    <AnimatePresence>
      {detectionResult.isDuplicate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Duplicate Scan Detected
              </h3>
              <div className="text-sm text-gray-600 font-mono bg-gray-100 px-3 py-2 rounded">
                {currentBarcode}
              </div>
            </div>

            {/* Duplicate Information */}
            <div className="mb-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Previous Scan Details</h4>

                {detectionResult.originalScan && (
                  <div className="space-y-2 text-sm text-yellow-700">
                    <div className="flex justify-between">
                      <span>Last scanned:</span>
                      <span className="font-medium">
                        {formatTimeAgo(detectionResult.originalScan.timestamp)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span className="font-medium">{detectionResult.originalScan.format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total scans:</span>
                      <span className="font-medium">{detectionResult.frequency}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {detectionResult.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleProceedWithDuplicate}
                className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
              >
                Proceed with Duplicate Scan
              </button>

              <button
                onClick={() => onDetectionComplete(detectionResult)}
                className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel Scan
              </button>
            </div>

            {/* Scan History Preview */}
            {scanHistory.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Recent Scan History</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {scanHistory.slice(0, 5).map((record, index) => (
                    <div
                      key={index}
                      className={`text-xs p-2 rounded ${
                        record.barcode === currentBarcode
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div className="font-mono truncate">{record.barcode}</div>
                      <div className="text-xs opacity-75">
                        {formatTimeAgo(record.timestamp)} • {record.format}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DuplicateScanDetector;