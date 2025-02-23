# Chat Application

A real-time chat application built with Next.js, WebSocket, and TypeScript.

## Project Status

⚠️ **Critical Issues**
- WebSocket stability issues (frequent disconnects, see [Performance Tuning Guide](docs/guides/PERFORMANCE_TUNING.md))
- Incomplete security implementation
- Missing rate limiting
- Insufficient error handling

See [CHECKLIST.md](CHECKLIST.md) for detailed status and next steps.

## Documentation Structure

### Core Documentation
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) - System design, API, and implementation details
- [`CHECKLIST.md`](CHECKLIST.md) - Project status and critical issues ⚠️
- [`SECURITY.md`](docs/SECURITY.md) - Security architecture and implementation
- [`PERFORMANCE_TUNING.md`](docs/guides/PERFORMANCE_TUNING.md) - Performance optimization and issues
- [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) - Deployment and infrastructure guides

### Additional Resources
- [`guides/`](docs/guides/) - Implementation guides and troubleshooting
- [`diagrams/`](docs/diagrams/) - System architecture diagrams
- [`api/`](docs/api/) - API documentation

> Note: Documentation is being consolidated. Some files may be outdated.

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
- **Testing**: Jest, Cypress, k6 (performance testing)

## Development

```bash
# Run tests
npm test

# Run performance tests (requires k6)
npm run test:perf

# Run linting
npm run lint

# Run type checking
npm run type-check

# Format code
npm run format
```

For detailed performance testing instructions, see [Performance Tuning Guide](docs/guides/PERFORMANCE_TUNING.md).

## Contributing

Please read our [Contributing Guidelines](docs/guides/CONTRIBUTING.md) before submitting a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 