import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { participantIds, title } = await req.json();
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return new NextResponse('Invalid participants', { status: 400 });
    }

    // Check if thread already exists with exact same participants
    const existingThread = await prisma.thread.findFirst({
      where: {
        AND: [
          {
            participants: {
              every: {
                id: {
                  in: [...participantIds, user.id]
                }
              }
            }
          },
          {
            participants: {
              none: {
                id: {
                  notIn: [...participantIds, user.id]
                }
              }
            }
          }
        ]
      }
    });

    if (existingThread) {
      return NextResponse.json(existingThread);
    }

    // Create new thread
    const thread = await prisma.thread.create({
      data: {
        title,
        participants: {
          connect: [
            { id: user.id },
            ...participantIds.map((id: string) => ({ id }))
          ]
        }
      },
      include: {
        participants: {
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
    });

    logger.debug('Thread created successfully', { threadId: thread.id });
    return NextResponse.json(thread);
  } catch (error) {
    logger.error('Error creating thread', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 