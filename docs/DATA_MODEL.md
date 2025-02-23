# Data Model & Schema

> **Note**: This is the consolidated data model documentation. Previous data model docs have been deprecated in favor of this unified document.

## Database Schema

### Core Entities

#### User
```prisma
model User {
  id            String    @id @default(cuid())
  clerkId       String    @unique
  name          String
  email         String    @unique
  avatar        String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  messages      Message[]
  threads       Thread[]  @relation("ThreadParticipants")
  reactions     Reaction[]
  readReceipts  ReadReceipt[]
}
```

#### Thread
```prisma
model Thread {
  id          String    @id @default(cuid())
  name        String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  messages    Message[]
  participants User[]   @relation("ThreadParticipants")
  metadata    Json?
  archived    Boolean   @default(false)
}
```

#### Message
```prisma
model Message {
  id          String    @id @default(cuid())
  content     String
  threadId    String
  userId      String
  parentId    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deleted     Boolean   @default(false)
  thread      Thread    @relation(fields: [threadId], references: [id])
  user        User      @relation(fields: [userId], references: [id])
  parent      Message?  @relation("MessageReplies", fields: [parentId], references: [id])
  replies     Message[] @relation("MessageReplies")
  reactions   Reaction[]
  attachments Attachment[]
  readReceipts ReadReceipt[]
}
```

### Supporting Entities

#### Attachment
```prisma
model Attachment {
  id          String    @id @default(cuid())
  messageId   String
  type        String
  url         String
  filename    String
  size        Int
  metadata    Json?
  createdAt   DateTime  @default(now())
  message     Message   @relation(fields: [messageId], references: [id])
}
```

#### Reaction
```prisma
model Reaction {
  id          String    @id @default(cuid())
  emoji       String
  messageId   String
  userId      String
  createdAt   DateTime  @default(now())
  message     Message   @relation(fields: [messageId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@unique([messageId, userId, emoji])
}
```

#### ReadReceipt
```prisma
model ReadReceipt {
  id          String    @id @default(cuid())
  messageId   String
  userId      String
  readAt      DateTime  @default(now())
  message     Message   @relation(fields: [messageId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@unique([messageId, userId])
}
```

## Redis Schema

### Ephemeral Data
- **Presence**: `presence:{userId}` → `{ status, lastSeen }`
- **Typing**: `typing:{threadId}:{userId}` → `timestamp`
- **Rate Limits**: `rate:{action}:{userId}` → `count`
- **Sessions**: `session:{sessionId}` → `{ userId, deviceId }`

### Caching
- **Messages**: `msg:{messageId}` → `MessageObject`
- **Threads**: `thread:{threadId}` → `ThreadObject`
- **User Data**: `user:{userId}` → `UserObject`
- **Reactions**: `reactions:{messageId}` → `ReactionsList`

### Pub/Sub Channels
- **Messages**: `messages:{threadId}`
- **Presence**: `presence:{threadId}`
- **Typing**: `typing:{threadId}`
- **Thread Updates**: `thread:{threadId}`

## Schema Evolution

### Version History
1. Initial Schema (v1.0)
   - Basic message and thread support
   - Simple user model
   - File attachments

2. Enhanced Schema (v2.0)
   - Added message threading
   - Reaction support
   - Read receipts
   - Improved user profiles

3. Current Schema (v3.0)
   - Advanced thread management
   - Rich message metadata
   - Enhanced file handling
   - Performance optimizations

### Migration Procedures
1. **Pre-migration**
   - Backup database
   - Validate data integrity
   - Estimate downtime

2. **Migration Steps**
   - Run schema updates
   - Transform data
   - Verify integrity
   - Update indexes

3. **Post-migration**
   - Verify application
   - Update caches
   - Monitor performance

## Performance Considerations

### Indexing Strategy
- Compound indexes for queries
- Full-text search indexes
- Temporal data indexing
- Selective indexing

### Query Optimization
- Efficient joins
- Pagination
- Eager loading
- Query caching
- Connection pooling

### Data Integrity
- Foreign key constraints
- Unique constraints
- Check constraints
- Triggers
- Validation rules

## Backup & Recovery

### Backup Strategy
- Daily full backups
- Continuous WAL archiving
- Point-in-time recovery
- Cross-region replication

### Recovery Procedures
- Data validation
- Integrity checks
- Incremental restore
- Cache warming

---
> Previously documented in: `docs/data-model.md`, `docs/data-model-v2.md`, `docs/database.md`, `SCHEMA_UPDATES.md` 