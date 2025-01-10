# Chat API

## Common Patterns

### Authentication
All endpoints require Clerk.js session token:
```http
Authorization: Bearer ${token}
```

### Error Responses
```typescript
interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: any;
}
```

### Rate Limiting
- GET endpoints: 100 requests/minute
- POST/PATCH/DELETE: 30 requests/minute
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

## Messages API

### GET /api/messages
Retrieves thread messages with pagination.

```typescript
// Query
{
  threadId: string;    // Required
  cursor?: string;     // Optional
  limit?: number;      // Default: 50
}

// Response
{
  messages: Message[];
  nextCursor?: string;
  hasMore: boolean;
}
```

### POST /api/messages
Creates a new message.

```typescript
// Body
{
  content: string;     // Required
  threadId: string;    // Required
  parentId?: string;   // Optional
  tempId?: string;     // Optional
}

// Response
{
  message: Message;
  tempId?: string;
}
```

### PATCH /api/messages/:id
Updates a message.

```typescript
// Body
{
  content: string;     // Required
}

// Response
{
  message: Message;
}
```

### DELETE /api/messages/:id
Deletes a message.

```typescript
// Response
{
  success: boolean;
  id: string;
}
```

## Threads API

### GET /api/threads
Lists user's threads.

```typescript
// Query
{
  cursor?: string;     // Optional
  limit?: number;      // Default: 20
  status?: string;     // Optional
}

// Response
{
  threads: Thread[];
  nextCursor?: string;
  hasMore: boolean;
}
```

### POST /api/threads
Creates a new thread.

```typescript
// Body
{
  name?: string;           // Optional
  participantIds: string[];// Required
  initialMessage?: string; // Optional
}

// Response
{
  thread: Thread;
  message?: Message;
}
```

### PATCH /api/threads/:id
Updates a thread.

```typescript
// Body
{
  name?: string;
  status?: string;
}

// Response
{
  thread: Thread;
}
```

### POST /api/threads/:id/participants
Adds participants to a thread.

```typescript
// Body
{
  userIds: string[];
}

// Response
{
  participants: ThreadParticipant[];
}
```

## Validation Rules

### Messages
- Content: 1-4000 characters
- Thread ID: Valid UUID
- Parent ID: Valid UUID or null
- Temp ID: ≤100 characters

### Threads
- Name: 1-100 characters
- Max participants: 50
- Valid user IDs required
- Thread ID: Valid UUID 