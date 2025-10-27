import type { DocumentType } from '@/types/domain/Document';

export interface OCRCompatibilityResult {
  isCompatible: boolean;
  confidence: number;
  recommendedSettings?: {
    imagePreprocessing?: boolean;
    languageDetection?: boolean;
    multiColumn?: boolean;
  };
  reasons?: string[];
  securityWarnings?: string[];
}

const OCR_COMPATIBLE_TYPES: Set<DocumentType> = new Set(['pdf', 'image']);

const OCR_COMPATIBLE_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
  'image/bmp',
  'image/gif',
  'image/webp',
]);

const OCR_COMPATIBLE_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.tiff',
  '.tif',
  '.bmp',
  '.gif',
  '.webp',
]);

// Security validation constants
const SUSPICIOUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar',
  '.zip', '.rar', '.7z', '.tar', '.gz'
]);

const MAX_FILENAME_LENGTH = 255;
const SUSPICIOUS_FILENAME_PATTERNS = [
  /\.\./,  // Directory traversal
  /[<>:"\\|?*]/,  // Invalid filename characters
  /\s+$/,  // Trailing whitespace
];

const RESERVED_WINDOWS_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;

export function isDocumentOCRCompatible(
  documentType: DocumentType,
  mimeType?: string,
  fileName?: string
): OCRCompatibilityResult {
  const reasons: string[] = [];
  const securityWarnings: string[] = [];
  let isCompatible = false;
  let confidence = 0;
  const recommendedSettings: OCRCompatibilityResult['recommendedSettings'] = {};

  // Security validation first
  if (fileName) {
    const securityCheck = validateFileNameSecurity(fileName);
    if (securityCheck.warnings.length > 0) {
      securityWarnings.push(...securityCheck.warnings);
    }
    if (securityCheck.isBlocked) {
      return {
        isCompatible: false,
        confidence: 0,
        reasons: ['File blocked due to security concerns'],
        securityWarnings
      };
    }
  }

  // Check by document type
  if (OCR_COMPATIBLE_TYPES.has(documentType)) {
    isCompatible = true;
    confidence += 0.4;
    reasons.push(`Document type '${documentType}' supports OCR`);

    if (documentType === 'pdf') {
      recommendedSettings.multiColumn = true;
      recommendedSettings.languageDetection = true;
      confidence += 0.3;
    } else if (documentType === 'image') {
      recommendedSettings.imagePreprocessing = true;
      recommendedSettings.languageDetection = true;
      confidence += 0.2;
    }
  } else {
    reasons.push(`Document type '${documentType}' does not support OCR`);
  }

  // Check by MIME type
  if (mimeType && OCR_COMPATIBLE_MIME_TYPES.has(mimeType)) {
    if (!isCompatible) {
      isCompatible = true;
      confidence += 0.3;
      reasons.push(`MIME type '${mimeType}' supports OCR`);
    } else {
      confidence += 0.2;
      reasons.push(`MIME type '${mimeType}' confirms OCR compatibility`);
    }

    if (mimeType.startsWith('image/')) {
      recommendedSettings.imagePreprocessing = true;
    }
  }

  // Check by file extension
  if (fileName) {
    const extension = getFileExtension(fileName).toLowerCase();
    if (OCR_COMPATIBLE_EXTENSIONS.has(extension)) {
      if (!isCompatible) {
        isCompatible = true;
        confidence += 0.2;
        reasons.push(`File extension '${extension}' supports OCR`);
      } else {
        confidence += 0.1;
        reasons.push(`File extension '${extension}' confirms OCR compatibility`);
      }
    }
  }

  // Finalize confidence score
  confidence = Math.min(confidence, 1.0);

  return {
    isCompatible,
    confidence,
    recommendedSettings: isCompatible ? recommendedSettings : undefined,
    reasons,
    securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined,
  };
}

export function validateFileNameSecurity(fileName: string): {
  isBlocked: boolean;
  warnings: string[]
} {
  const warnings: string[] = [];
  let isBlocked = false;

  // Check filename length
  if (fileName.length > MAX_FILENAME_LENGTH) {
    warnings.push(`Filename exceeds maximum length of ${MAX_FILENAME_LENGTH} characters`);
    isBlocked = true;
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_FILENAME_PATTERNS) {
    if (pattern.test(fileName)) {
      warnings.push('Filename contains suspicious patterns that could pose security risks');
      isBlocked = true;
      break;
    }
  }

  // Check for reserved Windows names
  const baseName = fileName.split('.')[0];
  if (RESERVED_WINDOWS_NAMES.test(baseName)) {
    warnings.push('Filename contains suspicious patterns that could pose security risks');
    isBlocked = true;
  }

  // Check for suspicious extensions
  const extension = getFileExtension(fileName).toLowerCase();
  if (SUSPICIOUS_EXTENSIONS.has(extension)) {
    warnings.push(`File extension '${extension}' is not allowed for security reasons`);
    isBlocked = true;
  }

  // Check for double extensions (potential masquerading)
  const parts = fileName.split('.');
  if (parts.length > 2) {
    const penultimateExt = '.' + parts[parts.length - 2].toLowerCase();
    if (SUSPICIOUS_EXTENSIONS.has(penultimateExt)) {
      warnings.push('File appears to be masquerading with double extension');
      isBlocked = true;
    }
  }

  // Check for null bytes
  if (fileName.includes('\0')) {
    warnings.push('Filename contains null bytes');
    isBlocked = true;
  }

  // Check for excessive dots (potential evasion)
  if (fileName.match(/\.{3,}/)) {
    warnings.push('Filename contains excessive consecutive dots');
    isBlocked = true;
  }

  return { isBlocked, warnings };
}

export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex >= 0 ? fileName.substring(lastDotIndex) : '';
}

