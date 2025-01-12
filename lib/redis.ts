import { Redis } from '@upstash/redis';
import { createClient } from 'redis';

class LocalRedis {
  private client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.client.connect().catch(console.error);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    await this.client.set(key, JSON.stringify(value), {
      EX: options?.ex
    });
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return this.client.expire(key, seconds);
  }
}

// Use Upstash in production, local Redis in development
const redis = process.env.UPSTASH_REDIS_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN || ''
    })
  : new LocalRedis();

export { redis }; 