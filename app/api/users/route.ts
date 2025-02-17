import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';

/**
 * @route GET /api/users
 * @description Retrieves the current user's profile
 * 
 * @returns {Promise<NextResponse>} JSON response containing user profile data
 * @throws {401} If user is not authenticated
 * @throws {404} If user profile is not found
 */
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        NOT: {
          clerkId: userId
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    logger.debug('Users fetched successfully', { count: users.length });
    return NextResponse.json(users);
  } catch (error) {
    logger.error('Error fetching users', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 