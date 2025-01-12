# Types and Interfaces

## Core Types

### Entity Types
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Thread {
  id: string;
  name?: string;
  isDirect: boolean;
  isArchived: boolean;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  participants: ThreadParticipant[];
  messages: Message[];
}

interface Message {
  id: string;
  threadId: string;
  userId: string;
  content: string;
  parentId?: string;
  status: MessageStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  messageId: string;
  url: string;
  type: string;
  name: string;
  size: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

### State Types
```typescript
interface AppState {
  user: UserState;
  threads: ThreadState;
  messages: MessageState;
  ui: UIState;
}

interface UserState {
  current: User | null;
  online: boolean;
  preferences: UserPreferences;
  contacts: User[];
}

interface ThreadState {
  active: Thread[];
  archived: Thread[];
  current: string | null;
  unread: Record<string, number>;
}

interface MessageState {
  byThread: Record<string, Message[]>;
  pending: Message[];
  failed: Message[];
  drafts: Record<string, string>;
}

interface UIState {
  theme: 'light' | 'dark';
  sidebar: boolean;
  modal: string | null;
  loading: Record<string, boolean>;
  errors: Error[];
}
```

### API Types
```typescript
type ApiResponse<T> = {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    hasMore?: boolean;
  };
} | {
  error: {
    code: string;
    message: string;
    details?: any;
  };
};

interface PaginationParams {
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
}

interface ThreadFilters {
  status?: 'active' | 'archived';
  type?: 'direct' | 'group';
  search?: string;
  q?: string;
}

interface MessageFilters {
  threadId: string;
  parentId?: string;
  fromDate?: Date;
  toDate?: Date;
}
```

### Event Types
```typescript
interface SocketEvent<T = any> {
  type: string;
  payload: T;
  meta?: {
    timestamp: number;
    sender: string;
  };
}

interface MessageEvent {
  type: 'message:new' | 'message:update' | 'message:delete';
  threadId: string;
  message: Message;
}

interface ThreadEvent {
  type: 'thread:update' | 'thread:delete' | 'thread:archive';
  threadId: string;
  data: Partial<Thread>;
}

interface UserEvent {
  type: 'user:online' | 'user:offline' | 'user:typing';
  userId: string;
  threadId?: string;
  data?: any;
}
```

### Component Props
```typescript
interface ChatInterfaceProps {
  thread: Thread;
  onThreadUpdate?: (thread: Thread) => void;
  onMessageSend?: (message: Message) => void;
  onError?: (error: Error) => void;
}

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMessageAction?: (message: Message, action: string) => void;
}

interface ThreadListProps {
  threads: Thread[];
  activeId?: string;
  onThreadSelect?: (threadId: string) => void;
  onThreadAction?: (thread: Thread, action: string) => void;
}

interface MessageInputProps {
  threadId: string;
  placeholder?: string;
  disabled?: boolean;
  onSend?: (content: string, attachments?: File[]) => void;
  onTyping?: () => void;
}
```

### Utility Types
```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type ActionHandler<T extends string = string, P = any> = {
  type: T;
  payload?: P;
  error?: boolean;
  meta?: Record<string, any>;
};

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

type ValidationResult = {
  valid: boolean;
  errors?: Record<string, string[]>;
};
``` 