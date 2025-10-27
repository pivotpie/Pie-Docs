import DOMPurify from 'dompurify';

/**
 * Sanitization utility for user input to prevent XSS attacks
 */

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  stripTags?: boolean;
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (
  dirty: string,
  options: SanitizationOptions = {}
): string => {
  const {
    allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes = [],
    stripTags = false
  } = options;

  const config: any = {
    ALLOWED_TAGS: stripTags ? [] : allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
  };

  return DOMPurify.sanitize(dirty, config);
};

/**
 * Sanitize plain text input (removes all HTML)
 */
export const sanitizeText = (input: string): string => {
  return sanitizeHtml(input, { stripTags: true });
};

/**
 * Sanitize approval comments (allows basic formatting)
 */
export const sanitizeApprovalComment = (comment: string): string => {
  return sanitizeHtml(comment, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: []
  });
};

/**
 * Sanitize document annotation content
 */
export const sanitizeAnnotation = (content: string): string => {
  return sanitizeHtml(content, {
    allowedTags: ['b', 'i', 'em', 'strong'],
    allowedAttributes: []
  });
};

/**
 * Validate and sanitize input with length limits
 */
export const sanitizeWithValidation = (
  input: string,
  maxLength: number = 1000,
  options: SanitizationOptions = {}
): { sanitized: string; isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check length
  if (input.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength} characters`);
  }

  // Sanitize the input
  const sanitized = sanitizeHtml(input, options);

  // Check if input was modified (potential XSS attempt)
  if (sanitized !== input) {
    errors.push('Input contained potentially unsafe content that was removed');
  }

  return {
    sanitized,
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Create a sanitization hook for React components
 */
export const useSanitization = () => {
  return {
    sanitizeText,
    sanitizeHtml,
    sanitizeApprovalComment,
    sanitizeAnnotation,
    sanitizeWithValidation
  };
};