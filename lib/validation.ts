import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { Prisma, UserStatus, MessageType, MessageStatus } from '@prisma/client';

// Define SystemRole enum to match Prisma schema
export const SystemRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER'
} as const;

export type SystemRole = typeof SystemRole[keyof typeof SystemRole];

// Sanitize HTML content
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
}

// User validation schemas
export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  image: z.string().url(),
  status: z.nativeEnum(UserStatus),
  systemRole: z.enum([SystemRole.OWNER, SystemRole.ADMIN, SystemRole.MEMBER])
});

// Message validation schemas
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message too long')
    .transform(sanitizeHtml),
  type: z.nativeEnum(MessageType),
  threadId: z.string().cuid(),
  parentId: z.string().cuid().optional(),
  metadata: z.record(z.unknown())
    .optional()
    .transform((val): Prisma.JsonValue => {
      if (!val) return null;
      return val as Prisma.JsonObject;
    })
});

// Thread validation schemas
export const threadSchema = z.object({
  name: z.string().min(1).max(100),
  isGroup: z.boolean(),
  participantIds: z.array(z.string().cuid()).min(1)
});

// Validation wrapper for API handlers
export async function validateRequest<T>(
  schema: z.Schema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Invalid request data' };
  }
}

// Role-based access control helper
export function hasPermission(
  userRole: SystemRole,
  requiredRole: SystemRole
): boolean {
  const roleHierarchy: Record<SystemRole, number> = {
    [SystemRole.OWNER]: 3,
    [SystemRole.ADMIN]: 2,
    [SystemRole.MEMBER]: 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
} 