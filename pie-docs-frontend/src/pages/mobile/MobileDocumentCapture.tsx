import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import DocumentCapture from '@/components/mobile/DocumentCapture';
import {
  startScanSession,
  endScanSession,
  setOfflineMode,
} from '@/store/slices/physicalDocsSlice';

interface MobileDocumentCaptureProps {
  className?: string;
}

const MobileDocumentCapture: React.FC<MobileDocumentCaptureProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentSession } = useSelector((state: RootState) => state.physicalDocs.mobileScanning);
  const { captureQueue, currentDocument } = useSelector((state: RootState) => state.physicalDocs.capture);
  const { isOffline } = useSelector((state: RootState) => state.physicalDocs.offline);
  const { capturing } = useSelector((state: RootState) => state.physicalDocs.loading);

  const [isCapturing, setIsCapturing] = useState(false);
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
      setIsCapturing(true);
      showNotification('success', 'Document capture session started');
    } catch (error) {
      showNotification('error', `Failed to start session: ${error}`);
    }
  };

  const handleEndSession = async () => {
    try {
      dispatch(endScanSession());
      setIsCapturing(false);
      setShowResults(true);
      showNotification('info', 'Document capture session ended');
    } catch (error) {
      showNotification('error', `Failed to end session: ${error}`);
    }
  };

  const handleCaptureSuccess = (documentId: string) => {
    showNotification('success', 'Document captured successfully');
  };

  const handleCaptureError = (error: string) => {
    showNotification('error', error);
  };

  const handleViewResults = () => {
    setShowResults(!showResults);
  };

  if (!currentSession && !isCapturing) {
    return (
      <div className={`min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 ${className}`}>
        {/* Welcome screen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="bg-purple-500/30 backdrop-blur-sm border border-purple-400/50 rounded-full p-6 mx-auto mb-6 w-24 h-24 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Document Capture
          </h1>

          <p className="text-gray-300 mb-8 leading-relaxed">
            Capture documents with automatic edge detection and enhancement.
            Your captures will be processed and can be synced when you're back online.
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
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-300">
                {captureQueue.length} Captured
              </span>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStartSession}
            disabled={capturing}
            className="w-full bg-purple-500/30 backdrop-blur-sm text-white border border-purple-400/50 hover:bg-purple-500/50 disabled:bg-white/10 disabled:border-white/20 py-4 px-6 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {capturing ? (
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
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <span>Start Capturing</span>
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
                You're currently offline. Captures will be saved locally and synced when connected.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black relative ${className}`}>
      {/* Document capture component */}
      <DocumentCapture
        isActive={isCapturing}
        onCaptureSuccess={handleCaptureSuccess}
        onCaptureError={handleCaptureError}
        className="absolute inset-0"
      />

      {/* Header controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* Session info */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 rounded-full text-white text-sm">
              Session: {captureQueue.length} captured
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
              aria-label="View captures"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
                  Captured Documents ({captureQueue.length})
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

              {captureQueue.length === 0 ? (
                <p className="text-gray-300 text-center py-8">
                  No documents captured yet. Point your camera at a document to start.
                </p>
              ) : (
                <div className="space-y-3">
                  {captureQueue.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500/70" />
                          <span className="text-sm text-gray-300">Document #{index + 1}</span>
                        </div>
                        <span className="text-xs text-gray-300">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-white text-sm">
                        {item.extractedText ? item.extractedText.substring(0, 100) + '...' : 'Processing...'}
                      </p>
                      {item.processedAt && (
                        <p className="text-green-400/80 text-xs mt-1">
                          ✓ Processed
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
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

export default MobileDocumentCapture;