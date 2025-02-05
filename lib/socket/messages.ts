import { Socket, Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../types/chat.js';
import { validateMessage } from '../validation/message.js';
import { SocketErrorCode, handleSocketError } from '../socketErrors.js';
import { MessageStatus } from '../../types/message.js';

export interface MessageHandler {
  initialize(socket: Socket<ClientToServerEvents, ServerToClientEvents>, userId: string): void;
}

interface MessageHandlerDeps {
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  prisma: PrismaClient;
  metrics: any; // TODO: Add proper metrics type
}

const userSelect = {
  id: true,
  email: true,
  name: true,
} as const;

export function createMessageHandler(io: Server<ClientToServerEvents, ServerToClientEvents>, deps: MessageHandlerDeps): MessageHandler {
  return {
    initialize(socket, userId) {
      socket.on('message:send', async (data) => {
        try {
          // Validate message
          const validationResult = await validateMessage(data, userId);
          if (!validationResult.isValid) {
            socket.emit('error', {
              code: SocketErrorCode.INVALID_INPUT,
              message: validationResult.errors?.[0] || 'Invalid message'
            });
            return;
          }

          // Create message with sanitized content
          const message = await deps.prisma.message.create({
            data: {
              content: validationResult.sanitizedContent || data.content,
              threadId: data.threadId,
              userId,
              status: MessageStatus.SENT,
            },
            include: {
              user: {
                select: userSelect
              },
            },
          });

          // Emit new message to thread
          io.to(data.threadId).emit('message:new', {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            sender: {
              id: message.user.id,
              name: message.user.name,
              email: message.user.email
            },
            threadId: message.threadId,
            tempId: data.tempId
          });

          // Get thread participants
          const participants = await deps.prisma.threadParticipant.findMany({
            where: { threadId: data.threadId },
            select: { userId: true },
          });

          // Mark as delivered for online participants
          const onlineParticipants = participants
            .map(p => p.userId)
            .filter(id => id !== userId && socket.rooms.has(`user_${id}`));

          if (onlineParticipants.length > 0) {
            await deps.prisma.message.update({
              where: { id: message.id },
              data: { status: MessageStatus.DELIVERED },
            });

            io.to(data.threadId).emit('message:status', {
              messageId: message.id,
              status: MessageStatus.DELIVERED,
            });
          }
        } catch (error) {
          handleSocketError(socket, error as Error);
        }
      });

      socket.on('message:read', async (messageId) => {
        try {
          const message = await deps.prisma.message.findUnique({
            where: { id: messageId },
            include: { thread: true },
          });

          if (!message) return;

          await deps.prisma.message.update({
            where: { id: messageId },
            data: { status: MessageStatus.READ },
          });

          io.to(message.threadId).emit('message:status', {
            messageId,
            status: MessageStatus.READ,
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });
    }
  };
} 