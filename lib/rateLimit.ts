import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface RateLimitConfig {
  maxRequests: number;  // Maximum requests in window
  windowMs: number;     // Time window in milliseconds
}

const DEFAULT_LIMITS = {
  messages: { maxRequests: 30, windowMs: 60000 }, // 30 messages per minute
  typing: { maxRequests: 20, windowMs: 30000 },   // 20 typing events per 30s
  threads: { maxRequests: 10, windowMs: 60000 }   // 10 thread joins per minute
};

export class RateLimiter {
  constructor(private prefix: string = 'ratelimit') {}

  private getKey(userId: string, action: string): string {
    return `${this.prefix}:${userId}:${action}`;
  }

  async isRateLimited(userId: string, action: keyof typeof DEFAULT_LIMITS): Promise<boolean> {
    const key = this.getKey(userId, action);
    const config = DEFAULT_LIMITS[action];
    
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.pexpire(key, config.windowMs);
    }
    
    return current > config.maxRequests;
  }

  async getRemainingAttempts(userId: string, action: keyof typeof DEFAULT_LIMITS): Promise<number> {
    const key = this.getKey(userId, action);
    const current = await redis.get(key);
    const config = DEFAULT_LIMITS[action];
    
    return current ? Math.max(0, config.maxRequests - parseInt(current)) : config.maxRequests;
  }
}

export const rateLimiter = new RateLimiter(); 