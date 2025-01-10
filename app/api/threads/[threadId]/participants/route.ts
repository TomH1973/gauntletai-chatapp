import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ParticipantRole } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const participants = await prisma.threadParticipant.findMany({
      where: { threadId: params.threadId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, role = ParticipantRole.MEMBER } = await req.json();

    // Check if the current user has permission to add participants
    const currentParticipant = await prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId: params.threadId,
          userId: session.user.id,
        },
      },
    });

    if (!currentParticipant || currentParticipant.role === ParticipantRole.MEMBER) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const participant = await prisma.threadParticipant.create({
      data: {
        threadId: params.threadId,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json(participant);
  } catch (error) {
    console.error('Error adding participant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await req.json();

    // Check if the current user has permission to remove participants
    const currentParticipant = await prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId: params.threadId,
          userId: session.user.id,
        },
      },
    });

    if (!currentParticipant || currentParticipant.role === ParticipantRole.MEMBER) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Don't allow removing the last owner
    if (userId !== session.user.id) {
      const targetParticipant = await prisma.threadParticipant.findUnique({
        where: {
          threadId_userId: {
            threadId: params.threadId,
            userId,
          },
        },
      });

      if (targetParticipant?.role === ParticipantRole.OWNER) {
        const ownerCount = await prisma.threadParticipant.count({
          where: {
            threadId: params.threadId,
            role: ParticipantRole.OWNER,
          },
        });

        if (ownerCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last owner' },
            { status: 400 }
          );
        }
      }
    }

    await prisma.threadParticipant.delete({
      where: {
        threadId_userId: {
          threadId: params.threadId,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing participant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, role } = await req.json();

    // Check if the current user has permission to update participant roles
    const currentParticipant = await prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId: params.threadId,
          userId: session.user.id,
        },
      },
    });

    if (!currentParticipant || currentParticipant.role !== ParticipantRole.OWNER) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Don't allow removing the last owner
    if (role !== ParticipantRole.OWNER) {
      const ownerCount = await prisma.threadParticipant.count({
        where: {
          threadId: params.threadId,
          role: ParticipantRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        const targetParticipant = await prisma.threadParticipant.findUnique({
          where: {
            threadId_userId: {
              threadId: params.threadId,
              userId,
            },
          },
        });

        if (targetParticipant?.role === ParticipantRole.OWNER) {
          return NextResponse.json(
            { error: 'Cannot remove the last owner' },
            { status: 400 }
          );
        }
      }
    }

    const participant = await prisma.threadParticipant.update({
      where: {
        threadId_userId: {
          threadId: params.threadId,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json(participant);
  } catch (error) {
    console.error('Error updating participant role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 