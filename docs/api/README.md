# Chat Application API Documentation

## Authentication

All API endpoints require authentication using Clerk. Include the authentication token in the `Authorization` header:
```
Authorization: Bearer <token>
```

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Endpoints

### Users

#### Get Current User
```http
GET /users/me
```

Response:
```json
{
  "id": "string",
  "email": "string",
  "username": "string",
  "firstName": "string?",
  "lastName": "string?",
  "profileImage": "string?",
  "role": "ADMIN | MODERATOR | USER | GUEST"
}
```

### Threads

#### List Threads
```http
GET /threads
```

Query Parameters:
- `limit` (optional): Number of threads to return (default: 20)
- `cursor` (optional): Cursor for pagination

Response:
```json
{
  "threads": [
    {
      "id": "string",
      "title": "string",
      "participants": [
        {
          "userId": "string",
          "role": "OWNER | ADMIN | MEMBER",
          "user": {
            "id": "string",
            "username": "string",
            "profileImage": "string?"
          }
        }
      ],
      "lastMessage": {
        "id": "string",
        "content": "string",
        "userId": "string",
        "createdAt": "string"
      }
    }
  ],
  "nextCursor": "string?"
}
```

#### Create Thread
```http
POST /threads
```

Request Body:
```json
{
  "title": "string",
  "participantIds": ["string"]
}
```

#### Update Thread
```http
PATCH /threads/:threadId
```

Request Body:
```json
{
  "title": "string?"
}
```

#### Delete Thread
```http
DELETE /threads/:threadId
```

### Messages

#### List Messages
```http
GET /threads/:threadId/messages
```

Query Parameters:
- `limit` (optional): Number of messages to return (default: 50)
- `cursor` (optional): Cursor for pagination

Response:
```json
{
  "messages": [
    {
      "id": "string",
      "content": "string",
      "userId": "string",
      "threadId": "string",
      "parentId": "string?",
      "status": "SENDING | SENT | DELIVERED | READ | ERROR | FAILED",
      "createdAt": "string",
      "updatedAt": "string",
      "user": {
        "id": "string",
        "username": "string",
        "profileImage": "string?"
      },
      "reactions": [
        {
          "emoji": "string",
          "userId": "string"
        }
      ]
    }
  ],
  "nextCursor": "string?"
}
```

#### Send Message
```http
POST /threads/:threadId/messages
```

Request Body:
```json
{
  "content": "string",
  "parentId": "string?" // For replies
}
```

#### Update Message
```http
PATCH /messages/:messageId
```

Request Body:
```json
{
  "content": "string"
}
```

#### Delete Message
```http
DELETE /messages/:messageId
```

### Reactions

#### Add Reaction
```http
POST /messages/:messageId/reactions
```

Request Body:
```json
{
  "emoji": "string"
}
```

#### Remove Reaction
```http
DELETE /messages/:messageId/reactions/:emoji
```

## WebSocket Events

### Client to Server

```typescript
interface ClientToServerEvents {
  // Join a thread's room
  'thread:join': (threadId: string) => void;
  
  // Leave a thread's room
  'thread:leave': (threadId: string) => void;
  
  // Start typing in a thread
  'typing:start': (threadId: string) => void;
  
  // Stop typing in a thread
  'typing:stop': (threadId: string) => void;
  
  // Mark messages as delivered
  'message:delivered': (messageId: string) => void;
  
  // Mark messages as read
  'message:read': (messageId: string) => void;
}
```

### Server to Client

```typescript
interface ServerToClientEvents {
  // New message in thread
  'message:new': (message: Message) => void;
  
  // Message status update
  'message:status': (data: { messageId: string, status: MessageStatus }) => void;
  
  // Typing indicator update
  'typing:update': (data: { threadId: string, users: Array<{ id: string, username: string }> }) => void;
  
  // User presence update
  'presence:update': (data: { userId: string, isOnline: boolean, lastSeen?: string }) => void;
  
  // Error events
  'error': (error: { code: string, message: string }) => void;
}
```

## Error Handling

All endpoints return standard HTTP status codes:

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

Error Response Format:
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "string?" // Only in development
  }
}
```

## Rate Limiting

- API endpoints: 100 requests per minute per IP
- WebSocket events: 60 events per minute per connection
- Message sending: 30 messages per minute per user

## Security

- All requests must use HTTPS
- Authentication via Clerk
- CORS configured for specific origins
- Rate limiting per IP and user
- Input validation using Zod
- SQL injection prevention via Prisma
- XSS prevention via content sanitization 