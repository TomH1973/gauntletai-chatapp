-- Optimize Message Retrieval
CREATE INDEX "idx_messages_thread_status_created" ON "Message"("threadId", "status", "createdAt" DESC);
CREATE INDEX "idx_messages_user_created" ON "Message"("userId", "createdAt" DESC);
CREATE INDEX "idx_messages_parent_created" ON "Message"("parentId", "createdAt" DESC);
CREATE INDEX "idx_messages_content_gin" ON "Message" USING gin(to_tsvector('english', content));

-- Optimize Thread Access
CREATE INDEX "idx_threads_last_message_created" ON "Thread"("lastMessageAt" DESC, "createdAt" DESC);
CREATE INDEX "idx_thread_participants_user_joined" ON "ThreadParticipant"("userId", "joinedAt" DESC);
CREATE INDEX "idx_thread_participants_thread_role" ON "ThreadParticipant"("threadId", "role");

-- Optimize User Lookup
CREATE INDEX "idx_users_active_last_login" ON "User"("isActive", "lastLoginAt" DESC);
CREATE INDEX "idx_users_username_trgm" ON "User" USING gin(username gin_trgm_ops);

-- Optimize Message Edits
CREATE INDEX "idx_message_edits_message_created" ON "MessageEdit"("messageId", "createdAt" DESC);

-- Optimize Reactions
CREATE INDEX "idx_reactions_message_count" ON "Reaction"("messageId", "count" DESC);

-- Add partial indexes for common queries
CREATE INDEX "idx_messages_unread" ON "Message"("threadId", "createdAt" DESC) 
WHERE status IN ('SENT', 'DELIVERED');

CREATE INDEX "idx_threads_active" ON "Thread"("lastMessageAt" DESC) 
WHERE "lastMessageAt" > NOW() - INTERVAL '30 days';

-- Add extensions if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Update table statistics
ANALYZE "Message";
ANALYZE "Thread";
ANALYZE "User";
ANALYZE "ThreadParticipant";
ANALYZE "MessageEdit";
ANALYZE "Reaction"; 