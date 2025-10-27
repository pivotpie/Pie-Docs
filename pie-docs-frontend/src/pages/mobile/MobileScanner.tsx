import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  startScanSession,
  endScanSession,
  clearScanQueue,
  setOfflineMode,
} from '@/store/slices/physicalDocsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import CameraScanner from '@/components/mobile/CameraScanner';

interface MobileScannerProps {
  className?: string;
}

const MobileScanner: React.FC<MobileScannerProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    currentSession,
    scanQueue,
    cameraStatus,
  } = useSelector((state: RootState) => state.physicalDocs.mobileScanning);
  const { isOffline } = useSelector((state: RootState) => state.physicalDocs.offline);
  const { scanning } = useSelector((state: RootState) => state.physicalDocs.loading);

  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => dispatch(setOfflineMode(false));
    const handleOffline = () => dispatch(setOfflineMode(true));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    dispatch(setOfflineMode(!navigator.onLine));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartSession = async () => {
    try {
      await dispatch(startScanSession()).unwrap();
      setIsScanning(true);
      showNotification('success', 'Scan session started');
    } catch (error) {
      showNotification('error', `Failed to start session: ${error}`);
    }
  };

  const handleEndSession = async () => {
    try {
      dispatch(endScanSession());
      setIsScanning(false);
      setShowResults(true);
      showNotification('info', 'Scan session ended');
    } catch (error) {
      showNotification('error', `Failed to end session: ${error}`);
    }
  };

  const handleScanSuccess = () => {
    showNotification('success', 'Barcode scanned successfully');
  };

  const handleScanError = (error: string) => {
    showNotification('error', error);
  };

  const handleClearQueue = () => {
    dispatch(clearScanQueue());
    showNotification('info', 'Scan queue cleared');
  };

  const handleViewResults = () => {
    setShowResults(!showResults);
  };

  if (!currentSession && !isScanning) {
    return (
      <div className={`min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 ${className}`}>
        {/* Welcome screen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="bg-blue-500/30 backdrop-blur-sm border border-blue-400/50 rounded-full p-6 mx-auto mb-6 w-24 h-24 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v1m6 11a6 6 0 11-12 0v-1m12 0H6m6 0V9a6.002 6.002 0 018.75 2.25M12 4a6.002 6.002 0 00-8.75 2.25" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Mobile Scanner
          </h1>

          <p className="text-gray-300 mb-8 leading-relaxed">
            Scan barcodes and capture documents on the go.
            Your scans will be automatically validated and can be synced when you're back online.
          </p>

          {/* Status indicators */}
          <div className="flex justify-center items-center space-x-4 mb-8">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-sm text-gray-300">
                {isOffline ? 'Offline' : 'Online'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${cameraStatus.hasPermission ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="text-sm text-gray-300">
                Camera {cameraStatus.hasPermission ? 'Ready' : 'Not Ready'}
              </span>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStartSession}
            disabled={scanning}
            className="w-full bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 hover:bg-blue-500/50 disabled:bg-white/10 disabled:border-white/20 py-4 px-6 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {scanning ? (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 16h1m4 0h1m-5-3.197l2.828-2.828M12 21l9-5-9-5-9 5 9 5z" />
                </svg>
                <span>Start Scanning</span>
              </>
            )}
          </button>

          {/* Offline notice */}
          {isOffline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 bg-yellow-600/20 backdrop-blur-sm border border-yellow-500/50 rounded-lg p-3"
            >
              <p className="text-yellow-300 text-sm">
                You're currently offline. Scans will be saved locally and synced when connected.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black relative ${className}`}>
      {/* Camera scanner */}
      <CameraScanner
        isActive={isScanning}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        className="absolute inset-0"
      />

      {/* Header controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* Session info */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 rounded-full text-white text-sm">
              Session: {currentSession?.scannedCount || 0} scanned
            </div>

            {/* Offline indicator */}
            {isOffline && (
              <div className="bg-yellow-600/30 backdrop-blur-sm border border-yellow-500/50 px-3 py-2 rounded-full text-white text-sm">
                Offline
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleViewResults}
              className="bg-blue-500/30 backdrop-blur-sm border border-blue-400/50 hover:bg-blue-500/50 text-white p-2 rounded-full transition-all duration-200"
              aria-label="View results"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>

            <button
              onClick={handleEndSession}
              className="bg-red-500/30 backdrop-blur-sm border border-red-400/50 hover:bg-red-500/50 text-white p-2 rounded-full transition-all duration-200"
              aria-label="End session"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Results panel */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="absolute inset-y-0 right-0 w-80 bg-white/10 backdrop-blur-md border-l border-white/20 z-20 overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Scan Results ({scanQueue.length})
                </h3>
                <button
                  onClick={() => setShowResults(false)}
                  className="text-gray-300 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {scanQueue.length === 0 ? (
                <p className="text-gray-300 text-center py-8">
                  No scans yet. Point your camera at a barcode to start.
                </p>
              ) : (
                <>
                  {/* Scan items */}
                  <div className="space-y-3 mb-4">
                    {scanQueue.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${item.validated ? 'bg-green-500/70' : 'bg-yellow-500/70'}`} />
                            <span className="text-sm text-gray-300">{item.format.name}</span>
                          </div>
                          <span className="text-xs text-gray-300">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-white font-mono text-sm break-all">
                          {item.barcode}
                        </p>
                        {item.metadata && (
                          <p className="text-gray-300 text-xs mt-1">
                            {item.metadata.title || 'Document'}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={handleClearQueue}
                      className="w-full bg-red-500/30 backdrop-blur-sm text-white border border-red-400/50 hover:bg-red-500/50 py-2 px-4 rounded-lg text-sm transition-colors duration-200"
                    >
                      Clear All
                    </button>
                  </div>
                </>
              )}
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

export default MobileScanner;