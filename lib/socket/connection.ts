import { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../types/chat.js';
import type { PresenceManager } from './presence.js';
import type { MessageHandler } from './messages.js';
import type { ThreadHandler } from './threads.js';
import type { TypingHandler } from './typing.js';
import { PrismaClient } from '@prisma/client';

interface ConnectionDependencies {
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  presenceManager: PresenceManager;
  messageHandler: MessageHandler;
  threadHandler: ThreadHandler;
  typingHandler: TypingHandler;
  prisma: PrismaClient;
  metrics: any; // TODO: Add proper metrics type
}

export async function handleConnection(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
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