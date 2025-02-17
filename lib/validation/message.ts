import { z } from 'zod';
import { MessageStatus } from '@/types/chat';
import { ParticipantRole } from '@prisma/client';
import { profanityFilter } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify';
import { rateLimiter } from '../security/rateLimiter.js';
import type { MessageInput } from '../../types/message.js';

// Constants for validation rules
const MAX_MESSAGE_LENGTH = 10000;
const MAX_THREAD_LENGTH = 100;
const MAX_MENTIONS = 50;
const MAX_ATTACHMENTS = 10;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

// Message content validation schema
export const messageContentSchema = z.string()
  .min(1, 'Message cannot be empty')
  .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
  .transform(content => content.trim())
  .refine(content => !profanityFilter.hasProfanity(content), {
    message: 'Message contains inappropriate content'
  });

// Thread title validation schema
export const threadTitleSchema = z.string()
  .min(1, 'Thread title cannot be empty')
  .max(MAX_THREAD_LENGTH, `Thread title cannot exceed ${MAX_THREAD_LENGTH} characters`)
  .transform(title => title.trim());

// URL validation schema
export const urlSchema = z.string().regex(URL_REGEX, 'Invalid URL format');

// Attachment validation schema
export const attachmentSchema = z.object({
  type: z.enum(['image', 'video', 'audio', 'document']),
  url: urlSchema,
  name: z.string().min(1, 'File name is required'),
  size: z.number().positive('File size must be positive'),
  mimeType: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
}).refine(data => {
  const maxSizes = {
    image: 5 * 1024 * 1024, // 5MB
    video: 100 * 1024 * 1024, // 100MB
    audio: 50 * 1024 * 1024, // 50MB
    document: 10 * 1024 * 1024 // 10MB
  };
  return data.size <= maxSizes[data.type];
}, {
  message: 'File size exceeds maximum allowed for this type'
});

// Message creation validation schema
export const createMessageSchema = z.object({
  content: messageContentSchema,
  threadId: z.string().uuid('Invalid thread ID'),
  parentId: z.string().uuid('Invalid parent message ID').optional(),
  attachments: z.array(attachmentSchema).max(MAX_ATTACHMENTS).optional(),
  mentions: z.array(z.string().uuid('Invalid user ID')).max(MAX_MENTIONS).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Message update validation schema
export const updateMessageSchema = z.object({
  content: messageContentSchema,
  messageId: z.string().uuid('Invalid message ID'),
  attachments: z.array(attachmentSchema).max(MAX_ATTACHMENTS).optional(),
  mentions: z.array(z.string().uuid('Invalid user ID')).max(MAX_MENTIONS).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Content moderation rules
const moderationRules = [
  {
    pattern: /^[\s\n]*$/,
    message: 'Message cannot be empty or only whitespace'
  },
  {
    pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    message: 'Message cannot contain script tags'
  },
  {
    pattern: /(?:https?:\/\/)?(?:[\da-z\.-]+)\.(?:[a-z\.]{2,6})(?:[\/\w \.-]*)*\/?/g,
    validate: async (url: string) => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    },
    message: 'Message contains invalid or unsafe links'
  }
];

// Rate limiting state
const rateLimits = new Map<string, { count: number; timestamp: number }>();

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = 30;

/**
 * @dataflow Message Validation and Transformation
 * 
 * 1. Content Validation Flow
 *    Input: Raw message content
 *    Steps:
 *    - Length validation (1 to MAX_MESSAGE_LENGTH)
 *    - Content trimming
 *    - Profanity filtering
 *    - Script tag removal
 *    - URL validation
 * 
 * 2. Thread Validation Flow
 *    Input: Thread title
 *    Steps:
 *    - Length validation
 *    - Content trimming
 *    - Special character handling
 * 
 * 3. Attachment Validation Flow
 *    Input: File metadata
 *    Steps:
 *    - Type validation
 *    - Size limits by type
 *    - MIME type checking
 *    - URL format validation
 * 
 * 4. Rate Limiting Flow
 *    Input: User ID and timestamp
 *    Steps:
 *    - Window calculation
 *    - Message count tracking
 *    - Limit enforcement
 * 
 * 5. Content Moderation Flow
 *    Input: Message content
 *    Steps:
 *    - Pattern matching
 *    - Link validation
 *    - Content sanitization
 *    - Error aggregation
 */

/**
 * @function moderateContent
 * @description Validates and moderates message content against defined rules
 * 
 * Data Transformations:
 * 1. Pattern matching: Apply regex patterns for content validation
 * 2. URL validation: Check and validate embedded URLs
 * 3. Content filtering: Remove or flag inappropriate content
 * 4. Error collection: Aggregate validation failures
 */
export async function moderateContent(content: string): Promise<{ isValid: boolean; reason?: string }> {
  // Check basic moderation rules
  for (const rule of moderationRules) {
    if (rule.pattern.test(content)) {
      if (rule.validate) {
        const matches = content.match(rule.pattern) || [];
        for (const match of matches) {
          if (!await rule.validate(match)) {
            return { isValid: false, reason: rule.message };
          }
        }
      } else {
        return { isValid: false, reason: rule.message };
      }
    }
  }

  return { isValid: true };
}

/**
 * Check if user has exceeded rate limit
 */
export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit) {
    rateLimits.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimits.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_MESSAGES) {
    return true;
  }

  userLimit.count++;
  return false;
}

// Clean up expired rate limits periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of rateLimits.entries()) {
    if (now - limit.timestamp > RATE_LIMIT_WINDOW) {
      rateLimits.delete(userId);
    }
  }
}, RATE_LIMIT_WINDOW);

