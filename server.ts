import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import { prisma } from './lib/prisma';
import { MessageStatus } from '@prisma/client';
import type { ClientToServerEvents, ServerToClientEvents } from './types/chat';
import { validateMessage } from '@/lib/validation/message';
import { SocketErrorCode, handleSocketError } from '@/lib/socketErrors';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

// Track online users and typing users
const onlineUsers = new Map<string, Set<string>>();
const typingUsers = new Map<string, Map<string, { username: string; timestamp: number }>>();
const lastSeenTimes = new Map<string, Date>();

io.on('connection', async (socket) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    socket.disconnect();
    return;
  }

  // Add user to online users
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)?.add(socket.id);

  // Broadcast user online status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true }
  });

  if (user) {
    socket.broadcast.emit('presence:online', {
      userId: user.id,
      name: user.name
    });
  }

  // Join user's room for direct messages
  socket.join(`user_${userId}`);

  // Handle presence events
  socket.on('presence:ping', async () => {
    lastSeenTimes.set(userId, new Date());
    socket.emit('presence:pong', {
      onlineUsers: Array.from(onlineUsers.keys()),
      lastSeenTimes: Object.fromEntries(lastSeenTimes)
    });
  });

  // Handle message sending
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
              name: true,
              image: true,
            },
          },
        },
      });

      // Emit new message to thread
      io.to(data.threadId).emit('message:new', {
        ...message,
        tempId: data.tempId,
        user: message.user
      });

      // Get thread participants
      const participants = await prisma.threadParticipant.findMany({
        where: { threadId: data.threadId },
        select: { userId: true },
      });

      // Mark as delivered for online participants
      const onlineParticipants = participants
        .map(p => p.userId)
        .filter(id => id !== userId && onlineUsers.has(id));

      if (onlineParticipants.length > 0) {
        await prisma.message.update({
          where: { id: message.id },
          data: { status: 'DELIVERED' as const },
        });

        io.to(data.threadId).emit('message:status', {
          messageId: message.id,
          status: 'DELIVERED' as const,
        });
      }
    } catch (error) {
      handleSocketError(socket, error as Error);
    }
  });

  // Handle message read
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

      io.to(message.threadId).emit('message:status', {
        messageId,
        status: 'READ' as const,
      });
      } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // Handle thread participant events
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
        socket.join(threadId);
      }
    } catch (error) {
      console.error('Error joining thread:', error);
    }
  });

  socket.on('thread:leave', (threadId) => {
    socket.leave(threadId);
  });

  // Handle participant added event
  socket.on('thread:participantAdded', async (data) => {
    try {
      const participant = await prisma.threadParticipant.findFirst({
        where: {
          AND: {
            threadId: data.threadId,
            userId: data.userId,
          }
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

      if (participant) {
        io.to(data.threadId).emit('thread:participantAdded', participant);
      }
    } catch (error) {
      console.error('Error handling participant added:', error);
    }
  });

  // Handle participant removed event
  socket.on('thread:participantRemoved', async (data) => {
    try {
      io.to(data.threadId).emit('thread:participantRemoved', {
        threadId: data.threadId,
        userId: data.userId,
      });
      } catch (error) {
      console.error('Error handling participant removed:', error);
    }
  });

  // Handle participant role updated event
  socket.on('thread:participantUpdated', async (data) => {
    try {
      const participant = await prisma.threadParticipant.findFirst({
        where: {
          AND: {
            threadId: data.threadId,
            userId: data.userId,
          }
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

      if (participant) {
        io.to(data.threadId).emit('thread:participantUpdated', participant);
      }
    } catch (error) {
      console.error('Error handling participant updated:', error);
    }
  });

  // Handle typing events
  socket.on('typing:start', async (threadId) => {
    try {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      });

      if (!user) return;

      // Initialize typing users map for thread if it doesn't exist
      if (!typingUsers.has(threadId)) {
        typingUsers.set(threadId, new Map());
      }

      // Add user to typing users
      typingUsers.get(threadId)?.set(userId, {
        username: user.name || 'Anonymous',
        timestamp: Date.now(),
      });

      // Emit typing update to thread
      const currentTypingUsers = Array.from(typingUsers.get(threadId)?.entries() || [])
        .map(([id, data]) => ({
          id,
          username: data.username,
        }));

      io.to(threadId).emit('typing:update', {
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
            
            // Emit updated typing users
            const updatedTypingUsers = Array.from(threadTyping.entries())
              .map(([id, data]) => ({
                id,
                username: data.username,
              }));

            io.to(threadId).emit('typing:update', {
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
      // Remove user from typing users
      typingUsers.get(threadId)?.delete(userId);

      // Emit typing update to thread
      const currentTypingUsers = Array.from(typingUsers.get(threadId)?.entries() || [])
        .map(([id, data]) => ({
          id,
          username: data.username,
        }));

      io.to(threadId).emit('typing:update', {
        threadId,
        users: currentTypingUsers,
      });
      } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove user from online users
    onlineUsers.get(userId)?.delete(socket.id);
    if (onlineUsers.get(userId)?.size === 0) {
      onlineUsers.delete(userId);
      lastSeenTimes.set(userId, new Date());
      socket.broadcast.emit('presence:offline', {
        userId,
        lastSeen: lastSeenTimes.get(userId)
      });
    }

    // Remove user from all typing lists
    for (const [threadId, threadTyping] of typingUsers.entries()) {
      if (threadTyping.has(userId)) {
        threadTyping.delete(userId);
        
        // Emit updated typing users
        const updatedTypingUsers = Array.from(threadTyping.entries())
          .map(([id, data]) => ({
            id,
            username: data.username,
          }));

        io.to(threadId).emit('typing:update', {
          threadId,
          users: updatedTypingUsers,
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 