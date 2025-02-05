import { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../types/chat';

export interface PresenceManager {
  handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>, userId: string): void;
  handleDisconnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>, userId: string): void;
  getOnlineUsers(): string[];
  getLastSeenTime(userId: string): Date | undefined;
}

export function createPresenceManager(io: Server<ClientToServerEvents, ServerToClientEvents>): PresenceManager {
  const onlineUsers = new Map<string, Set<string>>();
  const lastSeenTimes = new Map<string, Date>();

  return {
    handleConnection(socket, userId) {
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)?.add(socket.id);

      socket.broadcast.emit('presence:online', { userId });

      // Handle presence pings
      socket.on('presence:ping', () => {
        lastSeenTimes.set(userId, new Date());
        socket.emit('presence:pong', {
          onlineUsers: Array.from(onlineUsers.keys()),
          lastSeenTimes: Object.fromEntries(
            Array.from(lastSeenTimes.entries()).map(([id, date]) => [id, date.toISOString()])
          )
        });
      });
    },

    handleDisconnection(socket, userId) {
      onlineUsers.get(userId)?.delete(socket.id);
      if (onlineUsers.get(userId)?.size === 0) {
        onlineUsers.delete(userId);
        const currentTime = new Date();
        lastSeenTimes.set(userId, currentTime);
        socket.broadcast.emit('presence:offline', {
          userId,
          lastSeen: currentTime
        });
      }
    },

    getOnlineUsers() {
      return Array.from(onlineUsers.keys());
    },

    getLastSeenTime(userId) {
      return lastSeenTimes.get(userId);
    }
  };
} 