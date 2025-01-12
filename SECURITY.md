# Security Features

## Authentication & Authorization

### Role-Based Access Control (RBAC)
- System-wide roles: OWNER, ADMIN, MEMBER
- Role hierarchy with inheritance
- Permission checks in all protected routes
- Thread-level participant roles

### Rate Limiting
- Per-endpoint rate limits
- IP-based tracking
- Configurable windows and limits
- Fail-open design for reliability

### Input Validation & Sanitization
- Strict schema validation using Zod
- HTML content sanitization
- Type-safe request handling
- Markdown security measures

## Configuration

### Rate Limits
```typescript
const API_RATE_LIMITS = {
  '/api/messages': { maxRequests: 120, window: 60 },  // 120 requests per minute
  '/api/threads': { maxRequests: 60, window: 60 },    // 60 requests per minute
  '/api/auth': { maxRequests: 30, window: 60 }        // 30 requests per minute
};
```

### Allowed HTML Tags
```typescript
const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];
```

## Security Best Practices

### Authentication Flow
1. Clerk handles initial authentication
2. Session validation in middleware
3. Role-based permission checks
4. Thread participation verification

### WebSocket Security
- Authentication required for connection
- Rate limiting on socket events
- User ID verification
- Secure upgrade handling

### Data Protection
- Input sanitization before storage
- Type-safe database operations
- Proper error handling
- Secure error messages

## Environment Configuration
Required environment variables for security features:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret

# Redis Rate Limiting
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_token  # Optional for production

# Session Security
SESSION_SECRET=your_secret
```

## Security Headers
The application sets the following security headers:
- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset
- Retry-After (when rate limited)

## Error Handling
- Sanitized error messages
- No sensitive data in responses
- Proper status codes
- Detailed server-side logging 