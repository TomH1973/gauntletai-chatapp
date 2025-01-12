import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { messageSchema, validateRequest, hasPermission, SystemRole } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        systemRole: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate request body
    const body = await req.json();
    const validation = await validateRequest(messageSchema, body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { content, threadId, parentId, type = "TEXT", metadata } = validation.data;

    // Check thread participation
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        userId_threadId: {
          userId: user.id,
          threadId
        }
      }
    });

    const userRole = user.systemRole as SystemRole;
    if (!participant && !hasPermission(userRole, SystemRole.ADMIN)) {
      return NextResponse.json(
        { error: "Not a thread participant" },
        { status: 403 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        type,
        metadata: metadata ?? Prisma.JsonNull,
        threadId,
        userId: user.id,
        parentId,
        status: "SENT"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Create message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json({ error: "Thread ID required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        systemRole: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check thread participation or admin status
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        userId_threadId: {
          userId: user.id,
          threadId
        }
      }
    });

    const userRole = user.systemRole as SystemRole;
    if (!participant && !hasPermission(userRole, SystemRole.ADMIN)) {
      return NextResponse.json(
        { error: "Not a thread participant" },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: {
        threadId,
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      take: 50
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 