export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER' | 'GUEST';

export type Permission =
  | 'thread:create'
  | 'thread:read'
  | 'thread:update'
  | 'thread:delete'
  | 'message:create'
  | 'message:read'
  | 'message:update'
  | 'message:delete'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | '*';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'ADMIN': ['*'],
  'MODERATOR': [
    'thread:read',
    'thread:update',
    'message:read',
    'message:update',
    'message:delete',
    'user:read',
  ],
  'USER': [
    'thread:create',
    'thread:read',
    'message:create',
    'message:read',
    'message:update',
    'user:read',
  ],
  'GUEST': [
    'thread:read',
    'message:read',
    'user:read',
  ],
};

export function hasPermission(userRole: UserRole, requiredPermission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.includes('*') || permissions.includes(requiredPermission);
}

export function requirePermission(permission: Permission) {
  return async (context: { auth: { role: UserRole } }) => {
    if (!hasPermission(context.auth.role, permission)) {
      throw new Error('Insufficient permissions');
    }
  };
} 