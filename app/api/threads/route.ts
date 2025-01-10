import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { getCurrentUser } from '@/lib/auth.js';
import { logger } from '@/lib/logger.js';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
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
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    });

    return NextResponse.json(threads);
  } catch (error) {
    logger.error('Error fetching threads', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { title, participantIds } = await request.json();

    // Ensure the current user is included in participants
    const uniqueParticipantIds = Array.from(new Set([...participantIds, user.id]));

    // Verify all participants exist
    const participants = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueParticipantIds
        }
      }
    });

    if (participants.length !== uniqueParticipantIds.length) {
      return new NextResponse('One or more participants not found', { status: 400 });
    }

    // Create thread with participants
    const thread = await prisma.thread.create({
      data: {
        title,
        participants: {
          create: uniqueParticipantIds.map(userId => ({
            userId
          }))
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        }
      }
    });

    logger.debug('Thread created successfully', { threadId: thread.id, userId: user.id });
    return NextResponse.json(thread);
  } catch (error) {
    logger.error('Error creating thread', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 