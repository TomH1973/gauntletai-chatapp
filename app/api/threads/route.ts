import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';
import { ParticipantRole } from '@prisma/client';

/**
 * @route GET /api/threads
 * @description Retrieves all threads where the current user is a participant
 * 
 * @returns {Promise<NextResponse>} JSON response containing threads with participants and latest message
 * @throws {401} If user is not authenticated
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const threads = await prisma.thread.findMany({
      where: {
        participants: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        participants: {
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
        messages: {
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
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(threads);
  } catch (error) {
    logger.error('Error fetching threads:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * @route POST /api/threads
 * @description Creates a new thread with specified participants
 * 
 * @param {Object} request - Next.js request object
 * @param {Object} request.body - Request body
 * @param {string} request.body.title - Thread title
 * @param {string[]} request.body.participantIds - Array of user IDs to add as participants
 * 
 * @returns {Promise<NextResponse>} JSON response containing the created thread
 * @throws {401} If user is not authenticated
 * @throws {400} If one or more participants are not found
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const body = await request.json();
    const { name, participantIds } = body;

    if (!name || !participantIds || !Array.isArray(participantIds)) {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    // Verify all participants exist
    const participants = await prisma.user.findMany({
      where: {
        id: {
          in: participantIds
        }
      }
    });

    if (participants.length !== participantIds.length) {
      return new NextResponse('One or more participants not found', { status: 404 });
    }

    // Create thread with participants
    const thread = await prisma.thread.create({
      data: {
        name,
        participants: {
          create: [
            {
              userId: user.id,
              role: ParticipantRole.OWNER
            },
            ...participantIds.map((participantId: string) => ({
              userId: participantId,
              role: ParticipantRole.MEMBER
            }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      }
    });

    logger.debug('Thread created successfully', { threadId: thread.id, userId: user.id });
    return NextResponse.json(thread);
  } catch (error) {
    logger.error('Error creating thread:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 