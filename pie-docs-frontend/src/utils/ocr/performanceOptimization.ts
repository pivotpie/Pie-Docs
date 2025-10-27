import type { OCRProcessingSettings, OCRJob } from '@/types/domain/OCR';
import type { DocumentType } from '@/types/domain/Document';

export interface PerformanceMetrics {
  processingTime: number;
  queueWaitTime: number;
  throughput: number; // documents per minute
  averageFileSize: number;
  successRate: number;
  averageConfidence: number;
}

export interface OptimizationRecommendation {
  category: 'settings' | 'infrastructure' | 'workflow';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
  expectedImprovement: string;
  settings?: Partial<OCRProcessingSettings>;
}

export interface ClientOptimizationResult {
  optimizedImageUrl: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  qualityScore: number;
}

// Performance targets for OCR processing
export const PERFORMANCE_TARGETS = {
  maxProcessingTime: 30000, // 30 seconds
  minThroughput: 2, // documents per minute
  minSuccessRate: 0.95, // 95%
  minAverageConfidence: 75, // 75%
  maxQueueWaitTime: 5000, // 5 seconds
} as const;

export function optimizeSettingsForPerformance(
  documentType: DocumentType,
  fileSize: number,
  targetProcessingTime: number = PERFORMANCE_TARGETS.maxProcessingTime
): OCRProcessingSettings {
  // Base settings optimized for performance
  const baseSettings: OCRProcessingSettings = {
    enableLanguageDetection: true,
    targetLanguages: ['ar', 'en'],
    qualityThreshold: 70, // Slightly lower for speed
    imagePreprocessing: {
      enhanceContrast: false,
      denoiseImage: false,
      deskewImage: false,
      resolutionDPI: 200, // Lower resolution for speed
    },
    textProcessing: {
      preserveFormatting: false, // Disable for speed
      extractTables: false, // Disable for speed
      extractHeaders: false, // Disable for speed
      mergeFragments: true,
    },
  };

  // Adjust based on file size
  const fileSizeMB = fileSize / (1024 * 1024);

  if (fileSizeMB > 10) {
    // Large files - prioritize speed over quality
    baseSettings.imagePreprocessing.resolutionDPI = 150;
    baseSettings.qualityThreshold = 60;
    baseSettings.enableLanguageDetection = false; // Faster without detection
  } else if (fileSizeMB > 5) {
    // Medium files - balanced approach
    baseSettings.imagePreprocessing.resolutionDPI = 200;
    baseSettings.qualityThreshold = 65;
  } else {
    // Small files - can afford higher quality
    baseSettings.imagePreprocessing.resolutionDPI = 250;
    baseSettings.qualityThreshold = 75;
    baseSettings.imagePreprocessing.enhanceContrast = true;
  }

  // Adjust based on document type
  if (documentType === 'pdf') {
    baseSettings.textProcessing.preserveFormatting = true;
    baseSettings.textProcessing.extractHeaders = true;
  } else if (documentType === 'image') {
    baseSettings.imagePreprocessing.enhanceContrast = true;
    baseSettings.imagePreprocessing.denoiseImage = true;
  }

  // Further optimize based on target processing time
  if (targetProcessingTime < 15000) {
    // Very fast processing required
    baseSettings.imagePreprocessing.resolutionDPI = Math.min(baseSettings.imagePreprocessing.resolutionDPI, 150);
    baseSettings.qualityThreshold = Math.min(baseSettings.qualityThreshold, 60);
    baseSettings.enableLanguageDetection = false;
    baseSettings.textProcessing.preserveFormatting = false;
    baseSettings.textProcessing.extractTables = false;
    baseSettings.textProcessing.extractHeaders = false;
  }

  return baseSettings;
}

