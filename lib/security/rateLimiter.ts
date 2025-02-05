import Redis from 'ioredis';
import { metrics } from '../metrics.js';

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

interface RateLimitConfig {
  points: number;      // Number of requests allowed
  duration: number;    // Time window in seconds
  blockDuration: number; // How long to block if limit exceeded
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'message:send': {
    points: 10,        // 10 messages
    duration: 60,      // per minute
    blockDuration: 60  // block for 1 minute if exceeded
  },
  'typing:update': {
    points: 5,         // 5 updates
    duration: 5,       // per 5 seconds
    blockDuration: 5   // block for 5 seconds if exceeded
  }
};

class RateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async checkLimit(userId: string, action: keyof typeof RATE_LIMITS): Promise<RateLimitResult> {
    const config = RATE_LIMITS[action];
    const key = `ratelimit:${action}:${userId}`;

    try {
      const multi = this.redis.multi();
      
      // Get current count and TTL
      multi.get(key);
      multi.ttl(key);
      
      const [count, ttl] = await multi.exec() as [null | [null, string], null | [null, number]];
      const currentCount = count ? parseInt(count[1], 10) : 0;
      const currentTTL = ttl ? ttl[1] : 0;

      // Check if user is currently blocked
      if (currentTTL > config.duration) {
        metrics.rateLimitHits.inc({ action });
        return {
          allowed: false,
          retryAfter: Math.ceil(currentTTL - config.duration)
        };
      }

      // Check if limit is exceeded
      if (currentCount >= config.points) {
        // Set block duration
        await this.redis.setex(key, config.blockDuration + config.duration, config.points.toString());
        metrics.rateLimitHits.inc({ action });
        return {
          allowed: false,
          retryAfter: config.blockDuration
        };
      }

      // Increment counter
      if (currentCount === 0) {
        await this.redis.setex(key, config.duration, '1');
      } else {
        await this.redis.incr(key);
      }

      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open to prevent blocking legitimate traffic
      return { allowed: true };
    }
  }
}

export const rateLimiter = new RateLimiter(); 