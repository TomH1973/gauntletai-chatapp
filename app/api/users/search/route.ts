import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Rate limiting
    const identifier = `user-search-${userId}`;
    const { success } = await rateLimit(identifier);
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;

    if (!query) {
      return NextResponse.json({ users: [] });
    }

    // Search users with pagination
    const users = await db.write.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ],
        NOT: { id: userId } // Exclude current user
      },
      select: {
        id: true,
        username: true,
        profileImage: true
      },
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { username: 'asc' }
    });

    // Get total count for pagination
    const total = await db.write.user.count({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ],
        NOT: { id: userId }
      }
    });

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[USERS_SEARCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 