export async function optimizeImageForOCR(
  imageFile: File,
  targetSize?: number
): Promise<ClientOptimizationResult> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate optimal dimensions
        const originalSize = imageFile.size;
        const maxDimension = targetSize || 2048; // Default max dimension

        let { width, height } = img;

        // Resize if necessary
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Apply optimizations
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw and optimize
        ctx.drawImage(img, 0, 0, width, height);

        // Apply contrast enhancement for better OCR
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Simple contrast enhancement
        const factor = 1.2;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * factor);     // Red
          data[i + 1] = Math.min(255, data[i + 1] * factor); // Green
          data[i + 2] = Math.min(255, data[i + 2] * factor); // Blue
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create optimized image'));
              return;
            }

            const optimizedSize = blob.size;
            const compressionRatio = originalSize / optimizedSize;

            // Create URL for the optimized image
            const optimizedImageUrl = URL.createObjectURL(blob);

            resolve({
              optimizedImageUrl,
              originalSize,
              optimizedSize,
              compressionRatio,
              qualityScore: Math.min(100, compressionRatio * 50), // Rough quality estimate
            });
          },
          'image/jpeg',
          0.9 // High quality JPEG
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}

export function analyzePerformanceMetrics(
  jobs: OCRJob[],
  timeWindow: number = 3600000 // 1 hour in milliseconds
): PerformanceMetrics {
  const now = Date.now();
  const recentJobs = jobs.filter(job => {
    const jobTime = new Date(job.startTime).getTime();
    return now - jobTime <= timeWindow;
  });

  if (recentJobs.length === 0) {
    return {
      processingTime: 0,
      queueWaitTime: 0,
      throughput: 0,
      averageFileSize: 0,
      successRate: 0,
      averageConfidence: 0,
    };
  }

  const completedJobs = recentJobs.filter(job => job.status === 'completed');
  // const failedJobs = recentJobs.filter(job => job.status === 'failed');

  const totalProcessingTime = completedJobs.reduce((sum, job) => {
    if (job.endTime) {
      const processingTime = new Date(job.endTime).getTime() - new Date(job.startTime).getTime();
      return sum + processingTime;
    }
    return sum;
  }, 0);

  const averageProcessingTime = completedJobs.length > 0 ? totalProcessingTime / completedJobs.length : 0;
  const successRate = recentJobs.length > 0 ? completedJobs.length / recentJobs.length : 0;
  const throughput = (completedJobs.length / (timeWindow / 60000)); // per minute

  return {
    processingTime: averageProcessingTime,
    queueWaitTime: 0, // Would need queue timestamps to calculate
    throughput,
    averageFileSize: 0, // Would need file sizes
    successRate,
    averageConfidence: 0, // Would need confidence scores
  };
}

