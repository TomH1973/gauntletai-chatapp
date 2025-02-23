import Redis from 'ioredis';
import { SocketServer } from '@/types/socket';
import { MessageStatus, PrismaClient } from '@prisma/client';

const STATUS_KEY_PREFIX = 'message-status:';
const BATCH_SIZE = 100;

class MessageStatusHandler {
  private redis: Redis;
  private io: SocketServer;
  private prisma: PrismaClient;

  constructor(io: SocketServer, redis: Redis, prisma: PrismaClient) {
    this.redis = redis;
    this.io = io;
    this.prisma = prisma;
  }

  private getStatusKey(messageId: string): string {
    return `${STATUS_KEY_PREFIX}${messageId}`;
  }

  async markAsDelivered(messageId: string, userId: string): Promise<void> {
    await this.updateStatus(messageId, userId, MessageStatus.DELIVERED);
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.updateStatus(messageId, userId, MessageStatus.READ);
  }

  private async updateStatus(messageId: string, userId: string, status: MessageStatus): Promise<void> {
    const key = this.getStatusKey(messageId);
    
    // Add user to status list with timestamp
    await this.redis
      .multi()
      .hset(key, userId, JSON.stringify({ status, timestamp: new Date().toISOString() }))
      .exec();

    // Get message details
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        threadId: true,
        userId: true,
      }
    });

    if (message) {
      // Emit status update to thread
      this.io.to(`thread:${message.threadId}`).emit('message:status', {
        messageId,
        userId,
        status,
      });

      // Update message status in database if all thread participants have read it
      if (status === MessageStatus.READ) {
        const threadParticipants = await this.prisma.threadParticipant.findMany({
          where: { threadId: message.threadId },
          select: { userId: true }
        });

        const statusData = await this.redis.hgetall(key);
        const allRead = threadParticipants.every(participant => 
          participant.userId === message.userId || // Sender's messages are always read
          (statusData[participant.userId] && 
           JSON.parse(statusData[participant.userId]).status === MessageStatus.READ)
        );

        if (allRead) {
          await this.prisma.message.update({
            where: { id: messageId },
            data: { status: MessageStatus.READ }
          });
        }
      }
    }
  }

  async markThreadAsRead(threadId: string, userId: string): Promise<void> {
    // Get unread messages in thread
    const messages = await this.prisma.message.findMany({
      where: {
        threadId,
        status: { not: MessageStatus.READ },
        userId: { not: userId }, // Skip user's own messages
      },
      select: {
        id: true,
      },
      take: BATCH_SIZE,
    });

    // Update status for each message
    await Promise.all(
      messages.map(message => this.markAsRead(message.id, userId))
    );
  }

  async getMessageStatus(messageId: string): Promise<Record<string, MessageStatus>> {
    const key = this.getStatusKey(messageId);
    const statusData = await this.redis.hgetall(key);
    
    return Object.fromEntries(
      Object.entries(statusData).map(([userId, data]) => [
        userId,
        JSON.parse(data).status
      ])
    );
  }

  async cleanup(messageId: string): Promise<void> {
    const key = this.getStatusKey(messageId);
    await this.redis.del(key);
  }
}

export { MessageStatusHandler }; 