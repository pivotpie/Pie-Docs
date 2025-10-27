import React, { useState } from 'react';
import { motion } from 'framer-motion';
import BatchScanner from '@/components/mobile/BatchScanner';

interface MobileBatchScanningProps {
  className?: string;
}

const MobileBatchScanning: React.FC<MobileBatchScanningProps> = ({ className = '' }) => {
  const [selectedMode, setSelectedMode] = useState<'barcode' | 'document' | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBatchComplete = (batchId: string) => {
    showNotification('success', `Batch ${batchId} completed successfully`);
    setSelectedMode(null);
  };

  const handleBatchError = (error: string) => {
    showNotification('error', error);
  };

  if (selectedMode) {
    return (
      <BatchScanner
        mode={selectedMode}
        onBatchComplete={handleBatchComplete}
        onBatchError={handleBatchError}
        className={className}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 ${className}`}>
      {/* Mode selection screen */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md w-full"
      >
        <div className="bg-indigo-500/30 backdrop-blur-sm border border-indigo-400/50 rounded-full p-6 mx-auto mb-6 w-24 h-24 flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Batch Scanning
        </h1>

        <p className="text-gray-300 mb-8 leading-relaxed">
          Choose your scanning mode to process multiple items in sequence with automatic queue management.
        </p>

        {/* Mode selection buttons */}
        <div className="space-y-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedMode('barcode')}
            className="w-full bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 hover:bg-blue-500/50 py-6 px-6 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center space-x-4"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v1m6 11a6 6 0 11-12 0v-1m12 0H6m6 0V9a6.002 6.002 0 018.75 2.25M12 4a6.002 6.002 0 00-8.75 2.25" />
            </svg>
            <div className="text-left">
              <div className="text-xl font-bold">Barcode Batch</div>
              <div className="text-blue-200 text-sm">Scan multiple barcodes in sequence</div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedMode('document')}
            className="w-full bg-purple-500/30 backdrop-blur-sm text-white border border-purple-400/50 hover:bg-purple-500/50 py-6 px-6 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center space-x-4"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <div className="text-left">
              <div className="text-xl font-bold">Document Batch</div>
              <div className="text-purple-200 text-sm">Capture multiple documents in sequence</div>
            </div>
          </motion.button>
        </div>

        {/* Features list */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6">
          <h3 className="text-white text-lg font-medium mb-4">Batch Features</h3>
          <div className="space-y-3 text-left">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400/70 rounded-full"></div>
              <span className="text-gray-300 text-sm">Sequential scanning with progress tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400/70 rounded-full"></div>
              <span className="text-gray-300 text-sm">Auto-advance to next item</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400/70 rounded-full"></div>
              <span className="text-gray-300 text-sm">Review and edit before processing</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400/70 rounded-full"></div>
              <span className="text-gray-300 text-sm">Batch upload and validation</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400/70 rounded-full"></div>
              <span className="text-gray-300 text-sm">Offline support with sync</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-4 right-4 z-50"
        >
          <div className={`
            p-3 rounded-lg text-white text-sm backdrop-blur-md border
            ${notification.type === 'success' ? 'bg-green-500/30 border-green-400/50' : ''}
            ${notification.type === 'error' ? 'bg-red-500/30 border-red-400/50' : ''}
            ${notification.type === 'info' ? 'bg-blue-500/30 border-blue-400/50' : ''}
          `}>
            {notification.message}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MobileBatchScanning;