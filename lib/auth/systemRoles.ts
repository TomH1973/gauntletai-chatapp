import { prisma } from '../prisma';
import { hasPermission, Permission, UserRole } from './roles';

export interface SystemRoleContext {
  userId: string;
  role: UserRole;
}

export class SystemRoleManager {
  static async getUserRole(userId: string): Promise<UserRole> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    return user?.role ?? 'USER';
  }

  static async setUserRole(userId: string, newRole: UserRole, adminId: string): Promise<boolean> {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (admin?.role !== 'ADMIN') {
      throw new Error('Only administrators can change user roles');
    }

    // Prevent removing the last admin
    if (newRole !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (adminCount <= 1 && targetUser?.role === 'ADMIN') {
        throw new Error('Cannot remove the last administrator');
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    });

    return true;
  }

  static async checkPermission(context: SystemRoleContext, permission: Permission): Promise<boolean> {
    return hasPermission(context.role, permission);
  }

  static async validateAction(userId: string, permission: Permission): Promise<void> {
    const role = await this.getUserRole(userId);
    if (!hasPermission(role, permission)) {
      throw new Error(`User lacks permission: ${permission}`);
    }
  }

  // Helper method to get all users with a specific role
  static async getUsersByRole(role: UserRole): Promise<{ id: string; email: string }[]> {
    return prisma.user.findMany({
      where: { role },
      select: { id: true, email: true }
    });
  }
} 