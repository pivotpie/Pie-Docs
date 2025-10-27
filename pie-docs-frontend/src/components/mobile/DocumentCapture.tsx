import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  captureDocument,
  enhanceDocument,
  setEnhancementSettings,
  processDocument,
} from '@/store/slices/physicalDocsSlice';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentCaptureProps {
  onCaptureSuccess?: (documentId: string) => void;
  onCaptureError?: (error: string) => void;
  isActive: boolean;
  className?: string;
}

const DocumentCapture: React.FC<DocumentCaptureProps> = ({
  onCaptureSuccess,
  onCaptureError,
  isActive,
  className = '',
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentDocument, enhancementSettings, captureQueue, processingStatus } = useSelector(
    (state: RootState) => state.physicalDocs.capture
  );
  const { capturing } = useSelector((state: RootState) => state.physicalDocs.loading);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showCapturePreview, setShowCapturePreview] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedEdges, setDetectedEdges] = useState<number[][]>([]);

  // Initialize camera when component becomes active
  useEffect(() => {
    if (isActive && !stream) {
      initializeCamera();
    }
    return () => {
      cleanup();
    };
  }, [isActive]);

  const initializeCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920, max: 4096 },
          height: { ideal: 1080, max: 4096 },
          facingMode: { ideal: 'environment' },
          focusMode: { ideal: 'continuous' },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          startEdgeDetection();
        };
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      if (onCaptureError) {
        onCaptureError(`Camera access failed: ${error}`);
      }
    }
  };

  const startEdgeDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const detectEdges = () => {
      if (!cameraReady || showCapturePreview) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Simple edge detection using canvas ImageData
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const edges = performEdgeDetection(imageData);
      setDetectedEdges(edges);

      requestAnimationFrame(detectEdges);
    };

    detectEdges();
  }, [cameraReady, showCapturePreview]);

  const performEdgeDetection = (imageData: ImageData): number[][] => {
    // Simplified edge detection algorithm
    // In a real implementation, you'd use OpenCV.js or similar
    const { data, width, height } = imageData;
    const edges: number[][] = [];

    // Convert to grayscale and find high-contrast edges
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // Simple gradient detection
        const leftGray = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
        const rightGray = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
        const topGray = (data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2]) / 3;
        const bottomGray = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;

        const gradientX = Math.abs(rightGray - leftGray);
        const gradientY = Math.abs(bottomGray - topGray);
        const gradient = Math.sqrt(gradientX * gradientX + gradientY * gradientY);

        if (gradient > 30) { // Threshold for edge detection
          edges.push([x, y]);
        }
      }
    }

    // Find document corners (simplified)
    return findDocumentCorners(edges, width, height);
  };

  const findDocumentCorners = (edges: number[][], width: number, height: number): number[][] => {
    if (edges.length < 4) return [];

    // Simple corner detection - find points closest to corners
    const corners = [
      [0, 0], // top-left
      [width, 0], // top-right
      [width, height], // bottom-right
      [0, height], // bottom-left
    ];

    return corners.map(corner => {
      let closest = edges[0];
      let minDistance = Infinity;

      edges.forEach(edge => {
        const distance = Math.sqrt(
          Math.pow(edge[0] - corner[0], 2) + Math.pow(edge[1] - corner[1], 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closest = edge;
        }
      });

      return closest;
    });
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Capture full-resolution image
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageDataUrl);
      setShowCapturePreview(true);

      // Convert to blob for storage
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const result = await dispatch(captureDocument({
              imageBlob: blob,
              corners: detectedEdges,
              captureTime: new Date().toISOString(),
              deviceInfo: {
                userAgent: navigator.userAgent,
                resolution: `${canvas.width}x${canvas.height}`,
              },
            })).unwrap();

            if (onCaptureSuccess) {
              onCaptureSuccess(result.documentId);
            }
          } catch (error) {
            if (onCaptureError) {
              onCaptureError(`Capture failed: ${error}`);
            }
          }
        }
      }, 'image/jpeg', 0.9);

      // Provide haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100]);
      }
    } catch (error) {
      console.error('Photo capture failed:', error);
      if (onCaptureError) {
        onCaptureError(`Photo capture failed: ${error}`);
      }
    }
  };

  const retakePhoto = () => {
    setShowCapturePreview(false);
    setCapturedImage(null);
    setDetectedEdges([]);
    startEdgeDetection();
  };

  const acceptPhoto = async () => {
    if (!currentDocument) return;

    try {
      await dispatch(processDocument({
        documentId: currentDocument.id,
        enhancementSettings,
      })).unwrap();

      setShowCapturePreview(false);
      setCapturedImage(null);
      setDetectedEdges([]);
      startEdgeDetection();
    } catch (error) {
      if (onCaptureError) {
        onCaptureError(`Processing failed: ${error}`);
      }
    }
  };

  const adjustEnhancement = (setting: string, value: number) => {
    dispatch(setEnhancementSettings({
      ...enhancementSettings,
      [setting]: value,
    }));
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraReady(false);
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
        style={{ display: showCapturePreview ? 'none' : 'block' }}
      />

      {/* Hidden canvas for processing */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* Document detection overlay */}
      {!showCapturePreview && cameraReady && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Document frame guide */}
          <div className="absolute inset-4 border-2 border-white border-opacity-50 rounded-lg">
            {/* Corner indicators */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
          </div>

          {/* Edge detection visualization */}
          {detectedEdges.length > 0 && (
            <svg className="absolute inset-0 w-full h-full">
              <polygon
                points={detectedEdges.map(point => `${point[0]},${point[1]}`).join(' ')}
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeOpacity="0.8"
              />
            </svg>
          )}

          {/* Instructions */}
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
            <p className="text-white text-center text-sm font-medium bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-lg">
              Position document within the frame
            </p>
            <p className="text-white text-center text-xs opacity-75 mt-1">
              Document edges will be highlighted when detected
            </p>
          </div>
        </div>
      )}

      {/* Capture preview */}
      <AnimatePresence>
        {showCapturePreview && capturedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
          >
            <img
              src={capturedImage}
              alt="Captured document"
              className="w-full h-full object-contain"
            />

            {/* Enhancement controls */}
            <div className="absolute bottom-20 left-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <h3 className="text-white text-sm font-medium mb-3">Image Enhancement</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-white text-xs">Brightness</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={enhancementSettings.brightness}
                    onChange={(e) => adjustEnhancement('brightness', parseInt(e.target.value))}
                    className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-white text-xs">Contrast</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={enhancementSettings.contrast}
                    onChange={(e) => adjustEnhancement('contrast', parseInt(e.target.value))}
                    className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Preview actions */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between">
              <button
                onClick={retakePhoto}
                className="bg-red-500/30 backdrop-blur-sm text-white border border-red-400/50 hover:bg-red-500/50 px-6 py-3 rounded-lg font-medium"
              >
                Retake
              </button>

              <button
                onClick={acceptPhoto}
                disabled={processingStatus.isProcessing}
                className="bg-green-500/30 backdrop-blur-sm text-white border border-green-400/50 hover:bg-green-500/50 disabled:bg-white/10 disabled:border-white/20 px-6 py-3 rounded-lg font-medium flex items-center space-x-2"
              >
                {processingStatus.isProcessing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Accept</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capture controls */}
      {!showCapturePreview && cameraReady && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={capturePhoto}
            disabled={capturing}
            className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
            aria-label="Capture document"
          >
            {capturing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-400 rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* Status indicators */}
      <div className="absolute top-4 left-4 right-4">
        {!cameraReady && (
          <div className="bg-blue-500/30 backdrop-blur-md border border-blue-400/50 text-white p-3 rounded-lg text-sm">
            Initializing camera...
          </div>
        )}

        {captureQueue.length > 0 && (
          <div className="bg-green-500/30 backdrop-blur-md border border-green-400/50 text-white p-3 rounded-lg text-sm">
            {captureQueue.length} document(s) captured
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCapture;