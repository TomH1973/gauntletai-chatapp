# Database Schema Documentation

## Core Tables

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_image VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

### Threads
```sql
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  is_direct BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_threads_last_message ON threads(last_message_at DESC);
```

### Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'sent',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_thread ON messages(thread_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_parent ON messages(parent_id);
```

## Relationship Tables

### ThreadParticipants
```sql
CREATE TABLE thread_participants (
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  last_read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX idx_thread_participants_user ON thread_participants(user_id);
```

### MessageAttachments
```sql
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  url VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_attachments ON message_attachments(message_id);
```

## Indexing Strategy

### Primary Indexes
- UUID primary keys for all tables
- Composite keys for junction tables
- Foreign key indexes automatically created

### Performance Indexes
1. Message Retrieval
   - Thread-based message lookup
   - User message history
   - Parent-child relationships

2. Thread Access
   - Last message timestamp for sorting
   - Participant lookup
   - Unread message counting

3. User Lookup
   - Email and username uniqueness
   - Authentication queries
   - Profile searches

## Constraints

### Foreign Keys
```sql
ALTER TABLE messages
  ADD CONSTRAINT fk_message_thread
  FOREIGN KEY (thread_id)
  REFERENCES threads(id)
  ON DELETE CASCADE;

ALTER TABLE thread_participants
  ADD CONSTRAINT fk_participant_thread
  FOREIGN KEY (thread_id)
  REFERENCES threads(id)
  ON DELETE CASCADE;
```

### Unique Constraints
```sql
ALTER TABLE users
  ADD CONSTRAINT uq_users_email
  UNIQUE (email);

ALTER TABLE users
  ADD CONSTRAINT uq_users_username
  UNIQUE (username);
```

## Performance Considerations

### 1. Connection Pool
```typescript
const poolConfig = {
  max: 20,              // max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

### 2. Query Optimization
- Use prepared statements
- Implement connection pooling
- Leverage appropriate indexes
- Monitor query performance

### 3. Data Archival
```sql
CREATE TABLE archived_messages (
  LIKE messages INCLUDING ALL
);

CREATE TABLE archived_threads (
  LIKE threads INCLUDING ALL
);
```

## Migrations

### Version Control
- Sequential migration files
- Up and down migrations
- Transaction wrapping
- Data validation

### Example Migration
```typescript
export async function up(db: Prisma.TransactionClient) {
  await db.$executeRaw`
    ALTER TABLE messages
    ADD COLUMN metadata JSONB;
    
    CREATE INDEX idx_messages_metadata
    ON messages USING gin (metadata);
  `;
}

export async function down(db: Prisma.TransactionClient) {
  await db.$executeRaw`
    DROP INDEX idx_messages_metadata;
    ALTER TABLE messages DROP COLUMN metadata;
  `;
}
```

## Monitoring

### 1. Performance Metrics
- Query execution time
- Index usage statistics
- Cache hit ratios
- Connection pool status

### 2. Health Checks
```sql
SELECT 1;  -- Basic connectivity
SELECT COUNT(*) FROM pg_stat_activity;  -- Connection count
SELECT now() - pg_postmaster_start_time() as uptime;  -- Uptime
```

### 3. Maintenance
- Regular VACUUM
- Index maintenance
- Statistics updates
- Connection management 