# Chat Application Documentation

## Quick Start
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development environment
docker-compose up
```

## Documentation Structure

```
docs/
├── api/              # API documentation
├── architecture/     # System architecture
├── database/        # Database schema and migrations
├── error-handling/  # Error handling patterns
├── guides/          # Developer guides
├── hooks/           # React hooks documentation
├── planning/        # Project planning documents
│   └── IMPLEMENTATION_CHECKLIST.md  # Step-by-step implementation plan
├── schema/          # Data validation schemas
├── security/        # Security considerations
├── setup/           # Setup instructions
└── types/           # TypeScript type definitions
```

## Core Concepts

### 1. API Layer
- Type-safe endpoints using Zod validation
- Centralized error handling via `lib/api.ts`
- Rate limiting and authentication middleware
- WebSocket integration for real-time features

Example usage:
```typescript
import { withAuth, ApiResponse, ApiError } from '@/lib/api';
import { z } from 'zod';

const InputSchema = z.object({
  // ... your validation schema
});

export const POST = withAuth(async (req, user) => {
  const result = InputSchema.safeParse(await req.json());
  if (!result.success) {
    return ApiResponse.error(ApiError.BadRequest, 400, result.error);
  }
  // ... your handler logic
});
```

### 2. Authentication & Authorization
- Clerk-based authentication
- Automatic user synchronization
- Role-based access control
- WebSocket authentication

### 3. Real-time Features
- WebSocket server for instant updates
- Typing indicators
- Online presence
- Message delivery status

### 4. Database Access
- Prisma ORM with PostgreSQL
- Common query patterns in `lib/api.ts`
- Redis for caching and rate limiting
- Type-safe database operations

### 5. Error Handling
Consistent error format across the application:
```typescript
{
  error: string;    // One of ApiError types
  details?: any;    // Additional details in development
}
```

## Key Files

### `lib/api.ts`
Central API utilities including:
- Authentication wrapper
- Error handling
- Rate limiting
- Common database queries

### `middleware.ts`
Global middleware handling:
- Authentication
- User synchronization
- WebSocket upgrades
- Rate limiting

### API Routes
All routes follow the pattern:
```typescript
import { withAuth } from '@/lib/api';
import { z } from 'zod';

const ValidationSchema = z.object({...});

export const handler = withAuth(async (req, user) => {
  // 1. Validate input
  // 2. Perform operation
  // 3. Return response
});
```

## Development Workflow

1. **Starting the Environment**
   ```bash
   docker-compose up
   ```

2. **Making Changes**
   - Follow TypeScript strict mode
   - Add Zod validation for all inputs
   - Use `withAuth` for protected routes
   - Add tests for new features

3. **Testing**
   ```bash
   # Run all tests
   npm test
   
   # Run specific test
   npm test -- path/to/test
   ```

## Common Patterns

### Error Handling
```typescript
try {
  // Your logic
} catch (error) {
  return ApiResponse.error(ApiError.ServerError, 500, error);
}
```

### Rate Limiting
```typescript
const withinLimit = await checkRateLimit(
  `rate_limit:${user.id}`,
  100,  // limit
  60    // window in seconds
);
```

### Database Queries
```typescript
const data = await prisma.someModel.findMany({
  include: CommonIncludes.someInclude
});
```

## Contributing
1. Create a feature branch
2. Add tests
3. Update documentation
4. Submit PR

## Additional Resources
- [Architecture Details](./architecture/README.md)
- [API Documentation](./api/README.md)
- [Security Guide](./security/README.md)
- [Database Schema](./database/README.md) 