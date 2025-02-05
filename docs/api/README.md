# API Documentation

## Overview

This document describes the REST and WebSocket APIs available in the chat application.

## Authentication

All API endpoints require authentication using JWT tokens provided by Clerk.

### Headers
```http
Authorization: Bearer <jwt_token>
```

## REST API Endpoints

### Messages

#### Get Messages
```http
GET /api/threads/{threadId}/messages
```

Query Parameters:
- `limit` (optional): Number of messages to return (default: 50)
- `before` (optional): Cursor for pagination
- `parentId` (optional): Filter by parent message

Response:
```json
{
  "messages": [
    {
      "id": "string",
      "content": "string",
      "threadId": "string",
      "userId": "string",
      "createdAt": "string",
      "updatedAt": "string",
      "attachments": []
    }
  ],
  "nextCursor": "string"
}
```

#### Send Message
```http
POST /api/threads/{threadId}/messages
```

Request Body:
```json
{
  "content": "string",
  "parentId": "string?",
  "attachments": [
    {
      "id": "string",
      "type": "string",
      "url": "string"
    }
  ]
}
```

### Threads

#### Create Thread
```http
POST /api/threads
```

Request Body:
```json
{
  "name": "string",
  "participants": ["userId"]
}
```

#### Get Thread
```http
GET /api/threads/{threadId}
```

### Files

#### Upload File
```http
POST /api/upload
```
Content-Type: multipart/form-data

Form Fields:
- `file`: File to upload
- `threadId`: Thread ID
- `messageId` (optional): Message ID

Response:
```json
{
  "id": "string",
  "url": "string",
  "filename": "string",
  "mimeType": "string",
  "size": number
}
```

## WebSocket Events

### Client to Server

#### Join Thread
```typescript
socket.emit('thread:join', threadId: string)
```

#### Send Message
```typescript
socket.emit('message:send', {
  content: string,
  threadId: string,
  parentId?: string,
  attachments?: Array<{
    id: string,
    type: string,
    url: string
  }>
})
```

#### Typing Indicator
```typescript
socket.emit('typing:start', threadId: string)
socket.emit('typing:stop', threadId: string)
```

### Server to Client

#### New Message
```typescript
socket.on('message:new', (message: Message) => {})
```

#### Typing Update
```typescript
socket.on('typing:update', ({
  threadId: string,
  userId: string,
  isTyping: boolean
}) => {})
```

#### Presence Update
```typescript
socket.on('presence:update', ({
  userId: string,
  isOnline: boolean,
  lastSeen?: string
}) => {})
```

## Error Handling

### Error Response Format
```json
{
  "code": "string",
  "message": "string",
  "details?: object
}
```

### Common Error Codes
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- API requests: 100 requests per minute per user
- WebSocket messages: 60 messages per minute per user
- File uploads: 10 uploads per minute per user

## Pagination

API endpoints that return lists support cursor-based pagination:

Query Parameters:
- `limit`: Number of items per page
- `before`: Cursor for previous page
- `after`: Cursor for next page

Response includes:
```json
{
  "items": [],
  "nextCursor": "string",
  "prevCursor": "string",
  "total": number
}
```

## WebSocket Connection

### Connection URL
```
ws://domain.com/socket?token=<jwt_token>
```

### Reconnection Strategy
- Initial delay: 1 second
- Maximum delay: 30 seconds
- Exponential backoff with jitter
- Maximum retries: 10

### Heartbeat
- Ping interval: 30 seconds
- Pong timeout: 10 seconds
- Automatic reconnection on timeout

## Data Types

### Message
```typescript
interface Message {
  id: string;
  content: string;
  threadId: string;
  userId: string;
  parentId?: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}
```

### Thread
```typescript
interface Thread {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  participants: User[];
  lastMessage?: Message;
}
```

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}
```

### Attachment
```typescript
interface Attachment {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
}
``` 