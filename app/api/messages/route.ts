import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/prisma';
import { validateMessage } from "@/lib/validation/message";
import { MessageStatus } from "@/types/chat";
import { Prisma } from "@prisma/client";

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

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the database user ID from Clerk ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const body = await request.json();
    const { content, threadId, parentId } = body;

    // Validate message
    const validationResult = await validateMessage({ content, threadId, parentId }, user.id);
    if (!validationResult.isValid) {
      return new NextResponse(validationResult.errors?.[0] || 'Invalid message', { 
        status: 400 
      });
    }

    // Check if user is a participant of the thread
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: {
            userId: user.id
          }
        }
      }
    });

    if (!thread) {
      return new NextResponse("Thread not found or access denied", { status: 403 });
    }

    // Create message with sanitized content
    const message = await prisma.message.create({
      data: {
        content: validationResult.sanitizedContent || content,
        userId: user.id,
        threadId,
        parentId,
        status: MessageStatus.SENT
      },
      include: {
        user: {
          select: userSelect
        }
      }
    });

    // Create notifications for all participants except the sender
    const participants = await prisma.threadParticipant.findMany({
      where: {
        threadId,
        NOT: {
          userId: user.id
        }
      },
      select: {
        userId: true
      }
    });

    if (participants.length > 0) {
      await prisma.notification.createMany({
        data: participants.map(participant => ({
          userId: participant.userId,
          messageId: message.id,
          type: 'NEW_MESSAGE'
        }))
      });
    }

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 