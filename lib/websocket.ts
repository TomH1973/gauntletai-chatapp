import { Server } from 'socket.io';
import { createServer } from 'http';
import { instrument } from '@socket.io/admin-ui';
import { createReconnectionManager } from './reconnection';
import { WebSocketHandlers } from './handlers/websocket';
import { logger } from './logger';
import { metrics } from './metrics';

export const createWebSocketServer = (httpServer: ReturnType<typeof createServer>) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  });

  const reconnectionManager = createReconnectionManager(io);
  const handlers = new WebSocketHandlers(reconnectionManager);

  // Socket.IO admin UI setup
  if (process.env.NODE_ENV === 'development') {
    instrument(io, {
      auth: false,
      mode: 'development',
    });
  }

  // Middleware for authentication and metrics
  io.use(async (socket, next) => {
    const start = Date.now();
    try {
      const userId = socket.handshake.headers['x-user-id'];
      if (!userId) {
        return next(new Error('Authentication failed'));
      }
      
      socket.data.user = { id: userId as string };
      socket.data.deviceId = socket.handshake.headers['x-device-id'] as string;
      
      metrics.connectionSetupTime.observe((Date.now() - start) / 1000);
      next();
    } catch (error) {
      logger.error('Socket middleware error', { error });
      metrics.errors.inc({ type: 'auth' });
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    try {
      // Handle initial connection and potential reconnection
      await handlers.handleConnection(socket);

      // Handle state verification requests
      socket.on('state:verify', async ({ threadId }) => {
        await handlers.handleStateVerification(socket, threadId);
      });

      // Handle thread events
      socket.on('thread:join', async ({ threadId }) => {
        await handlers.handleThreadJoin(socket, threadId);
      });

      socket.on('thread:leave', async ({ threadId }) => {
        await handlers.handleThreadLeave(socket, threadId);
      });

      // Handle message events
      socket.on('message:send', async (message) => {
        await handlers.handleMessageSend(socket, message);
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        await handlers.handleDisconnect(socket);
      });

    } catch (error) {
      logger.error('Socket event handling error', { error });
      metrics.errors.inc({ type: 'socket_setup' });
    }
  });

  return io;
}; 