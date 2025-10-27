import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  startBatchSession,
  endBatchSession,
  addToBatch,
  removeFromBatch,
  processBatch,
  clearBatch,
  setBatchProgress,
} from '@/store/slices/physicalDocsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import CameraScanner from './CameraScanner';
import DocumentCapture from './DocumentCapture';

interface BatchScannerProps {
  mode: 'barcode' | 'document';
  onBatchComplete?: (batchId: string) => void;
  onBatchError?: (error: string) => void;
  className?: string;
}

const BatchScanner: React.FC<BatchScannerProps> = ({
  mode,
  onBatchComplete,
  onBatchError,
  className = '',
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { batchQueue, currentBatch, batchProgress } = useSelector(
    (state: RootState) => state.physicalDocs.batch
  );
  const { scanning, capturing } = useSelector((state: RootState) => state.physicalDocs.loading);

  const [isActive, setIsActive] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [scanTarget, setScanTarget] = useState(1);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Auto-advance to next item after successful scan
  useEffect(() => {
    if (autoAdvance && currentBatch && currentBatch.items.length > 0) {
      const lastItem = currentBatch.items[currentBatch.items.length - 1];
      if (lastItem.status === 'completed') {
        if (currentBatch.items.length < scanTarget) {
          // Continue scanning
          setTimeout(() => {
            showNotification('success', `Item ${currentBatch.items.length}/${scanTarget} scanned`);
          }, 1000);
        } else {
          // Target reached, show review
          setShowReview(true);
          showNotification('success', `All ${scanTarget} items scanned! Review your batch.`);
        }
      }
    }
  }, [currentBatch?.items, autoAdvance, scanTarget]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartBatch = async () => {
    try {
      const batchId = await dispatch(startBatchSession({
        type: mode,
        targetCount: scanTarget,
        autoAdvance,
      })).unwrap();

      setIsActive(true);
      showNotification('success', `Batch scanning started (${mode})`);
    } catch (error) {
      showNotification('error', `Failed to start batch: ${error}`);
    }
  };

  const handleEndBatch = async () => {
    try {
      if (currentBatch) {
        await dispatch(endBatchSession()).unwrap();
        setIsActive(false);
        setShowReview(false);
        showNotification('info', 'Batch session ended');
      }
    } catch (error) {
      showNotification('error', `Failed to end batch: ${error}`);
    }
  };

  const handleScanSuccess = useCallback(async (result: any) => {
    if (!currentBatch) return;

    try {
      await dispatch(addToBatch({
        batchId: currentBatch.id,
        item: {
          id: `item_${Date.now()}`,
          type: mode,
          data: mode === 'barcode' ? result.getText() : result.documentId,
          timestamp: new Date().toISOString(),
          status: 'completed',
          metadata: {
            confidence: result.confidence || 1.0,
            format: mode === 'barcode' ? result.getBarcodeFormat()?.toString() : 'document',
          },
        },
      })).unwrap();

      // Update progress
      const progress = (currentBatch.items.length + 1) / scanTarget * 100;
      dispatch(setBatchProgress(progress));

    } catch (error) {
      showNotification('error', `Failed to add to batch: ${error}`);
    }
  }, [currentBatch, dispatch, mode, scanTarget]);

  const handleScanError = (error: string) => {
    showNotification('error', error);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!currentBatch) return;

    try {
      await dispatch(removeFromBatch({
        batchId: currentBatch.id,
        itemId,
      })).unwrap();

      const progress = Math.max(0, currentBatch.items.length - 1) / scanTarget * 100;
      dispatch(setBatchProgress(progress));

      showNotification('info', 'Item removed from batch');
    } catch (error) {
      showNotification('error', `Failed to remove item: ${error}`);
    }
  };

  const handleProcessBatch = async () => {
    if (!currentBatch) return;

    try {
      await dispatch(processBatch(currentBatch.id)).unwrap();

      if (onBatchComplete) {
        onBatchComplete(currentBatch.id);
      }

      showNotification('success', 'Batch processed successfully');
      setIsActive(false);
      setShowReview(false);
    } catch (error) {
      const errorMessage = `Batch processing failed: ${error}`;
      showNotification('error', errorMessage);
      if (onBatchError) {
        onBatchError(errorMessage);
      }
    }
  };

  const handleClearBatch = async () => {
    if (!currentBatch) return;

    try {
      await dispatch(clearBatch(currentBatch.id)).unwrap();
      dispatch(setBatchProgress(0));
      showNotification('info', 'Batch cleared');
    } catch (error) {
      showNotification('error', `Failed to clear batch: ${error}`);
    }
  };

  if (!isActive) {
    return (
      <div className={`min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 ${className}`}>
        {/* Setup screen */}
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
            Batch {mode === 'barcode' ? 'Scanning' : 'Capture'}
          </h1>

          <p className="text-gray-300 mb-8 leading-relaxed">
            Scan multiple {mode === 'barcode' ? 'barcodes' : 'documents'} in sequence with automatic queue management and progress tracking.
          </p>

          {/* Batch settings */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Target Count
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={scanTarget}
                onChange={(e) => setScanTarget(parseInt(e.target.value))}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:ring-blue-400 focus:border-blue-400 px-4 py-2 rounded-lg"
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="autoAdvance"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="w-4 h-4 text-blue-400 bg-white/10 border-white/20 rounded focus:ring-blue-400"
              />
              <label htmlFor="autoAdvance" className="text-gray-300 text-sm">
                Auto-advance to next item
              </label>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStartBatch}
            disabled={scanning || capturing}
            className="w-full bg-indigo-500/30 backdrop-blur-sm text-white border border-indigo-400/50 hover:bg-indigo-500/50 disabled:bg-white/10 disabled:border-white/20 py-4 px-6 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {scanning || capturing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Start Batch</span>
              </>
            )}
          </button>

          {/* Recent batches */}
          {batchQueue.length > 0 && (
            <div className="mt-8">
              <h3 className="text-white text-lg font-medium mb-4">Recent Batches</h3>
              <div className="space-y-2">
                {batchQueue.slice(-3).map((batch) => (
                  <div key={batch.id} className="bg-gray-800 rounded-lg p-3 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-sm">
                        {batch.type} • {batch.items.length} items
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={`text-xs mt-1 ${
                      batch.status === 'completed' ? 'text-green-400' :
                      batch.status === 'processing' ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black relative ${className}`}>
      {/* Scanning interface */}
      {!showReview && (
        <>
          {mode === 'barcode' ? (
            <CameraScanner
              isActive={true}
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
              className="absolute inset-0"
            />
          ) : (
            <DocumentCapture
              isActive={true}
              onCaptureSuccess={handleScanSuccess}
              onCaptureError={handleScanError}
              className="absolute inset-0"
            />
          )}
        </>
      )}

      {/* Header with progress */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-white text-sm">
            Batch {mode === 'barcode' ? 'Scanning' : 'Capture'}
          </div>
          <button
            onClick={handleEndBatch}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            End Batch
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/5 rounded-full h-2 mb-2">
          <motion.div
            className="bg-indigo-500/70 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${batchProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white text-sm">
            {currentBatch?.items.length || 0} / {scanTarget} items
          </span>
          <span className="text-gray-300 text-sm">
            {Math.round(batchProgress)}%
          </span>
        </div>
      </div>

      {/* Review interface */}
      <AnimatePresence>
        {showReview && currentBatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Review Batch
                </h2>
                <button
                  onClick={() => setShowReview(false)}
                  className="text-gray-300 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Batch summary */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-300 text-sm">Items Scanned</div>
                    <div className="text-white text-2xl font-bold">{currentBatch.items.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-300 text-sm">Success Rate</div>
                    <div className="text-green-400/80 text-2xl font-bold">
                      {Math.round((currentBatch.items.filter(i => i.status === 'completed').length / currentBatch.items.length) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-3 mb-6">
                {currentBatch.items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-3 h-3 rounded-full ${
                            item.status === 'completed' ? 'bg-green-500/70' :
                            item.status === 'processing' ? 'bg-yellow-500/70' :
                            'bg-red-500/70'
                          }`} />
                          <span className="text-white font-medium">
                            Item #{index + 1}
                          </span>
                          <span className="text-gray-300 text-sm">
                            {item.metadata?.format}
                          </span>
                        </div>
                        <div className="text-gray-300 text-sm font-mono break-all">
                          {item.data}
                        </div>
                        <div className="text-gray-300 text-xs mt-1">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-400/80 hover:text-red-300 ml-4"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={handleClearBatch}
                  className="flex-1 bg-red-500/30 backdrop-blur-sm text-white border border-red-400/50 hover:bg-red-500/50 py-3 px-4 rounded-lg font-medium"
                >
                  Clear Batch
                </button>
                <button
                  onClick={() => setShowReview(false)}
                  className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 text-gray-300 hover:bg-white/20 hover:text-white py-3 px-4 rounded-lg font-medium"
                >
                  Continue Scanning
                </button>
                <button
                  onClick={handleProcessBatch}
                  className="flex-1 bg-green-500/30 backdrop-blur-sm text-white border border-green-400/50 hover:bg-green-500/50 py-3 px-4 rounded-lg font-medium"
                >
                  Process Batch
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-20 left-4 right-4 z-30"
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
      </AnimatePresence>
    </div>
  );
};

export default BatchScanner;