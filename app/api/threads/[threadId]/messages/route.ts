import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const messageSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get('parentId');

  const messages = await prisma.message.findMany({
    where: {
      threadId: params.threadId,
      parentId: parentId || null,
    },
    include: {
      user: true,
      replies: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json(messages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = messageSchema.parse(body);

    const message = await prisma.message.create({
      data: {
        content: validatedData.content,
        userId: session.userId,
        threadId: params.threadId,
        parentId: validatedData.parentId || null,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 