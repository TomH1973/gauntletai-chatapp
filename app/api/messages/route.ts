import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiResponse, withAuth, withErrorHandling, ErrorCode } from '@/lib/api';

// Input validation schema
const messageSchema = z.object({
  content: z.string().min(1).max(5000),
  threadId: z.string().min(1),
  parentId: z.string().optional(),
});

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    return withAuth(async (userId) => {
      // Validate input
      const body = await req.json();
      const result = messageSchema.safeParse(body);
      
      if (!result.success) {
        return ApiResponse.validationError({
          field: result.error.errors[0]?.path.join('.'),
          reason: result.error.errors[0]?.message
        });
      }
      
      const { content, threadId, parentId } = result.data;

      // Check thread exists and user has access
      const thread = await prisma.thread.findFirst({
        where: {
          id: threadId,
          participants: {
            some: {
              userId
            }
          }
        }
      });

      if (!thread) {
        return ApiResponse.notFound({
          reason: 'Thread not found or you do not have access',
          help: 'Verify the thread ID and your access permissions'
        });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          content,
          threadId,
          userId,
          parentId,
          status: "SENT"
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });

      return ApiResponse.success({ message });
    });
  }, (error) => {
    // Custom error mapping
    if (error instanceof z.ZodError) {
      return {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid message format',
          details: {
            field: error.errors[0]?.path.join('.'),
            reason: error.errors[0]?.message
          },
          requestId: ''  // Will be filled by ApiResponse
        }
      };
    }
    
    // Let the default error handler handle other errors
    throw error;
  });
}

export async function GET(req: Request) {
  return withErrorHandling(async () => {
    return withAuth(async (userId) => {
      const { searchParams } = new URL(req.url);
      const threadId = searchParams.get('threadId');
      const limit = parseInt(searchParams.get('limit') || '50');
      const before = searchParams.get('before');
      
      if (!threadId) {
        return ApiResponse.validationError({
          field: 'threadId',
          reason: 'Thread ID is required'
        });
      }

      // Verify thread access
      const thread = await prisma.thread.findFirst({
        where: {
          id: threadId,
          participants: {
            some: {
              userId
            }
          }
        }
      });

      if (!thread) {
        return ApiResponse.notFound({
          reason: 'Thread not found or you do not have access',
          help: 'Verify the thread ID and your access permissions'
        });
      }

      // Get messages with pagination
      const messages = await prisma.message.findMany({
        where: {
          threadId,
          ...(before ? {
            createdAt: {
              lt: new Date(before)
            }
          } : {})
        },
        take: limit,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });

      // Get total count for pagination
      const total = await prisma.message.count({
        where: {
          threadId
        }
      });

      return ApiResponse.success({
        messages,
        pagination: {
          total,
          hasMore: messages.length === limit
        }
      });
    });
  });
} 