import { prisma } from './prisma';
import { SocketError, SocketErrorCode, throwSocketError } from './socketErrors';

export enum ThreadPermission {
  SEND_MESSAGE = 'send_message',
  DELETE_MESSAGE = 'delete_message',
  EDIT_MESSAGE = 'edit_message',
  INVITE_USER = 'invite_user',
  REMOVE_USER = 'remove_user',
  EDIT_THREAD = 'edit_thread'
}

export enum ThreadRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member'
}

const ROLE_PERMISSIONS = {
  [ThreadRole.ADMIN]: [
    ThreadPermission.SEND_MESSAGE,
    ThreadPermission.DELETE_MESSAGE,
    ThreadPermission.EDIT_MESSAGE,
    ThreadPermission.INVITE_USER,
    ThreadPermission.REMOVE_USER,
    ThreadPermission.EDIT_THREAD
  ],
  [ThreadRole.MODERATOR]: [
    ThreadPermission.SEND_MESSAGE,
    ThreadPermission.DELETE_MESSAGE,
    ThreadPermission.EDIT_MESSAGE,
    ThreadPermission.INVITE_USER
  ],
  [ThreadRole.MEMBER]: [
    ThreadPermission.SEND_MESSAGE
  ]
};

export class PermissionManager {
  async checkThreadPermission(
    userId: string,
    threadId: string,
    permission: ThreadPermission
  ): Promise<boolean> {
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        userId_threadId: {
          userId,
          threadId
        }
      }
    });

    if (!participant) {
      return false;
    }

    const role = participant.role as ThreadRole || ThreadRole.MEMBER;
    return ROLE_PERMISSIONS[role].includes(permission);
  }

  async requireThreadPermission(
    userId: string,
    threadId: string,
    permission: ThreadPermission
  ): Promise<void> {
    const hasPermission = await this.checkThreadPermission(userId, threadId, permission);
    
    if (!hasPermission) {
      throwSocketError(
        SocketErrorCode.UNAUTHORIZED,
        `User lacks permission: ${permission}`,
        { threadId, permission }
      );
    }
  }

  async checkMessagePermission(
    userId: string,
    messageId: string,
    permission: ThreadPermission
  ): Promise<boolean> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        thread: {
          include: {
            participants: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!message) return false;

    // Message author can always edit/delete their own messages
    if (
      message.userId === userId &&
      (permission === ThreadPermission.EDIT_MESSAGE || permission === ThreadPermission.DELETE_MESSAGE)
    ) {
      return true;
    }

    // Check thread-level permissions
    return this.checkThreadPermission(userId, message.threadId, permission);
  }

  async requireMessagePermission(
    userId: string,
    messageId: string,
    permission: ThreadPermission
  ): Promise<void> {
    const hasPermission = await this.checkMessagePermission(userId, messageId, permission);
    
    if (!hasPermission) {
      throwSocketError(
        SocketErrorCode.UNAUTHORIZED,
        `User lacks permission: ${permission}`,
        { messageId, permission }
      );
    }
  }
}

export const permissionManager = new PermissionManager(); 