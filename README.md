# Chat App with AI Integration

A real-time chat application featuring AI responses, JWT authentication, and PostgreSQL persistence.

![Chat Application Screenshot](https://via.placeholder.com/800x450.png?text=Chat+App+Screenshot)

## Features

- **User Authentication**: Secure login and registration with JWT
- **Real-time Messaging**: Instant communication using Socket.IO
- **AI Responses**: Automatic AI-generated replies to user messages
- **Database Persistence**: Message history saved in PostgreSQL using Prisma ORM
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
  - [Environment Setup](#environment-setup)
  - [Database Configuration](#database-configuration)
  - [Application Installation](#application-installation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [AI Integration](#ai-integration)
- [Troubleshooting](#troubleshooting)
- [Development Guide](#development-guide)
- [License](#license)

## Prerequisites

- **Node.js**: v14 or later
- **PostgreSQL**: v12 or later
- **Windows Subsystem for Linux (WSL2)**: For development on Windows
- **Docker** (optional): For containerized setup

## Quick Start

For Windows users, we provide a simple launcher script to get started quickly:

```bash
# Just run the batch file and follow the prompts
start-app.bat
```

This launcher will guide you through setting up and running the application in WSL.

## Detailed Setup

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd chatapp
   ```

2. **Install WSL2 (Windows users)**:
   If not already installed, run in an administrator PowerShell:
   ```powershell
   wsl --install
   ```
   After installation, restart your computer.

3. **Run the setup script**:
   ```bash
   # Windows users
   start-app.bat
   # Then select option 6 to run the setup script
   
   # Linux/WSL users
   chmod +x wsl-setup.sh
   ./wsl-setup.sh
   ```

### Database Configuration

1. **Start PostgreSQL**:
   ```bash
   # Using Docker (recommended)
   npm run wsl:docker:db
   
   # Or run a standalone PostgreSQL instance
   docker run -d -p 5432:5432 --name chatapp-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_DB=chatapp \
     postgres:latest
   ```

2. **Update database connection**:
   Edit `server/.env` to match your PostgreSQL configuration:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatapp"
   ```
   
   *Note for WSL users*: If connecting to a Windows PostgreSQL instance, try:
   ```
   DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/chatapp"
   ```

3. **Initialize the database**:
   ```bash
   npm run wsl:db:migrate
   ```

### Application Installation

1. **Install dependencies**:
   ```bash
   # For both client and server
   npm install
   
   # Server only
   cd server && npm install
   ```

2. **Generate Prisma client**:
   ```bash
   npm run wsl:db:generate
   ```

## Running the Application

### Using the Windows Launcher (Recommended for Windows users)

```bash
start-app.bat
```

Then select the option you want:
1. Start development environment (server + client)
2. Start server only
3. Start client only
4. Start PostgreSQL database only
5. Start Docker Compose environment
6. Run setup script

### Using npm scripts (All platforms)

```bash
# Start both server and client
npm run wsl:dev

# Start server only
npm run wsl:server

# Start client only
npm run wsl:client

# Using Docker Compose (full environment)
npm run wsl:docker:up
```

### Accessing the Application

- **Web Client**: http://localhost:3000
- **API Server**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## Project Structure

```
chatapp/
├── server/                    # Backend server code
│   ├── index.js               # Server entry point
│   ├── routes/                # API routes
│   ├── middleware/            # Authentication middleware
│   ├── services/              # Business logic
│   ├── sockets/               # WebSocket handlers
│   ├── lib/                   # Shared utilities
│   └── prisma/                # Database schema and migrations
├── src/                       # Frontend React code
│   ├── components/            # React components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and helpers
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
├── docker-compose.wsl.yml     # Docker configuration
├── start-app.bat              # Windows launcher script
└── wsl-setup.sh               # WSL setup script
```

## API Documentation

### Authentication Endpoints

- **Register User**
  - URL: `POST /api/auth/register`
  - Body: `{ "username": "string", "email": "string", "password": "string" }`
  - Response: `{ "status": "success", "data": { "token": "string", "userId": "string", "username": "string" } }`

- **Login User**
  - URL: `POST /api/auth/login`
  - Body: `{ "username": "string", "password": "string" }`
  - Response: `{ "status": "success", "data": { "token": "string", "userId": "string", "username": "string" } }`

### Messages Endpoints

- **Get Recent Messages**
  - URL: `GET /api/messages`
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ "status": "success", "data": [Message] }`

- **Create New Message**
  - URL: `POST /api/messages`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "text": "string" }`
  - Response: `{ "status": "success", "data": Message }`

## WebSocket Events

- **Authentication**
  - Connect with auth token: `io('http://localhost:3001', { auth: { token: 'your-jwt-token' } })`

- **Sending Messages**
  - Event: `message`
  - Data: `"Your message text"`

- **Receiving Messages**
  - Event: `message`
  - Data: `{ id: string, text: string, userId: string, user: { username: string }, createdAt: string, isAI: boolean }`

- **Error Handling**
  - Event: `error`
  - Data: `{ message: string }`

## Database Schema

### User Model
```prisma
model User {
  id        String    @id @default(uuid())
  username  String    @unique
  email     String    @unique
  password  String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}
```

### Message Model
```prisma
model Message {
  id        String   @id @default(uuid())
  text      String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  isAI      Boolean  @default(false)

  @@index([createdAt(sort: Desc)])
}
```

## AI Integration

The application features a simple AI integration that automatically responds to user messages:

1. When a user sends a message, it's stored in the database and broadcast to all connected clients.
2. The server then generates an AI response using the `handleAIResponse` service.
3. The AI response is also stored in the database and broadcast to all clients.

Currently, the AI implementation is a simple echo service that prefixes the original message with "AI:". For production, this can be replaced with:
- OpenAI's GPT API
- Hugging Face models
- Custom ML models

To customize the AI integration, modify the `server/services/ai.js` file.

## Troubleshooting

### Database Connection Issues

**PostgreSQL connection failing in WSL**:
1. Check if PostgreSQL is running: `docker ps` or `pg_isready`
2. Try alternative connection strings in `server/.env`:
   ```
   # For Windows PostgreSQL from WSL
   DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/chatapp"
   
   # Alternative IP approach
   DATABASE_URL="postgresql://postgres:postgres@172.17.0.1:5432/chatapp"
   ```
3. Verify that PostgreSQL is configured to accept remote connections:
   - Edit `pg_hba.conf` to allow connections from WSL
   - Set `listen_addresses = '*'` in `postgresql.conf`

### WSL Issues

**Cannot connect to server from WSL**:
- Ensure WSL has network connectivity: `ping google.com`
- Check if Windows firewall is blocking connections
- Try using the direct IP address instead of localhost

**Slow performance in WSL**:
- Place your project directory in the Linux filesystem, not Windows mounted path
- Avoid working from /mnt/c/ paths for better performance

### Client-side Issues

**Socket.IO connection failing**:
- Check if the server is running
- Verify that the token is valid and correctly formatted
- Ensure CORS is properly configured on the server

## Development Guide

### Adding New Features

1. **Backend**:
   - Routes: Add new endpoints in `server/routes/`
   - Logic: Implement business logic in `server/services/`
   - WebSockets: Add event handlers in `server/sockets/`

2. **Frontend**:
   - Components: Create React components in `src/components/`
   - API Integration: Use Axios for HTTP requests, Socket.IO for real-time events

### Code Style and Standards

- Use Prettier for code formatting
- Follow React hooks patterns for frontend state management
- Use async/await for asynchronous operations
- Follow RESTful API conventions for endpoints

### Running Tests

```bash
# Client tests
npm test

# Server tests (if implemented)
cd server && npm test
```

## License

MIT License. See [LICENSE](LICENSE) for details. 