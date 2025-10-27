import type { FileTypeConfig, FileValidationResult } from '@/types/domain/Upload';

// Supported file types configuration
export const SUPPORTED_FILE_TYPES: FileTypeConfig[] = [
  // Documents
  {
    extension: 'pdf',
    mimeTypes: ['application/pdf'],
    maxSize: 50 * 1024 * 1024, // 50MB
    category: 'document',
    previewSupported: true,
    thumbnailSupported: true,
  },
  {
    extension: 'doc',
    mimeTypes: ['application/msword'],
    maxSize: 25 * 1024 * 1024, // 25MB
    category: 'document',
    previewSupported: false,
    thumbnailSupported: true,
  },
  {
    extension: 'docx',
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 25 * 1024 * 1024, // 25MB
    category: 'document',
    previewSupported: false,
    thumbnailSupported: true,
  },
  {
    extension: 'xls',
    mimeTypes: ['application/vnd.ms-excel'],
    maxSize: 25 * 1024 * 1024, // 25MB
    category: 'document',
    previewSupported: false,
    thumbnailSupported: true,
  },
  {
    extension: 'xlsx',
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 25 * 1024 * 1024, // 25MB
    category: 'document',
    previewSupported: false,
    thumbnailSupported: true,
  },
  {
    extension: 'ppt',
    mimeTypes: ['application/vnd.ms-powerpoint'],
    maxSize: 50 * 1024 * 1024, // 50MB
    category: 'document',
    previewSupported: false,
    thumbnailSupported: true,
  },
  {
    extension: 'pptx',
    mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    maxSize: 50 * 1024 * 1024, // 50MB
    category: 'document',
    previewSupported: false,
    thumbnailSupported: true,
  },
  {
    extension: 'txt',
    mimeTypes: ['text/plain'],
    maxSize: 10 * 1024 * 1024, // 10MB
    category: 'document',
    previewSupported: true,
    thumbnailSupported: false,
  },
  {
    extension: 'md',
    mimeTypes: ['text/markdown', 'text/x-markdown'],
    maxSize: 10 * 1024 * 1024, // 10MB
    category: 'document',
    previewSupported: true,
    thumbnailSupported: false,
  },
  // Images
  {
    extension: 'jpg',
    mimeTypes: ['image/jpeg'],
    maxSize: 20 * 1024 * 1024, // 20MB
    category: 'image',
    previewSupported: true,
    thumbnailSupported: true,
  },
  {
    extension: 'jpeg',
    mimeTypes: ['image/jpeg'],
    maxSize: 20 * 1024 * 1024, // 20MB
    category: 'image',
    previewSupported: true,
    thumbnailSupported: true,
  },
  {
    extension: 'png',
    mimeTypes: ['image/png'],
    maxSize: 20 * 1024 * 1024, // 20MB
    category: 'image',
    previewSupported: true,
    thumbnailSupported: true,
  },
  {
    extension: 'gif',
    mimeTypes: ['image/gif'],
    maxSize: 20 * 1024 * 1024, // 20MB
    category: 'image',
    previewSupported: true,
    thumbnailSupported: true,
  },
  {
    extension: 'webp',
    mimeTypes: ['image/webp'],
    maxSize: 20 * 1024 * 1024, // 20MB
    category: 'image',
    previewSupported: true,
    thumbnailSupported: true,
  },
  {
    extension: 'svg',
    mimeTypes: ['image/svg+xml'],
    maxSize: 5 * 1024 * 1024, // 5MB
    category: 'image',
    previewSupported: true,
    thumbnailSupported: true,
  },
  // Audio
  {
    extension: 'mp3',
    mimeTypes: ['audio/mpeg', 'audio/mp3'],
    maxSize: 100 * 1024 * 1024, // 100MB
    category: 'audio',
    previewSupported: true,
    thumbnailSupported: false,
  },
  {
    extension: 'wav',
    mimeTypes: ['audio/wav', 'audio/wave'],
    maxSize: 100 * 1024 * 1024, // 100MB
    category: 'audio',
    previewSupported: true,
    thumbnailSupported: false,
  },
  {
    extension: 'ogg',
    mimeTypes: ['audio/ogg'],
    maxSize: 100 * 1024 * 1024, // 100MB
    category: 'audio',
    previewSupported: true,
    thumbnailSupported: false,
  },
  {
    extension: 'm4a',
    mimeTypes: ['audio/m4a', 'audio/mp4'],
    maxSize: 100 * 1024 * 1024, // 100MB
    category: 'audio',
    previewSupported: true,
    thumbnailSupported: false,
  },
  // Video
  {
    extension: 'mp4',
    mimeTypes: ['video/mp4'],
    maxSize: 500 * 1024 * 1024, // 500MB
    category: 'video',
    previewSupported: true,
    thumbnailSupported: true,
  },
  {
    extension: 'webm',
    mimeTypes: ['video/webm'],
    maxSize: 500 * 1024 * 1024, // 500MB
    category: 'video',
    previewSupported: true,
    thumbnailSupported: true,
  },
  {
    extension: 'mov',
    mimeTypes: ['video/quicktime'],
    maxSize: 500 * 1024 * 1024, // 500MB
    category: 'video',
    previewSupported: true,
    thumbnailSupported: true,
  },
  {
    extension: 'avi',
    mimeTypes: ['video/x-msvideo'],
    maxSize: 500 * 1024 * 1024, // 500MB
    category: 'video',
    previewSupported: true,
    thumbnailSupported: true,
  },
];

