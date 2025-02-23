import Redis from 'ioredis';
import { metrics } from '../metrics';
import { LRUCache } from 'lru-cache';

interface RateLimitConfig {
  points: number;      // Number of requests allowed
  duration: number;    // Time window in seconds
  blockDuration: number; // How long to block if exceeded
}

interface RateLimitOptions {
  key: string;
  points?: number;
  duration?: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

interface CacheEntry {
  count: number;
  expiry: number;
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
  },
  'reaction:add': {
    points: 30,        // 30 reactions
    duration: 60,      // per minute
    blockDuration: 30  // block for 30 seconds if exceeded
  },
  'reaction:remove': {
    points: 30,        // 30 reaction removals
    duration: 60,      // per minute
    blockDuration: 30  // block for 30 seconds if exceeded
  },
  'file:upload': {
    points: 10,        // 10 file uploads
    duration: 300,     // per 5 minutes
    blockDuration: 300 // block for 5 minutes if exceeded
  },
  'search:query': {
    points: 30,        // 30 searches
    duration: 60,      // per minute
    blockDuration: 60  // block for 1 minute if exceeded
  }
};

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CACHE_TTL = 1000; // 1 second cache TTL
const CACHE_MAX = 10000; // Maximum number of cache entries

class RateLimiter {
  private redis: Redis;
  private cleanupInterval: NodeJS.Timeout;
  private cache: LRUCache<string, CacheEntry>;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true
    });
    this.cleanupInterval = setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
    
    this.cache = new LRUCache({
      max: CACHE_MAX,
      ttl: CACHE_TTL,
      updateAgeOnGet: true,
      dispose: () => {
        metrics.rateLimitCacheSize.dec();
      }
    });

    // Update cache size metric on interval
    setInterval(() => {
      metrics.rateLimitCacheSize.set(this.cache.size);
    }, 5000);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      clearInterval(this.cleanupInterval);
      this.redis.quit();
    });
  }

  private async cleanup() {
    const startTime = Date.now();
    try {
      // Get all rate limit keys
      const keys = await this.redis.keys('ratelimit:*');
      let cleaned = 0;

      // Use pipeline for better performance
      const pipeline = this.redis.pipeline();
      
      for (const key of keys) {
        pipeline.ttl(key);
      }

      const ttls = await pipeline.exec();
      const expiredKeys = keys.filter((_, i) => (ttls?.[i]?.[1] as number) <= 0);

      if (expiredKeys.length > 0) {
        await this.redis.del(...expiredKeys);
        cleaned = expiredKeys.length;
      }

      const duration = Date.now() - startTime;
      metrics.rateLimitCleanup.observe({ success: '1' }, duration / 1000);
      metrics.rateLimitExpiredKeys.set(cleaned);
    } catch (error) {
      console.error('Rate limit cleanup failed:', error);
      metrics.rateLimitCleanup.observe({ success: '0' }, 0);
    }
  }

  private getCacheKey(userId: string, action: string): string {
    return `${action}:${userId}`;
  }

  private trackCacheOperation<T>(operation: string, action: string, fn: () => T): T {
    const startTime = Date.now();
    try {
      const result = fn();
      metrics.rateLimitCacheOperationDuration.observe({ operation }, (Date.now() - startTime) / 1000);
      return result;
    } catch (error) {
      metrics.rateLimitErrors.inc({ type: 'cache' });
      throw error;
    }
  }

  async checkLimit(userId: string, action: string | RateLimitOptions): Promise<RateLimitResult> {
    const startTime = Date.now();
    let config: RateLimitConfig;
    let actionKey: string;

    if (typeof action === 'string') {
      actionKey = action;
      config = RATE_LIMITS[action];
      if (!config) {
        throw new Error(`No rate limit config found for action: ${action}`);
      }
    } else {
      actionKey = action.key;
      const baseConfig = RATE_LIMITS[actionKey] || {
        points: 30,
        duration: 60,
        blockDuration: 60
      };
      config = {
        ...baseConfig,
        points: action.points || baseConfig.points,
        duration: action.duration || baseConfig.duration
      };
    }

    const cacheKey = this.getCacheKey(userId, actionKey);
    const now = Date.now();

    // Check cache first
    const cached = this.trackCacheOperation('get', actionKey, () => this.cache.get(cacheKey));
    if (cached && now < cached.expiry) {
      metrics.rateLimitCacheHits.inc({ type: actionKey });
      if (cached.count >= config.points) {
        metrics.rateLimitHits.inc({ type: actionKey });
        return {
          allowed: false,
          retryAfter: Math.ceil((cached.expiry - now) / 1000)
        };
      }
      // Update cache
      this.trackCacheOperation('set', actionKey, () => {
        this.cache.set(cacheKey, {
          count: cached.count + 1,
          expiry: cached.expiry
        });
        metrics.rateLimitCacheSize.inc();
      });
      return { allowed: true };
    }

    metrics.rateLimitCacheMisses.inc({ type: actionKey });

    // Cache miss or expired, check Redis
    const key = `ratelimit:${actionKey}:${userId}`;

    try {
      const multi = this.redis.multi();
      
      // Use sorted set for sliding window
      const windowStart = now - (config.duration * 1000);
      
      // Remove old entries
      multi.zremrangebyscore(key, 0, windowStart);
      // Add new entry
      multi.zadd(key, now, now.toString());
      // Get window count
      multi.zcard(key);
      // Set key expiration
      multi.expire(key, config.duration);
      
      const [, , [, count]] = await multi.exec() as any;

      // Check if user is currently blocked
      const blockKey = `ratelimit:block:${actionKey}:${userId}`;
      const isBlocked = await this.redis.get(blockKey);

      if (isBlocked) {
        const ttl = await this.redis.ttl(blockKey);
        metrics.rateLimitHits.inc({ type: actionKey });
        
        // Update cache
        this.trackCacheOperation('set', actionKey, () => {
          this.cache.set(cacheKey, {
            count: config.points,
            expiry: now + (ttl * 1000)
          });
          metrics.rateLimitCacheSize.inc();
        });

        return {
          allowed: false,
          retryAfter: ttl
        };
      }

      // Check if limit is exceeded
      if (count > config.points) {
        // Set block
        await this.redis.setex(blockKey, config.blockDuration, '1');
        metrics.rateLimitHits.inc({ type: actionKey });

        // Update cache
        this.trackCacheOperation('set', actionKey, () => {
          this.cache.set(cacheKey, {
            count: config.points,
            expiry: now + (config.blockDuration * 1000)
          });
          metrics.rateLimitCacheSize.inc();
        });

        return {
          allowed: false,
          retryAfter: config.blockDuration
        };
      }

      // Update cache with current count
      this.trackCacheOperation('set', actionKey, () => {
        this.cache.set(cacheKey, {
          count: count,
          expiry: now + (config.duration * 1000)
        });
        metrics.rateLimitCacheSize.inc();
      });

      const allowed = true;
      const retryAfter = undefined;

      if (!allowed) {
        metrics.rateLimitBlocks.inc({ type: actionKey });
      }
      metrics.rateLimitChecks.inc({ type: actionKey });
      metrics.rateLimitDuration.observe((Date.now() - startTime) / 1000);
      
      if (!allowed) {
        metrics.rateLimitHits.inc({ type: actionKey });
      }
      metrics.rateLimitCacheHits.inc({ type: actionKey });
      metrics.rateLimitCleanup.observe({ success: 'true' }, (Date.now() - startTime) / 1000);
      
      return { allowed, retryAfter };
    } catch (error) {
      metrics.rateLimitErrors.inc({ type: 'check' });
      throw error;
    }
  }

  async getRemainingPoints(userId: string, action: keyof typeof RATE_LIMITS): Promise<number> {
    const config = RATE_LIMITS[action];
    const cacheKey = this.getCacheKey(userId, action);
    const now = Date.now();

    // Check cache first
    const cached = this.trackCacheOperation('get', action, () => this.cache.get(cacheKey));
    if (cached && now < cached.expiry) {
      metrics.rateLimitCacheHits.inc({ action });
      return Math.max(0, config.points - cached.count);
    }

    metrics.rateLimitCacheMisses.inc({ action });

    // Cache miss or expired, check Redis
    const key = `ratelimit:${action}:${userId}`;
    const windowStart = now - (config.duration * 1000);

    try {
      await this.redis.zremrangebyscore(key, 0, windowStart);
      const count = await this.redis.zcard(key);

      // Update cache
      this.trackCacheOperation('set', action, () => {
        this.cache.set(cacheKey, {
          count: count,
          expiry: now + (config.duration * 1000)
        });
        metrics.rateLimitCacheSize.inc();
      });

      return Math.max(0, config.points - count);
    } catch (error) {
      console.error('Failed to get remaining points:', error);
      return config.points; // Fail open
    }
  }
}

export const rateLimiter = new RateLimiter(); 