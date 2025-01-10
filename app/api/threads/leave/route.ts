import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { threadId } = body;

    if (!threadId) {
      return new NextResponse('Thread ID is required', { status: 400 });
    }

    // Remove user from thread participants
    await prisma.thread.update({
      where: { id: threadId },
      data: {
        participants: {
          disconnect: { id: user.id }
        }
      }
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error leaving thread:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 