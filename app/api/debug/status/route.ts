import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get some basic stats
    const [
      userCount,
      threadCount,
      messageCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.thread.count(),
      prisma.message.count()
    ]);

    const status = {
      database: 'connected',
      timestamp: new Date().toISOString(),
      stats: {
        users: userCount,
        threads: threadCount,
        messages: messageCount
      },
      environment: process.env.NODE_ENV,
      logs: logger.getLogs().slice(-10) // Get last 10 logs
    };

    logger.info('Status check completed', status);
    return NextResponse.json(status);
  } catch (error) {
    logger.error('Status check failed', error);
    return NextResponse.json(
      { error: 'System check failed', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
} 