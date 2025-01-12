import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || ''
});

interface RateLimitConfig {
  maxRequests: number;  // Maximum requests per window
  window: number;       // Time window in seconds
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,    // 100 requests
  window: 60          // per minute
};

const API_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/messages': { maxRequests: 120, window: 60 },     // 120 requests per minute
  '/api/threads': { maxRequests: 60, window: 60 },       // 60 requests per minute
  '/api/auth': { maxRequests: 30, window: 60 }          // 30 requests per minute
};

export async function rateLimit(req: NextRequest) {
  const ip = req.ip || 'anonymous';
  const path = req.nextUrl.pathname;
  
  // Get rate limit config for this endpoint
  const config = API_RATE_LIMITS[path] || DEFAULT_RATE_LIMIT;
  
  // Create a unique key for this IP and endpoint
  const key = `rate-limit:${ip}:${path}`;
  
  try {
    // Get current count
    const current = await redis.get<number>(key) || 0;
    
    if (current >= config.maxRequests) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': config.window.toString()
        }
      });
    }
    
    // Increment count and set expiry
    await redis.incr(key);
    await redis.expire(key, config.window);
    
    // Add rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', (config.maxRequests - current - 1).toString());
    headers.set('X-RateLimit-Reset', (Math.floor(Date.now() / 1000) + config.window).toString());
    
    return NextResponse.next({
      headers
    });
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request if rate limiting fails
    return NextResponse.next();
  }
} 