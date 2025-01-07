import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        createdAt: true,
        lastLoginAt: true,
      } as Record<keyof UserResponse, true>
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

