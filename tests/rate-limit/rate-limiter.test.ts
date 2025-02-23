import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { RateLimitResult } from '@/types/socket';
import { wsRateLimiter } from '@/lib/rate-limit/index';
import { redis } from '@/lib/redis';
import { metrics } from '@/lib/metrics';

describe('Rate Limiter', () => {
  const userId = 'test-user-123';
  
  beforeEach(async () => {
    await redis.flushall();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await redis.flushall();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limits', async () => {
      const results = await Promise.all(
        Array(30).fill(null).map(() => 
          wsRateLimiter.checkLimit(userId, 'reaction:add')
        )
      );

      expect(results.every((r: RateLimitResult) => r.allowed)).toBe(true);
      expect(results[29].remaining).toBe(0);
    });

    it('should block requests over limit', async () => {
      // Make 30 requests (the limit)
      await Promise.all(
        Array(30).fill(null).map(() => 
          wsRateLimiter.checkLimit(userId, 'reaction:add')
        )
      );

      // Try one more
      const result = await wsRateLimiter.checkLimit(userId, 'reaction:add');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Burst Protection', () => {
    it('should handle burst limits for message sending', async () => {
      // Test burst window (10 messages in 10 seconds)
      const burstResults = await Promise.all(
        Array(10).fill(null).map(() => 
          wsRateLimiter.checkLimit(userId, 'message:send')
        )
      );

      expect(burstResults.every((r: RateLimitResult) => r.allowed)).toBe(true);
      expect(burstResults[9].burstRemaining).toBe(0);

      // 11th message should be blocked by burst limit
      const overBurst = await wsRateLimiter.checkLimit(userId, 'message:send');
      expect(overBurst.allowed).toBe(false);
      expect(overBurst.burstRemaining).toBe(0);
    });
  });

  describe('Different Action Types', () => {
    it('should apply different limits for different actions', async () => {
      // Test file upload (limit: 10)
      const fileResults = await Promise.all(
        Array(10).fill(null).map(() => 
          wsRateLimiter.checkLimit(userId, 'file:upload')
        )
      );
      expect(fileResults.every((r: RateLimitResult) => r.allowed)).toBe(true);
      expect(fileResults[9].remaining).toBe(0);

      // Test typing updates (limit: 120)
      const typingResults = await Promise.all(
        Array(120).fill(null).map(() => 
          wsRateLimiter.checkLimit(userId, 'typing:update')
        )
      );
      expect(typingResults.every((r: RateLimitResult) => r.allowed)).toBe(true);
      expect(typingResults[119].remaining).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should fail open on Redis errors', async () => {
      // Mock Redis error
      vi.spyOn(redis, 'zremrangebyscore').mockRejectedValueOnce(new Error('Redis error'));

      const result = await wsRateLimiter.checkLimit(userId, 'message:send');
      expect(result.allowed).toBe(true);
      expect(metrics.socketErrors.inc).toHaveBeenCalledWith({ code: 'RATE_LIMIT_ERROR' });
    });
  });

  describe('Time Window Behavior', () => {
    it('should reset limits after window expires', async () => {
      // Fill up to limit
      await Promise.all(
        Array(30).fill(null).map(() => 
          wsRateLimiter.checkLimit(userId, 'reaction:add')
        )
      );

      // Mock time passing
      const now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now + 61000);

      // Should be allowed again
      const result = await wsRateLimiter.checkLimit(userId, 'reaction:add');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });
  });

  describe('Metrics Integration', () => {
    it('should track rate limit hits correctly', async () => {
      await wsRateLimiter.checkLimit(userId, 'message:send');
      expect(metrics.rateLimitHits.inc).toHaveBeenCalledWith({ allowed: 'true' });

      // Fill up to limit
      await Promise.all(
        Array(60).fill(null).map(() => 
          wsRateLimiter.checkLimit(userId, 'message:send')
        )
      );

      // This one should be blocked
      await wsRateLimiter.checkLimit(userId, 'message:send');
      expect(metrics.rateLimitHits.inc).toHaveBeenCalledWith({ allowed: 'false' });
    });
  });
}); 