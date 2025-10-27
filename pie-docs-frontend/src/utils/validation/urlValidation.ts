/**
 * URL validation utilities for citation navigation
 * Addresses SEC-003: Citation URL validation
 */

export interface UrlValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  errors: string[];
  warnings: string[];
}

export interface UrlValidationOptions {
  allowedProtocols?: string[];
  allowedDomains?: string[];
  blockList?: string[];
  maxLength?: number;
  requireRelative?: boolean;
}

/**
 * Default validation options for citation URLs
 */
export const DEFAULT_CITATION_URL_VALIDATION: UrlValidationOptions = {
  allowedProtocols: ['http:', 'https:', ''], // Empty string for relative URLs
  allowedDomains: [], // Empty means allow all domains for now
  blockList: [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'ftp:',
  ],
  maxLength: 2000,
  requireRelative: false, // Allow both relative and absolute URLs
};

/**
 * Internal document URL validation (more restrictive)
 */
export const INTERNAL_DOCUMENT_URL_VALIDATION: UrlValidationOptions = {
  allowedProtocols: [''], // Only relative URLs
  allowedDomains: [],
  blockList: [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'ftp:',
    'http:',
    'https:',
  ],
  maxLength: 500,
  requireRelative: true,
};

/**
 * Validates URL format and security
 */
export function validateUrl(
  url: string,
  options: UrlValidationOptions = DEFAULT_CITATION_URL_VALIDATION
): UrlValidationResult {
  const result: UrlValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Handle null/undefined/empty URL
  if (!url || typeof url !== 'string') {
    result.isValid = false;
    result.errors.push('URL cannot be empty');
    return result;
  }

  const sanitized = url.trim();

  // Check maximum length
  if (options.maxLength && sanitized.length > options.maxLength) {
    result.isValid = false;
    result.errors.push(`URL exceeds maximum length of ${options.maxLength} characters`);
    return result;
  }

  // Check for blocked protocols/schemes
  if (options.blockList) {
    for (const blocked of options.blockList) {
      if (sanitized.toLowerCase().startsWith(blocked.toLowerCase())) {
        result.isValid = false;
        result.errors.push(`Blocked protocol or scheme detected: ${blocked}`);
        return result;
      }
    }
  }

  // Parse URL to validate structure
  let parsedUrl: URL | null = null;
  try {
    // Handle relative URLs by using a dummy base
    if (sanitized.startsWith('/') || !sanitized.includes('://')) {
      parsedUrl = new URL(sanitized, 'https://example.com');
    } else {
      parsedUrl = new URL(sanitized);
    }
  } catch {
    result.isValid = false;
    result.errors.push('Invalid URL format');
    return result;
  }

  // Check protocol restrictions
  if (options.allowedProtocols && options.allowedProtocols.length > 0) {
    const protocol = parsedUrl.protocol;
    const isRelative = sanitized.startsWith('/') || !sanitized.includes('://');

    if (isRelative && !options.allowedProtocols.includes('')) {
      result.isValid = false;
      result.errors.push('Relative URLs are not allowed');
      return result;
    }

    if (!isRelative && !options.allowedProtocols.includes(protocol)) {
      result.isValid = false;
      result.errors.push(`Protocol ${protocol} is not allowed`);
      return result;
    }
  }

  // Check if relative URLs are required
  if (options.requireRelative) {
    const isRelative = sanitized.startsWith('/') || !sanitized.includes('://');
    if (!isRelative) {
      result.isValid = false;
      result.errors.push('Only relative URLs are allowed');
      return result;
    }
  }

  // Check domain restrictions (only for absolute URLs)
  if (options.allowedDomains && options.allowedDomains.length > 0) {
    const isAbsolute = sanitized.includes('://');
    if (isAbsolute) {
      const hostname = parsedUrl.hostname.toLowerCase();
      const isAllowed = options.allowedDomains.some(domain =>
        hostname === domain.toLowerCase() ||
        hostname.endsWith('.' + domain.toLowerCase())
      );

      if (!isAllowed) {
        result.isValid = false;
        result.errors.push(`Domain ${hostname} is not in the allowed list`);
        return result;
      }
    }
  }

  // Security checks
  if (sanitized.includes('<script') || sanitized.includes('javascript:')) {
    result.isValid = false;
    result.errors.push('URL contains potentially dangerous content');
    return result;
  }

  // Additional security patterns
  const dangerousPatterns = [
    /on\w+\s*=/i, // Event handlers
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    /<script/i,
    /eval\s*\(/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      result.isValid = false;
      result.errors.push('URL contains potentially dangerous patterns');
      return result;
    }
  }

  // Warnings for potentially suspicious URLs
  if (sanitized.includes('%') && decodeURIComponent(sanitized) !== sanitized) {
    try {
      const decoded = decodeURIComponent(sanitized);
      for (const pattern of dangerousPatterns) {
        if (pattern.test(decoded)) {
          result.warnings.push('URL contains encoded suspicious content');
          break;
        }
      }
    } catch {
      result.warnings.push('URL contains invalid encoding');
    }
  }

  result.sanitizedUrl = sanitized;
  return result;
}

