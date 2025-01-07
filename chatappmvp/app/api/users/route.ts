import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface UserUpdateBody {
  username: string;
  firstName: string;
  lastName: string;
  profileImage: string;
}

interface UserCreateBody extends UserUpdateBody {
  clerkId: string;
  email: string;
}

interface UserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { username, firstName, lastName, profileImage } = body;

    const updatedUser = await prisma.user.update({
      where: { clerkId: userId },
      data: {
        username,
        firstName,
        lastName,
        profileImage,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    // Only allow authenticated users to create new users (you might want to restrict this further)
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { clerkId, email, username, firstName, lastName, profileImage } = body;

    // Validate required fields
    if (!clerkId || !email) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { clerkId },
          { email },
        ],
      },
    });

    if (existingUser) {
      return new NextResponse("User already exists", { status: 409 });
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        clerkId,
        email,
        username,
        firstName,
        lastName,
        profileImage,
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating new user:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

