import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { metrics } from '@/lib/metrics';
import { validateMessage } from '@/lib/validation/message';
import { SocketErrorCode, handleSocketError } from '@/lib/socketErrors';
import { MessageStatus } from '@/types/message';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@/types/socket';
import { FileStorage } from '@/lib/fileStorage';

// Initialize services
const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

// Create Socket.IO server with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// State management
const onlineUsers = new Map<string, Set<string>>();
const typingUsers = new Map<string, Map<string, { username: string; timestamp: number }>>();
const lastSeenTimes = new Map<string, Date>();
const messageRateLimit = new Map<string, number>();

// Constants
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 60;
const MAX_MESSAGE_LENGTH = 5000;

// Utility function to clean up rate limit entries
const cleanupRateLimits = () => {
  const now = Date.now();
  messageRateLimit.forEach((timestamp, key) => {
    if (now - timestamp > RATE_LIMIT_WINDOW) {
      messageRateLimit.delete(key);
    }
  });
};

// Run cleanup every minute
setInterval(cleanupRateLimits, 60000);

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const session = await clerkClient.sessions.getSession(token);
    if (!session || !session.userId) {
      return next(new Error('Invalid token'));
    }

    socket.data = {
      userId: session.userId,
      sessionId: session.id,
    } as SocketData;

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Connection handling
io.on('connection', async (socket) => {
  const { userId } = socket.data;
  metrics.activeConnections.inc();

  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        profileImage: true,
      },
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
      data: { isActive: true, lastLoginAt: new Date() },
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
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username,
    });

    // Handle presence events
    socket.on('presence:ping', async () => {
      lastSeenTimes.set(userId, new Date());
      socket.emit('presence:pong', {
        onlineUsers: Array.from(onlineUsers.keys()),
        lastSeenTimes: Object.fromEntries(lastSeenTimes),
      });
    });

    // Handle message sending
    socket.on('message:send', async (data) => {
      try {
        // Rate limiting
        const userRate = messageRateLimit.get(userId) || 0;
        if (userRate >= MAX_MESSAGES_PER_WINDOW) {
          socket.emit('error', {
            code: SocketErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Too many messages. Please wait a minute.',
          });
          return;
        }

        // Validate message
        const validationResult = await validateMessage(data, userId);
        if (!validationResult.isValid) {
          socket.emit('error', {
            code: SocketErrorCode.INVALID_INPUT,
            message: validationResult.errors?.[0] || 'Invalid message',
          });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            content: validationResult.sanitizedContent || data.content,
            threadId: data.threadId,
            userId,
            status: MessageStatus.SENT,
            parentId: data.parentId || null,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profileImage: true,
              },
            },
          },
        });

        // Update rate limiting
        messageRateLimit.set(userId, userRate + 1);
        setTimeout(() => {
          const currentRate = messageRateLimit.get(userId) || 0;
          if (currentRate > 0) {
            messageRateLimit.set(userId, currentRate - 1);
          }
        }, RATE_LIMIT_WINDOW);

        // Emit new message to thread
        io.to(`thread:${data.threadId}`).emit('message:new', {
          ...message,
          tempId: data.tempId,
          user: message.user,
        });

        // Handle delivery status
        const participants = await prisma.threadParticipant.findMany({
          where: { threadId: data.threadId },
          select: { userId: true },
        });

        const onlineParticipants = participants
          .map(p => p.userId)
          .filter(id => id !== userId && onlineUsers.has(id));

        if (onlineParticipants.length > 0) {
          await prisma.message.update({
            where: { id: message.id },
            data: { status: MessageStatus.DELIVERED },
          });

          io.to(`thread:${data.threadId}`).emit('message:status', {
            messageId: message.id,
            status: MessageStatus.DELIVERED,
          });
        }

        metrics.messagesSent.inc({ status: 'success' });
      } catch (error) {
        metrics.messagesSent.inc({ status: 'error' });
        handleSocketError(socket, error as Error);
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
            message: 'Not authorized to delete this message',
          });
          return;
        }

        // Soft delete the message
        const deletedMessage = await prisma.message.update({
          where: { id: message.id },
          data: {
            deletedAt: new Date(),
            content: '[Message deleted]', // Optional: replace content for privacy
          },
        });

        // Notify thread participants
        io.to(`thread:${message.threadId}`).emit('message:deleted', {
          messageId: message.id,
          threadId: message.threadId,
          deletedAt: deletedMessage.deletedAt,
          deletedBy: {
            id: userId,
            name: message.user.name || 'Anonymous',
          },
        });

        metrics.messagesSent.inc({ status: 'deleted' });
      } catch (error) {
        console.error('Error deleting message:', error);
        handleSocketError(socket, error as Error);
      }
    });

    // Handle message reactions
    socket.on('message:addReaction', async (data) => {
      try {
        // Get message and verify it exists
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

        // Verify user is a thread participant
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

        // Add reaction
        const reaction = await prisma.messageReaction.create({
          data: {
            messageId: data.messageId,
            userId,
            emoji: data.emoji,
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
        io.to(`thread:${message.threadId}`).emit('message:reactionAdded', {
          messageId: message.id,
          emoji: reaction.emoji,
          userId: reaction.userId,
          user: {
            id: reaction.user.id,
            name: reaction.user.name || 'Anonymous',
          },
          createdAt: reaction.createdAt,
        });

        metrics.messageReactions.inc({ type: 'add' });
      } catch (error) {
        if (error.code === 'P2002') { // Unique constraint violation
          // Ignore duplicate reactions
          return;
        }
        console.error('Error adding reaction:', error);
        handleSocketError(socket, error as Error);
      }
    });

    socket.on('message:removeReaction', async (data) => {
      try {
        // Get reaction and verify ownership
        const reaction = await prisma.messageReaction.findUnique({
          where: {
            messageId_userId_emoji: {
              messageId: data.messageId,
              userId,
              emoji: data.emoji,
            },
          },
          include: {
            message: {
              select: {
                threadId: true,
              },
            },
          },
        });

        if (!reaction) {
          socket.emit('error', {
            code: SocketErrorCode.MESSAGE_NOT_FOUND,
            message: 'Reaction not found',
          });
          return;
        }

        // Delete reaction
        await prisma.messageReaction.delete({
          where: {
            messageId_userId_emoji: {
              messageId: data.messageId,
              userId,
              emoji: data.emoji,
            },
          },
        });

        // Notify thread participants
        io.to(`thread:${reaction.message.threadId}`).emit('message:reactionRemoved', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId,
        });

        metrics.messageReactions.inc({ type: 'remove' });
      } catch (error) {
        console.error('Error removing reaction:', error);
        handleSocketError(socket, error as Error);
      }
    });

    // Handle message read status
    socket.on('message:read', async (messageId) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: { thread: true },
        });

        if (!message) return;

        await prisma.message.update({
          where: { id: messageId },
          data: { status: MessageStatus.READ },
        });

        io.to(`thread:${message.threadId}`).emit('message:status', {
          messageId,
          status: MessageStatus.READ,
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing:start', async (threadId) => {
      try {
        if (!typingUsers.has(threadId)) {
          typingUsers.set(threadId, new Map());
        }

        typingUsers.get(threadId)?.set(userId, {
          username: user.username || 'Anonymous',
          timestamp: Date.now(),
        });

        const currentTypingUsers = Array.from(typingUsers.get(threadId)?.entries() || [])
          .map(([id, data]) => ({
            id,
            username: data.username,
          }));

        io.to(`thread:${threadId}`).emit('typing:update', {
          threadId,
          users: currentTypingUsers,
        });

        // Clean up typing status after 3 seconds
        setTimeout(() => {
          const threadTyping = typingUsers.get(threadId);
          if (threadTyping?.has(userId)) {
            const timestamp = threadTyping.get(userId)?.timestamp;
            if (timestamp && Date.now() - timestamp >= 3000) {
              threadTyping.delete(userId);
              
              const updatedTypingUsers = Array.from(threadTyping.entries())
                .map(([id, data]) => ({
                  id,
                  username: data.username,
                }));

              io.to(`thread:${threadId}`).emit('typing:update', {
                threadId,
                users: updatedTypingUsers,
              });
            }
          }
        }, 3000);
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });

    socket.on('typing:stop', (threadId) => {
      try {
        typingUsers.get(threadId)?.delete(userId);

        const currentTypingUsers = Array.from(typingUsers.get(threadId)?.entries() || [])
          .map(([id, data]) => ({
            id,
            username: data.username,
          }));

        io.to(`thread:${threadId}`).emit('typing:update', {
          threadId,
          users: currentTypingUsers,
        });
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
    socket.on('disconnect', async () => {
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
        lastSeenTimes.set(userId, new Date());
        socket.broadcast.emit('presence:offline', {
          userId,
          lastSeen: lastSeenTimes.get(userId),
        });
      }

      // Remove user from all typing lists
      for (const [threadId, threadTyping] of typingUsers.entries()) {
        if (threadTyping.has(userId)) {
          threadTyping.delete(userId);
          
          const updatedTypingUsers = Array.from(threadTyping.entries())
            .map(([id, data]) => ({
              id,
              username: data.username,
            }));

          io.to(`thread:${threadId}`).emit('typing:update', {
            threadId,
            users: updatedTypingUsers,
          });
        }
      }
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
          const validation = FileStorage.validateFile(file.name, file.mimeType, file.size);
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
        await FileStorage.deleteAttachment(data.attachmentId, userId);

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

  } catch (error) {
    console.error('Connection error:', error);
    socket.emit('error', {
      code: SocketErrorCode.CONNECTION_ERROR,
      message: 'Failed to connect to the server',
    });
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