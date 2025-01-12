# Migration and Upgrade Guide

## Database Migrations

### Creating Migrations

1. **Generate Migration**
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Preview changes
npx prisma migrate diff
```

2. **Migration Structure**
```sql
-- Example migration
-- migrations/YYYYMMDDHHMMSS_migration_name.sql
BEGIN;

-- Add new table
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    PRIMARY KEY ("id")
);

-- Add column to existing table
ALTER TABLE "Message"
ADD COLUMN "featureId" TEXT REFERENCES "Feature"("id");

COMMIT;
```

3. **Testing Migrations**
```bash
# Test migration
npx prisma migrate reset --preview-feature
npx prisma db push --preview-feature

# Verify data
npx prisma studio
```

### Applying Migrations

1. **Development**
```bash
# Apply pending migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset
```

2. **Production**
```bash
# Deploy migrations safely
npx prisma migrate deploy

# Verify deployment
npx prisma migrate status
```

3. **Rollback Procedures**
```bash
# Create rollback migration
npx prisma migrate diff --from-schema-datamodel prev.prisma --to-schema-datamodel schema.prisma

# Manual rollback
psql $DATABASE_URL -f rollback.sql
```

## Version Upgrades

### 1. Dependency Updates

#### Node.js and npm
```bash
# Update Node.js
nvm install 18
nvm use 18

# Update npm
npm install -g npm@latest
```

#### Project Dependencies
```bash
# Check outdated packages
npm outdated

# Update packages
npm update

# Update specific package
npm install package@latest
```

### 2. Framework Updates

#### Next.js
```bash
# Update Next.js
npm install next@latest react@latest react-dom@latest

# Check breaking changes
next-repo-upgrade check

# Apply codemods
npx @next/codemod@latest new-link ./app
```

#### Prisma
```bash
# Update Prisma
npm install prisma@latest @prisma/client@latest

# Reset generation
npm run prisma:generate
```

### 3. Infrastructure Updates

#### Docker Images
```bash
# Update base images
docker-compose pull

# Rebuild containers
docker-compose build --no-cache

# Apply updates
docker-compose up -d
```

#### Database Updates
```bash
# Backup before upgrade
pg_dump -U postgres chatapp > pre_upgrade_backup.sql

# Update PostgreSQL
docker-compose down
# Update version in docker-compose.yml
docker-compose up -d

# Verify upgrade
docker exec -it postgres psql -U postgres -c "SELECT version();"
```

## Feature Migrations

### 1. WebSocket Protocol Updates

#### Client Updates
```typescript
// Old connection
const socket = io('ws://localhost:4000');

// New connection with version
const socket = io('ws://localhost:4000', {
  query: { version: '2' }
});
```

#### Server Updates
```typescript
// Handle multiple versions
io.on('connection', (socket) => {
  const version = socket.handshake.query.version;
  if (version === '2') {
    // New protocol handlers
  } else {
    // Legacy protocol handlers
  }
});
```

### 2. API Version Migration

#### Request Versioning
```typescript
// Version header check
const version = req.headers['api-version'] || '1';
if (version === '2') {
  // New handler
} else {
  // Legacy handler
}
```

#### Response Format Migration
```typescript
// Gradual migration
function formatResponse(data, version) {
  if (version === '2') {
    return {
      data,
      meta: {
        version: '2',
        timestamp: new Date().toISOString()
      }
    };
  }
  return data; // Legacy format
}
```

## Testing Migrations

### 1. Unit Tests
```bash
# Run migration tests
npm test migrations/

# Test specific migration
npm test migrations/feature_name.test.ts
```

### 2. Integration Tests
```bash
# Test full flow
npm run test:integration

# Test specific feature
npm test:integration feature_name
```

### 3. Load Tests
```bash
# Run load tests
npm run test:load

# Monitor during migration
npm run monitor
```

## Deployment Checklist

### 1. Pre-deployment
- [ ] Backup database
- [ ] Test migrations locally
- [ ] Update documentation
- [ ] Prepare rollback plan
- [ ] Notify users

### 2. Deployment
- [ ] Apply database migrations
- [ ] Update application code
- [ ] Update dependencies
- [ ] Verify health checks
- [ ] Monitor metrics

### 3. Post-deployment
- [ ] Verify functionality
- [ ] Check error rates
- [ ] Monitor performance
- [ ] Update status page
- [ ] Clean up old data 