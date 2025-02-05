import { auth as getAuth } from '@clerk/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Add reaction to message
export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getAuth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json(
        { error: 'Emoji is required' },
        { status: 400 }
      );
    }

    // Check if message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Create reaction
    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId: session.userId,
        emoji
      }
    });

    return NextResponse.json(reaction, { status: 201 });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Remove reaction from message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getAuth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json(
        { error: 'Emoji is required' },
        { status: 400 }
      );
    }

    try {
      await prisma.messageReaction.delete({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId: session.userId,
            emoji
          }
        }
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      // If reaction doesn't exist, return 404
      return NextResponse.json(
        { error: 'Reaction not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 