# Chat Application Data Model

## Core Entities

### User
- **Purpose**: Represents an authenticated user in the system
- **Properties**:
  - `id`: string (from Clerk)
  - `username`: string
  - `email`: string
  - `firstName`: string (optional)
  - `lastName`: string (optional)
  - `imageUrl`: string (optional)
  - `createdAt`: string (ISO date)
  - `updatedAt`: string (ISO date)
  - `lastLoginAt`: string (ISO date)
  - `isActive`: boolean

### Thread
- **Purpose**: Represents a chat conversation between users
- **Properties**:
  - `id`: string
  - `name`: string
  - `title`: string
  - `createdAt`: string (ISO date)
  - `updatedAt`: string (ISO date)
  - `lastMessageAt`: string (ISO date)
  - `creatorId`: string (references User)
  - `participants`: User[]
  - `messages`: Message[]
  - `isArchived`: boolean
  - `metadata`: Record<string, unknown>

### Message
- **Purpose**: Represents a single message within a thread
- **Properties**:
  - `id`: string
  - `content`: string
  - `threadId`: string (references Thread)
  - `userId`: string (references User)
  - `parentId`: string (optional, for replies)
  - `createdAt`: string (ISO date)
  - `updatedAt`: string (ISO date)
  - `status`: MessageStatus
  - `mentions`: string[] (user IDs)
  - `attachments`: Attachment[]
  - `metadata`: Record<string, unknown>
  - `user`: User (relation)
  - `thread`: Thread (relation)
  - `parent`: Message (optional relation)

### Attachment
- **Purpose**: Represents files or media attached to messages
- **Properties**:
  - `id`: string
  - `type`: 'image' | 'file' | 'link'
  - `url`: string
  - `mimeType`: string (optional)
  - `size`: number (optional)
  - `metadata`: Record<string, unknown>

## Supporting Types

### MessageStatus
- **Purpose**: Tracks the delivery state of messages
- **Values**: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

### TypingIndicator
- **Purpose**: Tracks user typing status
- **Properties**:
  - `userId`: string
  - `threadId`: string
  - `timestamp`: string (ISO date)

### PresenceInfo
- **Purpose**: Tracks user online status
- **Properties**:
  - `userId`: string
  - `status`: 'online' | 'offline'
  - `lastSeen`: string (ISO date)

## Relationships

1. **Thread to User** (Many-to-Many)
   - Through `participants` array
   - Each thread has multiple participants
   - Each user can be in multiple threads

2. **Message to Thread** (Many-to-One)
   - Each message belongs to one thread
   - Each thread can have multiple messages

3. **Message to User** (Many-to-One)
   - Each message has one sender
   - Each user can send multiple messages

4. **Message to Message** (One-to-Many)
   - Messages can have parent messages (replies)
   - Each message can have multiple replies

## Real-time Features

The model supports real-time features through:
- Message status updates
- Typing indicators
- Presence information
- Message delivery confirmations

## Data Flow

1. **Message Creation**:
   ```
   User -> Message (optimistic) -> Socket -> Server -> Database
                                                   -> Other Users
   ```

2. **Thread Updates**:
   ```
   Action -> Thread -> Participants -> Socket -> Connected Users
   ```

3. **Presence Updates**:
   ```
   User Status Change -> Socket -> Server -> Connected Users
   ``` 