# Security Types and Interfaces

## Core Types

### Roles and Permissions
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

interface Permission {
  resource: string;
  action: string;
  conditions?: Array<(user: User, resource: any) => boolean>;
}
```

### Authentication
```typescript
interface AuthConfig {
  clerk: {
    publishableKey: string;
    secretKey: string;
    jwtExpiryMinutes: number;
    webhookSecret: string;
  };
  session: {
    maxAge: number;
    updateAge: number;
  };
}

interface AuthResult {
  userId: string;
  sessionId: string;
  permissions: string[];
}
```

### Access Control
```typescript
interface ResourceAccess {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  additionalPermissions?: Record<string, boolean>;
}

interface DataAccessPolicy {
  resource: string;
  actions: ('read' | 'write' | 'delete')[];
  roles: UserRole[];
  conditions?: Array<(user: User, resource: any) => boolean>;
}
```

## Monitoring and Logging

### Audit Logs
```typescript
interface BaseAuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  metadata: {
    ip: string;
    userAgent: string;
  };
}

interface SecurityAuditLog extends BaseAuditLog {
  success: boolean;
  failureReason?: string;
  roles: UserRole[];
  permissions: string[];
}

interface PrivacyAuditLog extends BaseAuditLog {
  data: {
    type: string;
    fields: string[];
    purpose: string;
  };
  compliance: {
    basis: string;
    consent?: string;
    policy: string;
  };
}

interface ChangeLog extends BaseAuditLog {
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}
```

### Monitoring
```typescript
interface ThresholdConfig {
  count: number;
  window: string;
  action: string;
}

interface MonitoringConfig {
  security: {
    failedLogins: ThresholdConfig;
    multipleDevices: ThresholdConfig;
    suspiciousAccess: ThresholdConfig;
    bulkRetrieval: ThresholdConfig;
  };
  performance: {
    responseTime: {
      p95: number;
      p99: number;
    };
  };
  alerts: {
    recipients: string[];
    channels: string[];
    severity: string[];
  };
}
```

## Data Privacy

### Classification
```typescript
enum DataSensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
}

interface DataClassification {
  category: string;
  sensitivity: DataSensitivity;
  retention: string;
  encryption: boolean;
  masking: boolean;
}
```

### Privacy Controls
```typescript
interface PrivacySettings {
  shareProfile: boolean;
  showOnlineStatus: boolean;
  allowMessagePreviews: boolean;
  retainMessageHistory: boolean;
}

interface ConsentRecord {
  userId: string;
  purpose: string;
  granted: boolean;
  timestamp: Date;
  expiresAt?: Date;
  version: string;
}
```

### Data Protection
```typescript
interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
  saltSize: number;
}

interface MaskingRule {
  pattern: RegExp;
  replacement: string | ((match: string) => string);
}
``` 