import Redis from 'ioredis';
import { SocketServer } from '@/types/socket';
import { PrismaClient } from '@prisma/client';

const REACTION_KEY_PREFIX = 'reaction:';
const REACTION_USERS_KEY_PREFIX = 'reaction-users:';

class ReactionHandler {
  private redis: Redis;
  private io: SocketServer;
  private prisma: PrismaClient;

  constructor(io: SocketServer, redis: Redis, prisma: PrismaClient) {
    this.redis = redis;
    this.io = io;
    this.prisma = prisma;
  }

  private getReactionKey(messageId: string): string {
    return `${REACTION_KEY_PREFIX}${messageId}`;
  }

  private getReactionUsersKey(messageId: string, emoji: string): string {
    return `${REACTION_USERS_KEY_PREFIX}${messageId}:${emoji}`;
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const key = this.getReactionKey(messageId);
    const usersKey = this.getReactionUsersKey(messageId, emoji);

    // Get message details
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        threadId: true,
        userId: true,
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Add reaction to Redis
    await this.redis
      .multi()
      .hincrby(key, emoji, 1)
      .sadd(usersKey, userId)
      .exec();

    // Create or update reaction in database
    const reaction = await this.prisma.reaction.upsert({
      where: {
        messageId_emoji: {
          messageId,
          emoji,
        },
      },
      create: {
        messageId,
        emoji,
        users: [userId],
        count: 1,
      },
      update: {
        users: {
          push: userId,
        },
        count: {
          increment: 1,
        },
      },
    });

    // Emit reaction added event
    this.io.to(`thread:${message.threadId}`).emit('message:reactionAdded', {
      messageId,
      emoji,
      userId,
      user: {
        id: user.id,
        name: user.name,
      },
      createdAt: new Date(),
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const key = this.getReactionKey(messageId);
    const usersKey = this.getReactionUsersKey(messageId, emoji);

    // Get message details
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        threadId: true,
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Remove reaction from Redis
    const [[, count], [, removed]] = await this.redis
      .multi()
      .hincrby(key, emoji, -1)
      .srem(usersKey, userId)
      .exec() as [[null, number], [null, number]];

    if (count <= 0) {
      // Remove reaction key if count is 0
      await this.redis
        .multi()
        .hdel(key, emoji)
        .del(usersKey)
        .exec();
    }

    // Update reaction in database
    await this.prisma.reaction.update({
      where: {
        messageId_emoji: {
          messageId,
          emoji,
        },
      },
      data: {
        users: {
          set: await this.redis.smembers(usersKey),
        },
        count: count > 0 ? count : 0,
      },
    });

    // Emit reaction removed event
    this.io.to(`thread:${message.threadId}`).emit('message:reactionRemoved', {
      messageId,
      emoji,
      userId,
    });
  }

  async getReactions(messageId: string): Promise<Array<{
    emoji: string;
    count: number;
    users: string[];
  }>> {
    const key = this.getReactionKey(messageId);
    const reactions = await this.redis.hgetall(key);

    return Promise.all(
      Object.entries(reactions).map(async ([emoji, count]) => ({
        emoji,
        count: parseInt(count, 10),
        users: await this.redis.smembers(this.getReactionUsersKey(messageId, emoji)),
      }))
    );
  }

  async cleanup(messageId: string): Promise<void> {
    const key = this.getReactionKey(messageId);
    const reactions = await this.redis.hgetall(key);

    // Remove all reaction keys
    await Promise.all([
      this.redis.del(key),
      ...Object.keys(reactions).map(emoji =>
        this.redis.del(this.getReactionUsersKey(messageId, emoji))
      ),
    ]);
  }
}

export { ReactionHandler }; 