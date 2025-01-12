# Troubleshooting Guide

## Common Issues

### 1. Authentication Problems

#### Symptoms
- 401 Unauthorized errors
- WebSocket connection failures
- User data not syncing

#### Solutions
1. **Check Clerk Configuration**
```bash
# Verify environment variables
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY

# Check .env.local
cat .env.local | grep CLERK
```

2. **Verify Token**
```typescript
// Debug middleware
console.log('Auth:', auth.userId, auth.user);
```

3. **Check User Sync**
```sql
-- Check user exists in database
SELECT * FROM "User" WHERE "clerkId" = 'user_id';
```

### 2. Database Connection Issues

#### Symptoms
- Prisma errors
- Slow queries
- Connection timeouts

#### Solutions
1. **Check Connection**
```bash
# Test database connection
nc -zv localhost 5432

# Check Prisma connection
npx prisma db push --preview-feature
```

2. **Verify Configuration**
```bash
# Check Docker container
docker ps | grep postgres
docker logs postgres

# Check connection string
echo $DATABASE_URL
```

3. **Reset Database**
```bash
# Reset Prisma
npx prisma migrate reset
npx prisma generate

# Reset Docker volume
docker-compose down -v
docker-compose up -d
```

### 3. WebSocket Problems

#### Symptoms
- Messages not real-time
- Typing indicators not working
- Presence status issues

#### Solutions
1. **Check WebSocket Server**
```bash
# Verify server running
docker ps | grep websocket
docker logs websocket

# Test connection
wscat -c ws://localhost:4000
```

2. **Debug Client Connection**
```typescript
socket.onAny((event, ...args) => {
  console.log('Socket Event:', event, args);
});
```

3. **Check Redis**
```bash
# Verify Redis
docker exec -it redis redis-cli
PING
KEYS *
```

### 4. Performance Issues

#### Symptoms
- Slow message loading
- High latency
- Memory usage alerts

#### Solutions
1. **Check Resource Usage**
```bash
# Monitor containers
docker stats

# Check logs
docker-compose logs --tail=100
```

2. **Database Optimization**
```sql
-- Check slow queries
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM "Message" WHERE "threadId" = 'id';
```

3. **Cache Verification**
```bash
# Check Redis memory
docker exec -it redis redis-cli info memory

# Clear cache if needed
docker exec -it redis redis-cli FLUSHALL
```

### 5. Development Environment

#### Symptoms
- Hot reload not working
- Build failures
- Type errors

#### Solutions
1. **Reset Environment**
```bash
# Clean install
rm -rf node_modules
npm install

# Clear Next.js cache
rm -rf .next
```

2. **Type Checking**
```bash
# Run TypeScript checks
npm run type-check

# Generate Prisma types
npx prisma generate
```

3. **Docker Reset**
```bash
# Full reset
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Debugging Tools

### 1. Logging
```typescript
// Enable debug logging
logger.level = 'debug';
logger.debug('Debug info:', { data });
```

### 2. Network Analysis
```bash
# Monitor network
docker network inspect chatapp_default

# Check ports
netstat -tulpn | grep LISTEN
```

### 3. Database Debugging
```bash
# Connect to database
docker exec -it postgres psql -U postgres -d chatapp

# Common queries
\dt  -- List tables
\d+ "User"  -- Describe table
```

## Monitoring

### 1. Health Checks
```bash
# API health
curl http://localhost:3000/api/health

# WebSocket health
curl http://localhost:4000/health
```

### 2. Metrics
```bash
# View metrics
curl http://localhost:3000/api/metrics

# Redis metrics
docker exec -it redis redis-cli info stats
```

### 3. Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f app
```

## Recovery Procedures

### 1. Data Recovery
```bash
# Backup database
docker exec postgres pg_dump -U postgres chatapp > backup.sql

# Restore database
cat backup.sql | docker exec -i postgres psql -U postgres chatapp
```

### 2. Service Recovery
```bash
# Restart specific service
docker-compose restart app

# Full system restart
docker-compose down
docker-compose up -d
```

### 3. State Reset
```bash
# Reset all state
docker-compose down -v
rm -rf .next
npm install
docker-compose up -d
``` 