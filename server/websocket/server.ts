import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import { PrismaClient, Message as PrismaMessage, User as PrismaUser, Thread as PrismaThread, Reaction as PrismaReaction, MessageStatus } from '@prisma/client';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { metrics } from '@/lib/metrics';
import { validateMessage } from '@/lib/validation/message';
import { handleSocketError } from '@/lib/socketErrors';
import type { ClientToServerEvents, ServerToClientEvents, SocketData, Message, Thread, MessageReaction, ThreadSettings, SocketServer } from '@/types/socket';
import { fileStorage } from '@/lib/fileStorage';
import { ReactionService } from '@/lib/reactions/reactionService';
import { prisma } from '@/lib/prisma';
import { handleReaction } from './reactionHandler';
import { rateLimit } from '@/lib/rate-limit';
import { SocketErrorCode } from '@/types/socket';
import { handleMessage } from './messageHandler';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { TypingHandler } from './typingHandler';
import { MessageStatusHandler } from './messageStatusHandler';
import { ReactionHandler } from './reactionHandler';

// Initialize services
const app = express();
const httpServer = createServer(app);

// Redis clients for pub/sub
const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subClient = pubClient.duplicate();

// Create Socket.IO server with typed events
const io: SocketServer = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  adapter: createAdapter(pubClient, subClient),
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// State management
const presenceClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const typingHandler = new TypingHandler(io, presenceClient);
const messageStatusHandler = new MessageStatusHandler(io, presenceClient, prisma);
const reactionHandler = new ReactionHandler(io, presenceClient, prisma);
const onlineUsers = new Map<string, Set<string>>();
const lastSeenTimes = new Map<string, string>();

