# ChatApp Development Guide

## Build & Test Commands
- **Dev (WSL)**: `npm run wsl:dev` - Start full stack in WSL
- **Server Only**: `cd server && npm run wsl:dev` - Start server in WSL
- **Client Only**: `npm run wsl:client` - Start React client in WSL
- **Test All**: `npm test` (client), `cd server && npm test` (server)
- **Single Test**: `npm test -- -t "test name pattern"` or `cd server && npm test -- -t "test name pattern"`
- **Database**: `npm run wsl:docker:db` - Start PostgreSQL container

## Deployment Path
- **Local**: WSL with Docker Compose for development
- **Staging**: Railway free tier deployment
- **Production**: AWS ECS/Fargate with RDS (PostgreSQL) and ElastiCache (Redis)

## Code Style Guidelines
- **TypeScript**: Use strong typing with interfaces/types in dedicated files
- **Imports**: React core first, components second, utilities last; use absolute imports with @/ prefix
- **Components**: Functional components with explicit prop interfaces and JSDoc comments
- **Formatting**: 2-space indent, single quotes, semicolons, trailing commas, ~80-100 char line length
- **Error Handling**: Use centralized error system with useErrorHandler hook
- **Naming**: PascalCase for components/interfaces, camelCase for functions/variables
- **Testing**: Jest with React Testing Library, mock external dependencies

## Architecture
- **Frontend**: React app with Socket.IO client
- **Backend**: Express server with Socket.IO
- **Database**: PostgreSQL with Prisma ORM
- **API Pattern**: RESTful endpoints + WebSocket for real-time