import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

// Redis client for rate limiting
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');

// In-memory cache for rate limit results
const cache = new LRUCache<string, RateLimitResult>({
  max: 10000, // Maximum number of items
  ttl: 1000, // TTL of 1 second
});

class RateLimiter {
  private readonly defaultLimit: number;
  private readonly defaultWindow: number;

  constructor(defaultLimit: number = 10, defaultWindow: number = 60) {
    this.defaultLimit = defaultLimit;
    this.defaultWindow = defaultWindow;
  }

  async checkLimit(
    identifier: string,
    action: string,
    limit?: number,
    window?: number
  ): Promise<RateLimitResult> {
    const actualLimit = limit || this.defaultLimit;
    const actualWindow = window || this.defaultWindow;
    const key = `rate-limit:${identifier}:${action}`;

    // Check in-memory cache first
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const now = Math.floor(Date.now() / 1000);

    // Use Redis pipeline for atomic operations
    const pipeline = redisClient.pipeline();
    pipeline.zremrangebyscore(key, 0, now - actualWindow); // Remove old entries
    pipeline.zcard(key); // Get current count
    pipeline.zadd(key, now, `${now}-${Math.random()}`); // Add current request
    pipeline.expire(key, actualWindow); // Set expiry

    const results = await pipeline.exec();
    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const count = (results[1][1] as number) || 0;
    const result: RateLimitResult = {
      allowed: count <= actualLimit,
      remaining: Math.max(0, actualLimit - count),
      retryAfter: now + actualWindow - Math.floor(Date.now() / 1000)
    };

    // Cache the result
    cache.set(key, result);

    return result;
  }

  async reset(identifier: string, action: string): Promise<void> {
    const key = `rate-limit:${identifier}:${action}`;
    await redisClient.del(key);
    cache.delete(key);
  }
}

export const rateLimit = new RateLimiter(); 