// Constants
const RATE_LIMIT_WINDOW = 60000;
const MAX_MESSAGES_PER_WINDOW = 60;
const MAX_MESSAGE_LENGTH = 5000;
const TYPING_TIMEOUT = 3000;
const PRESENCE_EXPIRY = 30;

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      next(new Error('Authentication required'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
      }
    });

    if (!user) {
      next(new Error('User not found'));
      return;
    }

    socket.data.userId = userId;
    socket.data.threadIds = [];
    socket.data.sessionId = socket.id;

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: { 
        isActive: true,
        lastSeen: new Date(),
        lastLoginAt: new Date()
      }
    });

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Connection handling
io.on('connection', async (socket) => {
  const userId = socket.data.userId;
  if (!userId) {
    socket.disconnect();
    return;
  }

  metrics.activeConnections.inc();

  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    });

    if (!user) {
      socket.emit('error', {
        code: SocketErrorCode.USER_NOT_FOUND,
        message: 'User not found in database',
      });
      socket.disconnect();
      return;
    }

    // Update user's online status
    await prisma.user.update({
      where: { id: userId },
      data: { 
        isActive: true,
        lastSeen: new Date()
      }
    });

    // Add user to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)?.add(socket.id);

    // Join user's threads
    const userThreads = await prisma.threadParticipant.findMany({
      where: { userId },
      select: { threadId: true },
    });

    userThreads.forEach(({ threadId }) => {
      socket.join(`thread:${threadId}`);
    });

    // Broadcast user online status
    socket.broadcast.emit('presence:online', {
      userId: user.id,
      name: user.name,
    });

    // Handle presence events
    socket.on('presence:ping', async () => {
      lastSeenTimes.set(userId, new Date().toISOString());
      socket.emit('presence:pong', {
        onlineUsers: Array.from(onlineUsers.keys()),
        lastSeenTimes: Object.fromEntries(lastSeenTimes),
      });
    });

    // Handle message status events
    socket.on('message:read', async (messageId: string) => {
      try {
        await messageStatusHandler.markAsRead(messageId, userId);
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    socket.on('thread:read', async (threadId: string) => {
      try {
        await messageStatusHandler.markThreadAsRead(threadId, userId);
      } catch (error) {
        console.error('Error marking thread as read:', error);
      }
    });

    // Handle message sending
    socket.on('message:send', async (data) => {
      try {
        const message = await handleMessage(io, socket, data);
        if (message) {
          // Mark as delivered for all online users in thread
          const threadParticipants = await prisma.threadParticipant.findMany({
            where: { threadId: message.threadId },
            select: { userId: true }
          });

          await Promise.all(
            threadParticipants
              .filter(p => p.userId !== userId && onlineUsers.has(p.userId))
              .map(p => messageStatusHandler.markAsDelivered(message.id, p.userId))
          );
        }
      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('error', {
          code: SocketErrorCode.MESSAGE_ERROR,
          message: 'Failed to process message',
        });
      }
    });

    // Handle message editing
    socket.on('message:edit', async (data) => {
      try {
        // Get message and verify ownership
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          include: {
            thread: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!message) {
          socket.emit('error', {
            code: SocketErrorCode.MESSAGE_NOT_FOUND,
            message: 'Message not found',
          });
          return;
        }

        if (message.userId !== userId) {
          socket.emit('error', {
            code: SocketErrorCode.THREAD_ACCESS_DENIED,
            message: 'Not authorized to edit this message',
          });
          return;
        }

        // Validate message content
        const validationResult = await validateMessage({ content: data.content, threadId: message.threadId }, userId);
        if (!validationResult.isValid) {
          socket.emit('error', {
            code: SocketErrorCode.INVALID_INPUT,
            message: validationResult.errors?.[0] || 'Invalid message content',
          });
          return;
        }

        // Create edit history
        const messageEdit = await prisma.messageEdit.create({
          data: {
            messageId: message.id,
            content: message.content,
            editedBy: userId,
          },
        });

        // Update message
        const updatedMessage = await prisma.message.update({
          where: { id: message.id },
          data: {
            content: validationResult.sanitizedContent || data.content,
            updatedAt: new Date(),
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Notify thread participants
        io.to(`thread:${message.threadId}`).emit('message:edited', {
          messageId: message.id,
          content: updatedMessage.content,
          editedAt: updatedMessage.updatedAt,
          editedBy: {
            id: userId,
            name: message.user.name || 'Anonymous',
          },
        });

        metrics.messagesSent.inc({ status: 'edited' });
      } catch (error) {
        console.error('Error editing message:', error);
        handleSocketError(socket, error as Error);
      }
    });

    // Handle message deletion
    socket.on('message:delete', async (data) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          select: {
            threadId: true,
            userId: true,
          }
        });

        if (!message) {
          socket.emit('error', {
            code: SocketErrorCode.MESSAGE_NOT_FOUND,
            message: 'Message not found',
          });
          return;
        }

        if (message.userId !== userId) {
          socket.emit('error', {
            code: SocketErrorCode.PERMISSION_DENIED,
            message: 'Not authorized to delete this message',
          });
          return;
        }

        // Cleanup reactions
        await reactionHandler.cleanup(data.messageId);

        // Delete message
        await prisma.message.delete({
          where: { id: data.messageId },
        });

        // Notify thread participants
        io.to(`thread:${message.threadId}`).emit('message:deleted', {
          messageId: data.messageId,
          threadId: message.threadId,
          deletedAt: new Date(),
          deletedBy: {
            id: userId,
            name: socket.data.username || 'Unknown',
          },
        });
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', {
          code: SocketErrorCode.OPERATION_FAILED,
          message: 'Failed to delete message',
        });
      }
    });

    // Handle message reactions
    socket.on('message:addReaction', async (data) => {
      try {
        await reactionHandler.addReaction(data.messageId, userId, data.reaction);
      } catch (error) {
        console.error('Error adding reaction:', error);
        socket.emit('error', {
          code: SocketErrorCode.OPERATION_FAILED,
          message: 'Failed to add reaction',
        });
      }
    });

    socket.on('message:removeReaction', async (data) => {
      try {
        await reactionHandler.removeReaction(data.messageId, userId, data.reaction);
      } catch (error) {
        console.error('Error removing reaction:', error);
        socket.emit('error', {
          code: SocketErrorCode.OPERATION_FAILED,
          message: 'Failed to remove reaction',
        });
      }
    });

    // Handle typing events
    socket.on('typing:start', async (threadId: string) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true }
        });

        if (user) {
          await typingHandler.startTyping(threadId, userId, user.name);
        }
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });

    socket.on('typing:stop', async (threadId: string) => {
      try {
        await typingHandler.stopTyping(threadId, userId);
      } catch (error) {
        console.error('Error handling typing stop:', error);
      }
    });

    // Handle thread management
    socket.on('thread:join', async (threadId) => {
      try {
        const participant = await prisma.threadParticipant.findFirst({
          where: {
            AND: {
              threadId,
              userId,
            }
          },
        });

        if (participant && !participant.leftAt) {
          socket.join(`thread:${threadId}`);
        }
      } catch (error) {
        console.error('Error joining thread:', error);
      }
    });

    socket.on('thread:leave', (threadId) => {
      socket.leave(`thread:${threadId}`);
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      metrics.activeConnections.dec();

      // Update user's online status
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Remove user from online users
      onlineUsers.get(userId)?.delete(socket.id);
      if (onlineUsers.get(userId)?.size === 0) {
        onlineUsers.delete(userId);
        lastSeenTimes.set(userId, new Date().toISOString());
        socket.broadcast.emit('presence:offline', {
          userId,
          lastSeen: lastSeenTimes.get(userId),
        });
      }

      // Stop typing in all threads
      const userThreads = await prisma.threadParticipant.findMany({
        where: { userId },
        select: { threadId: true }
      });

      await Promise.all([
        ...userThreads.map(({ threadId }) => typingHandler.stopTyping(threadId, userId)),
        // Update last seen time
        prisma.user.update({
          where: { id: userId },
          data: { lastSeen: new Date() }
        })
      ]);
    });

    // Handle file attachments
    socket.on('message:addAttachment', async (data) => {
      try {
        // Get message and verify ownership
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          include: {
            thread: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!message) {
          socket.emit('error', {
            code: SocketErrorCode.MESSAGE_NOT_FOUND,
            message: 'Message not found',
          });
          return;
        }

        // Verify thread participant
        const participant = await prisma.threadParticipant.findUnique({
          where: {
            userId_threadId: {
              userId,
              threadId: message.threadId,
            },
          },
        });

        if (!participant) {
          socket.emit('error', {
            code: SocketErrorCode.THREAD_ACCESS_DENIED,
            message: 'Not a participant of this thread',
          });
          return;
        }

        // Process each file
        for (const file of data.files) {
          // Validate file
          const validation = fileStorage.validateFile(file.name, file.mimeType, file.size);
          if (!validation.isValid) {
            socket.emit('error', {
              code: SocketErrorCode.INVALID_FILE,
              message: validation.error || 'Invalid file',
            });
            continue;
          }

          // Create attachment record
          const attachment = await prisma.attachment.create({
            data: {
              id: file.id,
              filename: file.name,
              fileType: validation.fileType,
              mimeType: file.mimeType,
              size: file.size,
              url: file.url,
              messageId: message.id,
              uploaderId: userId,
            },
            include: {
              uploader: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          // Notify thread participants
          io.to(`thread:${message.threadId}`).emit('message:attachmentAdded', {
            messageId: message.id,
            attachment: {
              id: attachment.id,
              name: attachment.filename,
              type: attachment.fileType.toLowerCase(),
              size: attachment.size,
              mimeType: attachment.mimeType,
              url: attachment.url,
              uploadedBy: {
                id: attachment.uploader.id,
                name: attachment.uploader.name || 'Anonymous',
              },
            },
          });
        }

        metrics.messageAttachments.inc({ type: 'add', count: data.files.length });
      } catch (error) {
        console.error('Error adding attachments:', error);
        handleSocketError(socket, error as Error);
      }
    });

    socket.on('message:removeAttachment', async (data) => {
      try {
        // Get attachment and verify ownership
        const attachment = await prisma.attachment.findUnique({
          where: { id: data.attachmentId },
          include: {
            message: {
              select: {
                threadId: true,
              },
            },
            uploader: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!attachment) {
          socket.emit('error', {
            code: SocketErrorCode.ATTACHMENT_NOT_FOUND,
            message: 'Attachment not found',
          });
          return;
        }

        // Only uploader can remove attachment
        if (attachment.uploaderId !== userId) {
          socket.emit('error', {
            code: SocketErrorCode.UNAUTHORIZED,
            message: 'Not authorized to remove this attachment',
          });
          return;
        }

        // Soft delete attachment
        await prisma.attachment.update({
          where: { id: data.attachmentId },
          data: { isDeleted: true },
        });

        // Schedule physical file deletion
        await fileStorage.deleteAttachment(data.attachmentId, userId);

        // Notify thread participants
        io.to(`thread:${attachment.message.threadId}`).emit('message:attachmentRemoved', {
          messageId: data.messageId,
          attachmentId: data.attachmentId,
          removedBy: {
            id: userId,
            name: attachment.uploader.name || 'Anonymous',
          },
        });

        metrics.messageAttachments.inc({ type: 'remove' });
      } catch (error) {
        console.error('Error removing attachment:', error);
        handleSocketError(socket, error as Error);
      }
    });

    // Handle thread creation
    socket.on('thread:create', async (data) => {
      try {
        // Get user details
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
          },
        });

        if (!user) {
          socket.emit('error', {
            code: SocketErrorCode.USER_NOT_FOUND,
            message: 'User not found',
          });
          return;
        }

        // Create thread with participants
        const thread = await prisma.thread.create({
          data: {
            title: data.title,
            participants: {
              create: [
                // Creator is always OWNER
                {
                  userId,
                  role: 'OWNER',
                },
                // Other participants
                ...data.participants.map(p => ({
                  userId: p.userId,
                  role: p.role,
                })),
              ],
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        // Subscribe creator to thread room
        socket.join(`thread:${thread.id}`);

        // Notify all participants
        const participantIds = thread.participants.map(p => p.userId);
        const participantSockets = await io.fetchSockets();
        
        participantSockets
          .filter(s => participantIds.includes(s.data?.userId))
          .forEach(s => s.join(`thread:${thread.id}`));

        // Emit thread created event
        io.to(`thread:${thread.id}`).emit('thread:created', {
          id: thread.id,
          title: thread.title,
          createdAt: thread.createdAt,
          createdBy: {
            id: userId,
            name: user.name || 'Anonymous',
          },
          participants: thread.participants.map(p => ({
            userId: p.userId,
            role: p.role,
            user: {
              id: p.user.id,
              name: p.user.name || 'Anonymous',
            },
          })),
        });

        // Update metrics
        metrics.threadParticipants.set({ threadId: thread.id }, thread.participants.length);
      } catch (error) {
        console.error('Error creating thread:', error);
        handleSocketError(socket, error as Error);
      }
    });

    // Handle thread participant management
    socket.on('thread:addParticipant', async (data) => {
      try {
        // Verify requester has permission
        const currentParticipant = await prisma.threadParticipant.findUnique({
          where: {
            userId_threadId: {
              userId,
              threadId: data.threadId,
            },
          },
        });

        if (!currentParticipant || currentParticipant.role === 'MEMBER') {
          socket.emit('error', {
            code: SocketErrorCode.UNAUTHORIZED,
            message: 'Not authorized to add participants',
          });
          return;
        }

        // Add new participant
        const participant = await prisma.threadParticipant.create({
          data: {
            threadId: data.threadId,
            userId: data.userId,
            role: data.role,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });

        // Subscribe new participant's sockets to thread room
        const participantSockets = await io.fetchSockets();
        participantSockets
          .filter(s => s.data?.userId === data.userId)
          .forEach(s => s.join(`thread:${data.threadId}`));

        // Notify thread participants
        io.to(`thread:${data.threadId}`).emit('thread:participantAdded', {
          threadId: data.threadId,
          userId: data.userId,
          role: data.role,
          user: participant.user,
        });

        metrics.threadParticipants.inc({ threadId: data.threadId });
      } catch (error) {
        console.error('Error adding participant:', error);
        handleSocketError(socket, error as Error);
      }
    });

    socket.on('thread:removeParticipant', async (data) => {
      try {
        // Verify requester has permission
        const [currentParticipant, targetParticipant] = await Promise.all([
          prisma.threadParticipant.findUnique({
            where: {
              userId_threadId: {
                userId,
                threadId: data.threadId,
              },
            },
          }),
          prisma.threadParticipant.findUnique({
            where: {
              userId_threadId: {
                userId: data.userId,
                threadId: data.threadId,
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          }),
        ]);

        if (!currentParticipant || currentParticipant.role === 'MEMBER') {
          socket.emit('error', {
            code: SocketErrorCode.UNAUTHORIZED,
            message: 'Not authorized to remove participants',
          });
          return;
        }

        // Don't allow removing the last owner
        if (targetParticipant?.role === 'OWNER') {
          const ownerCount = await prisma.threadParticipant.count({
            where: {
              threadId: data.threadId,
              role: 'OWNER',
            },
          });

          if (ownerCount <= 1) {
            socket.emit('error', {
              code: SocketErrorCode.INVALID_OPERATION,
              message: 'Cannot remove the last owner',
            });
            return;
          }
        }

        // Remove participant
        await prisma.threadParticipant.delete({
          where: {
            userId_threadId: {
              userId: data.userId,
              threadId: data.threadId,
            },
          },
        });

        // Unsubscribe participant's sockets from thread room
        const participantSockets = await io.fetchSockets();
        participantSockets
          .filter(s => s.data?.userId === data.userId)
          .forEach(s => s.leave(`thread:${data.threadId}`));

        // Notify thread participants
        io.to(`thread:${data.threadId}`).emit('thread:participantRemoved', {
          threadId: data.threadId,
          userId: data.userId,
          user: targetParticipant?.user,
        });

        metrics.threadParticipants.dec({ threadId: data.threadId });
      } catch (error) {
        console.error('Error removing participant:', error);
        handleSocketError(socket, error as Error);
      }
    });

    socket.on('thread:updateParticipant', async (data) => {
      try {
        // Verify requester has permission (only owners can update roles)
        const [currentParticipant, targetParticipant] = await Promise.all([
          prisma.threadParticipant.findUnique({
            where: {
              userId_threadId: {
                userId,
                threadId: data.threadId,
              },
            },
          }),
          prisma.threadParticipant.findUnique({
            where: {
              userId_threadId: {
                userId: data.userId,
                threadId: data.threadId,
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          }),
        ]);

        if (!currentParticipant || currentParticipant.role !== 'OWNER') {
          socket.emit('error', {
            code: SocketErrorCode.UNAUTHORIZED,
            message: 'Only owners can update participant roles',
          });
          return;
        }

        // Don't allow removing the last owner
        if (targetParticipant?.role === 'OWNER' && data.role !== 'OWNER') {
          const ownerCount = await prisma.threadParticipant.count({
            where: {
              threadId: data.threadId,
              role: 'OWNER',
            },
          });

          if (ownerCount <= 1) {
            socket.emit('error', {
              code: SocketErrorCode.INVALID_OPERATION,
              message: 'Cannot remove the last owner',
            });
            return;
          }
        }

        // Update participant role
        const updatedParticipant = await prisma.threadParticipant.update({
          where: {
            userId_threadId: {
              userId: data.userId,
              threadId: data.threadId,
            },
          },
          data: { role: data.role },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });

        // Notify thread participants
        io.to(`thread:${data.threadId}`).emit('thread:participantUpdated', {
          threadId: data.threadId,
          userId: data.userId,
          role: data.role,
          user: updatedParticipant.user,
        });
      } catch (error) {
        console.error('Error updating participant role:', error);
        handleSocketError(socket, error as Error);
      }
    });

    // Handle thread settings updates
    socket.on('thread:updateSettings', async (data) => {
      try {
        // Verify requester has permission (only owners and admins can update settings)
        const currentParticipant = await prisma.threadParticipant.findUnique({
          where: {
            userId_threadId: {
              userId,
              threadId: data.threadId,
            },
          },
        });

        if (!currentParticipant || !['OWNER', 'ADMIN'].includes(currentParticipant.role)) {
          socket.emit('error', {
            code: SocketErrorCode.UNAUTHORIZED,
            message: 'Not authorized to update thread settings',
          });
          return;
        }

        // Get current thread settings
        const thread = await prisma.thread.findUnique({
          where: { id: data.threadId },
          include: {
            settings: true,
          },
        });

        if (!thread) {
          socket.emit('error', {
            code: SocketErrorCode.THREAD_NOT_FOUND,
            message: 'Thread not found',
          });
          return;
        }

        // Update thread settings
        const updatedThread = await prisma.thread.update({
          where: { id: data.threadId },
          data: {
            settings: {
              upsert: {
                create: {
                  ...data.settings,
                  updatedBy: userId,
                },
                update: {
                  ...data.settings,
                  updatedBy: userId,
                },
              },
            },
          },
          include: {
            settings: true,
            participants: {
              where: { userId },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        // Notify thread participants
        io.to(`thread:${data.threadId}`).emit('thread:settingsUpdated', {
          threadId: data.threadId,
          settings: updatedThread.settings,
          updatedBy: {
            id: userId,
            name: updatedThread.participants[0]?.user?.name || 'Anonymous',
          },
          updatedAt: new Date(),
        });

        metrics.threadUpdates.inc({ type: 'settings' });
      } catch (error) {
        console.error('Error updating thread settings:', error);
        handleSocketError(socket, error as Error);
      }
    });

    socket.on('message:react', async ({ messageId, emoji }) => {
      await handleReaction(socket, messageId, emoji);
    });

  } catch (error) {
    console.error('Error in connection handler:', error);
    socket.disconnect();
  }
});

// Error handling
io.on('error', (error) => {
  console.error('Socket.IO Error:', error);
  metrics.socketErrors.inc();
});

// Start server
const PORT = process.env.SOCKET_PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

export default io; 