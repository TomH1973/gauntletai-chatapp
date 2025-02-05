import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure DOMPurify
const config = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
    'code', 'pre', 'img', 'blockquote', 'h1', 'h2', 'h3', 'h4',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  ALLOW_DATA_ATTR: false,
  ADD_TAGS: ['iframe'],  // For embedded content
  ADD_ATTR: ['target'],  // For opening links in new tab
  SANITIZE_DOM: true,
  WHOLE_DOCUMENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  FORCE_BODY: false,
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty The untrusted HTML input
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, config);
}

/**
 * Sanitizes a file name to prevent directory traversal and other attacks
 * @param filename The untrusted filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
}

/**
 * Validates and sanitizes a URL
 * @param url The untrusted URL
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow certain protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates and sanitizes JSON input
 * @param input The untrusted JSON string
 * @returns Parsed and sanitized object or null if invalid
 */
export function sanitizeJson(input: string): object | null {
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    // Deep sanitize all string values
    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = sanitizeHtml(String(key));
        result[sanitizedKey] = typeof value === 'string'
          ? sanitizeHtml(value)
          : sanitize(value);
      }
      return result;
    };
    return sanitize(parsed);
  } catch {
    return null;
  }
}

/**
 * Validates and sanitizes SQL identifiers
 * @param identifier The untrusted SQL identifier
 * @returns Sanitized identifier or null if invalid
 */
export function sanitizeSqlIdentifier(identifier: string): string | null {
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    return null;
  }
  return identifier;
} 