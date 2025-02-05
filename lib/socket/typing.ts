import { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../types/chat';

export interface TypingHandler {
  initialize(socket: Socket<ClientToServerEvents, ServerToClientEvents>, userId: string): void;
  handleDisconnection(userId: string): void;
}

export function createTypingHandler(io: Server<ClientToServerEvents, ServerToClientEvents>): TypingHandler {
  const typingUsers = new Map<string, Map<string, { username: string; timestamp: number }>>();

  return {
    initialize(socket, userId) {
      socket.on('typing:start', (threadId) => {
        if (!typingUsers.has(threadId)) {
          typingUsers.set(threadId, new Map());
        }

        typingUsers.get(threadId)?.set(userId, {
          username: socket.data.username || 'Unknown User',
          timestamp: Date.now()
        });

        io.to(threadId).emit('typing:update', {
          threadId,
          userId,
          isTyping: true
        });
      });

      socket.on('typing:stop', (threadId) => {
        typingUsers.get(threadId)?.delete(userId);

        io.to(threadId).emit('typing:update', {
          threadId,
          userId,
          isTyping: false
        });
      });
    },

    handleDisconnection(userId) {
      // Remove user from all typing lists
      for (const [threadId, threadTyping] of typingUsers.entries()) {
        if (threadTyping.has(userId)) {
          threadTyping.delete(userId);
          
          // Emit updated typing status
          io.to(threadId).emit('typing:update', {
            threadId,
            userId,
            isTyping: false
          });
        }
      }
    }
  };
} 