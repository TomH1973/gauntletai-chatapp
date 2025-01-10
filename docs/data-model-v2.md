# Enhanced Chat Application Data Model

## Core Entities

### User
- Extends Clerk user with additional properties
- **New Properties**:
  - `roles`: Role[] (for permission management)
  - `preferences`: UserPreferences (for UI/notification settings)
  - `lastSeenAt`: Map<threadId, timestamp> (for read receipts)

### ThreadParticipant
- **Purpose**: Normalized many-to-many relationship
- **Properties**:
  - `threadId`: string
  - `userId`: string
  - `role`: 'owner' | 'admin' | 'member'
  - `joinedAt`: string (ISO date)
  - `lastReadAt`: string (ISO date)
  - `isActive`: boolean
  - `notifications`: 'all' | 'mentions' | 'none'

### Thread
- **Modified Properties**:
  - Remove `participants` array
  - Add `category`: string
  - Add `type`: 'direct' | 'group' | 'channel'
  - Add `settings`: ThreadSettings
  - Add `pinnedMessages`: string[] (message IDs)

### Message
- **Modified Properties**:
  - Add `editHistory`: MessageEdit[]
  - Add `readBy`: ReadReceipt[]
  - Add `replyCount`: number
  - Add `reactions`: Reaction[]
  - Change `status` tracking to MessageDelivery[]

### Supporting Types

### MessageDelivery
- **Purpose**: Track message delivery status per recipient
- **Properties**:
  - `messageId`: string
  - `userId`: string
  - `status`: MessageStatus
  - `timestamp`: string (ISO date)

### ReadReceipt
- **Purpose**: Track message read status
- **Properties**:
  - `userId`: string
  - `timestamp`: string (ISO date)

### MessageEdit
- **Purpose**: Track message edit history
- **Properties**:
  - `content`: string
  - `editedAt`: string (ISO date)
  - `editedBy`: string (user ID)

### Reaction
- **Purpose**: Track message reactions
- **Properties**:
  - `emoji`: string
  - `userId`: string
  - `timestamp`: string (ISO date)

## Indexing Strategy

1. **ThreadParticipant**:
   - Composite index on (userId, threadId)
   - Index on lastReadAt for unread queries

2. **Message**:
   - Index on threadId + createdAt for pagination
   - Full-text search index on content
   - Index on parentId for reply chains

## Caching Strategy

1. **Thread List**:
   - Cache user's recent threads
   - Cache thread metadata
   - Invalidate on thread updates

2. **Messages**:
   - Cache latest N messages per thread
   - Cache thread participants
   - Cache user presence

## Data Access Patterns

1. **Thread Listing**:
   ```sql
   SELECT t.*, tp.lastReadAt, 
          COUNT(DISTINCT m.id) FILTER (WHERE m.createdAt > tp.lastReadAt) as unreadCount
   FROM threads t
   JOIN thread_participants tp ON t.id = tp.threadId
   LEFT JOIN messages m ON t.id = m.threadId
   WHERE tp.userId = :userId AND tp.isActive = true
   GROUP BY t.id, tp.lastReadAt
   ORDER BY t.lastMessageAt DESC;
   ```

2. **Message Loading**:
   ```sql
   WITH RECURSIVE replies AS (
     SELECT m.*, 1 as depth
     FROM messages m
     WHERE m.threadId = :threadId AND m.parentId IS NULL
     
     UNION ALL
     
     SELECT m.*, r.depth + 1
     FROM messages m
     JOIN replies r ON m.parentId = r.id
     WHERE r.depth < 3
   )
   SELECT * FROM replies
   ORDER BY createdAt DESC
   LIMIT 50;
   ```

## Optimization Notes

1. **Denormalization**:
   - Store lastMessageAt in Thread
   - Store replyCount in Message
   - Store participant count in Thread

2. **Batch Operations**:
   - Bulk insert message deliveries
   - Batch update read receipts
   - Batch presence updates

3. **Cleanup Jobs**:
   - Archive inactive threads
   - Clean up typing indicators
   - Aggregate read receipts
   - Compress message edit history 