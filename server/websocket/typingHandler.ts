import Redis from 'ioredis';
import { SocketServer } from '@/types/socket';

const TYPING_TIMEOUT = 3000; // 3 seconds
const TYPING_KEY_PREFIX = 'typing:';

class TypingHandler {
  private redis: Redis;
  private io: SocketServer;
  private timeouts: Map<string, NodeJS.Timeout>;

  constructor(io: SocketServer, redis: Redis) {
    this.redis = redis;
    this.io = io;
    this.timeouts = new Map();
  }

  private getTypingKey(threadId: string): string {
    return `${TYPING_KEY_PREFIX}${threadId}`;
  }

  async startTyping(threadId: string, userId: string, username: string): Promise<void> {
    const key = this.getTypingKey(threadId);
    
    // Add user to typing list with expiry
    await this.redis
      .multi()
      .hset(key, userId, username)
      .expire(key, Math.ceil(TYPING_TIMEOUT / 1000))
      .exec();

    // Clear existing timeout if any
    const existingTimeout = this.timeouts.get(`${threadId}:${userId}`);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      await this.stopTyping(threadId, userId);
    }, TYPING_TIMEOUT);

    this.timeouts.set(`${threadId}:${userId}`, timeout);

    // Emit typing update
    const typingUsers = await this.getTypingUsers(threadId);
    this.io.to(`thread:${threadId}`).emit('typing:update', {
      threadId,
      users: typingUsers.map(([id, username]) => ({ id, username }))
    });
  }

  async stopTyping(threadId: string, userId: string): Promise<void> {
    const key = this.getTypingKey(threadId);
    
    // Remove user from typing list
    await this.redis.hdel(key, userId);

    // Clear timeout
    const timeoutKey = `${threadId}:${userId}`;
    const existingTimeout = this.timeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.timeouts.delete(timeoutKey);
    }

    // Emit typing update
    const typingUsers = await this.getTypingUsers(threadId);
    this.io.to(`thread:${threadId}`).emit('typing:update', {
      threadId,
      users: typingUsers.map(([id, username]) => ({ id, username }))
    });
  }

  private async getTypingUsers(threadId: string): Promise<Array<[string, string]>> {
    const key = this.getTypingKey(threadId);
    const typingData = await this.redis.hgetall(key);
    return Object.entries(typingData);
  }

  async cleanup(threadId: string): Promise<void> {
    const key = this.getTypingKey(threadId);
    await this.redis.del(key);

    // Clear all timeouts for this thread
    for (const [timeoutKey, timeout] of this.timeouts.entries()) {
      if (timeoutKey.startsWith(`${threadId}:`)) {
        clearTimeout(timeout);
        this.timeouts.delete(timeoutKey);
      }
    }
  }
}

export { TypingHandler }; 