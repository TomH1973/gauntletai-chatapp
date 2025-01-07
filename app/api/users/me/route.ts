import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    logger.debug('Current user fetched', { userId: user.id });
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    logger.error('Error fetching current user', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 