import { Server } from 'socket.io';
import { handleMessage, createRedisAdapter, userPresence } from './messageHandler';

interface ServerToClientEvents {
  'message:new': (message: any) => void;
  'error': (error: { code: string; message: string }) => void;
  'presence:online': (userId: string) => void;
  'presence:offline': (userId: string) => void;
  'presence:join': (data: { userId: string; threadId: string }) => void;
  'presence:leave': (data: { userId: string; threadId: string }) => void;
  'reconnect': () => void;
  'reconnect_error': (error: Error) => void;
  'reconnect_failed': () => void;
}

interface ClientToServerEvents {
  'message:send': (data: {
    content: string;
    threadId: string;
    parentId?: string;
    tempId?: string;
  }) => void;
  'presence:join': (threadId: string) => void;
  'presence:leave': (threadId: string) => void;
  'presence:ping': () => void;
}

interface SocketData {
  userId: string;
  activeThreads: Set<string>;
}

export function createWebSocketServer(httpServer: any) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  // Set up Redis adapter
  io.adapter(createRedisAdapter());

  // Middleware to handle authentication
  io.use((socket, next) => {
    const userId = socket.data.userId;
    if (!userId) {
      next(new Error('Authentication failed'));
      return;
    }
    socket.data.activeThreads = new Set();
    next();
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    if (!userId) {
      socket.disconnect();
      return;
    }

    try {
      // Handle user presence
      await userPresence.userJoined(userId, socket.id);
      io.emit('presence:online', userId);

      // Handle thread presence
      socket.on('presence:join', async (threadId) => {
        socket.data.activeThreads.add(threadId);
        socket.join(threadId);
        io.to(threadId).emit('presence:join', { userId, threadId });
      });

      socket.on('presence:leave', async (threadId) => {
        socket.data.activeThreads.delete(threadId);
        socket.leave(threadId);
        io.to(threadId).emit('presence:leave', { userId, threadId });
      });

      // Handle messages
      socket.on('message:send', async (data) => {
        try {
          await handleMessage(io, socket, data);
        } catch (error) {
          console.error('Error handling message:', error);
          socket.emit('error', {
            code: 'MESSAGE_ERROR',
            message: 'Failed to process message',
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        try {
          // Leave all active threads
          for (const threadId of socket.data.activeThreads) {
            io.to(threadId).emit('presence:leave', { userId, threadId });
          }
          socket.data.activeThreads.clear();

          await userPresence.userLeft(userId, socket.id);
          const isStillOnline = await userPresence.isUserOnline(userId);
          if (!isStillOnline) {
            io.emit('presence:offline', userId);
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });

      // Handle periodic presence checks
      socket.on('presence:ping', async () => {
        try {
          const isOnline = await userPresence.isUserOnline(userId);
          if (!isOnline) {
            await userPresence.userJoined(userId, socket.id);
            io.emit('presence:online', userId);
          }
        } catch (error) {
          console.error('Error handling presence ping:', error);
        }
      });

    } catch (error) {
      console.error('Error in connection handler:', error);
      socket.disconnect();
    }
  });

  return io;
} 