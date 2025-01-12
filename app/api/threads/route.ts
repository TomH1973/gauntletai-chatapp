import { withAuth, ApiResponse, ApiError, CommonIncludes } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { ParticipantRole } from '@prisma/client';
import { z } from 'zod';
import type { AuthenticatedUser } from '@/lib/api';

// Input validation schemas
const CreateThreadSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(1),
  participantIds: z.array(z.string().min(1))
});

const LeaveThreadSchema = z.object({
  action: z.literal('leave'),
  threadId: z.string().min(1)
});

const ThreadActionSchema = z.discriminatedUnion('action', [
  CreateThreadSchema,
  LeaveThreadSchema
]);

// GET /api/threads - List user's active threads
export const GET = withAuth(async (req, user: AuthenticatedUser) => {
  const threads = await prisma.thread.findMany({
    where: {
      participants: {
        some: {
          userId: user.id,
          leftAt: null
        }
      }
    },
    include: {
      participants: CommonIncludes.threadParticipants,
      messages: CommonIncludes.latestMessage
    },
    orderBy: { updatedAt: 'desc' }
  });

  return ApiResponse.success(threads);
});

// POST /api/threads - Create or leave thread
export const POST = withAuth(async (req, user: AuthenticatedUser) => {
  const body = await req.json();
  
  // Validate request body
  const result = ThreadActionSchema.safeParse(body);
  if (!result.success) {
    return ApiResponse.error(ApiError.BadRequest, 400, result.error);
  }
  
  const data = result.data;
  
  // Handle thread leaving
  if (data.action === 'leave') {
    await prisma.threadParticipant.update({
      where: {
        userId_threadId: {
          userId: user.id,
          threadId: data.threadId
        }
      },
      data: { leftAt: new Date() }
    });
    return ApiResponse.success({ success: true });
  }
  
  // Handle thread creation
  const participants = await prisma.user.findMany({
    where: { id: { in: data.participantIds } }
  });

  if (participants.length !== data.participantIds.length) {
    return ApiResponse.error(ApiError.NotFound, 404, 'One or more participants not found');
  }

  const thread = await prisma.thread.create({
    data: {
      name: data.name,
      participants: {
        create: [
          {
            userId: user.id,
            role: ParticipantRole.OWNER
          },
          ...data.participantIds.map(id => ({
            userId: id,
            role: ParticipantRole.MEMBER
          }))
        ]
      }
    },
    include: {
      participants: CommonIncludes.threadParticipants
    }
  });

  return ApiResponse.success(thread);
}); 