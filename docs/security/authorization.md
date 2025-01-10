# Authorization Rules

## Role-Based Access Control

### 1. User Roles
```typescript
enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest',
}

interface RolePermissions {
  [UserRole.ADMIN]: string[];
  [UserRole.MODERATOR]: string[];
  [UserRole.USER]: string[];
  [UserRole.GUEST]: string[];
}

const rolePermissions: RolePermissions = {
  [UserRole.ADMIN]: ['*'],
  [UserRole.MODERATOR]: [
    'thread:read',
    'thread:write',
    'message:read',
    'message:write',
    'message:delete',
    'user:read',
  ],
  [UserRole.USER]: [
    'thread:read',
    'thread:write',
    'message:read',
    'message:write',
    'user:read',
  ],
  [UserRole.GUEST]: [
    'thread:read',
    'message:read',
    'user:read',
  ],
};
```

### 2. Permission Checks
```typescript
// lib/auth/permissions.ts
export async function hasPermission(
  userId: string,
  permission: string,
  resource?: string
): Promise<boolean> {
  const user = await getUser(userId);
  const roles = await getUserRoles(userId);
  
  // Check if any role has the required permission
  return roles.some(role => {
    const permissions = rolePermissions[role];
    return permissions.includes('*') || permissions.includes(permission);
  });
}

export function requirePermission(permission: string) {
  return async (req: NextApiRequest, res: NextApiResponse, next: NextFunction) => {
    const hasAccess = await hasPermission(req.auth.userId, permission);
    if (!hasAccess) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}
```

## Resource Access Control

### 1. Thread Access
```typescript
interface ThreadAccess {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canRemoveMembers: boolean;
}

async function getThreadAccess(userId: string, threadId: string): Promise<ThreadAccess> {
  const participant = await getThreadParticipant(threadId, userId);
  const userRoles = await getUserRoles(userId);
  
  return {
    canView: !!participant || userRoles.includes(UserRole.ADMIN),
    canEdit: participant?.role === 'owner' || userRoles.includes(UserRole.ADMIN),
    canDelete: participant?.role === 'owner' || userRoles.includes(UserRole.ADMIN),
    canInvite: ['owner', 'admin'].includes(participant?.role) || userRoles.includes(UserRole.ADMIN),
    canRemoveMembers: ['owner', 'admin'].includes(participant?.role) || userRoles.includes(UserRole.ADMIN),
  };
}
```

### 2. Message Access
```typescript
interface MessageAccess {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReact: boolean;
}

async function getMessageAccess(userId: string, messageId: string): Promise<MessageAccess> {
  const message = await getMessage(messageId);
  const threadAccess = await getThreadAccess(userId, message.threadId);
  
  return {
    canView: threadAccess.canView,
    canEdit: message.userId === userId || threadAccess.canEdit,
    canDelete: message.userId === userId || threadAccess.canDelete,
    canReact: threadAccess.canView,
  };
}
```

## Implementation

### 1. Middleware
```typescript
// middleware/authorization.ts
export function authorizeThread(action: keyof ThreadAccess) {
  return async (req: NextApiRequest, res: NextApiResponse, next: NextFunction) => {
    const threadId = req.query.threadId as string;
    const access = await getThreadAccess(req.auth.userId, threadId);
    
    if (!access[action]) {
      throw new ForbiddenError(`No permission to ${action} thread`);
    }
    next();
  };
}

export function authorizeMessage(action: keyof MessageAccess) {
  return async (req: NextApiRequest, res: NextApiResponse, next: NextFunction) => {
    const messageId = req.query.messageId as string;
    const access = await getMessageAccess(req.auth.userId, messageId);
    
    if (!access[action]) {
      throw new ForbiddenError(`No permission to ${action} message`);
    }
    next();
  };
}
```

### 2. WebSocket Authorization
```typescript
// lib/socket/authorization.ts
export function authorizeSocketAction(
  socket: Socket,
  action: string,
  data: any
): Promise<boolean> {
  const { userId } = socket.auth;
  
  switch (action) {
    case 'thread:join':
      return hasThreadAccess(userId, data.threadId, 'canView');
    case 'message:send':
      return hasThreadAccess(userId, data.threadId, 'canEdit');
    case 'message:edit':
      return hasMessageAccess(userId, data.messageId, 'canEdit');
    default:
      return Promise.resolve(false);
  }
}
```

## Data Privacy

### 1. Field-Level Security
```typescript
interface FieldAccess {
  field: string;
  roles: UserRole[];
  condition?: (user: User, resource: any) => boolean;
}

const userFieldAccess: FieldAccess[] = [
  { field: 'email', roles: [UserRole.ADMIN] },
  { field: 'lastLoginAt', roles: [UserRole.ADMIN] },
  {
    field: 'profileImage',
    roles: [UserRole.USER, UserRole.MODERATOR, UserRole.ADMIN],
    condition: (user, resource) => user.id === resource.id,
  },
];
```

### 2. Data Filtering
```typescript
export async function filterUserData(
  user: User,
  requestingUserId: string
): Promise<Partial<User>> {
  const requestingUser = await getUser(requestingUserId);
  const requestingRoles = await getUserRoles(requestingUserId);
  
  return Object.fromEntries(
    Object.entries(user).filter(([field]) =>
      canAccessField(field, requestingRoles, requestingUser, user)
    )
  );
}
```

## Audit Trail

### 1. Access Logging
```typescript
interface AccessLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  success: boolean;
  metadata: {
    ip: string;
    userAgent: string;
    roles: UserRole[];
    permissions: string[];
  };
}
```

### 2. Change Tracking
```typescript
interface ChangeLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata: {
    ip: string;
    userAgent: string;
  };
}
``` 