import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    const before = searchParams.get('before');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!threadId) {
      return new NextResponse('Thread ID is required', { status: 400 });
    }

    // Check if user is a participant of the thread
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: {
            id: user.id
          }
        }
      }
    });

    if (!thread) {
      return new NextResponse('Thread not found or access denied', { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: {
        threadId,
        ...(before ? {
          createdAt: {
            lt: new Date(before)
          }
        } : {})
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
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
    });

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { content, threadId } = body;

    if (!content || !threadId) {
      return new NextResponse('Content and thread ID are required', { status: 400 });
    }

    // Check if user is a participant of the thread
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: {
            id: user.id
          }
        }
      }
    });

    if (!thread) {
      return new NextResponse('Thread not found or access denied', { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        threadId,
        userId: user.id
      },
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
    });

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 