# Testing Guide

This document outlines the testing strategy and procedures for the chat application.

## Testing Strategy

### Test Types

1. **Unit Tests**
   - Component tests
   - Service layer tests
   - Utility function tests
   - Database model tests

2. **Integration Tests**
   - API endpoint tests
   - WebSocket event tests
   - Database integration tests
   - File storage integration tests

3. **End-to-End Tests**
   - User flow tests
   - Real-time communication tests
   - File upload/download tests
   - Authentication flows

4. **Performance Tests**
   - Load testing
   - Stress testing
   - Scalability testing
   - Network latency tests

## Test Setup

### Prerequisites
```bash
# Install test dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @playwright/test
npm install --save-dev artillery
```

### Test Configuration

```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1'
  }
};

// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium' }
    },
    {
      name: 'Firefox',
      use: { browserName: 'firefox' }
    }
  ]
};

export default config;
```

## Unit Testing

### Component Tests

```typescript
// __tests__/components/MessageInput.test.tsx
import { render, fireEvent } from '@testing-library/react';
import MessageInput from '@/components/MessageInput';

describe('MessageInput', () => {
  it('should handle message input', () => {
    const onSend = jest.fn();
    const { getByPlaceholderText, getByRole } = render(
      <MessageInput onSend={onSend} />
    );

    const input = getByPlaceholderText('Type a message...');
    const button = getByRole('button');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(button);

    expect(onSend).toHaveBeenCalledWith('Hello');
  });
});
```

### Service Tests

```typescript
// __tests__/services/MessageService.test.ts
import { MessageService } from '@/services/MessageService';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma');

describe('MessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a message', async () => {
    const messageData = {
      content: 'Test message',
      threadId: '123',
      userId: '456'
    };

    prisma.message.create.mockResolvedValue({
      id: '789',
      ...messageData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await MessageService.createMessage(messageData);
    expect(result.content).toBe(messageData.content);
    expect(prisma.message.create).toHaveBeenCalled();
  });
});
```

## Integration Testing

### API Tests

```typescript
// __tests__/api/messages.test.ts
import { createMocks } from 'node-mocks-http';
import messagesHandler from '@/pages/api/messages';

describe('/api/messages', () => {
  it('should create a message', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        content: 'Test message',
        threadId: '123'
      }
    });

    await messagesHandler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        content: 'Test message'
      })
    );
  });
});
```

### WebSocket Tests

```typescript
// __tests__/websocket/events.test.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import { setupWebSocketServer } from '@/lib/websocket';

describe('WebSocket Events', () => {
  let io, serverSocket, clientSocket;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    setupWebSocketServer(io);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
  });

  test('should handle message events', (done) => {
    clientSocket.emit('message:send', {
      content: 'Test message',
      threadId: '123'
    });

    serverSocket.on('message:send', (data) => {
      expect(data.content).toBe('Test message');
      done();
    });
  });
});
```

## End-to-End Testing

### User Flow Tests

```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test('user can send and receive messages', async ({ page }) => {
  await page.goto('/');
  await page.fill('[placeholder="Type a message..."]', 'Hello World');
  await page.click('button[type="submit"]');

  const message = await page.waitForSelector('.message-content');
  expect(await message.textContent()).toBe('Hello World');
});
```

## Performance Testing

### Load Test Script

```javascript
// tests/performance/chat-flow.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      rampTo: 50
      name: "Ramp up load"
  websocket:
    url: "ws://localhost:3000"

scenarios:
  - name: "Chat flow"
    flow:
      - get:
          url: "/api/threads"
      - think: 1
      - post:
          url: "/api/messages"
          json:
            content: "Test message"
            threadId: "123"
      - think: 2
      - ws:
          channel: "thread:123"
          send: "Hello"
```

## Test Coverage

### Coverage Goals
- Unit Tests: 80% coverage
- Integration Tests: 70% coverage
- E2E Tests: Key user flows covered
- Performance Tests: Response time < 200ms

### Running Tests

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Generate coverage report
npm run test:coverage
```

## Continuous Integration

### GitHub Actions Test Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: --health-cmd pg_isready

      redis:
        image: redis:6
        ports:
          - 6379:6379
        options: --health-cmd "redis-cli ping"

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Run E2E tests
        run: |
          npm run build
          npm run start &
          npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Test Maintenance

### Best Practices
1. Keep tests focused and atomic
2. Use meaningful test descriptions
3. Maintain test data fixtures
4. Regular test cleanup
5. Monitor test performance
6. Update tests with code changes

### Test Data Management
1. Use factories for test data
2. Maintain separate test database
3. Clean up test data after runs
4. Use realistic test scenarios

### Debugging Tests
1. Use test debugger
2. Check test logs
3. Isolate failing tests
4. Review test environment
5. Check for race conditions
``` 