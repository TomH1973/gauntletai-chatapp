import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

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
            id: user.id
          }
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
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    logger.debug('Threads fetched successfully', { userId: user.id, threadCount: threads.length });
    return NextResponse.json(threads);
  } catch (error) {
    logger.error('Error fetching threads', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 