import { ParticipantRole } from '@prisma/client';
import { prisma } from '../prisma';
import { Permission, UserRole } from './roles';
import { SystemRoleManager } from './systemRoles';

export type ThreadPermission =
  | 'thread:update'
  | 'thread:delete'
  | 'thread:invite'
  | 'thread:kick'
  | 'message:create'
  | 'message:read'
  | 'message:update'
  | 'message:delete'
  | '*';

const OWNER: ParticipantRole = 'OWNER';
const ADMIN: ParticipantRole = 'ADMIN';
const MEMBER: ParticipantRole = 'MEMBER';

export const THREAD_ROLE_PERMISSIONS: Record<ParticipantRole, ThreadPermission[]> = {
  [OWNER]: ['*'],
  [ADMIN]: [
    'thread:update',
    'thread:invite',
    'thread:kick',
    'message:create',
    'message:read',
    'message:update',
    'message:delete'
  ],
  [MEMBER]: [
    'message:create',
    'message:read',
    'message:update'
  ]
};

export class ThreadRoleManager {
  static async getThreadRole(userId: string, threadId: string): Promise<ParticipantRole | null> {
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        userId_threadId: {
          userId,
          threadId
        }
      }
    });

    return participant?.role ?? null;
  }

  static async setThreadRole(
    threadId: string,
    targetUserId: string,
    newRole: ParticipantRole,
    actorId: string
  ): Promise<boolean> {
    // Check if actor has permission to change roles
    const [actorSystemRole, actorThreadRole] = await Promise.all([
      SystemRoleManager.getUserRole(actorId),
      this.getThreadRole(actorId, threadId)
    ]);

    // System admins can always change roles
    const isSystemAdmin = actorSystemRole === 'ADMIN';
    
    // Thread owners can change roles except for other owners
    const isThreadOwner = actorThreadRole === OWNER;
    
    // Thread admins can only modify member roles
    const isThreadAdmin = actorThreadRole === ADMIN;

    if (!isSystemAdmin && !isThreadOwner && !isThreadAdmin) {
      throw new Error('Insufficient permissions to change roles');
    }

    const targetParticipant = await prisma.threadParticipant.findUnique({
      where: {
        userId_threadId: {
          userId: targetUserId,
          threadId
        }
      }
    });

    // Only system admins can modify owner roles
    if (targetParticipant?.role === OWNER && !isSystemAdmin) {
      throw new Error('Only system administrators can modify owner roles');
    }

    // Thread admins can only modify member roles
    if (isThreadAdmin && (newRole !== MEMBER || targetParticipant?.role !== MEMBER)) {
      throw new Error('Thread administrators can only modify member roles');
    }

    // Prevent removing the last owner
    if (targetParticipant?.role === OWNER && newRole !== OWNER) {
      const ownerCount = await prisma.threadParticipant.count({
        where: {
          threadId,
          role: OWNER
        }
      });

      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last thread owner');
      }
    }

    await prisma.threadParticipant.update({
      where: {
        userId_threadId: {
          userId: targetUserId,
          threadId
        }
      },
      data: { role: newRole }
    });

    return true;
  }

  static async hasThreadPermission(
    userId: string,
    threadId: string,
    permission: ThreadPermission
  ): Promise<boolean> {
    const [systemRole, threadRole] = await Promise.all([
      SystemRoleManager.getUserRole(userId),
      this.getThreadRole(userId, threadId)
    ]);

    // System admins have all permissions
    if (systemRole === 'ADMIN') {
      return true;
    }

    if (!threadRole) {
      return false;
    }

    const permissions = THREAD_ROLE_PERMISSIONS[threadRole];
    return permissions.includes('*') || permissions.includes(permission);
  }

  static async validateThreadAction(
    userId: string,
    threadId: string,
    permission: ThreadPermission
  ): Promise<void> {
    const hasPermission = await this.hasThreadPermission(userId, threadId, permission);
    if (!hasPermission) {
      throw new Error(`User lacks thread permission: ${permission}`);
    }
  }

  // Helper method to get all participants with a specific role in a thread
  static async getThreadParticipantsByRole(
    threadId: string,
    role: ParticipantRole
  ): Promise<{ userId: string; joinedAt: Date }[]> {
    const participants = await prisma.threadParticipant.findMany({
      where: {
        threadId,
        role,
        leftAt: null
      },
      select: {
        userId: true,
        joinedAt: true
      }
    });

    return participants;
  }
} 