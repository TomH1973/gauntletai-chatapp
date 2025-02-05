import { Redis } from 'ioredis';
import { env } from '@/env.mjs';
import { Counter, Histogram } from 'prom-client';

// Prometheus metrics
const cacheHits = new Counter({
  name: 'redis_cache_hits_total',
  help: 'Total number of cache hits'
});

const cacheMisses = new Counter({
  name: 'redis_cache_misses_total',
  help: 'Total number of cache misses'
});

const cacheOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations',
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  THREAD: 3600,           // 1 hour
  THREAD_LIST: 300,       // 5 minutes
  MESSAGE: 3600,          // 1 hour
  USER: 3600,            // 1 hour
  USER_PRESENCE: 300,     // 5 minutes
  RATE_LIMIT: 60,        // 1 minute
} as const;

// Cache key patterns
export const CACHE_KEYS = {
  thread: (id: string) => `thread:${id}`,
  threadMessages: (id: string, page: number) => `thread:${id}:messages:${page}`,
  threadParticipants: (id: string) => `thread:${id}:participants`,
  userThreads: (id: string) => `user:${id}:threads`,
  user: (id: string) => `user:${id}`,
  userPresence: (id: string) => `presence:${id}`,
  message: (id: string) => `message:${id}`,
  messageReactions: (id: string) => `message:${id}:reactions`,
  rateLimit: (key: string) => `ratelimit:${key}`,
} as const;

// Redis client configuration
const redisConfig = {
  host: env.REDIS_HOST || 'localhost',
  port: parseInt(env.REDIS_PORT || '6379'),
  password: env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
} as const;

// Create Redis client instance
const redisClient = new Redis(redisConfig);

// Cache management functions
export const cache = {
  // Get cached data with type safety
  async get<T>(key: string): Promise<T | null> {
    const timer = cacheOperationDuration.startTimer();
    try {
      const data = await redisClient.get(key);
      timer({ operation: 'get' });
      if (!data) {
        cacheMisses.inc();
        return null;
      }
      cacheHits.inc();
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // Set cached data with TTL
  async set(key: string, data: unknown, ttl: number): Promise<void> {
    await redisClient.set(key, JSON.stringify(data), 'EX', ttl);
  },

  // Delete cached data
  async del(key: string): Promise<void> {
    await redisClient.del(key);
  },

  // Clear cache by pattern
  async clearPattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  },

  // Increment counter with TTL
  async incr(key: string, ttl: number): Promise<number> {
    const value = await redisClient.incr(key);
    if (value === 1) {
      await redisClient.expire(key, ttl);
    }
    return value;
  },

  // Cache with automatic invalidation
  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await cache.get<T>(key);
    if (cached) return cached;

    const fresh = await callback();
    await cache.set(key, fresh, ttl);
    return fresh;
  },

  // Batch get multiple keys
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await redisClient.mget(keys);
    return values.map((v: string | null) => v ? JSON.parse(v) as T : null);
  },

  // Batch set multiple keys
  async mset(items: { key: string; value: unknown; ttl: number }[]): Promise<void> {
    const pipeline = redisClient.pipeline();
    items.forEach(({ key, value, ttl }) => {
      pipeline.set(key, JSON.stringify(value), 'EX', ttl);
    });
    await pipeline.exec();
  },
};

// Cache invalidation helpers
export const invalidateCache = {
  // Invalidate thread-related caches
  async thread(threadId: string): Promise<void> {
    await cache.clearPattern(`thread:${threadId}:*`);
    await cache.del(CACHE_KEYS.thread(threadId));
  },

  // Invalidate user-related caches
  async user(userId: string): Promise<void> {
    await cache.clearPattern(`user:${userId}:*`);
    await cache.del(CACHE_KEYS.user(userId));
  },

  // Invalidate message-related caches
  async message(messageId: string, threadId: string): Promise<void> {
    await cache.del(CACHE_KEYS.messageReactions(messageId));
    await cache.clearPattern(`thread:${threadId}:messages:*`);
  },
};

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Circuit breaker configuration
const CIRCUIT_BREAKER = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  monitorInterval: 5000, // 5 seconds
};

let circuitState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false
};

// Circuit breaker wrapper
async function withCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
  if (circuitState.isOpen) {
    const timeSinceLastFailure = Date.now() - circuitState.lastFailure;
    if (timeSinceLastFailure < CIRCUIT_BREAKER.resetTimeout) {
      throw new Error('Circuit breaker is open');
    }
    circuitState.isOpen = false;
    circuitState.failures = 0;
  }

  try {
    const result = await operation();
    circuitState.failures = 0;
    return result;
  } catch (error) {
    circuitState.failures++;
    circuitState.lastFailure = Date.now();
    
    if (circuitState.failures >= CIRCUIT_BREAKER.failureThreshold) {
      circuitState.isOpen = true;
    }
    throw error;
  }
}

// Wrap Redis client with circuit breaker
export const redis: Redis = new Proxy(redisClient, {
  get(target: Redis, prop: string | symbol) {
    const original = Reflect.get(target, prop);
    if (typeof original === 'function') {
      return async (...args: unknown[]) => {
        return withCircuitBreaker(() => original.apply(target, args));
      };
    }
    return original;
  }
}) as Redis;

// Export metrics for Prometheus scraping
export const getMetrics = () => ({
  cacheHits,
  cacheMisses,
  cacheOperationDuration
});

// Export Redis client for direct access if needed
export { Redis }; 