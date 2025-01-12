# Chat Application Architecture

## Overview
This document outlines the architecture of our real-time chat application built with Next.js, Prisma, PostgreSQL, and Clerk authentication.

## System Architecture

```mermaid
graph TD
    A[Client/Frontend] --> B[Next.js API Routes]
    B --> C[Prisma/PostgreSQL]
    B --> D[Clerk Auth]
    A --> E[WebSocket Server]
    E --> C
    
    subgraph Database Models
        F[User] --> G[Thread]
        G --> H[Message]
        H --> I[Attachment]
        H --> J[Reaction]
        H --> K[MessageEdit]
    end
```

## Core Components

### 1. Authentication & User Management
- Clerk handles authentication and user identity
- Automatic user synchronization via middleware
- Session handling and security
- Profile management with customizable user profiles
- WebSocket authentication via Clerk user ID

### 2. API Structure
- RESTful endpoints with consolidated operations
- Thread operations (create, list, leave) in single endpoint
- Consistent error handling and response formats
- Rate limiting with Redis
- Automatic user data synchronization

### 3. Real-time Features
- WebSocket server for instant updates
- Message delivery status
- Typing indicators
- Online presence tracking
- Real-time thread updates

### 4. Data Models

```typescript
// Core models with their relationships
User {
  id: string
  clerkId: string
  email: string
  name: string
  image: string
  status: "ONLINE" | "OFFLINE"
  systemRole: "OWNER" | "ADMIN" | "MEMBER"
  threads: ThreadParticipant[]
}

Thread {
  id: string
  name: string
  participants: ThreadParticipant[]
  messages: Message[]
}

Message {
  id: string
  content: string
  threadId: string
  userId: string
  attachments: Attachment[]
  reactions: Reaction[]
  edits: MessageEdit[]
}
```

### 5. Security
- Authentication middleware for all routes
- Rate limiting per user/IP
- Input validation and sanitization
- File upload restrictions
- Role-based access control

### 6. Development Setup
- Docker Compose for all services
- Hot reload enabled
- TypeScript with strict mode
- ESLint and Prettier configuration
- Automated testing setup

## Environment Configuration
Required environment variables:
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# WebSocket
NEXT_PUBLIC_SOCKET_URL=ws://localhost:4000

# Redis
REDIS_URL=redis://localhost:6379
```

## Docker Services
```yaml
services:
  app:        # Next.js application (3000)
  websocket:  # WebSocket server (4000)
  postgres:   # Database (5432)
  redis:      # Cache & Rate Limiting (6379)
```

## API Endpoints

### /api/threads
- `GET`: List user's active threads
- `POST`: Create thread or leave thread
  ```typescript
  // Create thread
  POST /api/threads
  body: {
    action: 'create',
    name: string,
    participantIds: string[]
  }

  // Leave thread
  POST /api/threads
  body: {
    action: 'leave',
    threadId: string
  }
  ```

### /api/messages
- `GET`: Get thread messages
- `POST`: Send message
- `PATCH`: Edit message
- `DELETE`: Delete message

## Error Handling
Consistent error response format:
```typescript
{
  error: string,
  details?: string // Only in development
}
```

## Future Considerations
1. Message search functionality
2. File storage optimization
3. Read receipts
4. Thread archiving
5. User blocking 