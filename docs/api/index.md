# API Documentation

## Overview

The API provides both REST endpoints and WebSocket events for real-time communication. All endpoints are prefixed with `/api/`.

## Authentication

All requests require authentication using JWT tokens:
```http
Authorization: Bearer <token>
```

## REST Endpoints

### Thread Management

#### GET /api/threads
List user's threads
- Query Parameters: `PaginationParams & ThreadFilters`
- Response: `ApiResponse<Thread[]>`

#### POST /api/threads
Create new thread
- Body:
  ```typescript
  {
    name?: string;
    participantIds: string[];
    initialMessage?: {
      content: string;
      attachments?: Array<{
        url: string;
        type: string;
        name: string;
      }>;
    };
  }
  ```
- Response: `ApiResponse<Thread>`

#### GET /api/threads/:threadId
Get thread details
- Response: `ApiResponse<Thread>`

#### PUT /api/threads/:threadId
Update thread
- Body: `DeepPartial<Thread>`
- Response: `ApiResponse<Thread>`

### Message Management

#### GET /api/threads/:threadId/messages
Get thread messages
- Query Parameters: `PaginationParams & MessageFilters`
- Response: `ApiResponse<Message[]>`

#### POST /api/threads/:threadId/messages
Send message
- Body:
  ```typescript
  {
    content: string;
    parentId?: string;
    attachments?: File[];
  }
  ```
- Response: `ApiResponse<Message>`

#### PUT /api/threads/:threadId/messages/:messageId
Update message
- Body: `DeepPartial<Message>`
- Response: `ApiResponse<Message>`

#### DELETE /api/threads/:threadId/messages/:messageId
Delete message
- Response: `ApiResponse<void>`

### User Management

#### GET /api/users/me
Get current user profile
- Response: `ApiResponse<User>`

#### PUT /api/users/me
Update user profile
- Body: `DeepPartial<User>`
- Response: `ApiResponse<User>`

## WebSocket Events

### Connection

```typescript
// Connect with authentication
socket.connect({
  auth: {
    token: string;
  }
});
```

### Server → Client Events

#### Message Events
- `message:new`: New message in thread
- `message:update`: Message updated
- `message:delete`: Message deleted
- `message:status`: Message status change

#### Thread Events
- `thread:update`: Thread details updated
- `thread:delete`: Thread deleted
- `thread:typing`: User typing in thread
- `thread:presence`: Thread participant presence update

#### User Events
- `user:online`: User came online
- `user:offline`: User went offline
- `user:update`: User profile updated

### Client → Server Events

#### Message Actions
```typescript
// Send message
socket.emit('message:send', {
  threadId: string;
  content: string;
  attachments?: File[];
});

// Update message
socket.emit('message:update', {
  messageId: string;
  content: string;
});

// Delete message
socket.emit('message:delete', {
  messageId: string;
});
```

#### Thread Actions
```typescript
// Join thread
socket.emit('thread:join', {
  threadId: string;
});

// Leave thread
socket.emit('thread:leave', {
  threadId: string;
});

// Start typing
socket.emit('thread:typing', {
  threadId: string;
});
```

## Error Handling

All errors follow the `ApiResponse` error format:
```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

### Common Error Codes
- `unauthorized`: Authentication required
- `forbidden`: Permission denied
- `not_found`: Resource not found
- `validation_error`: Invalid input
- `rate_limited`: Too many requests
- `internal_error`: Server error

## Rate Limiting

Default rate limits per endpoint:
- Authentication: 10 requests per minute
- GET endpoints: 60 requests per minute
- POST/PUT/DELETE endpoints: 30 requests per minute

Rate limit headers included in all responses:
```http
X-RateLimit-Limit: <limit>
X-RateLimit-Remaining: <remaining>
X-RateLimit-Reset: <timestamp>
```

## Pagination

All list endpoints support pagination using cursor-based pagination:
```typescript
interface PaginationParams {
  limit?: number;    // Default: 20
  before?: string;   // Message/Thread ID
  after?: string;    // Message/Thread ID
}
```

Response includes pagination metadata:
```typescript
{
  data: T[];
  meta: {
    hasMore: boolean;
    total?: number;
  }
}
```

## WebSocket Connection Management

### Reconnection
```typescript
const socket = io({
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});
```

### Health Checks
- Server sends ping every 30s
- Client must respond with pong
- Connection considered dead after 2 missed pings 