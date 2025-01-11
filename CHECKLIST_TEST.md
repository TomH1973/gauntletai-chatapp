# 🧪 Chat Application Testing Checklist

> **Purpose**: Systematic verification of core functionality and critical paths
> **Method**: Manual testing with local environment
> **Priority**: Top-down, focusing on user-facing features first

## 1. Connection & Authentication 🔌
- [x] Initial Connection Flow
  - [x] Clean database state
    - ✓ Schema updated with real-time features
    - ✓ Test data seeded (Alice & Bob)
    - ✓ Prisma Studio verified
  - [x] Start server (`npm run dev`)
    - ✓ Next.js running on :3000
    - ✓ WebSocket server on :4000
    - ✓ Concurrent execution working
  - [x] Verify WebSocket connection in dev tools
    - ✓ Connection established on :4000
    - ✓ Status indicator visible (green dot)
    - ✓ Test page functional
    - ✓ Client connection confirmed
  - [x] Confirm Clerk authentication redirect
    - ✓ Middleware setup complete
    - ✓ Auth error resolved
    - ✓ Protected routes redirecting
    - ✓ Public routes accessible
  - [x] Validate session persistence
    - ✓ Token refresh (15min/7d)
    - ✓ Session timeout (24h)
    - ✓ Multi-tab behavior
    - ✓ Inactivity handling (30min)
    - ✓ Max sessions (5)

- [x] Reconnection Scenarios
  - [x] Test server restart recovery
    - ✓ Auto-reconnection
    - ✓ State recovery
  - [x] Verify client reconnection after sleep
    - ✓ Connection reestablished
    - ✓ Session restored
  - [x] Check state recovery after disconnect
    - ✓ Message queue processed
    - ✓ Presence status updated
  - [x] Validate presence status sync
    - ✓ Online/offline tracking
    - ✓ Last seen timestamps
    - ✓ Multi-device sync

## 2. Message Operations 💬
- [ ] Basic Messaging
  - [ ] Send plain text message
  - [ ] Verify real-time delivery
  - [ ] Check message persistence
  - [ ] Confirm optimistic updates
  - [ ] Validate status indicators

- [ ] Edge Cases
  - [ ] Send maximum length message (4000 chars)
  - [ ] Test rapid message sequence
  - [ ] Verify rate limiting triggers
  - [ ] Check offline message queue
  - [ ] Test concurrent edits

## 3. Thread Management 🗂️
- [ ] Thread Operations
  - [ ] Create new thread
  - [ ] Add participant (MEMBER role)
  - [ ] Promote to ADMIN
  - [ ] Remove participant
  - [ ] Verify role permissions

- [ ] Participant Scenarios
  - [ ] Test OWNER privileges
  - [ ] Verify ADMIN limitations
  - [ ] Check MEMBER restrictions
  - [ ] Test multi-user presence
  - [ ] Validate typing indicators

## 4. Real-time Features ⚡
- [ ] Presence System
  - [ ] Verify online status updates
  - [ ] Check last seen timestamps
  - [ ] Test multi-tab behavior
  - [ ] Validate presence sync
  - [ ] Check status persistence

- [ ] Live Updates
  - [ ] Test typing indicators
  - [ ] Verify read receipts
  - [ ] Check message status sync
  - [ ] Test participant updates
  - [ ] Validate thread updates

## 5. Error Handling 🚨
- [ ] Network Scenarios
  - [ ] Test slow connection (throttle in dev tools)
  - [ ] Verify timeout handling
  - [ ] Check error state recovery
  - [ ] Test offline mode
  - [ ] Validate retry logic

- [ ] Input Validation
  - [ ] Test XSS prevention
  - [ ] Verify SQL injection protection
  - [ ] Check file upload limits
  - [ ] Test content moderation
  - [ ] Validate input sanitization

## Test Environment Setup 🛠️
1. Prerequisites
   ```bash
   npm install
   npm run build
   ```

2. Database Reset
   ```bash
   npx prisma db push --force-reset
   npx prisma db seed
   ```

3. Environment Variables
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   DATABASE_URL="postgresql://..."
   ```

## Validation Commands 🖥️
- Check Types: `npm run type-check`
- Verify Build: `npm run build`
- Start Dev: `npm run dev`
- Reset DB: `npx prisma db push --force-reset`

## Error Codes Reference 📝
- `CONN_001`: WebSocket connection failed
- `AUTH_001`: Authentication failed
- `MSG_001`: Message delivery failed
- `THR_001`: Thread operation failed
- `PRES_001`: Presence sync failed

## Notes
- Test each feature in isolation first
- Verify error states before success paths
- Document unexpected behaviors
- Focus on user-facing features first
- Use network throttling for edge cases

## Success Criteria ✅
1. All core paths function without errors
2. Real-time features sync across clients
3. Error states recover gracefully
4. No type errors in console
5. All roles function as designed 