import { Socket } from 'socket.io';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  SocketData,
  SocketServer
} from '../../types/socket';
import type { PresenceManager } from './presence';
import type { MessageHandler } from './messages';
import type { ThreadHandler } from './threads';
import type { TypingHandler } from './typing';
import { PrismaClient } from '@prisma/client';

interface ConnectionDependencies {
  io: SocketServer;
  presenceManager: PresenceManager;
  messageHandler: MessageHandler;
  threadHandler: ThreadHandler;
  typingHandler: TypingHandler;
  prisma: PrismaClient;
  metrics: any; // TODO: Add proper metrics type
}

export async function handleConnection(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  deps: ConnectionDependencies
) {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    socket.disconnect();
    return;
  }

  // Initialize handlers with socket instance
  deps.presenceManager.handleConnection(socket, userId);
  deps.messageHandler.initialize(socket, userId);
  deps.threadHandler.initialize(socket, userId);
  deps.typingHandler.initialize(socket, userId);

  // Handle disconnection
  socket.on('disconnect', () => {
    deps.presenceManager.handleDisconnection(socket, userId);
    deps.typingHandler.handleDisconnection(userId);
  });
} 