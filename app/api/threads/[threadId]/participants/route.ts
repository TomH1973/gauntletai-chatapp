import { auth as getAuth } from '@clerk/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Define ThreadRole enum since it's not exported from @prisma/client
enum ThreadRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

// Helper to check if user has required role
async function checkUserRole(threadId: string, userId: string, requiredRoles: ThreadRole[]) {
  const participant = await prisma.threadParticipant.findFirst({
    where: {
      threadId,
      userId,
    }
  });

  return participant && requiredRoles.includes(participant.role as ThreadRole);
}

// Add participant to thread
export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getAuth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = params;
    const { userId, role } = await request.json();

    // Check if current user is owner/admin
    const hasPermission = await checkUserRole(
      threadId,
      session.userId,
      [ThreadRole.OWNER, ThreadRole.ADMIN]
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const participant = await prisma.threadParticipant.create({
      data: {
        userId,
        threadId,
        role
      },
      include: {
        user: true
      }
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error('Error adding participant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update participant role
export async function PUT(
  request: NextRequest,
  { params }: { params: { threadId: string; userId: string } }
) {
  try {
    const session = await getAuth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId, userId } = params;
    const { role } = await request.json();

    // Check if current user is owner/admin
    const hasPermission = await checkUserRole(
      threadId,
      session.userId,
      [ThreadRole.OWNER, ThreadRole.ADMIN]
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if target user is owner
    const targetUser = await prisma.threadParticipant.findFirst({
      where: {
        threadId,
        userId
      }
    });

    if (targetUser?.role === ThreadRole.OWNER) {
      return NextResponse.json(
        { error: 'Cannot modify owner role' },
        { status: 403 }
      );
    }

    const participant = await prisma.threadParticipant.update({
      where: {
        userId_threadId: {
          userId,
          threadId
        }
      },
      data: { role },
      include: {
        user: true
      }
    });

    return NextResponse.json(participant);
  } catch (error) {
    console.error('Error updating participant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Remove participant
export async function DELETE(
  request: NextRequest,
  { params }: { params: { threadId: string; userId: string } }
) {
  try {
    const session = await getAuth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId, userId } = params;

    // Check if current user is owner/admin
    const hasPermission = await checkUserRole(
      threadId,
      session.userId,
      [ThreadRole.OWNER, ThreadRole.ADMIN]
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if target user is owner
    const targetUser = await prisma.threadParticipant.findFirst({
      where: {
        threadId,
        userId
      }
    });

    if (targetUser?.role === ThreadRole.OWNER) {
      return NextResponse.json(
        { error: 'Cannot remove owner' },
        { status: 403 }
      );
    }

    await prisma.threadParticipant.delete({
      where: {
        userId_threadId: {
          userId,
          threadId
        }
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error removing participant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 