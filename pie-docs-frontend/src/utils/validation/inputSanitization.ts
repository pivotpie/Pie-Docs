/**
 * Input validation and sanitization utilities for answer generation
 * Addresses SEC-001: Input validation for user queries
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedInput?: string;
  errors: string[];
  warnings: string[];
}

export interface ValidationOptions {
  maxLength?: number;
  allowedChars?: RegExp;
  blockPatterns?: RegExp[];
  trimWhitespace?: boolean;
  normalizeSpaces?: boolean;
}

/**
 * Default validation options for user queries
 */
export const DEFAULT_QUERY_VALIDATION: ValidationOptions = {
  maxLength: 5000,
  allowedChars: /^[\w\s\-.,!?()[\]{}'"@#$%&*+=/:;<>|~`]+$/u,
  blockPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocols
    /data:text\/html/gi, // Data URLs
    /vbscript:/gi, // VBScript
    /on\w+\s*=/gi, // Event handlers
    /eval\s*\(/gi, // Eval functions
    /expression\s*\(/gi, // CSS expressions
  ],
  trimWhitespace: true,
  normalizeSpaces: true,
};

/**
 * Validates and sanitizes user input for answer generation
 */
export function validateAndSanitizeQuery(
  input: string,
  options: ValidationOptions = DEFAULT_QUERY_VALIDATION
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Handle null/undefined input
  if (!input) {
    result.isValid = false;
    result.errors.push('Query cannot be empty');
    return result;
  }

  let sanitized = input;

  // Trim whitespace if enabled
  if (options.trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Check minimum length after trimming
  if (sanitized.length === 0) {
    result.isValid = false;
    result.errors.push('Query cannot be empty after removing whitespace');
    return result;
  }

  // Check maximum length
  if (options.maxLength && sanitized.length > options.maxLength) {
    result.isValid = false;
    result.errors.push(`Query exceeds maximum length of ${options.maxLength} characters`);
    return result;
  }

  // Normalize spaces if enabled
  if (options.normalizeSpaces) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  // Check for blocked patterns
  if (options.blockPatterns) {
    for (const pattern of options.blockPatterns) {
      if (pattern.test(sanitized)) {
        result.isValid = false;
        result.errors.push('Query contains potentially harmful content');
        return result;
      }
    }
  }

  // Validate allowed characters
  if (options.allowedChars && !options.allowedChars.test(sanitized)) {
    result.isValid = false;
    result.errors.push('Query contains invalid characters');
    return result;
  }

  // Additional security checks
  if (sanitized.length > 1000) {
    result.warnings.push('Long queries may impact performance');
  }

  if (/[<>]/.test(sanitized)) {
    result.warnings.push('Query contains HTML-like characters');
  }

  result.sanitizedInput = sanitized;
  return result;
}

/**
 * Validates conversation ID format
 */
export function validateConversationId(conversationId?: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!conversationId) {
    return result; // Optional field
  }

  // Check format: should be UUID or alphanumeric
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const alphanumericPattern = /^[a-zA-Z0-9_-]{1,50}$/;

  if (!uuidPattern.test(conversationId) && !alphanumericPattern.test(conversationId)) {
    result.isValid = false;
    result.errors.push('Invalid conversation ID format');
  }

  result.sanitizedInput = conversationId;
  return result;
}

/**
 * Validates numeric parameters
 */
export function validateNumericParameter(
  value: number | undefined,
  name: string,
  min?: number,
  max?: number
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (value === undefined) {
    return result; // Optional parameter
  }

  if (typeof value !== 'number' || isNaN(value)) {
    result.isValid = false;
    result.errors.push(`${name} must be a valid number`);
    return result;
  }

  if (min !== undefined && value < min) {
    result.isValid = false;
    result.errors.push(`${name} must be at least ${min}`);
  }

  if (max !== undefined && value > max) {
    result.isValid = false;
    result.errors.push(`${name} cannot exceed ${max}`);
  }

  return result;
}

/**
 * Comprehensive validation for answer generation request
 */
export function validateAnswerGenerationRequest(request: {
  query: string;
  conversationId?: string;
  maxSources?: number;
  confidenceThreshold?: number;
}): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validate query
  const queryValidation = validateAndSanitizeQuery(request.query);
  result.errors.push(...queryValidation.errors);
  result.warnings.push(...queryValidation.warnings);
  result.isValid = result.isValid && queryValidation.isValid;

  // Validate conversation ID
  const conversationValidation = validateConversationId(request.conversationId);
  result.errors.push(...conversationValidation.errors);
  result.warnings.push(...conversationValidation.warnings);
  result.isValid = result.isValid && conversationValidation.isValid;

  // Validate maxSources
  const maxSourcesValidation = validateNumericParameter(
    request.maxSources,
    'maxSources',
    1,
    50
  );
  result.errors.push(...maxSourcesValidation.errors);
  result.warnings.push(...maxSourcesValidation.warnings);
  result.isValid = result.isValid && maxSourcesValidation.isValid;

  // Validate confidence threshold
  const confidenceValidation = validateNumericParameter(
    request.confidenceThreshold,
    'confidenceThreshold',
    0,
    1
  );
  result.errors.push(...confidenceValidation.errors);
  result.warnings.push(...confidenceValidation.warnings);
  result.isValid = result.isValid && confidenceValidation.isValid;

  if (queryValidation.sanitizedInput) {
    result.sanitizedInput = queryValidation.sanitizedInput;
  }

  return result;
}