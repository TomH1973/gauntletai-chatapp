import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Create a new thread
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body: { title: string; participantIds: string[] } = await request.json();
    const { title, participantIds } = body;

    // Create a new thread and connect it with participants
    const thread = await prisma.thread.create({
      data: {
        title,
        participants: {
          connect: [
            { clerkId: userId },
            ...participantIds.map((id: string) => ({ clerkId: id })),
          ],
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
    console.error("Error creating thread:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Get all threads for the current user
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch threads where the current user is a participant
    const threads = await prisma.thread.findMany({
      where: {
        participants: {
          some: {
            clerkId: userId,
          },
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
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(threads);
  } catch (error) {
    console.error("Error fetching threads:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

