import { auth } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        status: true,
        lastActiveAt: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 