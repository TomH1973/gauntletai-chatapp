import { Redis } from 'ioredis';
import { metrics } from '../metrics';
import { LRUCache } from 'lru-cache';
import { createPool, Pool } from 'generic-pool';

interface RateLimitConfig {
  limit: number;
  duration: number;
  blockDuration?: number;
  sampleRate?: number;
  burstLimit?: number;
  burstDuration?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  burstRemaining?: number;
}

interface CacheEntry {
  count: number;
  expires: number;
  burstCount?: number;
}

const CACHE_TTL = 2000; // 2 seconds
const CACHE_MAX = 10000;

const redisPool = createPool({
  create: async () => {
    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    return client;
  },
  destroy: async (client) => {
    await client.quit();
  }
}, {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  evictionRunIntervalMillis: 15000,
});

export const rateLimitConfig: Record<string, RateLimitConfig> = {
  'message:send': {
    limit: 60,
    duration: 60,
    blockDuration: 120,
    burstLimit: 10,
    burstDuration: 10
  },
  'typing:update': {
    limit: 120,
    duration: 60,
    sampleRate: 0.5,
    burstLimit: 20,
    burstDuration: 5
  },
  'reaction:add': {
    limit: 30,
    duration: 60,
    sampleRate: 0.8,
    burstLimit: 5,
    burstDuration: 5
  },
  'presence:update': {
    limit: 60,
    duration: 60,
    sampleRate: 0.5,
    burstLimit: 10,
    burstDuration: 10
  }
};

export class WebSocketRateLimiter {
  private cache = new Map<string, { count: number, burstCount: number, timestamp: number }>();

  constructor() {
    // Cleanup expired cache entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          this.cache.delete(key);
        }
      }
      if (this.cache.size > CACHE_MAX) {
        // Remove oldest entries if cache is too large
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toRemove = entries.slice(0, entries.length - CACHE_MAX);
        for (const [key] of toRemove) {
          this.cache.delete(key);
        }
      }
    }, CACHE_TTL);
  }

  private async getRedisClient(): Promise<Redis> {
    return await redisPool.acquire();
  }

  private async releaseRedisClient(client: Redis): Promise<void> {
    await redisPool.release(client);
  }

  async checkLimit(userId: string, action: string): Promise<RateLimitResult> {
    const config = rateLimitConfig[action];
    if (!config) return { allowed: true, remaining: Infinity };

    // Apply probabilistic filtering if configured
    if (config.sampleRate && Math.random() > config.sampleRate) {
      return { allowed: true, remaining: Infinity };
    }

    const key = `rate:${action}:${userId}`;
    const burstKey = `rate:${action}:${userId}:burst`;

    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      const { count, burstCount, timestamp } = cached;
      const age = Date.now() - timestamp;
      
      if (age < 1000) { // Cache is fresh (less than 1 second old)
        if (count >= config.limit || (config.burstLimit && burstCount >= config.burstLimit)) {
          return {
            allowed: false,
            remaining: 0,
            retryAfter: config.blockDuration || config.duration,
            burstRemaining: config.burstLimit ? Math.max(0, config.burstLimit - burstCount) : undefined
          };
        }
        
        this.cache.set(key, {
          count: count + 1,
          burstCount: burstCount + 1,
          timestamp
        });
        
        return {
          allowed: true,
          remaining: config.limit - (count + 1),
          burstRemaining: config.burstLimit ? Math.max(0, config.burstLimit - (burstCount + 1)) : undefined
        };
      }
    }

    let client: Redis | null = null;
    try {
      client = await this.getRedisClient();

      // Check regular rate limit
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, config.duration);
      }

      // Check burst rate limit if configured
      let burstCount = 0;
      if (config.burstLimit) {
        burstCount = await client.incr(burstKey);
        if (burstCount === 1) {
          await client.expire(burstKey, config.burstDuration || 1);
        }
      }

      // Update cache
      this.cache.set(key, {
        count,
        burstCount,
        timestamp: Date.now()
      });

      const isBlocked = count > config.limit || (config.burstLimit && burstCount > config.burstLimit);
      
      if (isBlocked && config.blockDuration) {
        await client.setex(`block:${key}`, config.blockDuration, '1');
        return {
          allowed: false,
          remaining: 0,
          retryAfter: config.blockDuration,
          burstRemaining: config.burstLimit ? Math.max(0, config.burstLimit - burstCount) : undefined
        };
      }

      return {
        allowed: !isBlocked,
        remaining: Math.max(0, config.limit - count),
        burstRemaining: config.burstLimit ? Math.max(0, config.burstLimit - burstCount) : undefined
      };

    } catch (error) {
      console.error('Rate limit error:', error);
      return { allowed: true, remaining: Infinity }; // Fail open on errors
    } finally {
      if (client) {
        await this.releaseRedisClient(client);
      }
    }
  }

  async shutdown(): Promise<void> {
    await redisPool.drain();
    await redisPool.clear();
  }
}

// Export singleton instance
export const wsRateLimiter = new WebSocketRateLimiter(); 