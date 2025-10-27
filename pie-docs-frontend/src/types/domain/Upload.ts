export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';

// Serializable file metadata for Redux store
export interface UploadFileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  thumbnail?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
    author?: string;
  };
  folderId?: string;
  folderPath?: string;
  lastModified: number;
  uploadStartTime?: number;
  uploadEndTime?: number;
  retryCount: number;
}

// Complete upload file (includes File object for use outside Redux)
export interface UploadFile extends UploadFileMetadata {
  file: File;
}

export interface UploadQueue {
  files: UploadFileMetadata[];
  isUploading: boolean;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalBytes: number;
  uploadedBytes: number;
  overallProgress: number;
  concurrentUploads: number;
  maxConcurrentUploads: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadOptions {
  folderId?: string;
  folderPath?: string;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
    documentNumber?: string;
    author?: string;
  };
  autoOcr?: boolean;
  autoClassify?: boolean;
  concurrency?: number;
  chunkSize?: number;
  timeout?: number;
  embeddings?: number[];  // Semantic embeddings for RAG
  insights?: any[];  // Document insights from AI extraction
  summary?: any;  // Document summary from AI extraction
  key_terms?: any[];  // Key terms from AI extraction
}

export interface FileTypeConfig {
  extension: string;
  mimeTypes: string[];
  maxSize: number; // in bytes
  category: 'document' | 'image' | 'audio' | 'video' | 'other';
  previewSupported: boolean;
  thumbnailSupported: boolean;
}

export interface UploadProgress {
  fileId: string;
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
}

export interface FolderUpload {
  path: string;
  files: File[];
  structure: {
    [path: string]: File[];
  };
}

export interface UploadResponse {
  success: boolean;
  documentId?: string;
  message?: string;
  error?: string;
  thumbnailUrl?: string;
}

// Component Props
export interface UploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  onFolderAdded?: (folder: FolderUpload) => void;
  disabled?: boolean;
  accept?: string;
  maxFileSize?: number;
  maxFiles?: number;
  className?: string;
  children?: React.ReactNode;
}

export interface FileUploadQueueProps {
  uploadQueue: UploadQueue;
  onCancelUpload: (fileId: string) => void;
  onRetryUpload: (fileId: string) => void;
  onRemoveFile: (fileId: string) => void;
  onUpdateMetadata: (fileId: string, metadata: UploadFile['metadata']) => void;
  className?: string;
}

export interface UploadProgressBarProps {
  uploadFile: UploadFile;
  showDetails?: boolean;
  showThumbnail?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  className?: string;
}

export interface MetadataEntryFormProps {
  files: UploadFile[];
  onMetadataChange: (fileId: string, metadata: UploadFile['metadata']) => void;
  onBulkMetadataChange: (metadata: UploadFile['metadata']) => void;
  suggestedTags?: string[];
  suggestedCategories?: string[];
  className?: string;
}