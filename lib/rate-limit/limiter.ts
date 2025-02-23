import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { RateLimitEvent, RateLimitEventType } from './events';
import { RateLimitEventEmitter } from './eventEmitter';

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
  remaining?: number;
  retryAfter?: number;
}

interface CacheEntry {
  count: number;
  expiry: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  'message:send': {
    points: 60,
    duration: 60,
    blockDuration: 60
  },
  'reaction:add': {
    points: 30,
    duration: 60,
    blockDuration: 30
  }
};

export class RateLimiter {
  private redis: Redis;
  private cache: LRUCache<string, CacheEntry>;
  private events: RateLimitEventEmitter;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || 'redis://localhost:6380');
    this.cache = new LRUCache({
      max: 10000,
      ttl: 1000,
      updateAgeOnGet: true
    });
    this.events = new RateLimitEventEmitter();

    // Clean up on shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  async checkLimit(userId: string, action: string | RateLimitOptions): Promise<RateLimitResult> {
    const startTime = Date.now();
    let config: RateLimitConfig;
    let actionKey: string;

    try {
      // Emit attempt event
      this.events.emit({
        type: 'ATTEMPT',
        timestamp: startTime,
        userId,
        action: typeof action === 'string' ? action : action.key
      });

      if (typeof action === 'string') {
        actionKey = action;
        config = DEFAULT_LIMITS[action];
        if (!config) {
          throw new Error(`No rate limit config found for action: ${action}`);
        }
      } else {
        actionKey = action.key;
        config = {
          points: action.points || DEFAULT_LIMITS[actionKey]?.points || 30,
          duration: action.duration || DEFAULT_LIMITS[actionKey]?.duration || 60,
          blockDuration: DEFAULT_LIMITS[actionKey]?.blockDuration || 60
        };
      }

      const key = `ratelimit:${actionKey}:${userId}`;
      const blockKey = `ratelimit:block:${actionKey}:${userId}`;
      const now = Date.now();

      // Check if user is blocked
      const isBlocked = await this.redis.get(blockKey);
      if (isBlocked) {
        const ttl = await this.redis.ttl(blockKey);
        this.emitEvent('BLOCKED', userId, actionKey, { retryAfter: ttl });
        return { allowed: false, retryAfter: ttl };
      }

      // Use Redis pipeline for atomic operations
      const multi = this.redis.multi();
      const windowStart = now - (config.duration * 1000);
      
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zadd(key, now, now.toString());
      multi.zcard(key);
      multi.expire(key, config.duration);
      
      const results = await multi.exec();
      const count = results?.[2]?.[1] as number || 0;

      const allowed = count <= config.points;
      const remaining = Math.max(0, config.points - count);

      if (!allowed) {
        await this.redis.setex(blockKey, config.blockDuration, '1');
        this.emitEvent('BLOCKED', userId, actionKey, {
          remaining: 0,
          retryAfter: config.blockDuration
        });
      } else {
        this.emitEvent('ALLOWED', userId, actionKey, { remaining });
      }

      return {
        allowed,
        remaining,
        retryAfter: allowed ? undefined : config.blockDuration
      };

    } catch (error) {
      this.emitEvent('ERROR', userId, typeof action === 'string' ? action : action.key, {
        error: error.message
      });
      throw error;
    }
  }

  private emitEvent(
    type: RateLimitEventType,
    userId: string,
    action: string,
    metadata?: RateLimitEvent['metadata']
  ): void {
    this.events.emitEvent({
      type,
      timestamp: Date.now(),
      userId,
      action,
      metadata
    });
  }

  onBatch(handler: (events: RateLimitEvent[]) => void): void {
    this.events.on('batch', handler);
  }

  onEventType(type: RateLimitEventType, handler: (events: RateLimitEvent[]) => void): void {
    this.events.on(`batch:${type.toLowerCase()}`, handler);
  }

  async shutdown(): Promise<void> {
    this.events.shutdown();
    await this.redis.quit();
  }
} 