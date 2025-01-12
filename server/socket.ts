import { Server } from 'socket.io';
import { metrics } from '@/app/api/metrics/route';

export function createSocketServer(server: any) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Increment active connections
    metrics.activeConnections.inc();
    
    socket.on('message', async (data) => {
      try {
        // Your existing message handling logic here
        // ...
        
        // Record successful message
        metrics.messagesSent.inc({ status: 'success' });
      } catch (error) {
        console.error('Error handling message:', error);
        // Record failed message
        metrics.messagesSent.inc({ status: 'error' });
      }
    });

    socket.on('disconnect', () => {
      // Decrement active connections
      metrics.activeConnections.dec();
    });
  });

  return io;
} 