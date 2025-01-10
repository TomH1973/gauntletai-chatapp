# Environment Setup

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm >= 9.0.0 or yarn >= 1.22.0
- Git

## Initial Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd chatapp
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Required environment variables:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chatapp"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# File Storage
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
STORAGE_REGION=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

4. Initialize database:
```bash
npx prisma generate
npx prisma db push
```

5. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Development Environment

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build production bundle
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run test`: Run tests
- `npm run prisma:studio`: Open Prisma Studio

### IDE Setup

#### VS Code
Recommended extensions:
- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features

Recommended settings (`settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Production Deployment

### Build Process
1. Install dependencies:
```bash
npm install --production
```

2. Build the application:
```bash
npm run build
```

3. Start the server:
```bash
npm run start
```

### Environment Considerations
- Set `NODE_ENV=production`
- Configure proper database connection pool
- Set up proper CORS settings
- Configure rate limiting
- Enable production logging

### Health Checks
The application provides the following health check endpoints:
- `/api/health`: Basic application health
- `/api/health/db`: Database connectivity
- `/api/health/ws`: WebSocket server status 