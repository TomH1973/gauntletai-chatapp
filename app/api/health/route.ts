import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

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
    const result = await redis.set('health-check', 'ok', { ex: 10 });
    return { 
      status: result === 'OK' ? 'connected' : 'error',
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
  const metrics: HealthMetrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis()
    }
  };

  const isHealthy = metrics.services.database.status === 'connected' && 
                   metrics.services.redis.status === 'connected';

  console.log('[Health Check]', {
    healthy: isHealthy,
    metrics: {
      uptime: Math.round(metrics.uptime),
      memory: {
        heapUsed: Math.round(metrics.memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(metrics.memory.heapTotal / 1024 / 1024),
        rss: Math.round(metrics.memory.rss / 1024 / 1024)
      },
      services: metrics.services
    }
  });

  return NextResponse.json(
    { 
      status: isHealthy ? 'healthy' : 'unhealthy',
      ...metrics
    },
    { 
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/health+json'
      }
    }
  );
} 