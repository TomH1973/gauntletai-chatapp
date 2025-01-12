# Chat Application

A real-time chat application built with Next.js, Socket.IO, and PostgreSQL.

## Quick Start

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development environment
docker-compose up -d

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run dev
```

## Documentation

### 1. Getting Started
- [Project Overview](docs/README.md)
- [Architecture Overview](docs/architecture/system-overview.md)
- [Development Setup](docs/setup/README.md)
- [Contributing Guidelines](docs/guides/CONTRIBUTING.md)

### 2. Core Features
- [Authentication](docs/api/README.md#authentication)
- [Real-time Communication](docs/architecture/data-flow.md)
- [Message Threading](docs/schema/README.md#message-threading)
- [File Handling](docs/architecture/system-overview.md#file-handling)

### 3. Technical Documentation
- [API Reference](docs/api/README.md)
- [Database Schema](docs/database/README.md)
- [Component Library](docs/components/index.md)
- [Error Handling](docs/error-handling/taxonomy.md)

### 4. Guides
- [Troubleshooting](docs/guides/TROUBLESHOOTING.md)
- [Migration Guide](docs/guides/MIGRATIONS.md)
- [Security Guidelines](docs/guides/security.md)
- [Performance Optimization](docs/architecture/data-flow.md#performance-considerations)

### 5. Deployment
- [Deployment Guide](docs/deployment/README.md)
- [Monitoring Setup](docs/monitoring/README.md)
- [Security Checklist](docs/security/README.md)
- [Backup & Recovery](docs/guides/TROUBLESHOOTING.md#recovery-procedures)

## Key Features

- Real-time messaging with WebSocket support
- Message threading and replies
- File attachments and media preview
- Rich text support with markdown
- @mentions and notifications
- Emoji reactions
- User presence and typing indicators
- Search functionality
- Error handling and recovery
- Performance monitoring

## Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Node.js, Socket.IO, Prisma ORM
- **Database**: PostgreSQL 15, Redis 7
- **Authentication**: Clerk
- **Monitoring**: Prometheus, Grafana
- **Testing**: Jest, Cypress

## Development

```bash
# Run tests
npm test

# Run linting
npm run lint

# Run type checking
npm run type-check

# Format code
npm run format
```

## Contributing

Please read our [Contributing Guidelines](docs/guides/CONTRIBUTING.md) before submitting a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 