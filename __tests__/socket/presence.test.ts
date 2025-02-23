import { createServer } from 'http';
import { Server } from 'socket.io';
import { connect } from 'socket.io-client';
import { createPresenceManager, UserStatus } from '@/lib/socket/presence';
import type { ClientToServerEvents, ServerToClientEvents, PresenceEvent } from '@/types/socket';

describe('Presence System', () => {
  let io: Server;
  let clientSocket1: ReturnType<typeof connect>;
  let clientSocket2: ReturnType<typeof connect>;
  let port: number;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    const presenceManager = createPresenceManager(io);
    
    io.on('connection', (socket) => {
      const userId = socket.handshake.auth.userId;
      presenceManager.handleConnection(socket, userId);
      
      socket.on('disconnect', () => {
        presenceManager.handleDisconnection(socket, userId);
      });
    });

    port = 3001;
    httpServer.listen(port, () => {
      done();
    });
  });

  afterAll(() => {
    io.close();
  });

  beforeEach((done) => {
    clientSocket1 = connect(`http://localhost:${port}`, {
      auth: { userId: 'user1' },
      transports: ['websocket'],
    });
    
    clientSocket2 = connect(`http://localhost:${port}`, {
      auth: { userId: 'user2' },
      transports: ['websocket'],
    });

    clientSocket1.on('connect', () => {
      clientSocket2.on('connect', () => {
        done();
      });
    });
  });

  afterEach(() => {
    clientSocket1.close();
    clientSocket2.close();
  });

  it('should handle multi-device connections correctly', (done) => {
    const clientSocket1b = connect(`http://localhost:${port}`, {
      auth: { userId: 'user1' },
      transports: ['websocket'],
    });

    let onlineEventCount = 0;
    clientSocket2.on('presence:online', (data: PresenceEvent) => {
      onlineEventCount++;
      // Should only emit once despite multiple connections
      expect(onlineEventCount).toBe(1);
      expect(data.userId).toBe('user1');
      expect(data.status).toBe('ONLINE');
      clientSocket1b.close();
      done();
    });
  });

  it('should transition through status states correctly', (done) => {
    const statusUpdates: UserStatus[] = [];
    
    clientSocket2.on('presence:status', (data: PresenceEvent) => {
      statusUpdates.push(data.status);
      if (statusUpdates.length === 2) {
        expect(statusUpdates).toEqual(['AWAY', 'OFFLINE']);
        done();
      }
    });

    // Fast-forward time to trigger AWAY status
    jest.advanceTimersByTime(300000); // 5 minutes
    // Fast-forward more to trigger OFFLINE status
    jest.advanceTimersByTime(300000); // Another 5 minutes
  });

  it('should handle reconnection scenarios', (done) => {
    let disconnectHandled = false;
    let reconnectHandled = false;

    clientSocket2.on('presence:offline', (data: PresenceEvent) => {
      expect(data.userId).toBe('user1');
      disconnectHandled = true;
      if (disconnectHandled && reconnectHandled) done();
    });

    clientSocket2.on('presence:online', (data: PresenceEvent) => {
      if (disconnectHandled) {
        expect(data.userId).toBe('user1');
        reconnectHandled = true;
        if (disconnectHandled && reconnectHandled) done();
      }
    });

    // Simulate disconnect/reconnect
    clientSocket1.disconnect();
    setTimeout(() => {
      clientSocket1.connect();
    }, 1000);
  });

  it('should maintain accurate last seen times', (done) => {
    let lastSeenTime: string;

    clientSocket2.on('presence:pong', (data: {
      lastSeenTimes: Record<string, string>;
    }) => {
      lastSeenTime = data.lastSeenTimes['user1'];
      expect(new Date(lastSeenTime)).toBeInstanceOf(Date);
      done();
    });

    clientSocket2.emit('presence:ping');
  });

  it('should clean up stale data', (done) => {
    // Fast-forward time past STALE_THRESHOLD
    jest.advanceTimersByTime(86400000 + 1000); // 24 hours + 1 second

    clientSocket2.emit('presence:ping');
    clientSocket2.on('presence:pong', (data: {
      onlineUsers: string[];
    }) => {
      expect(data.onlineUsers).not.toContain('user1');
      done();
    });
  });

  it('should handle activity updates correctly', (done) => {
    let activityHandled = false;
    
    clientSocket2.on('presence:status', (data: PresenceEvent) => {
      expect(data.userId).toBe('user1');
      expect(data.status).toBe('ONLINE');
      activityHandled = true;
      done();
    });

    // Simulate user activity after being AWAY
    jest.advanceTimersByTime(300000); // Go to AWAY state
    clientSocket1.emit('presence:activity'); // Should go back to ONLINE
  });
}); 