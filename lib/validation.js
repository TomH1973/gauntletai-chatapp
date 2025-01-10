const { z } = require('zod');

// Maximum message content length (100KB)
const MAX_CONTENT_LENGTH = 100 * 1024;

// Maximum number of mentions per message
const MAX_MENTIONS = 50;

// Maximum number of attachments per message
const MAX_ATTACHMENTS = 10;

// Message schema definition
const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message content cannot be empty')
    .max(MAX_CONTENT_LENGTH, `Message content cannot exceed ${MAX_CONTENT_LENGTH} bytes`)
    .transform(str => str.trim()),
  
  threadId: z.string()
    .uuid('Invalid thread ID format'),
  
  parentId: z.string()
    .uuid('Invalid parent message ID format')
    .nullable()
    .optional(),
  
  mentions: z.array(z.string().uuid('Invalid user ID in mentions'))
    .max(MAX_MENTIONS, `Cannot mention more than ${MAX_MENTIONS} users`)
    .optional(),
  
  attachments: z.array(z.object({
    type: z.enum(['image', 'file', 'link']),
    url: z.string().url('Invalid attachment URL'),
    mimeType: z.string().optional(),
    size: z.number()
      .int('File size must be an integer')
      .positive('File size must be positive')
      .optional(),
    metadata: z.record(z.unknown()).optional()
  }))
  .max(MAX_ATTACHMENTS, `Cannot include more than ${MAX_ATTACHMENTS} attachments`)
  .optional(),
  
  metadata: z.record(z.unknown())
    .optional()
}).strict();

/**
 * Content moderation rules
 * @type {Array<{pattern: RegExp, description: string}>}
 */
const moderationRules = [
  {
    pattern: /^[\s\n]*$/,
    description: 'Message cannot be empty or only whitespace'
  },
  {
    pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    description: 'Message cannot contain script tags'
  },
  // Add more moderation rules as needed
];

/**
 * Validate message content against moderation rules
 * @param {string} content - Message content to validate
 * @returns {{isValid: boolean, reason?: string}} Validation result
 */
function moderateContent(content) {
  for (const rule of moderationRules) {
    if (rule.pattern.test(content)) {
      return {
        isValid: false,
        reason: rule.description
      };
    }
  }
  return { isValid: true };
}

/**
 * Rate limiting state
 * @type {Map<string, {count: number, timestamp: number}>}
 */
const rateLimits = new Map();

/**
 * Check if user has exceeded rate limit
 * @param {string} userId - User ID to check
 * @param {number} limit - Maximum messages per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} True if rate limit exceeded
 */
function checkRateLimit(userId, limit = 30, windowMs = 60000) {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit) {
    rateLimits.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (now - userLimit.timestamp > windowMs) {
    rateLimits.set(userId, { count: 1, timestamp: now });
    return false;
  }

  if (userLimit.count >= limit) {
    return true;
  }

  userLimit.count++;
  return false;
}

// Clean up expired rate limits periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of rateLimits.entries()) {
    if (now - limit.timestamp > 60000) {
      rateLimits.delete(userId);
    }
  }
}, 60000);

/**
 * Validate a message
 * @param {Object} message - Message to validate
 * @param {string} userId - ID of user sending message
 * @returns {{isValid: boolean, errors?: string[]}} Validation result
 */
function validateMessage(message, userId) {
  try {
    // Check rate limit
    if (checkRateLimit(userId)) {
      return {
        isValid: false,
        errors: ['Rate limit exceeded. Please wait before sending more messages.']
      };
    }

    // Validate against schema
    messageSchema.parse(message);

    // Check content moderation
    const moderation = moderateContent(message.content);
    if (!moderation.isValid) {
      return {
        isValid: false,
        errors: [moderation.reason]
      };
    }

    return { isValid: true };
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

module.exports = {
  validateMessage,
  messageSchema,
  MAX_CONTENT_LENGTH,
  MAX_MENTIONS,
  MAX_ATTACHMENTS
}; 