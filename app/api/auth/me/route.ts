import { auth, currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get or create user in our database
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
        image: clerkUser.imageUrl,
      },
      create: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
        image: clerkUser.imageUrl,
        status: "OFFLINE"
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 