import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const preferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  shareProfile: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  allowMessagePreviews: z.boolean().optional(),
  retainMessageHistory: z.boolean().optional(),
  notificationSound: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  language: z.string().min(2).max(5).optional(),
  timezone: z.string().min(1).max(50).optional(),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get local user ID from clerkId
    const localUser = await prisma.user.findFirst({
      where: { clerkId: userId },
      select: { id: true }
    });

    if (!localUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: localUser.id },
    });

    if (!preferences) {
      // Create default preferences if they don't exist
      const defaultPreferences = await prisma.userPreferences.create({
        data: { userId: localUser.id },
      });
      return NextResponse.json(defaultPreferences);
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('GET /api/user/preferences error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get local user ID from clerkId
    const localUser = await prisma.user.findFirst({
      where: { clerkId: userId },
      select: { id: true }
    });

    if (!localUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    const body = await req.json();
    const validatedData = preferencesSchema.parse(body);

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: localUser.id },
      create: { userId: localUser.id, ...validatedData },
      update: validatedData,
    });

    return NextResponse.json(preferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse('Invalid request data', { status: 400 });
    }
    console.error('PATCH /api/user/preferences error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 