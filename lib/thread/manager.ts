import { PrismaClient } from '@prisma/client';
import { MessageEncryption } from '../security/encryption.js';
import { metrics } from '../metrics.js';
import Redis from 'ioredis';

interface ThreadManagerConfig {
  prisma: PrismaClient;
  redis: Redis;
}

export class ThreadManager {
  private prisma: PrismaClient;
  private redis: Redis;
  private static CACHE_TTL = 3600; // 1 hour

  constructor(config: ThreadManagerConfig) {
    this.prisma = config.prisma;
    this.redis = config.redis;
  }

  private async getCachedThread(threadId: string) {
    const cached = await this.redis.get(`thread:${threadId}`);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheThread(threadId: string, data: any) {
    await this.redis.setex(`thread:${threadId}`, ThreadManager.CACHE_TTL, JSON.stringify(data));
  }

  async createThread(title: string, creatorId: string, participantIds: string[]) {
    const startTime = performance.now();
    
    try {
      const thread = await this.prisma.$transaction(async (tx) => {
        // Create thread with encryption key
        const thread = await tx.thread.create({
          data: {
            title,
            encryptionKey: MessageEncryption.generateThreadKey(),
            participants: {
              create: [
                { userId: creatorId, role: 'ADMIN' },
                ...participantIds.map(id => ({ userId: id, role: 'MEMBER' }))
              ]
            }
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        // Cache thread data
        await this.cacheThread(thread.id, thread);

        return thread;
      });

      metrics.threadCreationDuration.observe(performance.now() - startTime);
      return thread;
    } catch (error) {
      metrics.threadErrors.inc({ operation: 'create' });
      throw error;
    }
  }

  async addParticipants(threadId: string, participantIds: string[]) {
    const startTime = performance.now();

    try {
      const thread = await this.prisma.$transaction(async (tx) => {
        const thread = await tx.thread.update({
          where: { id: threadId },
          data: {
            participants: {
              create: participantIds.map(id => ({ userId: id, role: 'MEMBER' }))
            }
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        // Invalidate cache
        await this.redis.del(`thread:${threadId}`);

        return thread;
      });

      metrics.threadUpdateDuration.observe(performance.now() - startTime);
      return thread;
    } catch (error) {
      metrics.threadErrors.inc({ operation: 'addParticipants' });
      throw error;
    }
  }

  async getThread(threadId: string, userId: string) {
    const startTime = performance.now();

    try {
      // Try cache first
      const cached = await this.getCachedThread(threadId);
      if (cached) {
        metrics.threadCacheHits.inc();
        return cached;
      }

      metrics.threadCacheMisses.inc();

      // Get from database with participant check
      const thread = await this.prisma.thread.findFirst({
        where: {
          id: threadId,
          participants: {
            some: {
              userId
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          messages: {
            take: 50,
            orderBy: {
              createdAt: 'desc'
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (thread) {
        await this.cacheThread(threadId, thread);
      }

      metrics.threadRetrievalDuration.observe(performance.now() - startTime);
      return thread;
    } catch (error) {
      metrics.threadErrors.inc({ operation: 'getThread' });
      throw error;
    }
  }
} 