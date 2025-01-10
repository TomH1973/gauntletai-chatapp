# API Routes Specification

## Authentication

All API routes except authentication endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Thread Routes

### GET /api/threads
List user's threads
- Query Parameters:
  - `limit`: number (default: 20)
  - `offset`: number (default: 0)
  - `status`: 'active' | 'archived'
- Response: ThreadList
  ```typescript
  {
    threads: Thread[];
    total: number;
    hasMore: boolean;
  }
  ```

### POST /api/threads
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
- Response: Thread

### GET /api/threads/:threadId
Get thread details
- Response: Thread

### PUT /api/threads/:threadId
Update thread
- Body:
  ```typescript
  {
    name?: string;
    isArchived?: boolean;
  }
  ```
- Response: Thread

## Message Routes

### GET /api/threads/:threadId/messages
Get thread messages
- Query Parameters:
  - `limit`: number (default: 50)
  - `before`: string (message ID)
  - `after`: string (message ID)
- Response: MessageList
  ```typescript
  {
    messages: Message[];
    hasMore: boolean;
  }
  ```

### POST /api/threads/:threadId/messages
Send message
- Body:
  ```typescript
  {
    content: string;
    parentId?: string;
    attachments?: Array<{
      url: string;
      type: string;
      name: string;
    }>;
    mentions?: string[];
  }
  ```
- Response: Message

### PUT /api/threads/:threadId/messages/:messageId
Update message
- Body:
  ```typescript
  {
    content: string;
  }
  ```
- Response: Message

### DELETE /api/threads/:threadId/messages/:messageId
Delete message
- Response: 204 No Content

## User Routes

### GET /api/users/me
Get current user profile
- Response: User

### PUT /api/users/me
Update user profile
- Body:
  ```typescript
  {
    username?: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  }
  ```
- Response: User

### GET /api/users/:userId
Get user profile
- Response: User

## Error Responses

All error responses follow the format:
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

## Rate Limits

Default rate limits per endpoint:
- Authentication: 10 requests per minute
- GET endpoints: 60 requests per minute
- POST/PUT/DELETE endpoints: 30 requests per minute

Rate limit headers included in all responses:
```
X-RateLimit-Limit: <limit>
X-RateLimit-Remaining: <remaining>
X-RateLimit-Reset: <timestamp>
``` 