import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Get a specific thread by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch the thread with its participants and messages
    const thread = await prisma.thread.findUnique({
      where: {
        id: params.id,
      },
      include: {
        participants: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
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
        },
      },
    });

    if (!thread) {
      return new NextResponse("Thread not found", { status: 404 });
    }

    // Ensure the current user is a participant in the thread
    if (!thread.participants.some((p: { id: string }) => p.id === userId)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Error fetching thread:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Update a specific thread
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body: { title: string; participantIds: string[] } = await request.json();
    const { title, participantIds } = body;

    // Update the thread title and participants
    const thread = await prisma.thread.update({
      where: {
        id: params.id,
      },
      data: {
        title,
        participants: {
          set: participantIds.map((id: string) => ({ clerkId: id })),
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Error updating thread:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Delete a specific thread
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Delete the thread and its messages
    await prisma.$transaction([
      prisma.message.deleteMany({
        where: { threadId: params.id }
      }),
      prisma.thread.delete({
        where: { id: params.id }
      })
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting thread:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