/**
 * Validates document citation URL specifically
 */
export function validateCitationUrl(url: string): UrlValidationResult {
  // For document citations, we prefer relative URLs for security
  return validateUrl(url, INTERNAL_DOCUMENT_URL_VALIDATION);
}

/**
 * Safe URL navigation that validates before opening
 */
export function safeNavigateToUrl(
  url: string,
  options: {
    target?: '_blank' | '_self';
    validation?: UrlValidationOptions;
    onError?: (error: string) => void;
  } = {}
): boolean {
  const {
    target = '_blank',
    validation = DEFAULT_CITATION_URL_VALIDATION,
    onError
  } = options;

  const validationResult = validateUrl(url, validation);

  if (!validationResult.isValid) {
    const errorMessage = `Navigation blocked: ${validationResult.errors.join(', ')}`;
    if (onError) {
      onError(errorMessage);
    } else {
      console.warn(errorMessage);
    }
    return false;
  }

  try {
    window.open(validationResult.sanitizedUrl || url, target);
    return true;
  } catch (error) {
    const errorMessage = `Failed to navigate: ${error instanceof Error ? error.message : 'Unknown error'}`;
    if (onError) {
      onError(errorMessage);
    } else {
      console.error(errorMessage);
    }
    return false;
  }
}

/**
 * Validates and constructs document URL with parameters
 */
export function buildDocumentUrl(
  documentId: string,
  options: {
    sectionId?: string;
    pageNumber?: number;
    highlight?: string;
    baseUrl?: string;
  } = {}
): UrlValidationResult {
  const result: UrlValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validate document ID
  if (!documentId || typeof documentId !== 'string') {
    result.isValid = false;
    result.errors.push('Document ID is required');
    return result;
  }

  // Sanitize document ID (alphanumeric, hyphens, underscores only)
  const sanitizedDocId = documentId.replace(/[^a-zA-Z0-9\-_]/g, '');
  if (sanitizedDocId !== documentId) {
    result.warnings.push('Document ID was sanitized');
  }

  if (sanitizedDocId.length === 0) {
    result.isValid = false;
    result.errors.push('Document ID contains no valid characters');
    return result;
  }

  // Build base URL
  const baseUrl = options.baseUrl || '/documents';
  let url = `${baseUrl}/${sanitizedDocId}`;

  // Add query parameters if provided
  const params = new URLSearchParams();

  if (options.sectionId) {
    const sanitizedSection = options.sectionId.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (sanitizedSection) {
      params.set('section', sanitizedSection);
    }
  }

  if (options.pageNumber && typeof options.pageNumber === 'number' && options.pageNumber > 0) {
    params.set('page', options.pageNumber.toString());
  }

  if (options.highlight) {
    const sanitizedHighlight = options.highlight.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (sanitizedHighlight) {
      params.set('highlight', sanitizedHighlight);
    }
  }

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  // Validate the constructed URL
  const urlValidation = validateUrl(url, INTERNAL_DOCUMENT_URL_VALIDATION);
  result.isValid = result.isValid && urlValidation.isValid;
  result.errors.push(...urlValidation.errors);
  result.warnings.push(...urlValidation.warnings);

  if (result.isValid) {
    result.sanitizedUrl = url;
  }

  return result;
}