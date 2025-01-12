# WebSocket Events Documentation

## Connection Setup

### Client Connection
```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:4000', {
  auth: {
    token: 'clerk-jwt-token'
  }
});
```

### Authentication Events
```typescript
// Server authenticates connection
socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('auth_error', (error) => {
  console.error('Authentication failed:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

## Message Events

### New Message
```typescript
// Send new message
socket.emit('message:send', {
  threadId: string,
  content: string,
  attachments?: Array<{
    type: 'image' | 'file',
    url: string
  }>
});

// Receive new message
socket.on('message:new', (message: {
  id: string;
  threadId: string;
  content: string;
  userId: string;
  createdAt: string;
  attachments?: Array<{
    type: string;
    url: string;
  }>;
}) => {
  // Handle new message
});
```

### Message Updates
```typescript
// Edit message
socket.emit('message:edit', {
  messageId: string,
  content: string
});

// Receive message update
socket.on('message:update', (update: {
  messageId: string;
  content: string;
  editedAt: string;
}) => {
  // Handle message update
});
```

### Message Deletion
```typescript
// Delete message
socket.emit('message:delete', {
  messageId: string
});

// Receive deletion
socket.on('message:delete', (messageId: string) => {
  // Handle message deletion
});
```

## Typing Indicators

### Typing Status
```typescript
// Start typing
socket.emit('typing:start', {
  threadId: string
});

// Stop typing
socket.emit('typing:stop', {
  threadId: string
});

// Receive typing updates
socket.on('typing:update', (update: {
  threadId: string;
  users: Array<{
    id: string;
    name: string;
    isTyping: boolean;
  }>;
}) => {
  // Update typing indicators
});
```

## Presence Management

### User Status
```typescript
// Update status
socket.emit('presence:update', {
  status: 'ONLINE' | 'AWAY' | 'OFFLINE'
});

// Receive presence updates
socket.on('presence:update', (updates: Array<{
  userId: string;
  status: 'ONLINE' | 'AWAY' | 'OFFLINE';
  lastSeen?: string;
}>) => {
  // Update user presence
});
```

## Thread Events

### Thread Updates
```typescript
// Join thread
socket.emit('thread:join', {
  threadId: string
});

// Leave thread
socket.emit('thread:leave', {
  threadId: string
});

// Receive thread updates
socket.on('thread:update', (update: {
  threadId: string;
  type: 'participant_joined' | 'participant_left' | 'thread_updated';
  data: any;
}) => {
  // Handle thread update
});
```

## Error Handling

### Error Events
```typescript
socket.on('error', (error: {
  code: string;
  message: string;
  details?: any;
}) => {
  // Handle error
});
```

## Rate Limiting

### Rate Limit Events
```typescript
socket.on('rate_limit', (info: {
  event: string;
  limit: number;
  remaining: number;
  reset: number;
}) => {
  // Handle rate limit
});
```

## Best Practices

1. **Reconnection**
```typescript
socket.io.on('reconnect_attempt', (attempt) => {
  // Handle reconnection
});

socket.io.on('reconnect', () => {
  // Restore application state
});
```

2. **Event Acknowledgments**
```typescript
socket.emit('message:send', data, (response) => {
  if (response.error) {
    // Handle error
  } else {
    // Message sent successfully
  }
});
```

3. **Room Management**
```typescript
// Join multiple threads
socket.emit('thread:join_bulk', {
  threadIds: string[]
});

// Leave all threads
socket.emit('thread:leave_all');
```

## Development Tools

### Debugging
```typescript
// Enable socket debugging
const socket = io('ws://localhost:4000', {
  debug: true
});

// Listen to all events
socket.onAny((event, ...args) => {
  console.log('Event:', event, 'Args:', args);
});
```

### Testing
```typescript
// Mock socket for testing
import { createMockSocket } from '@/test/utils';

const mockSocket = createMockSocket();
mockSocket.emit('message:send', data);
expect(mockSocket.lastEmitted).toBe('message:send');
``` 