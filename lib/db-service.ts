import { prisma } from './prisma';
import { safeDbOperation, withErrorHandling } from './db-errors';
import { validateCreateMessage, validateUpdateMessage, sanitizeMessageContent } from './validation/message';
import type { Message, Thread, User } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/**
 * @class DatabaseService
 * @description Service class for handling database operations with error handling and validation
 * 
 * Features:
 * - Message CRUD operations
 * - Thread management
 * - User operations
 * - Transaction support
 * - Batch operations
 * - Data cleanup
 */
export class DatabaseService {
  /**
   * @method createMessage
   * @description Creates a new message with content validation and sanitization
   * 
   * @param {Prisma.MessageCreateInput} data - Message creation data
   * @returns {Promise<Message>} Created message
   * @throws {Error} If message creation fails or validation fails
   */
  async createMessage(data: Prisma.MessageCreateInput): Promise<Message> {
    return safeDbOperation(async () => {
      // Validate and sanitize the message content
      const validatedData = validateCreateMessage({
        content: data.content,
        threadId: data.thread.connect?.id,
        parentId: data.parent?.connect?.id,
      });

      return prisma.message.create({
        data: {
          ...data,
          content: sanitizeMessageContent(validatedData.content),
        },
      });
    }, 'Failed to create message');
  }

  /**
   * @method updateMessage
   * @description Updates a message with permission checks and edit history
   * 
   * @param {string} id - Message ID
   * @param {Prisma.MessageUpdateInput} data - Update data
   * @param {string} userId - ID of user making the update
   * @returns {Promise<Message>} Updated message
   * @throws {Error} If message not found, user not authorized, or update fails
   */
  async updateMessage(
    id: string,
    data: Prisma.MessageUpdateInput,
    userId: string
  ): Promise<Message> {
    return withErrorHandling(async () => {
      // First, verify the user has permission to edit this message
      const message = await prisma.message.findUnique({
        where: { id },
        select: { userId: true, content: true }
      });

      if (!message) {
        throw new Error('Message not found');
      }

      if (message.userId !== userId) {
        throw new Error('Not authorized to edit this message');
      }

      // Validate the update data
      if (typeof data.content === 'string') {
        const validatedData = validateUpdateMessage({
          content: data.content,
          messageId: id,
        });
        data.content = sanitizeMessageContent(validatedData.content);
      }

      // Create message edit history
      await prisma.messageEdit.create({
        data: {
          message: { connect: { id } },
          content: message.content,
          editor: { connect: { id: userId } }
        }
      });

      // Update the message
      return prisma.message.update({
        where: { id },
        data: {
          ...data,
          isEdited: true
        }
      });
    });
  }

  /**
   * @method createThread
   * @description Creates a new thread
   * 
   * @param {Prisma.ThreadCreateInput} data - Thread creation data
   * @returns {Promise<Thread>} Created thread
   * @throws {Error} If thread creation fails
   */
  async createThread(data: Prisma.ThreadCreateInput): Promise<Thread> {
    return safeDbOperation(
      () => prisma.thread.create({ data }),
      'Failed to create thread'
    );
  }

  /**
   * @method addThreadParticipant
   * @description Adds a participant to a thread with role
   * 
   * @param {string} threadId - Thread ID
   * @param {string} userId - User ID to add
   * @param {Prisma.ParticipantRole} role - Role to assign
   * @returns {Promise<ThreadParticipant>} Created/updated participant
   * @throws {Error} If participant already exists or operation fails
   */
  async addThreadParticipant(
    threadId: string,
    userId: string,
    role: Prisma.ParticipantRole
  ): Promise<ThreadParticipant> {
    return safeDbOperation(async () => {
      const existingParticipant = await prisma.threadParticipant.findUnique({
        where: {
          threadId_userId: { threadId, userId }
        }
      });

      if (existingParticipant) {
        if (existingParticipant.leftAt) {
          // Rejoin the thread
          return prisma.threadParticipant.update({
            where: { id: existingParticipant.id },
            data: { leftAt: null, role }
          });
        }
        throw new Error('User is already a participant');
      }

      return prisma.threadParticipant.create({
        data: { threadId, userId, role }
      });
    }, 'Failed to add thread participant');
  }

  /**
   * @method findUser
   * @description Finds a user by unique criteria
   * 
   * @param {Prisma.UserWhereUniqueInput} where - Search criteria
   * @param {Prisma.UserSelect} [select] - Fields to select
   * @returns {Promise<User | null>} Found user or null
   * @throws {Error} If operation fails
   */
  async findUser(
    where: Prisma.UserWhereUniqueInput,
    select?: Prisma.UserSelect
  ): Promise<User | null> {
    return safeDbOperation(
      () => prisma.user.findUnique({ where, select }),
      'Failed to find user'
    );
  }

  /**
   * @method transaction
   * @description Executes operations in a transaction
   * 
   * @param {(tx: Prisma.TransactionClient) => Promise<T>} operation - Transaction operation
   * @returns {Promise<T>} Transaction result
   * @throws {Error} If transaction fails
   */
  async transaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return safeDbOperation(
      () => prisma.$transaction(operation),
      'Transaction failed'
    );
  }

  /**
   * @method batchUpdateMessages
   * @description Updates multiple messages in a transaction
   * 
   * @param {Array<{id: string; data: Prisma.MessageUpdateInput}>} updates - Updates to apply
   * @returns {Promise<Message[]>} Updated messages
   * @throws {Error} If any update fails
   */
  async batchUpdateMessages(
    updates: Array<{ id: string; data: Prisma.MessageUpdateInput }>
  ): Promise<Message[]> {
    return this.transaction(async (tx) => {
      const results = await Promise.all(
        updates.map(({ id, data }) =>
          tx.message.update({ where: { id }, data })
        )
      );
      return results;
    });
  }

  /**
   * @method cleanupStaleData
   * @description Cleans up expired sessions and archives old messages
   * 
   * @returns {Promise<void>}
   * @throws {Error} If cleanup fails
   */
  async cleanupStaleData(): Promise<void> {
    return safeDbOperation(async () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      await prisma.$transaction([
        // Clean up expired sessions
        prisma.session.deleteMany({
          where: { expiresAt: { lt: new Date() } }
        }),
        // Archive old messages
        prisma.message.updateMany({
          where: {
            createdAt: { lt: oneMonthAgo },
            thread: { title: { contains: 'ARCHIVED:' } }
          },
          data: { content: '[Archived Message]' }
        })
      ]);
    }, 'Failed to cleanup stale data');
  }
} 