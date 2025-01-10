import { io, Socket } from 'socket.io-client';
import { ReactionService } from '../services/reactionService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL ?? '', {
  autoConnect: false,
  withCredentials: true,
});

export const connectSocket = (userId: string) => {
  socket.auth = { userId };
  socket.connect();
};

// Handle reactions
socket.on('message:react', async ({ messageId, emoji }) => {
  try {
    await ReactionService.addReaction(messageId, socket.data.userId, emoji);
    const reaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: socket.data.userId,
          emoji
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    if (reaction) {
      // Get thread participants to broadcast to
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { threadId: true }
      });

      if (message) {
        const participants = await prisma.threadParticipant.findMany({
          where: { threadId: message.threadId },
          select: { userId: true }
        });

        // Broadcast to all participants
        participants.forEach(({ userId }) => {
          const userSocket = getUserSocket(userId);
          if (userSocket) {
            userSocket.emit('message:reaction', {
              messageId,
              reaction: {
                id: reaction.id,
                emoji: reaction.emoji,
                userId: reaction.userId,
                messageId: reaction.messageId
              }
            });
          }
        });
      }
    }
  } catch (error) {
    socket.emit('error', {
      code: 'REACTION_ERROR',
      message: 'Failed to add reaction'
    });
  }
});

socket.on('message:react:remove', async ({ messageId, emoji }) => {
  try {
    await ReactionService.removeReaction(messageId, socket.data.userId, emoji);
    
    // Get thread participants to broadcast to
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { threadId: true }
    });

    if (message) {
      const participants = await prisma.threadParticipant.findMany({
        where: { threadId: message.threadId },
        select: { userId: true }
      });

      // Broadcast to all participants
      participants.forEach(({ userId }) => {
        const userSocket = getUserSocket(userId);
        if (userSocket) {
          userSocket.emit('message:reaction:removed', {
            messageId,
            reaction: {
              emoji,
              userId: socket.data.userId,
              messageId
            }
          });
        }
      });
    }
  } catch (error) {
    socket.emit('error', {
      code: 'REACTION_ERROR',
      message: 'Failed to remove reaction'
    });
  }
}); 