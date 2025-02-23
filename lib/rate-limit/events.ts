import { z } from 'zod';

export type RateLimitEventType = 
  | 'ATTEMPT'    // Rate limit check attempted
  | 'ALLOWED'    // Request allowed
  | 'BLOCKED'    // Request blocked
  | 'EXPIRED'    // Rate limit expired
  | 'RESET'      // Rate limit manually reset
  | 'ERROR';     // Error occurred

export interface RateLimitEvent {
  type: RateLimitEventType;
  timestamp: number;
  userId: string;
  action: string;
  metadata?: {
    remaining?: number;
    retryAfter?: number;
    error?: string;
    count?: number;
  };
}

// Validation schema for events
export const rateLimitEventSchema = z.object({
  type: z.enum(['ATTEMPT', 'ALLOWED', 'BLOCKED', 'EXPIRED', 'RESET', 'ERROR']),
  timestamp: z.number(),
  userId: z.string(),
  action: z.string(),
  metadata: z.object({
    remaining: z.number().optional(),
    retryAfter: z.number().optional(),
    error: z.string().optional(),
    count: z.number().optional()
  }).optional()
});

// Type guard
export function isRateLimitEvent(event: unknown): event is RateLimitEvent {
  return rateLimitEventSchema.safeParse(event).success;
} 