export function generateOptimizationRecommendations(
  metrics: PerformanceMetrics,
  currentSettings: OCRProcessingSettings
): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];

  // Processing time optimization
  if (metrics.processingTime > PERFORMANCE_TARGETS.maxProcessingTime) {
    recommendations.push({
      category: 'settings',
      priority: 'high',
      title: 'Reduce Processing Time',
      description: 'Processing time exceeds 30-second target',
      implementation: 'Lower image resolution and disable advanced preprocessing',
      expectedImprovement: '40-60% faster processing',
      settings: {
        imagePreprocessing: {
          ...currentSettings.imagePreprocessing,
          resolutionDPI: Math.max(currentSettings.imagePreprocessing.resolutionDPI - 100, 150),
          enhanceContrast: false,
          denoiseImage: false,
        },
        qualityThreshold: Math.max(currentSettings.qualityThreshold - 10, 50),
      },
    });
  }

  // Throughput optimization
  if (metrics.throughput < PERFORMANCE_TARGETS.minThroughput) {
    recommendations.push({
      category: 'infrastructure',
      priority: 'high',
      title: 'Increase Processing Throughput',
      description: 'Document processing rate is below target',
      implementation: 'Increase concurrent processing slots and optimize queue management',
      expectedImprovement: '2-3x throughput increase',
    });
  }

  // Success rate optimization
  if (metrics.successRate < PERFORMANCE_TARGETS.minSuccessRate) {
    recommendations.push({
      category: 'workflow',
      priority: 'high',
      title: 'Improve Success Rate',
      description: 'Too many OCR jobs are failing',
      implementation: 'Implement better pre-processing and error handling',
      expectedImprovement: '10-15% improvement in success rate',
      settings: {
        imagePreprocessing: {
          ...currentSettings.imagePreprocessing,
          enhanceContrast: true,
          denoiseImage: true,
          deskewImage: true,
        },
      },
    });
  }

  // Quality vs speed balance
  if (currentSettings.qualityThreshold > 80) {
    recommendations.push({
      category: 'settings',
      priority: 'medium',
      title: 'Balance Quality and Speed',
      description: 'High quality threshold may be slowing processing',
      implementation: 'Reduce quality threshold for better performance',
      expectedImprovement: '20-30% faster processing',
      settings: {
        qualityThreshold: 70,
      },
    });
  }

  // Language detection optimization
  if (currentSettings.enableLanguageDetection && currentSettings.targetLanguages.length === 1) {
    recommendations.push({
      category: 'settings',
      priority: 'low',
      title: 'Disable Language Detection',
      description: 'Language detection unnecessary for single-language processing',
      implementation: 'Disable language detection when target language is known',
      expectedImprovement: '10-15% faster processing',
      settings: {
        enableLanguageDetection: false,
      },
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

export function estimateOptimizedProcessingTime(
  originalTime: number,
  originalSettings: OCRProcessingSettings,
  optimizedSettings: OCRProcessingSettings
): number {
  let speedupFactor = 1;

  // Resolution impact
  const resolutionRatio = originalSettings.imagePreprocessing.resolutionDPI / optimizedSettings.imagePreprocessing.resolutionDPI;
  speedupFactor *= Math.pow(resolutionRatio, 0.5); // Square root relationship

  // Preprocessing impact
  const originalPreprocessing = [
    originalSettings.imagePreprocessing.enhanceContrast,
    originalSettings.imagePreprocessing.denoiseImage,
    originalSettings.imagePreprocessing.deskewImage,
  ].filter(Boolean).length;

  const optimizedPreprocessing = [
    optimizedSettings.imagePreprocessing.enhanceContrast,
    optimizedSettings.imagePreprocessing.denoiseImage,
    optimizedSettings.imagePreprocessing.deskewImage,
  ].filter(Boolean).length;

  if (originalPreprocessing > optimizedPreprocessing) {
    speedupFactor *= 1 + (originalPreprocessing - optimizedPreprocessing) * 0.1;
  }

  // Language detection impact
  if (originalSettings.enableLanguageDetection && !optimizedSettings.enableLanguageDetection) {
    speedupFactor *= 1.15;
  }

  // Text processing impact
  const originalTextProcessing = [
    originalSettings.textProcessing.preserveFormatting,
    originalSettings.textProcessing.extractTables,
    originalSettings.textProcessing.extractHeaders,
  ].filter(Boolean).length;

  const optimizedTextProcessing = [
    optimizedSettings.textProcessing.preserveFormatting,
    optimizedSettings.textProcessing.extractTables,
    optimizedSettings.textProcessing.extractHeaders,
  ].filter(Boolean).length;

  if (originalTextProcessing > optimizedTextProcessing) {
    speedupFactor *= 1 + (originalTextProcessing - optimizedTextProcessing) * 0.05;
  }

  return Math.max(originalTime / speedupFactor, 5000); // Minimum 5 seconds
}

export function createPerformanceMonitor() {
  const metrics = new Map<string, number>();
  const timestamps = new Map<string, number>();

  return {
    startTiming: (operation: string) => {
      timestamps.set(operation, performance.now());
    },

    endTiming: (operation: string) => {
      const start = timestamps.get(operation);
      if (start) {
        const duration = performance.now() - start;
        metrics.set(operation, duration);
        timestamps.delete(operation);
        return duration;
      }
      return 0;
    },

    getMetric: (operation: string) => {
      return metrics.get(operation) || 0;
    },

    getAllMetrics: () => {
      return Object.fromEntries(metrics);
    },

    clear: () => {
      metrics.clear();
      timestamps.clear();
    },
  };
}

export const performanceMonitor = createPerformanceMonitor();