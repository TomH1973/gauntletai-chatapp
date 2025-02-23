import { Server } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';
import io from 'socket.io-client';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

jest.setTimeout(30000); // Increase global timeout

describe('WebSocket Server Tests', () => {
  let httpServer: HttpServer;
  let socketServer: Server;
  let clientSocket: ReturnType<typeof io>;
  let pubClient: Redis;
  let subClient: Redis;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = createServer();
    socketServer = new Server(httpServer);

    // Initialize Redis clients
    pubClient = new Redis({
      host: 'localhost',
      port: 6379,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null // Disable max retries per request
    });

    subClient = new Redis({
      host: 'localhost',
      port: 6379,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null // Disable max retries per request
    });

    // Add error handlers
    pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
    subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

    // Create adapter
    socketServer.adapter(createAdapter(pubClient, subClient));

    // Start server
    httpServer.listen(3000, () => {
      console.log('Server listening on port 3000');
    });
  });

  beforeEach((done) => {
    clientSocket = io('http://localhost:3000');
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  afterAll(async () => {
    // Cleanup
    await socketServer.close();
    await httpServer.close();
    await pubClient.quit();
    await subClient.quit();
  });

  test('should establish basic connection', (done) => {
    expect(socketServer).toBeDefined();
    expect(clientSocket.connected).toBe(true);
    done();
  }, 10000);

  test('should handle ping-pong for heartbeat', (done) => {
    const startTime = Date.now();
    clientSocket.emit('ping');
    
    clientSocket.on('pong', () => {
      const latency = Date.now() - startTime;
      expect(latency).toBeLessThan(1000);
      done();
    });
  }, 10000);

  test('should handle reconnection', (done) => {
    let disconnectCount = 0;
    let reconnectCount = 0;

    clientSocket.on('disconnect', () => {
      disconnectCount++;
    });

    clientSocket.on('connect', () => {
      reconnectCount++;
      if (reconnectCount === 2) { // Original connection + 1 reconnect
        expect(disconnectCount).toBe(1);
        done();
      }
    });

    // Force a disconnect
    clientSocket.disconnect();
    // Attempt reconnection
    setTimeout(() => {
      clientSocket.connect();
    }, 1000);
  }, 15000);

  test('should maintain room subscriptions after reconnect', (done) => {
    const room = 'test-room';
    const message = 'test message';

    clientSocket.emit('join', room, () => {
      // Force disconnect and reconnect
      clientSocket.disconnect();
      setTimeout(() => {
        clientSocket.connect();
        
        // Wait for reconnection
        clientSocket.on('connect', () => {
          setTimeout(() => {
            // Send message to room
            socketServer.to(room).emit('message', message);
          }, 1000);
        });

        // Listen for message
        clientSocket.on('message', (msg: string) => {
          expect(msg).toBe(message);
          done();
        });
      }, 1000);
    });
  }, 20000);
}); 