/**
 * Content sanitization
 */
export function sanitizeMessageContent(content: string): string {
  // Remove any HTML tags
  content = content.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  content = content.trim();
  
  // Replace multiple spaces with a single space
  content = content.replace(/\s+/g, ' ');
  
  // Replace multiple newlines with a maximum of two
  content = content.replace(/\n{3,}/g, '\n\n');
  
  return content;
}

// Message schema for validation
const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`),
  threadId: z.string().uuid('Invalid thread ID'),
  tempId: z.string().optional(),
  attachments: z.array(z.string().uuid('Invalid attachment ID')).max(MAX_ATTACHMENTS).optional()
});

export interface ValidationResult {
  isValid: boolean;
  sanitizedContent?: string;
  errors?: string[];
}

/**
 * Validate a message
 */
export async function validateMessage(data: MessageInput, userId: string): Promise<ValidationResult> {
  try {
    // Rate limiting check
    const rateLimitResult = await rateLimiter.checkLimit(userId, 'message:send');
    if (!rateLimitResult.allowed) {
      return {
        isValid: false,
        errors: [`Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} seconds.`]
      };
    }

    // Schema validation
    const parseResult = messageSchema.safeParse(data);
    if (!parseResult.success) {
      return {
        isValid: false,
        errors: parseResult.error.errors.map(e => e.message)
      };
    }

    // Content sanitization
    const sanitizedContent = DOMPurify.sanitize(data.content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
      ALLOWED_ATTR: ['href']
    });

    // Content length check after sanitization
    if (sanitizedContent.length > MAX_MESSAGE_LENGTH) {
      return {
        isValid: false,
        errors: ['Message content too long after sanitization']
      };
    }

    return {
      isValid: true,
      sanitizedContent
    };
  } catch (error) {
    console.error('Message validation error:', error);
    return {
      isValid: false,
      errors: ['Internal validation error']
    };
  }
}

// Export constants and types
export const MESSAGE_CONSTANTS = {
  MAX_MESSAGE_LENGTH,
  MAX_THREAD_LENGTH,
  MAX_MENTIONS,
  MAX_ATTACHMENTS,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX_MESSAGES
} as const;

// ... existing code ... 