import { Socket } from 'socket.io';
import { rateLimiter } from '../security/rateLimiter';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  SocketData,
  PresenceEvent,
  PresenceData,
  MessageReactionData,
  ErrorResponse,
  SocketServer
} from '@/types/socket';

export type UserStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

interface UserPresence {
  userId: string;
  status: UserStatus;
  lastActivity: Date;
  lastPing: Date;
  deviceCount: number;
  sockets: Set<string>;
}

export interface PresenceManager {
  handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>, userId: string): void;
  handleDisconnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>, userId: string): void;
  getOnlineUsers(): string[];
  getLastSeenTime(userId: string): Date | undefined;
  getUserStatus(userId: string): UserStatus;
  cleanup(): void;
}

const PRESENCE_CONFIG = {
  AWAY_TIMEOUT: 5 * 60 * 1000,    // 5 minutes
  OFFLINE_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  CLEANUP_INTERVAL: 60 * 1000,     // 1 minute
  BROADCAST_DEBOUNCE: 100         // 100ms
} as const;

export function createPresenceManager(io: SocketServer): PresenceManager {
  const presenceMap = new Map<string, UserPresence>();
  const lastSeenTimes = new Map<string, Date>();
  let cleanupInterval: NodeJS.Timeout;

  // Cache for optimizing broadcasts
  const cachedPresenceData = {
    timestamp: 0,
    data: null as null | {
      onlineUsers: string[],
      lastSeenTimes: Record<string, string>,
      userStatuses: Record<string, UserStatus>
    }
  };

  const updateUserStatus = (userId: string, presence: UserPresence): void => {
    const now = Date.now();
    const inactiveTime = now - presence.lastActivity.getTime();

    let newStatus: UserStatus = 'ONLINE';
    if (inactiveTime > PRESENCE_CONFIG.OFFLINE_TIMEOUT) {
      newStatus = 'OFFLINE';
    } else if (inactiveTime > PRESENCE_CONFIG.AWAY_TIMEOUT) {
      newStatus = 'AWAY';
    }

    if (newStatus !== presence.status) {
      presence.status = newStatus;
      io.emit('presence:status', { userId, status: newStatus });
      cachedPresenceData.timestamp = 0; // Invalidate cache
    }
  };

  const getPresenceData = () => {
    const now = Date.now();
    if (cachedPresenceData.data && now - cachedPresenceData.timestamp < PRESENCE_CONFIG.BROADCAST_DEBOUNCE) {
      return cachedPresenceData.data;
    }

    const data = {
      onlineUsers: Array.from(presenceMap.entries())
        .filter(([_, p]) => p.status === 'ONLINE')
        .map(([id]) => id),
      lastSeenTimes: Object.fromEntries(
        Array.from(lastSeenTimes.entries())
          .map(([id, date]) => [id, date.toISOString()])
      ),
      userStatuses: Object.fromEntries(
        Array.from(presenceMap.entries())
          .map(([id, p]) => [id, p.status])
      )
    };

    cachedPresenceData.data = data;
    cachedPresenceData.timestamp = now;
    return data;
  };

  const cleanup = () => {
    const now = Date.now();
    for (const [userId, presence] of presenceMap.entries()) {
      if (now - presence.lastPing.getTime() > PRESENCE_CONFIG.OFFLINE_TIMEOUT) {
        if (presence.sockets.size === 0) {
          presenceMap.delete(userId);
          lastSeenTimes.set(userId, new Date());
          io.emit('presence:offline', { 
            userId, 
            status: 'OFFLINE',
            lastSeen: new Date().toISOString() 
          });
        }
      }
      updateUserStatus(userId, presence);
    }
    cachedPresenceData.timestamp = 0; // Invalidate cache after cleanup
  };

  // Start cleanup interval
  cleanupInterval = setInterval(cleanup, PRESENCE_CONFIG.CLEANUP_INTERVAL);

  return {
    handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>, userId: string) {
      let pingTimeout: NodeJS.Timeout;

      // Initialize or update presence
      let presence = presenceMap.get(userId);
      if (!presence) {
        presence = {
          userId,
          status: 'ONLINE',
          lastActivity: new Date(),
          lastPing: new Date(),
          deviceCount: 1,
          sockets: new Set([socket.id])
        };
        presenceMap.set(userId, presence);
        io.emit('presence:online', { userId, status: 'ONLINE' });
      } else {
        presence.sockets.add(socket.id);
        presence.deviceCount++;
        presence.lastActivity = new Date();
        presence.lastPing = new Date();
        presence.status = 'ONLINE';
        updateUserStatus(userId, presence);
      }

      socket.on('presence:ping', () => {
        clearTimeout(pingTimeout);
        pingTimeout = setTimeout(() => {
          const presence = presenceMap.get(userId);
          if (presence) {
            presence.lastPing = new Date();
            presence.lastActivity = new Date();
            updateUserStatus(userId, presence);
            socket.emit('presence:pong', getPresenceData());
          }
        }, PRESENCE_CONFIG.BROADCAST_DEBOUNCE);
      });

      socket.on('presence:activity', () => {
        const presence = presenceMap.get(userId);
        if (presence) {
          presence.lastActivity = new Date();
          updateUserStatus(userId, presence);
        }
      });

      // Handle message reactions
      socket.on('message:reaction', async (data: MessageReactionData) => {
        try {
          const isAllowed = await rateLimiter.checkLimit(socket.data.userId, {
            key: 'reaction:add',
            points: 30,  // Allow 30 reactions
            duration: 60 // per minute
          });

          if (!isAllowed.allowed) {
            const error: ErrorResponse = {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many reactions. Please wait before adding more.',
              retryAfter: isAllowed.retryAfter
            };
            socket.emit('error', error);
            return;
          }

          // Rest of reaction handling logic...
          // ... existing code ...
        } catch (error) {
          console.error('Error handling message reaction:', error);
          const errorResponse: ErrorResponse = {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process reaction'
          };
          socket.emit('error', errorResponse);
        }
      });
    },

    handleDisconnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>, userId: string) {
      const presence = presenceMap.get(userId);
      if (presence) {
        presence.sockets.delete(socket.id);
        presence.deviceCount--;

        if (presence.deviceCount <= 0) {
          presence.status = 'OFFLINE';
          io.emit('presence:offline', { 
            userId, 
            status: 'OFFLINE',
            lastSeen: new Date().toISOString() 
          });
        }
      }
    },

    getOnlineUsers(): string[] {
      return Array.from(presenceMap.entries())
        .filter(([_, p]) => p.status === 'ONLINE')
        .map(([id]) => id);
    },

    getLastSeenTime(userId: string): Date | undefined {
      return lastSeenTimes.get(userId);
    },

    getUserStatus(userId: string): UserStatus {
      const presence = presenceMap.get(userId);
      return presence?.status || 'OFFLINE';
    },

    cleanup(): void {
      cleanup();
    }
  };
} 