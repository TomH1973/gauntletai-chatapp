import { z } from 'zod';
import { MessageStatus, ParticipantRole } from '@/types/chat';
import { profanityFilter } from '@/lib/utils';

// Constants for validation rules
const MAX_MESSAGE_LENGTH = 4000;
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
 * Validate message content against moderation rules
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

/**
 * Validate a message
 */
export async function validateMessage(message: any, userId: string): Promise<ValidationResult> {
  try {
    // Check rate limit
    if (checkRateLimit(userId)) {
      return {
        isValid: false,
        errors: ['Rate limit exceeded. Please wait before sending more messages.']
      };
    }

    // Validate against schema
    createMessageSchema.parse(message);

    // Check content moderation
    const moderation = await moderateContent(message.content);
    if (!moderation.isValid) {
      return {
        isValid: false,
        errors: [moderation.reason!]
      };
    }

    // Sanitize content
    const sanitizedContent = sanitizeMessageContent(message.content);

    return { 
      isValid: true,
      sanitizedContent
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => e.message)
      };
    }
    throw error;
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

export type ValidationResult = {
  isValid: boolean;
  errors?: string[];
  sanitizedContent?: string;
};

// ... existing code ... 