import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { logger } from './logger';
import { prisma } from './prisma';
import { socketState } from './socketState';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const MISSED_EVENT_TTL = 300; // 5 minutes in seconds

interface MissedEvent {
  type: string;
  data: any;
  timestamp: number;
}

export class ReconnectionManager {
  constructor(private io: Server) {}

  private getMissedEventsKey(userId: string): string {
    return `missed_events:${userId}`;
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.user.id;
    const isOffline = await socketState.removeUserSocket(userId, socket.id);
    
    if (isOffline) {
      // User has no other active connections
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() }
      });
    }
  }

  async handleReconnect(socket: Socket): Promise<void> {
    const userId = socket.data.user.id;
    
    try {
      // Add new socket connection
      await socketState.addUserSocket(userId, socket.id);

      // Rejoin user's threads
      const userThreads = await prisma.threadParticipant.findMany({
        where: { userId },
        select: { threadId: true }
      });

      userThreads.forEach(({ threadId }) => {
        socket.join(threadId);
      });

      // Process missed events
      await this.processMissedEvents(socket);

      // Update user status
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() }
      });

      logger.info('User reconnected', { userId });
    } catch (error) {
      logger.error('Error handling reconnection', { userId, error });
    }
  }

  async storeMissedEvent(userId: string, type: string, data: any): Promise<void> {
    const isOnline = await socketState.isUserOnline(userId);
    if (isOnline) return; // Don't store events for online users

    const event: MissedEvent = {
      type,
      data,
      timestamp: Date.now()
    };

    const key = this.getMissedEventsKey(userId);
    await redis.lpush(key, JSON.stringify(event));
    await redis.expire(key, MISSED_EVENT_TTL);
  }

  private async processMissedEvents(socket: Socket): Promise<void> {
    const userId = socket.data.user.id;
    const key = this.getMissedEventsKey(userId);

    try {
      // Get all missed events
      const events = await redis.lrange(key, 0, -1);
      
      if (events.length === 0) return;

      // Process events in chronological order (oldest first)
      const missedEvents = events
        .map(event => JSON.parse(event) as MissedEvent)
        .sort((a, b) => a.timestamp - b.timestamp);

      // Emit events to the reconnected client
      for (const event of missedEvents) {
        socket.emit(event.type, event.data);
      }

      // Clear processed events
      await redis.del(key);

      logger.debug('Processed missed events', {
        userId,
        eventCount: events.length
      });
    } catch (error) {
      logger.error('Error processing missed events', { userId, error });
    }
  }

  async storeThreadEvents(threadId: string, type: string, data: any): Promise<void> {
    const participants = await prisma.threadParticipant.findMany({
      where: { threadId },
      select: { userId: true }
    });

    await Promise.all(
      participants.map(({ userId }) => 
        this.storeMissedEvent(userId, type, data)
      )
    );
  }
}

export const createReconnectionManager = (io: Server) => new ReconnectionManager(io); 