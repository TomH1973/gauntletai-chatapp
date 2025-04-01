# Chat App with AI Integration

A real-time chat application featuring JWT authentication, PostgreSQL persistence, and WebSocket communication.

![Chat Application Screenshot](https://via.placeholder.com/800x450.png?text=Chat+App+Screenshot)

## Features

- **User Authentication**: Secure login and registration with JWT
- **Real-time Messaging**: Instant communication using Socket.IO
- **Database Persistence**: Message history saved in PostgreSQL using Prisma ORM
- **Modern UI**: Clean, responsive interface built with React
- **Deployment Ready**: Configured for Railway and AWS deployment paths

## Development Setup

### Prerequisites

- **Node.js**: v18 or later
- **PostgreSQL**: v16 or later
- **Redis**: v7 or later
- **Windows Subsystem for Linux (WSL2)**: For development on Windows
- **Docker**: For containerized setup

### Quick Start (WSL)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd chatapp
   ```

2. **Start with Docker Compose** (recommended):
   ```bash
   # Build and start all services with hot-reloading
   npm run wsl:docker:build
   npm run wsl:docker:dev
   ```
   This will start the entire stack with hot-reloading enabled. Any changes to the server or client code will be automatically reflected without needing to restart.

3. **Manual Setup**:
   ```bash
   # Install dependencies
   npm install
   cd server && npm install && cd ..

   # Start PostgreSQL and Redis services
   npm run wsl:docker:db
   npm run wsl:docker:redis

   # In a new terminal, run the application with hot-reloading
   npm run wsl:dev
   ```

### Development Workflow

For the best development experience with hot-reloading:

1. **Environment Setup**:
   - Create a `.env` file by copying `.env.example`
   - Add the `.env.hot-reload` variables to your environment if needed
   
2. **Start Development Servers**:
   - Use `npm run wsl:dev` for the standard WSL development with hot-reloading
   - For Docker-based development, use `npm run wsl:docker:dev`
   
3. **Hot-Reloading**:
   - Client-side code changes will instantly refresh in the browser
   - Server-side changes will automatically restart the server
   - File watching is optimized for WSL

4. **Database Changes**:
   - After modifying the Prisma schema, run `npm run wsl:db:migrate`
   - Access the database UI with `npm run db:studio`

### Environment Setup

1. **Create a .env file**:
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables**:
   Edit the .env file with your specific settings for database, Redis, etc.

### Accessing the Application

- **Web Client**: http://localhost:3000
- **API Server**: http://localhost:3001
- **WebSocket Server**: ws://localhost:4000
- **Database UI**: http://localhost:5555 (after running `npm run db:studio`)

## Development Commands

### Docker Compose (Recommended)

```bash
# Start all services
npm run wsl:docker:dev

# Start database only
npm run wsl:docker:db

# Start redis only
npm run wsl:docker:redis

# Rebuild containers
npm run wsl:docker:build

# Stop all services
npm run wsl:docker:down
```

### Manual Development

```bash
# Start both client and server
npm run wsl:dev

# Start server only
npm run wsl:server

# Start client only
npm run wsl:client

# Database commands
npm run wsl:db:migrate  # Apply migrations
npm run wsl:db:generate # Generate Prisma client
npm run db:studio       # Launch Prisma Studio UI
```

### Testing

```bash
# Run client tests
npm test

# Run specific client test
npm test -- -t "test name pattern"

# Run server tests
cd server && npm test

# Run specific server test
cd server && npm test -- -t "test name pattern"
```

### Cleanup Commands

```bash
# Clean node_modules
npm run clean:dev

# Remove redundant code directory
npm run clean:chatappmvp
```

## Deployment

### Railway Deployment (Free Tier)

1. **Initialize and Configure Railway**:
   ```bash
   # Install Railway CLI and log in
   npm i -g @railway/cli
   railway login
   
   # Initialize Railway project
   npm run deploy:railway:setup
   ```

2. **Deploy**:
   ```bash
   npm run deploy:railway
   ```

### AWS Deployment (Production)

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed AWS ECS/Fargate deployment instructions.

## Project Structure

```
chatapp/
├── server/                   # Backend server code
│   ├── index.js              # Server entry point
│   ├── routes/               # API routes
│   ├── middleware/           # Authentication middleware 
│   ├── services/             # Business logic
│   ├── sockets/              # WebSocket handlers
│   └── prisma/               # Database schema and migrations
├── src/                      # Frontend React code
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks 
│   ├── lib/                  # Utilities and helpers
│   └── types/                # TypeScript type definitions
├── docker-compose.wsl.yml    # Docker configuration
├── railway.json              # Railway deployment config
└── ROADMAP.md                # Project roadmap and cleanup plan
```

## Documentation

- [API Documentation](docs/api/README.md)
- [WebSocket Events](docs/api/WEBSOCKET.md)
- [Database Schema](docs/database/schema.md)

## Troubleshooting

See [TROUBLESHOOTING.md](docs/guides/TROUBLESHOOTING.md) for common issues and solutions.