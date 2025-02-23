# System Architecture & Context

> **Note**: This is the consolidated architecture documentation. Previous docs have been deprecated in favor of this unified document.

## Project Overview
// ... existing code ...

## System Architecture
### Core Components
- **Frontend**: Next.js 14, React 18, TypeScript 5
- **Backend**: Node.js 18, Socket.IO 4
- **Database**: PostgreSQL 15, Redis 7, Prisma 5
- **Infrastructure**: Docker, Kubernetes, AWS (S3/CloudFront)
- **Monitoring**: Prometheus, Grafana, OpenTelemetry

### API Design
#### REST Endpoints
- Authentication routes
- Message CRUD operations
- Thread management
- File uploads
- User management

#### WebSocket Events
- Real-time message delivery
- Presence tracking
- Typing indicators
- Read receipts
- Thread updates

### Server Implementation
#### Core Server
- Express.js based HTTP server
- Socket.IO for real-time communication
- Redis adapter for horizontal scaling
- Connection state recovery
- Health check system

#### WebSocket Architecture
- Room-based message routing
- Redis pub/sub for cross-instance communication
- Presence tracking with heartbeats
- Connection recovery with state restoration
- Rate limiting per action type

### Data Flow
1. **Message Flow**
   - Client sends message
   - WebSocket server receives
   - Validation & processing
   - Database persistence
   - Real-time broadcast
   - CDN integration for media

2. **State Management**
   - Redis for ephemeral data
   - PostgreSQL for persistence
   - In-memory caching
   - Optimistic updates

## Performance Considerations
- Message delivery < 100ms
- Connection recovery < 2s
- Search latency < 500ms
- File upload streaming
- CDN edge caching

## Scalability
- Horizontal scaling of WebSocket servers
- Database read replicas
- Redis cluster
- Load balancing
- Multi-region deployment

## Monitoring & Observability
- Prometheus metrics
- Grafana dashboards
- Error tracking
- Performance monitoring
- Resource utilization

## Future Considerations
- GraphQL API layer
- Event sourcing
- Message queue integration
- Enhanced caching strategies
- AI/ML features

---
> Previously documented in: `docs/CONTEXT.md`, `docs/api-routes.md`, `docs/server.md`, `docs/socket-lib.md` 