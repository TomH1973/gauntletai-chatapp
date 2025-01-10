import { prisma } from '../prisma';
import { ResourceIsolation } from '../auth/resourceIsolation';

export class ReactionService {
  // Add a reaction to a message
  static async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    // Validate thread access
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { threadId: true }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    const hasAccess = await ResourceIsolation.validateThreadAccess(
      message.threadId,
      userId
    );

    if (!hasAccess) {
      throw new Error('Access denied to message');
    }

    // Create reaction (will fail if duplicate due to unique constraint)
    await prisma.reaction.create({
      data: {
        emoji,
        messageId,
        userId
      }
    });
  }

  // Remove a reaction from a message
  static async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    await prisma.reaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      }
    });
  }

  // Get all reactions for a message
  static async getMessageReactions(messageId: string): Promise<{
    emoji: string;
    count: number;
    users: { id: string; name: string | null }[];
  }[]> {
    const reactions = await prisma.reaction.groupBy({
      by: ['emoji'],
      where: { messageId },
      _count: true,
      orderBy: {
        _count: {
          emoji: 'desc'
        }
      }
    });

    const reactionDetails = await Promise.all(
      reactions.map(async (reaction) => {
        const users = await prisma.user.findMany({
          where: {
            reactions: {
              some: {
                messageId,
                emoji: reaction.emoji
              }
            }
          },
          select: {
            id: true,
            name: true
          }
        });

        return {
          emoji: reaction.emoji,
          count: reaction._count,
          users
        };
      })
    );

    return reactionDetails;
  }

  // Get reactions summary for multiple messages
  static async getReactionsSummary(messageIds: string[]): Promise<{
    [messageId: string]: { emoji: string; count: number }[];
  }> {
    const reactions = await prisma.reaction.groupBy({
      by: ['messageId', 'emoji'],
      where: {
        messageId: {
          in: messageIds
        }
      },
      _count: true
    });

    const summary = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.messageId]) {
        acc[reaction.messageId] = [];
      }

      acc[reaction.messageId].push({
        emoji: reaction.emoji,
        count: reaction._count
      });

      return acc;
    }, {} as { [messageId: string]: { emoji: string; count: number }[] });

    return summary;
  }
} 