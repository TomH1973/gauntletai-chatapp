## Chat Application Project Context

### Stack
- Next.js 14.1.0
- Socket.IO
- Clerk (Auth)
- Prisma
- PostgreSQL 17

### Current State
- WebSocket server running on port 4000
- Next.js on port 3000
- Database authentication issues in `/api/auth/me` route
- WebSocket connection working but client auth failing

### Database Status
- PostgreSQL service running
- Credentials: postgres/postgres
- Connection URL: postgresql://postgres:postgres@localhost:5432/chatapp?schema=public
- Schema pushed and seeded with test data (Alice/Bob)
- Prisma Studio accessible but runtime connections failing

### Authentication Flow
1. Clerk handles user auth
2. `/api/auth/me` validates session
3. Prisma queries fail due to DB auth

### Critical Issues
1. PostgreSQL auth failing despite service running
2. Password resets attempted but inconsistent
3. Environment variables properly set but not taking effect

### Next Steps
1. Verify PostgreSQL connection with correct credentials
2. Ensure database exists and is accessible
3. Validate Prisma client generation
4. Test full auth flow

### Notes
- Multiple password attempts: postgres, ChatApp2024!
- Prisma Studio connects but app doesn't
- WebSocket test page shows connection
- Database seeded successfully but can't be queried 