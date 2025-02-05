# Data Flow Documentation

## System Overview

The chat application uses a multi-layered architecture with real-time communication capabilities. Below are the key data flows in the system.

## Message Flow

```mermaid
graph TD
    Client[Client Browser] -->|1. Send Message| WSS[WebSocket Server]
    Client -->|2. File Upload| API[API Server]
    WSS -->|3. Validate & Process| Auth[Auth Service]
    WSS -->|4. Store Message| DB[(PostgreSQL)]
    WSS -->|5. Cache Message| Redis[(Redis)]
    API -->|6. Store Files| S3[AWS S3]
    S3 -->|7. CDN Distribution| CDN[CloudFront CDN]
    WSS -->|8. Broadcast| Clients[Other Clients]
    Redis -->|9. Read Cache| WSS
    DB -->|10. Persist Data| WSS
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant Clerk
    participant Redis
    participant DB

    User->>Client: Login Request
    Client->>Clerk: Authenticate
    Clerk-->>Client: JWT Token
    Client->>API: API Request + Token
    API->>Clerk: Validate Token
    API->>Redis: Cache Session
    API->>DB: Log Access
    API-->>Client: Response
```

## Real-time Updates Flow

```mermaid
graph LR
    Client[Client] -->|1. Connect| WSS[WebSocket Server]
    WSS -->|2. Join Room| Redis[(Redis PubSub)]
    Client -->|3. User Action| WSS
    WSS -->|4. Broadcast| Redis
    Redis -->|5. Notify| WSS
    WSS -->|6. Update| Clients[Connected Clients]
```

## File Handling Flow

```mermaid
graph TD
    Client[Client] -->|1. Upload Request| API[API Server]
    API -->|2. Validate| Security[Security Scanner]
    API -->|3. Store| S3[AWS S3]
    S3 -->|4. Distribute| CDN[CloudFront CDN]
    API -->|5. Create Record| DB[(PostgreSQL)]
    API -->|6. Send Message| WSS[WebSocket Server]
    WSS -->|7. Notify| Clients[Other Clients]
    Clients -->|8. Download| CDN
```

## Data Storage Hierarchy

```mermaid
graph TD
    App[Application] -->|Hot Data| Redis[(Redis Cache)]
    App -->|Persistent Data| DB[(PostgreSQL)]
    App -->|File Storage| S3[AWS S3]
    App -->|Static Assets| CDN[CloudFront CDN]
    Redis -->|Expire| DB
    DB -->|Backup| S3
```

## Key Components

1. **Client Layer**
   - Next.js Frontend
   - React Components
   - WebSocket Client
   - Service Workers

2. **API Layer**
   - REST Endpoints
   - WebSocket Server
   - File Processing
   - Authentication

3. **Service Layer**
   - Message Processing
   - File Handling
   - User Management
   - Thread Management

4. **Storage Layer**
   - PostgreSQL (Primary Data)
   - Redis (Caching/PubSub)
   - S3 (File Storage)
   - CloudFront (CDN)

## Performance Considerations

- Redis caching for frequently accessed data
- WebSocket connection pooling
- CDN for static assets and files
- Database query optimization
- Message batching and throttling 