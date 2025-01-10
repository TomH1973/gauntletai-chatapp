import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/prisma';
import { validateMessage } from "@/lib/validation/message";
import { MessageStatus } from "@/types/chat";
import { Prisma } from "@prisma/client";
import { emitToThread } from '@/lib/socket';

// Define the user select type
const userSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the database user ID from Clerk ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
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
            name: true,
            image: true,
            email: true
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

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { content, threadId, parentId } = await req.json();

    // Validate thread access
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId
        }
      }
    });

    if (!participant) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // If this is a reply, validate parent message exists and is in same thread
    if (parentId) {
      const parentMessage = await prisma.message.findUnique({
        where: { id: parentId }
      });

      if (!parentMessage || parentMessage.threadId !== threadId) {
        return new NextResponse('Invalid parent message', { status: 400 });
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        threadId,
        userId,
        parentId,
        status: 'SENT'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        replies: true,
        reactions: true,
        readBy: true
      }
    });

    // Update thread's lastMessageAt
    await prisma.thread.update({
      where: { id: threadId },
      data: { updatedAt: message.createdAt }
    });

    // Emit to all participants
    emitToThread(threadId, 'message:new', message);

    return NextResponse.json(message);
  } catch (error) {
    console.error('[MESSAGES_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 