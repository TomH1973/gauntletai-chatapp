import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/chat';
import { handleConnection } from './socket/connection';
import { createPresenceManager } from './socket/presence';
import { createMessageHandler } from './socket/messages';
import { createThreadHandler } from './socket/threads';
import { createTypingHandler } from './socket/typing';
import { createRedisClient, createDuplicateClient } from './redis';
import { logger } from './logger';

interface SocketServerDependencies {
  prisma: PrismaClient;
  metrics: any; // TODO: Add proper metrics type
  redis?: Redis;
}

export function initializeSocketServer(
  httpServer: HttpServer,
  deps: SocketServerDependencies
) {
  // Use the centralized Redis client or create a new one
  const redis = createRedisClient();
  const pubClient = createDuplicateClient();
  const subClient = createDuplicateClient();

  logger.info('Initializing Socket.IO server with Redis adapter');

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
    adapter: createAdapter(pubClient, subClient),
    pingTimeout: 10000,
    pingInterval: 5000,
  });
  
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