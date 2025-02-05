import { Socket, Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../types/chat';

export interface ThreadHandler {
  initialize(socket: Socket<ClientToServerEvents, ServerToClientEvents>, userId: string): void;
}

interface ThreadHandlerDeps {
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  prisma: PrismaClient;
  metrics: any; // TODO: Add proper metrics type
}

const userSelect = {
  id: true,
  email: true,
  name: true,
} as const;

export function createThreadHandler(io: Server<ClientToServerEvents, ServerToClientEvents>, deps: ThreadHandlerDeps): ThreadHandler {
  return {
    initialize(socket, userId) {
      socket.on('thread:join', async (threadId) => {
        try {
          const participant = await deps.prisma.threadParticipant.findFirst({
            where: {
              AND: {
                threadId,
                userId,
              }
            },
          });

          if (participant) {
            socket.join(threadId);
          }
        } catch (error) {
          console.error('Error joining thread:', error);
        }
      });

      socket.on('thread:leave', (threadId) => {
        socket.leave(threadId);
      });

      socket.on('thread:participantAdded', async (data) => {
        try {
          const participant = await deps.prisma.threadParticipant.findFirst({
            where: {
              AND: {
                threadId: data.threadId,
                userId: data.userId,
              }
            },
            include: {
              user: {
                select: userSelect
              },
            },
          });

          if (participant) {
            io.to(data.threadId).emit('thread:participantAdded', participant);
          }
        } catch (error) {
          console.error('Error handling participant added:', error);
        }
      });

      socket.on('thread:participantRemoved', async (data) => {
        try {
          io.to(data.threadId).emit('thread:participantRemoved', {
            threadId: data.threadId,
            userId: data.userId,
          });
        } catch (error) {
          console.error('Error handling participant removed:', error);
        }
      });

      socket.on('thread:participantUpdated', async (data) => {
        try {
          const participant = await deps.prisma.threadParticipant.findFirst({
            where: {
              AND: {
                threadId: data.threadId,
                userId: data.userId,
              }
            },
            include: {
              user: {
                select: userSelect
              },
            },
          });

          if (participant) {
            io.to(data.threadId).emit('thread:participantUpdated', participant);
          }
        } catch (error) {
          console.error('Error handling participant updated:', error);
        }
      });
    }
  };
} 