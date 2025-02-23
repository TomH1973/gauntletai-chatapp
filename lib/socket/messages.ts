import { Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  SocketData,
  SocketServer 
} from '../../types/socket';
import { validateMessage } from '../validation/message';
import { handleSocketError } from '../socketErrors';
import { MessageStatus } from '../../types/message.js';
import { rateLimiter } from '../security/rateLimiter';
import { metrics } from '../metrics';

export interface MessageHandler {
  initialize(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>, userId: string): void;
}

interface MessageHandlerDeps {
  io: SocketServer;
  prisma: PrismaClient;
  metrics: any; // TODO: Add proper metrics type
}

const userSelect = {
  id: true,
  email: true,
  name: true,
} as const;

const REACTION_LIMITS = {
  WINDOW_SIZE: 60, // 1 minute
  MAX_REACTIONS: 10, // Per window
  COOLDOWN: 1000, // 1 second between reactions
};

export function createMessageHandler(io: SocketServer, deps: MessageHandlerDeps): MessageHandler {
  return {
    initialize(socket, userId) {
      socket.on('message:send', async (event) => {
        try {
          // Validate message
          const validationResult = await validateMessage(event, userId);
          if (!validationResult.isValid) {
            socket.emit('error', {
              code: 'INVALID_INPUT',
              message: validationResult.errors?.[0] || 'Invalid message'
            });
            return;
          }

          // Create message with sanitized content
          const message = await deps.prisma.message.create({
            data: {
              content: validationResult.sanitizedContent || event.content,
              threadId: event.threadId,
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
          io.to(event.threadId).emit('message:new', {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            sender: {
              id: message.user.id,
              name: message.user.name,
              email: message.user.email
            },
            threadId: message.threadId,
            tempId: event.tempId
          });

          // Get thread participants
          const participants = await deps.prisma.threadParticipant.findMany({
            where: { threadId: event.threadId },
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

            io.to(event.threadId).emit('message:status', {
              messageId: message.id,
              status: MessageStatus.DELIVERED,
            });
          }
        } catch (error) {
          handleSocketError(socket, error);
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

      socket.on('message:react', async (data) => {
        try {
          // Check rate limits
          const isAllowed = await rateLimiter.checkLimit(userId, {
            key: 'REACTION',
            points: REACTION_LIMITS.MAX_REACTIONS,
            duration: REACTION_LIMITS.WINDOW_SIZE
          });

          if (!isAllowed) {
            socket.emit('error', {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many reactions. Please wait before trying again.'
            });
            return;
          }

          // Get message and verify it exists
          const message = await deps.prisma.message.findUnique({
            where: { id: data.messageId },
            include: {
              thread: {
                include: {
                  participants: {
                    where: { userId },
                  },
                },
              },
              reactions: {
                where: {
                  userId,
                  emoji: data.emoji
                }
              }
            },
          });

          if (!message) {
            socket.emit('error', {
              code: 'MESSAGE_NOT_FOUND',
              message: 'Message not found'
            });
            return;
          }

          // Verify user has access to the thread
          if (!message.thread.participants.length) {
            socket.emit('error', {
              code: 'UNAUTHORIZED',
              message: 'Not authorized to react to this message'
            });
            return;
          }

          // Add or update reaction
          const existingReaction = message.reactions[0];
          let reaction;
          
          if (existingReaction) {
            // Remove reaction if it already exists (toggle behavior)
            await deps.prisma.reaction.delete({
              where: { id: existingReaction.id }
            });
            
            io.to(`thread:${message.threadId}`).emit('message:reaction', {
              messageId: data.messageId,
              emoji: data.emoji,
              removed: true,
              userId
            });
            
            metrics.reactions.inc({ action: 'remove' });
          } else {
            // Add new reaction
            reaction = await deps.prisma.reaction.create({
              data: {
                messageId: data.messageId,
                userId,
                emoji: data.emoji,
              },
            });

            io.to(`thread:${message.threadId}`).emit('message:reaction', {
              messageId: data.messageId,
              emoji: data.emoji,
              userId,
              user: {
                id: userId,
                name: socket.data.user.name
              }
            });

            metrics.reactions.inc({ action: 'add' });
          }

          metrics.reactionProcessingTime.observe(Date.now() - new Date(message.createdAt).getTime());

        } catch (error) {
          console.error('Error handling reaction:', error);
          socket.emit('error', {
            code: 'REACTION_ERROR',
            message: 'Failed to add reaction'
          });
        }
      });
    }
  };
} 