export class FileValidator {
  private static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private static getFileTypeConfig(file: File): FileTypeConfig | null {
    if (!file || !file.name) {
      return null;
    }
    const extension = this.getFileExtension(file.name);
    return SUPPORTED_FILE_TYPES.find(
      (config) =>
        config.extension === extension &&
        config.mimeTypes.includes(file.type)
    ) || null;
  }

  static validateFile(file: File): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if file exists and has content
    if (!file) {
      errors.push('File is required');
      return { isValid: false, errors, warnings };
    }

    if (file.size === 0) {
      errors.push('File is empty');
      return { isValid: false, errors, warnings };
    }

    // Get file type configuration
    const fileTypeConfig = this.getFileTypeConfig(file);

    if (!fileTypeConfig) {
      const extension = this.getFileExtension(file.name);
      errors.push(`File type "${extension}" is not supported`);
      return { isValid: false, errors, warnings };
    }

    // Validate file size
    if (file.size > fileTypeConfig.maxSize) {
      const maxSizeMB = Math.round(fileTypeConfig.maxSize / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      errors.push(`File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`);
    }

    // Validate MIME type
    if (!fileTypeConfig.mimeTypes.includes(file.type)) {
      warnings.push(`File MIME type "${file.type}" doesn't match expected type for ${fileTypeConfig.extension} files`);
    }

    // Validate filename
    if (file.name.length > 255) {
      errors.push('Filename is too long (maximum 255 characters)');
    }

    if (!/^[a-zA-Z0-9._\-\s()[\]{}]+$/.test(file.name)) {
      warnings.push('Filename contains special characters that may cause issues');
    }

    // Check for large files that might cause performance issues
    if (file.size > 100 * 1024 * 1024) { // 100MB
      warnings.push('Large file may take longer to upload');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateFiles(files: File[]): FileValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let totalSize = 0;

    // Validate individual files
    for (const file of files) {
      const result = this.validateFile(file);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      totalSize += file.size;
    }

    // Validate batch constraints
    if (files.length > 50) {
      allErrors.push('Too many files selected. Maximum 50 files can be uploaded at once.');
    }

    if (totalSize > 1024 * 1024 * 1024) { // 1GB total
      const totalSizeGB = Math.round(totalSize / (1024 * 1024 * 1024) * 100) / 100;
      allWarnings.push(`Total upload size is ${totalSizeGB}GB. Large batches may take longer to upload.`);
    }

    // Check for duplicate filenames
    const filenames = files.map(f => f.name);
    const duplicates = filenames.filter((name, index) => filenames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      allWarnings.push(`Duplicate filenames detected: ${[...new Set(duplicates)].join(', ')}`);
    }

    return {
      isValid: allErrors.length === 0,
      errors: [...new Set(allErrors)],
      warnings: [...new Set(allWarnings)],
    };
  }

  static getSupportedExtensions(): string[] {
    return SUPPORTED_FILE_TYPES.map(config => config.extension);
  }

  static getSupportedMimeTypes(): string[] {
    return SUPPORTED_FILE_TYPES.flatMap(config => config.mimeTypes);
  }

  static getAcceptAttribute(): string {
    return SUPPORTED_FILE_TYPES.flatMap(config => config.mimeTypes).join(',');
  }

  static getPublicFileTypeConfig(file: File): FileTypeConfig | null {
    return this.getFileTypeConfig(file);
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static isImageFile(file: File): boolean {
    const config = this.getFileTypeConfig(file);
    return config?.category === 'image' || false;
  }

  static isVideoFile(file: File): boolean {
    const config = this.getFileTypeConfig(file);
    return config?.category === 'video' || false;
  }

  static isAudioFile(file: File): boolean {
    const config = this.getFileTypeConfig(file);
    return config?.category === 'audio' || false;
  }

  static isDocumentFile(file: File): boolean {
    const config = this.getFileTypeConfig(file);
    return config?.category === 'document' || false;
  }

  static isPDFFile(file: File): boolean {
    const config = this.getFileTypeConfig(file);
    return config?.extension === 'pdf' || false;
  }

  static getFileCategory(file: File): string {
    const config = this.getFileTypeConfig(file);
    return config?.category || 'unknown';
  }

  static getFileExtensionFromName(filename: string): string {
    return this.getFileExtension(filename);
  }
}

export default FileValidator;