import { NextResponse } from 'next/server';
import { redisClient } from '@/lib/redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HealthMetrics {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  timestamp: string;
  services: {
    database: {
      status: 'connected' | 'error';
      latency: number;
    };
    redis: {
      status: 'connected' | 'error';
      latency: number;
    };
  };
}

async function checkDatabase(): Promise<{ status: 'connected' | 'error'; latency: number }> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { 
      status: 'connected', 
      latency: Math.round(performance.now() - start) 
    };
  } catch (error) {
    console.error('[Health Check] Database error:', error);
    return { 
      status: 'error', 
      latency: Math.round(performance.now() - start) 
    };
  }
}

async function checkRedis(): Promise<{ status: 'connected' | 'error'; latency: number }> {
  const start = performance.now();
  try {
    const result = await redisClient.ping();
    return { 
      status: result === 'PONG' ? 'connected' : 'error',
      latency: Math.round(performance.now() - start)
    };
  } catch (error) {
    console.error('[Health Check] Redis error:', error);
    return { 
      status: 'error', 
      latency: Math.round(performance.now() - start)
    };
  }
}

export async function GET() {
  try {
    // Check Redis connection
    await redisClient.ping();
    
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return new NextResponse(
      JSON.stringify({ status: 'healthy' }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Health check failed:', error);
    return new NextResponse(
      JSON.stringify({ 
        status: 'unhealthy', 
        error: error?.message || 'Unknown error' 
      }),
      { status: 500 }
    );
  }
} 