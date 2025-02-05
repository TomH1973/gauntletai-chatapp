import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../types/chat';
import { handleConnection } from './connection';
import { createPresenceManager } from './presence';
import { createMessageHandler } from './messages';
import { createThreadHandler } from './threads';
import { createTypingHandler } from './typing';

interface SocketServerDependencies {
  prisma: PrismaClient;
  metrics: any;
}

export function initializeSocketServer(
  httpServer: HttpServer,
  deps: SocketServerDependencies
) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
  const presenceManager = createPresenceManager(io);
  const messageHandler = createMessageHandler(io, { ...deps, io });
  const threadHandler = createThreadHandler(io, { ...deps, io });
  const typingHandler = createTypingHandler(io);

  io.on('connection', (socket) => {
    handleConnection(socket, {
      io,
      presenceManager,
      messageHandler,
      threadHandler,
      typingHandler,
      ...deps
    });
  });

  return io;
} 