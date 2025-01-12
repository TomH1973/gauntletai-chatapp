import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

// Types
export type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

// Centralized error types
export const ApiError = {
  Unauthorized: 'Unauthorized',
  NotFound: 'Not Found',
  BadRequest: 'Bad Request',
  RateLimit: 'Rate Limit Exceeded',
  ServerError: 'Internal Server Error'
} as const;

// Type-safe response builder
export class ApiResponse {
  static success<T>(data: T) {
    return NextResponse.json(data);
  }

  static error(error: typeof ApiError[keyof typeof ApiError], status: number, details?: any) {
    logger.error(error, { details });
    return NextResponse.json(
      { 
        error,
        details: process.env.NODE_ENV === 'development' ? details : undefined 
      },
      { status }
    );
  }
}

// Rate limiting helper
export async function checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }
  return current <= limit;
}

// Authenticated handler wrapper
type ApiHandler = (req: Request, user: AuthenticatedUser) => Promise<NextResponse>;

export async function getUser() {
  const { userId } = await auth();
  if (!userId) return null;
  
  return await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      clerkId: true,
      email: true,
      name: true,
      image: true,
      systemRole: true,
      status: true
    }
  });
}

export function withAuth(handler: ApiHandler) {
  return async (req: Request) => {
    try {
      // Get authenticated user
      const user = await getUser();
      if (!user) {
        return ApiResponse.error(ApiError.Unauthorized, 401);
      }

      // Check rate limit (100 requests per minute)
      const withinLimit = await checkRateLimit(`rate_limit:${user.id}`, 100, 60);
      if (!withinLimit) {
        return ApiResponse.error(ApiError.RateLimit, 429);
      }

      // Call handler with authenticated user
      return await handler(req, user);
    } catch (error) {
      logger.error('API error:', error);
      return ApiResponse.error(ApiError.ServerError, 500, error);
    }
  };
}

// Database query helpers
export const CommonIncludes = {
  threadParticipants: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true
        }
      }
    }
  },
  latestMessage: {
    take: 1,
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true
        }
      }
    }
  }
} as const; 