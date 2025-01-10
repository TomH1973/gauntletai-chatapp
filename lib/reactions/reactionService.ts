import { prisma } from '../prisma';
import { ResourceIsolation } from '../auth/resourceIsolation';

/**
 * @class ReactionService
 * @description Service class for managing message reactions with access control
 * 
 * Features:
 * - Add/remove reactions
 * - Access control validation
 * - Reaction aggregation
 * - User reaction tracking
 */
export class ReactionService {
  /**
   * @method addReaction
   * @description Adds a reaction to a message with access control
   * 
   * @param {string} messageId - ID of the message to react to
   * @param {string} userId - ID of the user adding the reaction
   * @param {string} emoji - Emoji to add as reaction
   * @returns {Promise<void>}
   * @throws {Error} If message not found or user lacks access
   */
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

  /**
   * @method removeReaction
   * @description Removes a reaction from a message
   * 
   * @param {string} messageId - ID of the message to remove reaction from
   * @param {string} userId - ID of the user removing the reaction
   * @param {string} emoji - Emoji to remove
   * @returns {Promise<void>}
   * @throws {Error} If reaction not found
   */
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

  /**
   * @method getMessageReactions
   * @description Gets all reactions for a message with user details
   * 
   * @param {string} messageId - ID of the message to get reactions for
   * @returns {Promise<Array<{emoji: string; count: number; users: Array<{id: string; name: string | null}>}>>}
   * @throws {Error} If operation fails
   */
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

  /**
   * @algorithm Reaction Aggregation
   * 1. Group Reactions
   *    - Group by emoji
   *    - Count occurrences
   *    - Sort by popularity
   * 
   * 2. User Details
   *    - Find reacting users
   *    - Get user metadata
   * 
   * 3. Response Format
   *    - Combine counts and users
   *    - Format for client
   */
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