export type OCRStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
export type OCRLanguage = 'ar' | 'en' | 'ar-en' | 'auto';
export type OCRQuality = 'low' | 'medium' | 'high' | 'excellent';

export interface OCRJob {
  id: string;
  documentId: string;
  status: OCRStatus;
  progress: number; // 0-100
  language: OCRLanguage;
  detectedLanguage?: OCRLanguage;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  estimatedTimeRemaining?: number; // seconds
  processingSettings: OCRProcessingSettings;
  retryCount: number;
  maxRetries: number;
  error?: OCRError;
}

export interface OCRProcessingSettings {
  enableLanguageDetection: boolean;
  targetLanguages: OCRLanguage[];
  qualityThreshold: number; // 0-100
  imagePreprocessing: {
    enhanceContrast: boolean;
    denoiseImage: boolean;
    deskewImage: boolean;
    resolutionDPI: number;
  };
  textProcessing: {
    preserveFormatting: boolean;
    extractTables: boolean;
    extractHeaders: boolean;
    mergeFragments: boolean;
  };
}

export interface OCRResult {
  id: string;
  jobId: string;
  documentId: string;
  extractedText: string;
  formattedText?: string;
  language: OCRLanguage;
  confidence: OCRConfidenceScore;
  qualityMetrics: OCRQualityMetrics;
  textBlocks: OCRTextBlock[];
  processingTime: number; // seconds
  dateCreated: string; // ISO string
}

export interface OCRTextBlock {
  id: string;
  text: string;
  confidence: number; // 0-100
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  language?: OCRLanguage;
  type: 'paragraph' | 'heading' | 'table' | 'list' | 'other';
  order: number;
}

export interface OCRConfidenceScore {
  overall: number; // 0-100
  character: number; // 0-100
  word: number; // 0-100
  line: number; // 0-100
  paragraph: number; // 0-100
}

export interface OCRQualityMetrics {
  textCoverage: number; // percentage of document with text
  averageWordLength: number;
  punctuationRatio: number;
  specialCharacterRatio: number;
  layoutPreservation: number; // 0-100
  quality: OCRQuality;
  recommendations: string[];
}

export interface OCRError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string; // ISO string
  recoverable: boolean;
}

export interface OCRQueue {
  jobs: OCRJob[];
  activeJobs: number;
  maxConcurrentJobs: number;
  totalProcessingTime: number; // seconds
  averageProcessingTime: number; // seconds
  isProcessing: boolean;
}

export interface OCRRetryOptions {
  jobId: string;
  newSettings?: Partial<OCRProcessingSettings>;
  reason?: string;
}

export interface OCRPreviewData {
  originalImageUrl?: string;
  preprocessedImageUrl?: string;
  extractedText: string;
  formattedText?: string;
  confidence: OCRConfidenceScore;
  highlightedBlocks: OCRTextBlock[];
  editable: boolean;
}

export interface OCREditSession {
  id: string;
  ocrResultId: string;
  originalText: string;
  editedText: string;
  changes: OCRTextChange[];
  dateStarted: string; // ISO string
  dateLastModified: string; // ISO string
  isCompleted: boolean;
}

export interface OCRTextChange {
  id: string;
  blockId: string;
  originalText: string;
  newText: string;
  changeType: 'correction' | 'addition' | 'deletion' | 'formatting';
  timestamp: string; // ISO string
  confidence?: number;
}

// Component Props Types
export interface OCRProcessorProps {
  documentId: string;
  autoStart?: boolean;
  onComplete?: (result: OCRResult) => void;
  onError?: (error: OCRError) => void;
  onProgress?: (progress: number) => void;
}

export interface OCRStatusIndicatorProps {
  job: OCRJob;
  showDetails?: boolean;
  compact?: boolean;
}

export interface OCRQualityIndicatorProps {
  qualityMetrics: OCRQualityMetrics;
  confidence: OCRConfidenceScore;
  showRecommendations?: boolean;
}

export interface OCRTextPreviewProps {
  ocrResult: OCRResult;
  previewData: OCRPreviewData;
  editMode?: boolean;
  onTextEdit?: (changes: OCRTextChange[]) => void;
  onSave?: (editedText: string) => void;
}

export interface OCRRetryControlsProps {
  job: OCRJob;
  onRetry: (options: OCRRetryOptions) => void;
  onSettingsChange?: (settings: Partial<OCRProcessingSettings>) => void;
  disabled?: boolean;
}