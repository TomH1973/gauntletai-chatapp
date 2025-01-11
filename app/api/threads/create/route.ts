import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';
import { ParticipantRole } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, participantIds } = body;

    if (!name || !participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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
      return NextResponse.json({ error: 'One or more participants not found' }, { status: 404 });
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
  } catch (error: any) {
    logger.error('Error creating thread:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
} 