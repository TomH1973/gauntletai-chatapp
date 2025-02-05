import { Socket } from 'socket.io';
import { prisma } from '@/lib/prisma';
import { ReactionService } from '@/lib/reactions/reactionService';
import { SocketErrorCode } from '@/types/socket';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@/types/socket';

export async function handleReaction(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  messageId: string,
  emoji: string
) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { reactions: true }
    });

    if (!message) {
      socket.emit('error', { code: SocketErrorCode.MESSAGE_NOT_FOUND, message: 'Message not found' });
      return;
    }

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_emoji: {
          messageId,
          emoji
        }
      }
    });

    if (existingReaction) {
      // User has already reacted - remove their reaction
      if (existingReaction.users.includes(socket.data.userId)) {
        await ReactionService.removeReaction(messageId, socket.data.userId, emoji);
      } else {
        // Add user's reaction
        const updatedUsers = [...existingReaction.users, socket.data.userId];
        await prisma.reaction.update({
          where: { id: existingReaction.id },
          data: {
            users: updatedUsers,
            count: updatedUsers.length
          }
        });
      }
    } else {
      // Create new reaction
      await ReactionService.addReaction(messageId, socket.data.userId, emoji);
    }

    // Get updated message with reactions
    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        reactions: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Broadcast updated message to thread
    socket.to(message.threadId).emit('message:reactionUpdated', {
      messageId,
      reactions: updatedMessage?.reactions || []
    });

  } catch (error) {
    console.error('Error handling reaction:', error);
    socket.emit('error', { 
      code: SocketErrorCode.REACTION_FAILED,
      message: 'Failed to handle reaction'
    });
  }
} 