import { Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { logger } from './logger';
import { prisma } from './prisma';
import { socketState } from './socketState';
import { recoveryMetrics } from './recoveryMetrics';
import { metrics } from './metrics';

const MISSED_EVENT_TTL = 300; // 5 minutes in seconds
const STATE_SNAPSHOT_TTL = 3600; // 1 hour in seconds

interface MissedEvent {
  type: string;
  data: any;
  timestamp: number;
}

interface ThreadState {
  lastMessageId: string;
  lastReadTimestamp: string;
  participants: string[];
  typing: string[];
}

interface UserState {
  activeThreads: string[];
  presence: 'online' | 'away' | 'offline';
  lastSeen: string;
  deviceId?: string;
}

export class ReconnectionManager {
  constructor(private redis: Redis) {
    this.setupStateCleanup();
  }

  private getMissedEventsKey(userId: string): string {
    return `missed_events:${userId}`;
  }

  private getThreadStateKey(threadId: string): string {
    return `thread_state:${threadId}`;
  }

  private getUserStateKey(userId: string): string {
    return `user_state:${userId}`;
  }

  private setupStateCleanup(): void {
    // Cleanup expired state snapshots every hour
    setInterval(async () => {
      try {
        const pattern = 'thread_state:*';
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl <= 0) {
            await this.redis.del(key);
          }
        }
      } catch (error) {
        logger.error('State cleanup error', { error });
      }
    }, 3600000);
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.user.id;
    const isOffline = await socketState.removeUserSocket(userId, socket.id);
    
    if (isOffline) {
      // Save user state before going offline
      await this.saveUserState(userId, socket);
      
      // Update user status
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

      // Restore user state
      const userState = await this.restoreUserState(userId);
      if (userState) {
        // Rejoin active threads
        for (const threadId of userState.activeThreads) {
          socket.join(threadId);
          // Restore thread state
          const threadState = await this.restoreThreadState(threadId);
          if (threadState) {
            socket.emit('state:restored', {
              threadId,
              state: threadState
            });
          }
        }
      }

      // Process missed events
      await this.processMissedEvents(socket);

      // Update user status
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() }
      });

      socket.emit('reconnection:complete', {
        success: true,
        timestamp: new Date().toISOString()
      });

      logger.info('User reconnected with state restoration', { userId });
    } catch (error) {
      logger.error('Error handling reconnection', { userId, error });
      socket.emit('reconnection:complete', {
        success: false,
        error: 'State restoration failed'
      });
    }
  }

  async verifyState(socket: Socket, threadId: string): Promise<void> {
    try {
      const userId = socket.data.user.id;
      const threadState = await this.restoreThreadState(threadId);
      
      if (threadState) {
        socket.emit('state:verified', {
          threadId,
          state: threadState,
          timestamp: new Date().toISOString()
        });
      } else {
        // Thread state not found, fetch from database
        const thread = await prisma.thread.findUnique({
          where: { id: threadId },
          include: {
            participants: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });

        if (thread) {
          const newState: ThreadState = {
            lastMessageId: thread.messages[0]?.id,
            lastReadTimestamp: new Date().toISOString(),
            participants: thread.participants.map(p => p.id),
            typing: []
          };

          await this.saveThreadState(threadId, newState);
          socket.emit('state:verified', {
            threadId,
            state: newState,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      logger.error('State verification error', { threadId, error });
      socket.emit('state:error', {
        threadId,
        error: 'State verification failed'
      });
    }
  }

  private async saveThreadState(threadId: string, state: ThreadState): Promise<void> {
    const key = this.getThreadStateKey(threadId);
    await this.redis.setex(key, STATE_SNAPSHOT_TTL, JSON.stringify(state));
  }

  private async restoreThreadState(threadId: string): Promise<ThreadState | null> {
    const key = this.getThreadStateKey(threadId);
    const state = await this.redis.get(key);
    return state ? JSON.parse(state) : null;
  }

  private async saveUserState(userId: string, socket: Socket): Promise<void> {
    const key = this.getUserStateKey(userId);
    const state: UserState = {
      activeThreads: Array.from(socket.rooms).filter(room => room.startsWith('thread:')),
      presence: 'offline',
      lastSeen: new Date().toISOString(),
      deviceId: socket.data.deviceId
    };
    await this.redis.setex(key, STATE_SNAPSHOT_TTL, JSON.stringify(state));
  }

  private async restoreUserState(userId: string): Promise<UserState | null> {
    const key = this.getUserStateKey(userId);
    const state = await this.redis.get(key);
    return state ? JSON.parse(state) : null;
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
    await this.redis.lpush(key, JSON.stringify(event));
    await this.redis.expire(key, MISSED_EVENT_TTL);
  }

  private async processMissedEvents(socket: Socket): Promise<void> {
    const userId = socket.data.user.id;
    const key = this.getMissedEventsKey(userId);

    try {
      // Get all missed events
      const events = await this.redis.lrange(key, 0, -1);
      
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
      await this.redis.del(key);

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

export const createReconnectionManager = (redis: Redis) => new ReconnectionManager(redis); 