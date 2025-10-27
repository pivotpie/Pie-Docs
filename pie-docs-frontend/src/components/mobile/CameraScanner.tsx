import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';
import type { RootState, AppDispatch } from '@/store';
import {
  initializeCamera,
  scanBarcode,
  validateBarcode,
  setCameraStatus,
} from '@/store/slices/physicalDocsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import BarcodeValidator from './BarcodeValidator';
import ScanFeedbackSystem from './ScanFeedbackSystem';
import DuplicateScanDetector from './DuplicateScanDetector';

interface CameraScannerProps {
  onScanSuccess?: (result: Result) => void;
  onScanError?: (error: string) => void;
  isActive: boolean;
  className?: string;
}

const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanSuccess,
  onScanError,
  isActive,
  className = '',
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { cameraStatus, scanQueue } = useSelector((state: RootState) => state.physicalDocs.mobileScanning);
  const { scanning, validating } = useSelector((state: RootState) => state.physicalDocs.loading);

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);
  const [scanningActive, setScanningActive] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [targetVisible, setTargetVisible] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);

  // Validation and feedback states
  const [showValidator, setShowValidator] = useState(false);
  const [currentScanResult, setCurrentScanResult] = useState<Result | null>(null);
  const [scanFeedback, setScanFeedback] = useState<any>(null);
  const [showDuplicateDetector, setShowDuplicateDetector] = useState(false);
  const [sessionId] = useState(() => Date.now().toString());

  // Initialize camera when component becomes active
  useEffect(() => {
    if (isActive && !cameraStatus.isActive) {
      initializeCameraStream();
    }
    return () => {
      cleanup();
    };
  }, [isActive]);

  // Initialize barcode reader
  useEffect(() => {
    if (isActive) {
      readerRef.current = new BrowserMultiFormatReader();
    }
  }, [isActive]);

  const initializeCameraStream = async () => {
    try {
      await dispatch(initializeCamera()).unwrap();
      if (videoRef.current) {
        startScanning();
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      if (onScanError) {
        onScanError(`Camera access failed: ${error}`);
      }
    }
  };

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current || scanningActive) return;

    try {
      setScanningActive(true);

      const constraints = {
        video: {
          width: { ideal: 1920, max: 4096 },
          height: { ideal: 1080, max: 4096 },
          facingMode: { ideal: 'environment' },
          focusMode: { ideal: 'continuous' },
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;

      // Start barcode detection
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined, // Use default camera
        videoRef.current,
        (result, error) => {
          if (result) {
            handleScanResult(result);
          }
          // Suppress error logging for continuous scanning
        }
      );

      dispatch(setCameraStatus({ isActive: true, hasPermission: true }));
    } catch (error) {
      console.error('Failed to start camera:', error);
      dispatch(setCameraStatus({ error: `Camera error: ${error}` }));
      setScanningActive(false);
    }
  };

  const handleScanResult = useCallback(async (result: Result) => {
    const now = Date.now();

    // Prevent duplicate scans within 2 seconds
    if (now - lastScanTime < 2000) return;

    setLastScanTime(now);
    setTargetVisible(false);
    setCurrentScanResult(result);

    // Show validation overlay
    setShowValidator(true);
  }, [lastScanTime]);

  const handleValidationComplete = useCallback(async (validationResult: any) => {
    setShowValidator(false);

    if (!currentScanResult) return;

    const barcodeText = currentScanResult.getText();
    const format = currentScanResult.getBarcodeFormat();

    if (validationResult.isValid && !validationResult.isDuplicate) {
      try {
        // Add scan to queue
        await dispatch(scanBarcode({
          barcode: barcodeText,
          format: format.toString(),
          confidence: validationResult.confidence || 1.0,
        })).unwrap();

        // Validate barcode against system
        await dispatch(validateBarcode(barcodeText));

        // Show success feedback
        setScanFeedback({
          type: 'success',
          message: 'Barcode scanned successfully',
          details: `Format: ${format.toString()}`,
          code: barcodeText,
          duration: 3000
        });

        // Trigger success callback
        if (onScanSuccess) {
          onScanSuccess(currentScanResult);
        }

        // Provide haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

      } catch (error) {
        console.error('Scan processing failed:', error);
        setScanFeedback({
          type: 'error',
          message: 'Scan processing failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          suggestions: ['Check network connection', 'Try scanning again'],
          duration: 5000
        });

        if (onScanError) {
          onScanError(`Scan failed: ${error}`);
        }
      }
    } else if (validationResult.isDuplicate) {
      // Show duplicate detector
      setShowDuplicateDetector(true);
    } else {
      // Show error feedback
      setScanFeedback({
        type: 'error',
        message: 'Invalid barcode detected',
        details: validationResult.errorType || 'Barcode validation failed',
        suggestions: validationResult.suggestions || ['Try scanning again', 'Check barcode quality'],
        duration: 5000
      });

      if (onScanError) {
        onScanError('Invalid barcode');
      }
    }

    // Reset target visibility
    setTimeout(() => setTargetVisible(true), 1000);
  }, [dispatch, currentScanResult, onScanSuccess, onScanError]);

  const handleRetryRequested = useCallback(() => {
    setShowValidator(false);
    setCurrentScanResult(null);
    setScanFeedback(null);
    setTargetVisible(true);
  }, []);

  const handleDuplicateDetectionComplete = useCallback(async (detectionResult: any) => {
    setShowDuplicateDetector(false);

    if (!detectionResult.isDuplicate) {
      // Proceed with normal scan processing
      await handleValidationComplete({
        isValid: true,
        isDuplicate: false,
        confidence: 1.0
      });
    } else {
      // Show duplicate warning but allow user choice
      setScanFeedback({
        type: 'warning',
        message: 'Duplicate scan detected',
        details: `Last scanned ${detectionResult.timeSinceOriginal ? Math.floor(detectionResult.timeSinceOriginal / 60000) : 0} minutes ago`,
        suggestions: detectionResult.recommendations.slice(0, 2),
        duration: 5000
      });
    }
  }, [handleValidationComplete]);

  const handleProceedWithDuplicate = useCallback(async () => {
    setShowDuplicateDetector(false);

    if (currentScanResult) {
      const barcodeText = currentScanResult.getText();
      const format = currentScanResult.getBarcodeFormat();

      try {
        await dispatch(scanBarcode({
          barcode: barcodeText,
          format: format.toString(),
          confidence: 1.0,
        })).unwrap();

        setScanFeedback({
          type: 'info',
          message: 'Duplicate scan processed',
          details: 'Scan added despite being a duplicate',
          code: barcodeText,
          duration: 3000
        });

        if (onScanSuccess) {
          onScanSuccess(currentScanResult);
        }
      } catch (error) {
        setScanFeedback({
          type: 'error',
          message: 'Failed to process duplicate scan',
          details: error instanceof Error ? error.message : 'Unknown error',
          duration: 5000
        });
      }
    }

    setTimeout(() => setTargetVisible(true), 1000);
  }, [dispatch, currentScanResult, onScanSuccess]);

  const toggleTorch = async () => {
    if (!videoRef.current?.srcObject) return;

    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];

      if ('torch' in track.getCapabilities()) {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled } as any]
        });
        setTorchEnabled(!torchEnabled);
      }
    } catch (error) {
      console.error('Torch control failed:', error);
    }
  };

  const cleanup = () => {
    // Stop barcode scanning using controls
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (error) {
        console.warn('Failed to stop barcode scanning:', error);
      }
      controlsRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setScanningActive(false);
    dispatch(setCameraStatus({ isActive: false }));
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      {/* Video stream */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Scan target overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence>
          {targetVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="relative"
            >
              {/* Scan frame */}
              <div className="w-64 h-64 border-2 border-white border-opacity-50 rounded-lg relative">
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />

                {/* Scanning line animation */}
                <motion.div
                  animate={{ y: [0, 240, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"
                />
              </div>

              {/* Instructions */}
              <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                <p className="text-white text-center text-sm font-medium">
                  Align barcode within the frame
                </p>
                <p className="text-white text-center text-xs opacity-75 mt-1">
                  Scanning will happen automatically
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan success indicator */}
        <AnimatePresence>
          {!targetVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="bg-green-500/30 backdrop-blur-sm border border-green-400/50 rounded-full p-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
        {/* Torch toggle */}
        <button
          onClick={toggleTorch}
          className={`p-3 rounded-full backdrop-blur-sm border text-white ${torchEnabled ? 'bg-yellow-500/30 border-yellow-400/50' : 'bg-white/10 border-white/20'}`}
          aria-label="Toggle flashlight"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>

        {/* Scan count indicator */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 rounded-full text-white text-sm">
          Scanned: {scanQueue.length}
        </div>

        {/* Loading indicator */}
        {(scanning || validating) && (
          <div className="bg-blue-500/30 backdrop-blur-sm border border-blue-400/50 p-3 rounded-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.div>
          </div>
        )}
      </div>

      {/* Status messages */}
      <div className="absolute top-4 left-4 right-4">
        {cameraStatus.error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/30 backdrop-blur-md border border-red-400/50 text-white p-3 rounded-lg text-sm"
          >
            {cameraStatus.error}
          </motion.div>
        )}
      </div>

      {/* Validation and Feedback Components */}
      {showValidator && currentScanResult && (
        <BarcodeValidator
          barcode={currentScanResult.getText()}
          format={currentScanResult.getBarcodeFormat()}
          onValidationComplete={handleValidationComplete}
          onRetryRequested={handleRetryRequested}
          isVisible={showValidator}
        />
      )}

      {showDuplicateDetector && currentScanResult && (
        <DuplicateScanDetector
          currentBarcode={currentScanResult.getText()}
          currentFormat={currentScanResult.getBarcodeFormat().toString()}
          sessionId={sessionId}
          onDetectionComplete={handleDuplicateDetectionComplete}
          onProceedWithDuplicate={handleProceedWithDuplicate}
          isActive={showDuplicateDetector}
        />
      )}

      <ScanFeedbackSystem
        feedback={scanFeedback}
        onDismiss={() => setScanFeedback(null)}
        onRetry={handleRetryRequested}
      />
    </div>
  );
};

export default CameraScanner;