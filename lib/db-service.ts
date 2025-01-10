import { prisma } from './prisma';
import { safeDbOperation, withErrorHandling } from './db-errors';
import { validateCreateMessage, validateUpdateMessage, sanitizeMessageContent } from './validation/message';
import type { Message, Thread, User } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export class DatabaseService {
  // Message operations
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

  // Thread operations
  async createThread(data: Prisma.ThreadCreateInput): Promise<Thread> {
    return safeDbOperation(
      () => prisma.thread.create({ data }),
      'Failed to create thread'
    );
  }

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

  // User operations
  async findUser(
    where: Prisma.UserWhereUniqueInput,
    select?: Prisma.UserSelect
  ): Promise<User | null> {
    return safeDbOperation(
      () => prisma.user.findUnique({ where, select }),
      'Failed to find user'
    );
  }

  // Transaction wrapper
  async transaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return safeDbOperation(
      () => prisma.$transaction(operation),
      'Transaction failed'
    );
  }

  // Batch operations
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

  // Cleanup operations
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