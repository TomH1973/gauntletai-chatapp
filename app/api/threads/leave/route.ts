import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

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
    const { threadId } = body;

    if (!threadId) {
      return new NextResponse('Thread ID is required', { status: 400 });
    }

    // Update the participant record with leftAt timestamp
    await prisma.threadParticipant.update({
      where: {
        userId_threadId: {
          userId: user.id,
          threadId
        }
      },
      data: {
        leftAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving thread:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 