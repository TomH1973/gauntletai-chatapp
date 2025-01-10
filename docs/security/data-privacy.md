# Data Privacy

## Data Classification

### 1. Sensitive Data Categories
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

const dataClassifications: Record<string, DataClassification> = {
  'user.email': {
    category: 'Personal Information',
    sensitivity: DataSensitivity.CONFIDENTIAL,
    retention: '7 years',
    encryption: true,
    masking: true,
  },
  'user.password': {
    category: 'Authentication',
    sensitivity: DataSensitivity.RESTRICTED,
    retention: 'until changed',
    encryption: true,
    masking: true,
  },
  'message.content': {
    category: 'User Content',
    sensitivity: DataSensitivity.INTERNAL,
    retention: '5 years',
    encryption: true,
    masking: false,
  },
};
```

## Data Protection

### 1. Encryption
```typescript
interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
  saltSize: number;
}

const encryptionConfig: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keySize: 32,
  ivSize: 16,
  saltSize: 16,
};

interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
}
```

### 2. Data Masking
```typescript
interface MaskingRule {
  pattern: RegExp;
  replacement: string | ((match: string) => string);
}

const maskingRules: Record<string, MaskingRule> = {
  email: {
    pattern: /^(.{2})(.*)(@.*)$/,
    replacement: (match, p1, p2, p3) => p1 + '*'.repeat(p2.length) + p3,
  },
  phone: {
    pattern: /^(\+\d{2})?(.*)(\d{4})$/,
    replacement: (match, p1, p2, p3) => (p1 || '') + '*'.repeat(p2.length) + p3,
  },
};
```

## Data Handling

### 1. Data Access
```typescript
interface DataAccessPolicy {
  resource: string;
  actions: ('read' | 'write' | 'delete')[];
  roles: UserRole[];
  conditions?: Array<(user: User, resource: any) => boolean>;
}

const dataAccessPolicies: DataAccessPolicy[] = [
  {
    resource: 'user.email',
    actions: ['read'],
    roles: [UserRole.ADMIN],
  },
  {
    resource: 'message.content',
    actions: ['read', 'write'],
    roles: [UserRole.USER, UserRole.MODERATOR, UserRole.ADMIN],
    conditions: [
      (user, message) => message.threadParticipants.includes(user.id),
    ],
  },
];
```

### 2. Data Retention
```typescript
interface RetentionPolicy {
  dataType: string;
  duration: string;
  archiveAfter?: string;
  deleteAfter: string;
}

const retentionPolicies: RetentionPolicy[] = [
  {
    dataType: 'messages',
    duration: '5 years',
    archiveAfter: '2 years',
    deleteAfter: '5 years',
  },
  {
    dataType: 'user_activity',
    duration: '1 year',
    deleteAfter: '1 year',
  },
];
```

## Compliance

### 1. GDPR Compliance
```typescript
interface GDPRRequest {
  type: 'access' | 'delete' | 'modify';
  userId: string;
  requestDate: Date;
  completionDeadline: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface DataPortability {
  format: 'json' | 'csv';
  includeTypes: string[];
  excludeTypes: string[];
}
```

### 2. Data Processing
```typescript
interface DataProcessingRecord {
  purpose: string;
  categories: string[];
  recipients: string[];
  retention: string;
  security: string[];
}

const dataProcessingRegistry: Record<string, DataProcessingRecord> = {
  messaging: {
    purpose: 'Provide messaging service',
    categories: ['messages', 'user_profile', 'attachments'],
    recipients: ['internal', 'thread_participants'],
    retention: '5 years',
    security: ['encryption', 'access_control', 'audit_logging'],
  },
};
```

## Privacy Controls

### 1. User Controls
```typescript
interface PrivacySettings {
  shareProfile: boolean;
  showOnlineStatus: boolean;
  allowMessagePreviews: boolean;
  retainMessageHistory: boolean;
}

interface PrivacyDefaults {
  settings: PrivacySettings;
  notifications: NotificationPreferences;
  dataSharing: DataSharingPreferences;
}
```

### 2. Consent Management
```typescript
interface ConsentRecord {
  userId: string;
  purpose: string;
  granted: boolean;
  timestamp: Date;
  expiresAt?: Date;
  version: string;
}

interface ConsentRequirement {
  purpose: string;
  description: string;
  required: boolean;
  duration?: string;
}
```

## Audit and Monitoring

### 1. Privacy Logs
```typescript
interface PrivacyLog {
  timestamp: Date;
  userId: string;
  action: string;
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
```

### 2. Data Access Monitoring
```typescript
interface AccessMonitoring {
  patterns: {
    suspiciousAccess: {
      threshold: number;
      window: string;
      action: string;
    };
    bulkRetrieval: {
      threshold: number;
      window: string;
      action: string;
    };
  };
  alerts: {
    recipients: string[];
    channels: string[];
    severity: string[];
  };
}
``` 