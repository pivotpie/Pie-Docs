import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageEnhancementSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  autoEnhance: boolean;
}

interface QualityAssessment {
  score: number;
  issues: string[];
  suggestions: string[];
  metrics: {
    brightness: number;
    contrast: number;
    sharpness: number;
    noise: number;
  };
}

interface ImageEnhancerProps {
  originalImage: string | File;
  onEnhancementComplete: (enhancedImage: string, settings: ImageEnhancementSettings) => void;
  onCancel: () => void;
  isVisible: boolean;
  documentType?: 'text' | 'photo' | 'mixed';
}

const ImageEnhancer: React.FC<ImageEnhancerProps> = ({
  originalImage,
  onEnhancementComplete,
  onCancel,
  isVisible,
  documentType = 'text'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [settings, setSettings] = useState<ImageEnhancementSettings>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    autoEnhance: false
  });

  const [qualityAssessment, setQualityAssessment] = useState<QualityAssessment | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);

  useEffect(() => {
    if (isVisible && originalImage) {
      loadAndAnalyzeImage();
    }
  }, [isVisible, originalImage]);

  useEffect(() => {
    if (imageLoaded && originalImageData) {
      applyEnhancements();
    }
  }, [settings, imageLoaded, originalImageData]);

  const loadAndAnalyzeImage = async () => {
    if (!originalImage) return;

    try {
      setProcessing(true);
      const imageUrl = typeof originalImage === 'string'
        ? originalImage
        : URL.createObjectURL(originalImage);

      const img = new Image();
      img.onload = async () => {
        // Draw original image to canvas
        const originalCanvas = originalCanvasRef.current;
        const canvas = canvasRef.current;

        if (!originalCanvas || !canvas) return;

        const ctx = originalCanvas.getContext('2d');
        const enhancedCtx = canvas.getContext('2d');

        if (!ctx || !enhancedCtx) return;

        // Set canvas dimensions
        const maxWidth = 800;
        const maxHeight = 600;
        const { width, height } = calculateDimensions(img.width, img.height, maxWidth, maxHeight);

        originalCanvas.width = canvas.width = width;
        originalCanvas.height = canvas.height = height;

        // Draw original image
        ctx.drawImage(img, 0, 0, width, height);
        enhancedCtx.drawImage(img, 0, 0, width, height);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, width, height);
        setOriginalImageData(imageData);

        // Analyze image quality
        const assessment = await analyzeImageQuality(imageData);
        setQualityAssessment(assessment);

        // Apply auto-enhancement if enabled
        if (documentType) {
          const autoSettings = getAutoEnhancementSettings(assessment, documentType);
          setSettings(autoSettings);
        }

        setImageLoaded(true);
        setProcessing(false);

        // Clean up blob URL
        if (typeof originalImage !== 'string') {
          URL.revokeObjectURL(imageUrl);
        }
      };

      img.src = imageUrl;
    } catch (error) {
      console.error('Failed to load image:', error);
      setProcessing(false);
    }
  };

  const calculateDimensions = (
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ) => {
    const aspectRatio = originalWidth / originalHeight;
    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  };

  const analyzeImageQuality = async (imageData: ImageData): Promise<QualityAssessment> => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Calculate brightness
    let totalBrightness = 0;
    const totalContrast = 0;
    let brightPixels = 0;
    let darkPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += luminance;

      if (luminance > 200) brightPixels++;
      if (luminance < 50) darkPixels++;
    }

    const pixelCount = data.length / 4;
    const avgBrightness = totalBrightness / pixelCount;

    // Calculate contrast using standard deviation
    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      variance += Math.pow(luminance - avgBrightness, 2);
    }
    const contrast = Math.sqrt(variance / pixelCount);

    // Calculate sharpness using edge detection
    const sharpness = calculateSharpness(data, width, height);

    // Calculate noise estimate
    const noise = estimateNoise(data, width, height);

    // Generate assessment
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    if (avgBrightness < 80) {
      issues.push('Image appears too dark');
      suggestions.push('Increase brightness');
      score -= 20;
    } else if (avgBrightness > 180) {
      issues.push('Image appears too bright');
      suggestions.push('Decrease brightness');
      score -= 15;
    }

    if (contrast < 30) {
      issues.push('Low contrast detected');
      suggestions.push('Increase contrast for better readability');
      score -= 25;
    }

    if (sharpness < 20) {
      issues.push('Image appears blurry');
      suggestions.push('Apply sharpening filter');
      score -= 20;
    }

    if (noise > 15) {
      issues.push('High noise levels detected');
      suggestions.push('Apply noise reduction');
      score -= 10;
    }

    if (darkPixels / pixelCount > 0.3) {
      issues.push('Too many dark areas');
      suggestions.push('Improve lighting or increase brightness');
      score -= 15;
    }

    if (brightPixels / pixelCount > 0.2) {
      issues.push('Overexposed areas detected');
      suggestions.push('Reduce brightness or improve exposure');
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      issues,
      suggestions,
      metrics: {
        brightness: avgBrightness,
        contrast: contrast,
        sharpness: sharpness,
        noise: noise
      }
    };
  };

  const calculateSharpness = (data: Uint8ClampedArray, width: number, height: number): number => {
    // Simple edge detection for sharpness estimation
    let edgeStrength = 0;
    let edgeCount = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;

        // Get luminance of current and neighboring pixels
        const current = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const right = 0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6];
        const bottom = 0.299 * data[i + width * 4] + 0.587 * data[i + width * 4 + 1] + 0.114 * data[i + width * 4 + 2];

        // Calculate edge strength
        const horizontalEdge = Math.abs(current - right);
        const verticalEdge = Math.abs(current - bottom);
        const edge = Math.sqrt(horizontalEdge * horizontalEdge + verticalEdge * verticalEdge);

        if (edge > 10) {
          edgeStrength += edge;
          edgeCount++;
        }
      }
    }

    return edgeCount > 0 ? edgeStrength / edgeCount : 0;
  };

  const estimateNoise = (data: Uint8ClampedArray, width: number, height: number): number => {
    // Estimate noise using local variance
    let noiseSum = 0;
    let sampleCount = 0;

    for (let y = 1; y < height - 1; y += 5) {
      for (let x = 1; x < width - 1; x += 5) {
        const i = (y * width + x) * 4;

        // Sample 3x3 neighborhood
        const luminances: number[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = ((y + dy) * width + (x + dx)) * 4;
            luminances.push(0.299 * data[ni] + 0.587 * data[ni + 1] + 0.114 * data[ni + 2]);
          }
        }

        // Calculate local variance
        const mean = luminances.reduce((a, b) => a + b) / luminances.length;
        const variance = luminances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / luminances.length;

        noiseSum += variance;
        sampleCount++;
      }
    }

    return sampleCount > 0 ? Math.sqrt(noiseSum / sampleCount) : 0;
  };

  const getAutoEnhancementSettings = (
    assessment: QualityAssessment,
    docType: string
  ): ImageEnhancementSettings => {
    const autoSettings: ImageEnhancementSettings = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      autoEnhance: true
    };

    // Adjust based on document type
    if (docType === 'text') {
      // Text documents benefit from high contrast and reduced saturation
      autoSettings.saturation = -20;

      if (assessment.metrics.contrast < 40) {
        autoSettings.contrast = 25;
      }

      if (assessment.metrics.brightness < 100) {
        autoSettings.brightness = 15;
      }

      if (assessment.metrics.sharpness < 25) {
        autoSettings.sharpness = 20;
      }
    } else if (docType === 'photo') {
      // Photos need balanced enhancement
      if (assessment.metrics.brightness < 120) {
        autoSettings.brightness = 10;
      }

      if (assessment.metrics.contrast < 35) {
        autoSettings.contrast = 15;
      }

      if (assessment.metrics.sharpness < 20) {
        autoSettings.sharpness = 10;
      }
    }

    return autoSettings;
  };

  const applyEnhancements = useCallback(() => {
    if (!originalImageData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create enhanced image data
    const enhancedData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );

    const data = enhancedData.data;

    // Apply brightness and contrast
    const brightnessFactor = 1 + (settings.brightness / 100);
    const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));

    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] = Math.min(255, Math.max(0, data[i] * brightnessFactor));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * brightnessFactor));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * brightnessFactor));

      // Apply contrast
      data[i] = Math.min(255, Math.max(0, contrastFactor * (data[i] - 128) + 128));
      data[i + 1] = Math.min(255, Math.max(0, contrastFactor * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.min(255, Math.max(0, contrastFactor * (data[i + 2] - 128) + 128));
    }

    // Apply saturation
    if (settings.saturation !== 0) {
      const saturationFactor = 1 + (settings.saturation / 100);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Convert to grayscale
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Apply saturation
        data[i] = Math.min(255, Math.max(0, gray + saturationFactor * (r - gray)));
        data[i + 1] = Math.min(255, Math.max(0, gray + saturationFactor * (g - gray)));
        data[i + 2] = Math.min(255, Math.max(0, gray + saturationFactor * (b - gray)));
      }
    }

    // Apply simple sharpening (unsharp mask)
    if (settings.sharpness > 0) {
      applySharpening(enhancedData, settings.sharpness / 100);
    }

    // Draw enhanced image
    ctx.putImageData(enhancedData, 0, 0);
  }, [originalImageData, settings]);

  const applySharpening = (imageData: ImageData, strength: number) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const original = new Uint8ClampedArray(data);

    // 3x3 sharpening kernel
    const kernel = [
      0, -strength, 0,
      -strength, 1 + 4 * strength, -strength,
      0, -strength, 0
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const i = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += original[i] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const i = (y * width + x) * 4 + c;
          data[i] = Math.min(255, Math.max(0, sum));
        }
      }
    }
  };

  const handleSettingChange = (setting: keyof ImageEnhancementSettings, value: number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value,
      autoEnhance: setting === 'autoEnhance' ? value as boolean : false
    }));
  };

  const resetSettings = () => {
    setSettings({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      autoEnhance: false
    });
  };

  const handleApplyEnhancement = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader();
        reader.onload = () => {
          onEnhancementComplete(reader.result as string, settings);
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Image Enhancement
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-300 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {processing && (
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 mx-auto mb-4 border-2 border-blue-400 border-t-transparent rounded-full"
              />
              <p className="text-gray-300">Analyzing image...</p>
            </div>
          )}

          {imageLoaded && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Image Preview */}
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowPreview(false)}
                    className={`px-3 py-1 text-sm rounded backdrop-blur-sm border ${
                      !showPreview ? 'bg-blue-500/30 border-blue-400/50 text-white' : 'bg-white/10 border-white/20 text-gray-300'
                    }`}
                  >
                    Enhanced
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className={`px-3 py-1 text-sm rounded backdrop-blur-sm border ${
                      showPreview ? 'bg-blue-500/30 border-blue-400/50 text-white' : 'bg-white/10 border-white/20 text-gray-300'
                    }`}
                  >
                    Original
                  </button>
                </div>

                <div className="relative border border-white/20 rounded-lg overflow-hidden bg-white/5">
                  <canvas
                    ref={originalCanvasRef}
                    className={`w-full h-auto ${showPreview ? 'block' : 'hidden'}`}
                  />
                  <canvas
                    ref={canvasRef}
                    className={`w-full h-auto ${!showPreview ? 'block' : 'hidden'}`}
                  />
                </div>

                {/* Quality Assessment */}
                {qualityAssessment && (
                  <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Quality Assessment</h4>
                    <div className="flex items-center mb-2">
                      <span className="text-sm text-gray-300 mr-2">Score:</span>
                      <div className="flex-1 bg-white/5 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            qualityAssessment.score >= 80 ? 'bg-green-500/70' :
                            qualityAssessment.score >= 60 ? 'bg-yellow-500/70' : 'bg-red-500/70'
                          }`}
                          style={{ width: `${qualityAssessment.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white">{qualityAssessment.score}/100</span>
                    </div>

                    {qualityAssessment.issues.length > 0 && (
                      <div className="mb-2">
                        <h5 className="text-xs font-medium text-gray-300 mb-1">Issues:</h5>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {qualityAssessment.issues.map((issue, index) => (
                            <li key={index} className="flex items-start">
                              <span className="w-1 h-1 bg-red-400/80 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {qualityAssessment.suggestions.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-300 mb-1">Suggestions:</h5>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {qualityAssessment.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start">
                              <span className="w-1 h-1 bg-blue-400/80 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Enhancement Controls</h4>
                  <button
                    onClick={resetSettings}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Reset
                  </button>
                </div>

                {/* Auto Enhancement */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Auto Enhancement</label>
                  <input
                    type="checkbox"
                    checked={settings.autoEnhance}
                    onChange={(e) => {
                      if (e.target.checked && qualityAssessment) {
                        const autoSettings = getAutoEnhancementSettings(qualityAssessment, documentType);
                        setSettings(autoSettings);
                      } else {
                        handleSettingChange('autoEnhance', e.target.checked);
                      }
                    }}
                    className="rounded border-white/20 text-blue-400 bg-white/10 focus:ring-blue-400"
                  />
                </div>

                {/* Manual Controls */}
                <div className="space-y-4">
                  {/* Brightness */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300">Brightness</label>
                      <span className="text-sm text-gray-300">{settings.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={settings.brightness}
                      onChange={(e) => handleSettingChange('brightness', parseInt(e.target.value))}
                      className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300">Contrast</label>
                      <span className="text-sm text-gray-300">{settings.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={settings.contrast}
                      onChange={(e) => handleSettingChange('contrast', parseInt(e.target.value))}
                      className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300">Saturation</label>
                      <span className="text-sm text-gray-300">{settings.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={settings.saturation}
                      onChange={(e) => handleSettingChange('saturation', parseInt(e.target.value))}
                      className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Sharpness */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300">Sharpness</label>
                      <span className="text-sm text-gray-300">{settings.sharpness}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={settings.sharpness}
                      onChange={(e) => handleSettingChange('sharpness', parseInt(e.target.value))}
                      className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Document Type Selection */}
                <div>
                  <label className="text-sm text-gray-300 block mb-2">Document Type</label>
                  <select
                    value={documentType}
                    onChange={(e) => {
                      if (qualityAssessment) {
                        const autoSettings = getAutoEnhancementSettings(
                          qualityAssessment,
                          e.target.value as 'text' | 'photo' | 'mixed'
                        );
                        setSettings(autoSettings);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:ring-blue-400 focus:border-blue-400 rounded-lg"
                  >
                    <option value="text" className="bg-gray-800">Text Document</option>
                    <option value="photo" className="bg-gray-800">Photo</option>
                    <option value="mixed" className="bg-gray-800">Mixed Content</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                  <button
                    onClick={handleApplyEnhancement}
                    className="w-full bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 hover:bg-blue-500/50 py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Apply Enhancement
                  </button>
                  <button
                    onClick={onCancel}
                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-gray-300 hover:bg-white/20 hover:text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageEnhancer;