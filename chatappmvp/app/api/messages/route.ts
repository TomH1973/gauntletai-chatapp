import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { content, threadId, parentId } = body;

    const message = await prisma.message.create({
      data: {
        content,
        userId,
        threadId,
        parentId,
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

    // Create notifications for all users except the sender
    const users = await prisma.user.findMany({
      where: {
        NOT: {
          clerkId: userId,
        },
      },
    });

    await prisma.notification.createMany({
      data: users.map((user: { id: string }) => ({
        userId: user.id,
        messageId: message.id,
      })),
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return new NextResponse("Thread ID is required", { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
        threadId,
        parentId: null, // Only fetch top-level messages
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
        replies: {
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
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

