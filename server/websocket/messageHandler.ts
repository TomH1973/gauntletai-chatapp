import { Server, Socket } from 'socket.io';
import { PrismaClient, MessageStatus } from '@prisma/client';
import { rateLimit } from '../../lib/rate-limit';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

const prisma = new PrismaClient();

// Redis clients for pub/sub
const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6380', {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
});

const subClient = pubClient.duplicate();

// Handle Redis connection events
pubClient.on('error', (err) => {
  console.error('Redis Pub Client Error:', err);
});

subClient.on('error', (err) => {
  console.error('Redis Sub Client Error:', err);
});

pubClient.on('connect', () => {
  console.log('Redis Pub Client Connected');
});

subClient.on('connect', () => {
  console.log('Redis Sub Client Connected');
});

// Create Redis adapter for Socket.IO with error handling
export function createRedisAdapter() {
  try {
    return createAdapter(pubClient, subClient, {
      publishOnSpecificResponseChannel: true,
      requestsTimeout: 5000,
    });
  } catch (error) {
    console.error('Failed to create Redis adapter:', error);
    throw error;
  }
}

// Track user presence
const userPresence = {
  async userJoined(userId: string, socketId: string) {
    try {
      await pubClient
        .multi()
        .sadd(`presence:${userId}`, socketId)
        .pexpire(`presence:${userId}`, 24 * 60 * 60 * 1000) // 24 hour expiry
        .exec();
    } catch (error) {
      console.error('Error in userJoined:', error);
      throw error;
    }
  },
  
  async userLeft(userId: string, socketId: string) {
    try {
      await pubClient.srem(`presence:${userId}`, socketId);
    } catch (error) {
      console.error('Error in userLeft:', error);
      throw error;
    }
  },
  
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const count = await pubClient.scard(`presence:${userId}`);
      return count > 0;
    } catch (error) {
      console.error('Error in isUserOnline:', error);
      return false;
    }
  },
  
  async getUserSockets(userId: string): Promise<string[]> {
    try {
      return await pubClient.smembers(`presence:${userId}`);
    } catch (error) {
      console.error('Error in getUserSockets:', error);
      return [];
    }
  },

  async cleanup() {
    try {
      await Promise.all([pubClient.quit(), subClient.quit()]);
    } catch (error) {
      console.error('Error cleaning up Redis connections:', error);
    }
  }
};

const MAX_MESSAGE_LENGTH = 5000;

interface MessageData {
  content: string;
  threadId: string;
  parentId?: string;
  tempId?: string;
}

interface MessageResponse {
  id: string;
  content: string;
  userId: string;
  threadId: string;
  parentId: string | null;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  tempId?: string;
}

export async function handleMessage(
  io: Server,
  socket: Socket,
  data: MessageData
): Promise<void> {
  const userId = socket.data.userId;
  if (!userId) {
    socket.emit('error', {
      code: 'UNAUTHORIZED',
      message: 'User not authenticated',
    });
    return;
  }

  // Rate limiting check
  const rateLimitResult = await rateLimit.checkLimit(userId, 'message:send', 10);
  if (!rateLimitResult.allowed) {
    socket.emit('error', {
      code: 'RATE_LIMIT',
      message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`,
    });
    return;
  }

  // Validate message content
  if (!data.content || data.content.length > MAX_MESSAGE_LENGTH) {
    socket.emit('error', {
      code: 'INVALID_MESSAGE',
      message: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`,
    });
    return;
  }

  try {
    // Create message in database
    const message = await prisma.message.create({
      data: {
        content: data.content,
        threadId: data.threadId,
        userId: userId,
        parentId: data.parentId,
        status: MessageStatus.SENT,
      },
      include: {
        user: true,
        parent: true,
      },
    });

    // Update thread's lastActivity
    await prisma.thread.update({
      where: { id: data.threadId },
      data: { 
        updatedAt: new Date(),
        lastMessageAt: new Date()
      },
    });

    // Emit to all users in the thread
    io.to(data.threadId).emit('message:new', {
      ...message,
      tempId: data.tempId,
    });

  } catch (error) {
    console.error('Error creating message:', error);
    socket.emit('error', {
      code: 'DATABASE_ERROR',
      message: 'Failed to save message',
    });
  }
}

export { userPresence }; 