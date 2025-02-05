# Sequence Diagrams

This document contains sequence diagrams illustrating key flows in the chat application.

## Message Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket Server
    participant API as API Server
    participant DB as Database
    participant S3 as File Storage
    participant CDN as CloudFront CDN

    C->>WS: Connect(token)
    WS->>WS: Validate Token
    WS-->>C: Connected

    C->>WS: Join Thread(threadId)
    WS->>DB: Get Thread
    WS-->>C: Thread Joined

    C->>API: POST /api/upload
    API->>S3: Upload File
    S3->>CDN: Distribute File
    API-->>C: File URL

    C->>WS: Send Message(content, attachments)
    WS->>DB: Save Message
    WS-->>C: Message Sent
    WS->>WS: Broadcast to Thread
    WS-->>C: New Message Event
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant Clerk as Clerk Auth
    participant API as API Server
    participant DB as Database

    C->>Clerk: Login Request
    Clerk-->>C: JWT Token
    
    C->>API: API Request + Token
    API->>API: Validate Token
    API->>DB: Get User
    DB-->>API: User Data
    API-->>C: Response
```

## Real-time Updates Flow

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant WS as WebSocket Server
    participant DB as Database
    participant Redis as Redis PubSub

    C1->>WS: typing:start
    WS->>Redis: Publish Event
    Redis->>WS: Broadcast Event
    WS-->>C2: typing:update

    C1->>WS: Send Message
    WS->>DB: Save Message
    WS->>Redis: Publish Message
    Redis->>WS: Broadcast Message
    WS-->>C2: message:new
```

## File Handling Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant S3 as AWS S3
    participant CDN as CloudFront
    participant DB as Database

    C->>API: Upload Request
    API->>API: Validate File
    API->>S3: Upload File
    S3-->>API: File URL
    API->>CDN: Generate URL
    API->>DB: Save Attachment
    API-->>C: CDN URL

    C->>CDN: Get File
    CDN->>S3: Fetch File
    S3-->>CDN: File Content
    CDN-->>C: Optimized Content
```

## Data Storage Hierarchy

```mermaid
graph TD
    A[Client] --> B[API Layer]
    B --> C[Service Layer]
    C --> D[PostgreSQL]
    C --> E[Redis Cache]
    C --> F[AWS S3]
    F --> G[CloudFront CDN]
```

## Key Components

```mermaid
graph LR
    A[Client Layer] --> |HTTP/WS| B[API Layer]
    B --> |Business Logic| C[Service Layer]
    C --> |Data Access| D[Storage Layer]
    D --> E[PostgreSQL]
    D --> F[Redis]
    D --> G[S3/CloudFront]
``` 