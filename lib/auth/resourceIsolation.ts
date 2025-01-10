import { prisma } from '../prisma';
import { ThreadRoleManager } from './threadRoles';
import { SystemRoleManager } from './systemRoles';

export class ResourceIsolation {
  // User data separation
  static async validateUserAccess(targetUserId: string, actorId: string): Promise<boolean> {
    // System admins can access all user data
    const actorRole = await SystemRoleManager.getUserRole(actorId);
    if (actorRole === 'ADMIN') {
      return true;
    }

    // Users can only access their own data
    return targetUserId === actorId;
  }

  // Thread access control
  static async validateThreadAccess(threadId: string, userId: string): Promise<boolean> {
    // Check if user is a participant in the thread
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        userId_threadId: {
          userId,
          threadId
        }
      },
      select: {
        leftAt: true
      }
    });

    // User must be an active participant (not left the thread)
    return participant !== null && participant.leftAt === null;
  }

  // Message access control
  static async validateMessageAccess(messageId: string, userId: string): Promise<boolean> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        threadId: true,
        userId: true
      }
    });

    if (!message) {
      return false;
    }

    // Message creator can always access their messages
    if (message.userId === userId) {
      return true;
    }

    // Otherwise, check thread access
    return this.validateThreadAccess(message.threadId, userId);
  }

  // Attachment access control (preparation for file storage isolation)
  static async validateAttachmentAccess(
    attachmentId: string,
    userId: string
  ): Promise<boolean> {
    // This is a placeholder for when we implement attachments
    // It will integrate with the file storage system
    return false;
  }

  // Helper method to enforce access control
  static async enforceAccess(
    type: 'user' | 'thread' | 'message' | 'attachment',
    resourceId: string,
    userId: string
  ): Promise<void> {
    let hasAccess = false;

    switch (type) {
      case 'user':
        hasAccess = await this.validateUserAccess(resourceId, userId);
        break;
      case 'thread':
        hasAccess = await this.validateThreadAccess(resourceId, userId);
        break;
      case 'message':
        hasAccess = await this.validateMessageAccess(resourceId, userId);
        break;
      case 'attachment':
        hasAccess = await this.validateAttachmentAccess(resourceId, userId);
        break;
    }

    if (!hasAccess) {
      throw new Error(`Access denied to ${type} resource`);
    }
  }
} 