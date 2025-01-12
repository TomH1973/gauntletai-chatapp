# API Documentation

## Core Concepts

### Authentication
All protected routes use the `withAuth` wrapper from `lib/api.ts`:
```typescript
import { withAuth } from '@/lib/api';

export const handler = withAuth(async (req, user) => {
  // Handler implementation
});
```

### Input Validation
All routes use Zod for input validation:
```typescript
import { z } from 'zod';

const InputSchema = z.object({
  field1: z.string(),
  field2: z.number(),
  // ...
});

export const POST = withAuth(async (req, user) => {
  const result = InputSchema.safeParse(await req.json());
  if (!result.success) {
    return ApiResponse.error(ApiError.BadRequest, 400, result.error);
  }
  const data = result.data;
  // Use validated data
});
```

### Error Handling
Consistent error responses across all endpoints:
```typescript
{
  error: string;    // One of ApiError types
  details?: any;    // Additional info in development
}
```

Available error types:
- `Unauthorized`: Authentication failed
- `NotFound`: Resource not found
- `BadRequest`: Invalid input
- `RateLimit`: Too many requests
- `ServerError`: Internal error

### Rate Limiting
- Global rate limit: 1000 requests per minute per user
- Endpoint-specific limits where needed
- Handled automatically by middleware

## Endpoints

### Threads

#### GET /api/threads
List user's active threads.

**Response**:
```typescript
{
  id: string;
  name: string;
  participants: {
    user: {
      id: string;
      name: string;
      image: string;
    };
  }[];
  messages: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      image: string;
    };
  }[];
}[]
```

#### POST /api/threads
Create or leave a thread.

**Create Thread Request**:
```typescript
{
  action: 'create';
  name: string;
  participantIds: string[];
}
```

**Leave Thread Request**:
```typescript
{
  action: 'leave';
  threadId: string;
}
```

### Messages

#### GET /api/messages
Get messages for a thread.

**Query Parameters**:
- `threadId`: string (required)
- `cursor`: string (optional)
- `limit`: number (optional, default: 50)

#### POST /api/messages
Send a message.

**Request**:
```typescript
{
  threadId: string;
  content: string;
  attachments?: {
    type: 'image' | 'file';
    url: string;
  }[];
}
```

### WebSocket Events

#### Connection
```typescript
socket.on('connect', () => {
  socket.emit('auth', { token: 'user-token' });
});
```

#### Message Events
- `message:new`: New message in thread
- `message:update`: Message edited
- `message:delete`: Message deleted
- `typing:start`: User started typing
- `typing:stop`: User stopped typing

## Common Database Queries

### Thread Participants
```typescript
include: CommonIncludes.threadParticipants
```
Returns:
```typescript
{
  user: {
    id: string;
    name: string;
    image: string;
  };
}[]
```

### Latest Message
```typescript
include: CommonIncludes.latestMessage
```
Returns:
```typescript
{
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string;
  };
}
```

## Development Tools

### API Testing
```bash
# Using curl
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/threads

# Using the test suite
npm test -- api/threads.test.ts
```

### WebSocket Testing
```bash
# Using wscat
wscat -c ws://localhost:4000 -H "Authorization: Bearer $TOKEN"
```

## Security Considerations

1. **Authentication**
   - All routes require valid Clerk token
   - WebSocket connections authenticated via headers
   - Rate limiting per user

2. **Input Validation**
   - All inputs validated with Zod
   - Strict TypeScript types
   - SQL injection prevention via Prisma

3. **Error Handling**
   - No sensitive info in errors
   - Detailed logs for debugging
   - Rate limit information in headers

## Deployment

1. **Environment Variables**
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=sk_...
```

2. **Health Checks**
- `/api/health`: Basic health check
- `/api/metrics`: Detailed metrics (protected)

3. **Monitoring**
- Request logging
- Error tracking
- Performance metrics 