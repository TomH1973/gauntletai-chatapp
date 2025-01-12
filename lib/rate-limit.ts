import { redis } from '@/lib/redis';

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Rate limit requests using Redis
 * @param identifier - Unique identifier for the rate limit (e.g., 'user-search-123')
 * @param limit - Maximum number of requests (default: 10)
 * @param window - Time window in seconds (default: 60)
 */
export async function rateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 60
): Promise<RateLimitResult> {
  const key = `rate-limit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, now - window); // Remove old entries
  pipeline.zcard(key); // Get current count
  pipeline.zadd(key, now, `${now}-${Math.random()}`); // Add current request
  pipeline.expire(key, window); // Set expiry

  const [, current] = await pipeline.exec() || [];
  const count = (current?.[1] as number) || 0;

  const success = count <= limit;
  const remaining = Math.max(0, limit - count);
  const reset = now + window;

  return { success, remaining, reset };
} 