export function isImageDocument(documentType: DocumentType, mimeType?: string): boolean {
  if (documentType === 'image') return true;
  if (mimeType && mimeType.startsWith('image/')) return true;
  return false;
}

export function isPDFDocument(documentType: DocumentType, mimeType?: string): boolean {
  if (documentType === 'pdf') return true;
  if (mimeType === 'application/pdf') return true;
  return false;
}

export function getOptimalOCRSettings(
  documentType: DocumentType,
  mimeType?: string,
  fileName?: string
) {
  const compatibilityResult = isDocumentOCRCompatible(documentType, mimeType, fileName);

  if (!compatibilityResult.isCompatible) {
    return null;
  }

  const settings = {
    enableLanguageDetection: true,
    targetLanguages: ['ar', 'en'] as const,
    qualityThreshold: 75,
    imagePreprocessing: {
      enhanceContrast: isImageDocument(documentType, mimeType),
      denoiseImage: isImageDocument(documentType, mimeType),
      deskewImage: isImageDocument(documentType, mimeType),
      resolutionDPI: isImageDocument(documentType, mimeType) ? 300 : 200,
    },
    textProcessing: {
      preserveFormatting: isPDFDocument(documentType, mimeType),
      extractTables: isPDFDocument(documentType, mimeType),
      extractHeaders: isPDFDocument(documentType, mimeType),
      mergeFragments: true,
    },
  };

  return settings;
}

export function estimateOCRProcessingTime(
  fileSizeBytes: number,
  documentType: DocumentType,
  pageCount?: number
): number {
  // Base processing time per MB
  const baseMBProcessingTime = documentType === 'pdf' ? 3 : 5; // seconds per MB
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  let estimatedTime = fileSizeMB * baseMBProcessingTime;

  // Adjust for page count if available
  if (pageCount) {
    const pageProcessingTime = documentType === 'pdf' ? 2 : 3; // seconds per page
    const pageBasedTime = pageCount * pageProcessingTime;
    estimatedTime = Math.max(estimatedTime, pageBasedTime);
  }

  // Add overhead and minimum time
  estimatedTime += 5; // 5 seconds overhead
  estimatedTime = Math.max(estimatedTime, 10); // minimum 10 seconds
  estimatedTime = Math.min(estimatedTime, 300); // maximum 5 minutes

  return Math.round(estimatedTime);
}