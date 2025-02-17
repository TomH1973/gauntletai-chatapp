import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/chat.js';
import { handleConnection } from './socket/connection.js';
import { createPresenceManager } from './socket/presence.js';
import { createMessageHandler } from './socket/messages.js';
import { createThreadHandler } from './socket/threads.js';
import { createTypingHandler } from './socket/typing.js';

interface SocketServerDependencies {
  prisma: PrismaClient;
  metrics: any; // TODO: Add proper metrics type
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